require("dotenv").config();

const { setGlobalOptions } = require("firebase-functions/v2");
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// ✅ Admin SDK pour vérifier App Check
const admin = require("firebase-admin");
admin.initializeApp();

setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * ✅ CORS helper (répond au preflight OPTIONS)
 */
function applyCors(req, res, extraHeaders = "") {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set(
    "Access-Control-Allow-Headers",
    `Content-Type${extraHeaders ? ", " + extraHeaders : ""}`
  );

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true; // stop
  }
  return false;
}

/**
 * ✅ Vérifie App Check (header: X-Firebase-AppCheck)
 * SOFT MODE: si pas de token => on ne bloque pas (pour garder fetch OK)
 */
async function verifyAppCheckSoft(req) {
  const token = req.header("X-Firebase-AppCheck");
  if (!token) return null;

  try {
    const decoded = await admin.appCheck().verifyToken(token);
    return decoded;
  } catch (err) {
    logger.warn("Token App Check invalide (soft mode)", err);
    return null;
  }
}

/**

 */
exports.verifyRecaptcha = onRequest(async (req, res) => {
  // ✅ CORS + preflight
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "method-not-allowed" });
  }

  const { token } = req.body || {};
  if (!token) {
    return res.status(400).json({ success: false, error: "missing-token" });
  }

  const secret = process.env.RECAPTCHA_V2_SECRET;
  if (!secret) {
    return res.status(500).json({ success: false, error: "missing-recaptcha-secret" });
  }

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
    });

    const data = await response.json();
    return res.json(data); // { success: true/false, ... }
  } catch (err) {
    logger.error("Erreur verifyRecaptcha:", err);
    return res.status(500).json({ success: false, error: "server-error" });
  }
});

exports.validateAnswerAI = onRequest(async (req, res) => {
  // ✅ CORS + preflight (inclut App Check header)
  if (applyCors(req, res, "X-Firebase-AppCheck")) return;

  // POST only
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée" });
    return;
  }

  // ✅ App Check en mode SOFT (ne bloque pas ton fetch)
  // Pour l’examen tu peux dire: “si on active Enforced, il devient obligatoire”
  const appCheck = await verifyAppCheckSoft(req);
  if (appCheck) {
    logger.info("App Check OK (soft)", appCheck);
  } else {
    logger.info("App Check absent/invalide (soft) - requête acceptée quand même");
  }

  const { question, answer, rule } = req.body || {};

  // rule obligatoire
  if (!answer || !rule) {
    res.status(400).json({
      error: "Les champs 'answer' et 'rule' sont obligatoires.",
    });
    return;
  }

  if (!OPENAI_API_KEY) {
    logger.error("OPENAI_API_KEY manquante dans l'environnement");
    res.status(500).json({ error: "OPENAI_API_KEY non configurée sur le serveur" });
    return;
  }

 
  const prompt = `
Tu es un correcteur professionnel de français (orthographe + grammaire + ponctuation + style).
Tu dois suivre STRICTEMENT la règle fournie par l'utilisateur (RULE).

RULE:
${rule}

CONTEXTE (optionnel):
${question ? `Tâche: ${question}` : ""}

TEXTE À ANALYSER:
${answer}

IMPORTANT:
- Retourne UNIQUEMENT un objet JSON (sans texte avant ni après).
- Le JSON doit respecter EXACTEMENT ce format:
{
  "status": "Conforme" | "À améliorer" | "Non conforme",
  "points_positifs": ["..."],
  "points_a_ameliorer": ["..."],
  "suggestion": "..."
}

RÈGLES POUR LES CHAMPS:
- "status":
  - "Conforme" si aucune faute majeure.
  - "À améliorer" si quelques fautes/corrections utiles.
  - "Non conforme" si beaucoup de fautes ou texte très difficile à comprendre.
- "points_a_ameliorer": liste courte (max 8) qui indique OÙ est la faute avec un extrait + la correction.
- "points_positifs": 0 à 4 éléments max (ex: clarté, vocabulaire, structure).
- "suggestion": contient le rapport complet formaté (Verdict + fautes + texte corrigé complet + astuces), propre et lisible.
`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Tu es un assistant qui répond uniquement en JSON valide. Aucun texte hors JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error("Erreur HTTP OpenAI:", response.status, text);
      res.status(500).json({ error: `Erreur OpenAI (${response.status})`, details: text });
      return;
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";

    content = content.replace(/```json/gi, "").replace(/```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      logger.error("JSON invalide renvoyé par OpenAI:", content);
      res.status(500).json({
        error: "Réponse IA non valide (JSON invalide)",
        raw: content,
      });
      return;
    }

    const result = {
      status: parsed.status || "À améliorer",
      points_positifs: Array.isArray(parsed.points_positifs) ? parsed.points_positifs : [],
      points_a_ameliorer: Array.isArray(parsed.points_a_ameliorer) ? parsed.points_a_ameliorer : [],
      suggestion:
        typeof parsed.suggestion === "string" && parsed.suggestion.trim()
          ? parsed.suggestion
          : "Analyse terminée. (Aucune suggestion fournie.)",
    };

    res.json(result);
  } catch (error) {
    logger.error("Erreur serveur lors de l'appel OpenAI:", error);
    res.status(500).json({
      error: "Erreur serveur lors de l'appel OpenAI",
      details: error.message,
    });
  }
});
