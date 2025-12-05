
require("dotenv").config();

const { setGlobalOptions } = require("firebase-functions/v2");
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");


setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
});


const OPENAI_API_KEY = process.env.OPENAI_API_KEY;



exports.validateAnswerAI = onRequest({ cors: true }, async (req, res) => {
  // On ne veut que du POST
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée" });
    return;
  }

  const { question, answer, rule } = req.body || {};

  if (!question || !answer || !rule) {
    res.status(400).json({
      error: "Les champs 'question', 'answer' et 'rule' sont obligatoires.",
    });
    return;
  }

  if (!OPENAI_API_KEY) {
    logger.error("OPENAI_API_KEY manquante dans l'environnement");
    res.status(500).json({ error: "OPENAI_API_KEY non configurée sur le serveur" });
    return;
  }

  const prompt = `
    Agis comme un expert pédagogique. Valide la réponse d'un enseignant pour un plan de cours.

    Question : "${question}"
    Réponse de l'enseignant : "${answer}"
    Règle à respecter : "${rule}"

    Retourne UNIQUEMENT un objet JSON (sans texte avant ni après) avec ce format EXACT :
    {
      "status": "Conforme" | "À améliorer" | "Non conforme",
      "points_positifs": ["point positif 1", "point positif 2"],
      "points_a_ameliorer": ["point à améliorer 1", "point à améliorer 2"],
      "suggestion": "Une suggestion de réécriture améliorée si nécessaire"
    }
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
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error("Erreur HTTP OpenAI:", response.status, text);
      res
        .status(500)
        .json({ error: `Erreur OpenAI (${response.status})`, details: text });
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
      points_positifs: parsed.points_positifs || parsed.positives || [],
      points_a_ameliorer:
        parsed.points_a_ameliorer || parsed.negatives || [],
      suggestion:
        parsed.suggestion ||
        "Veuillez préciser davantage certains éléments du plan de cours.",
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
