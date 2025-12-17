import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { analyzeResponse } from "../openai";

import { db, storage } from "../firebase";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
} from "firebase/firestore";

const THEME = {
  bg1: "#071A2B",
  bg2: "#0D2B4B",
  card: "rgba(7, 22, 38, 0.92)",
  border: "#1B3D5C",
  text: "#EAF2FA",
  muted: "#B7C8D8",
  accent1: "#1E6FB8",
  accent2: "#124A7A",
  danger: "#FF6B6B",
};

const RULE_TEXT = `
Tu es un correcteur de français (Québec ok). Analyse le texte de l’utilisateur.

Réponds en format CLAIR, structuré et court, avec ces sections EXACTES:

A) Verdict (Oui/Non)
- "Il y a des fautes: Oui/Non"

B) Où sont les fautes (3 à 8 max)
Pour chaque faute, affiche:
- Extrait: "...mot/phrase..."
- Erreur: (orthographe / grammaire / accord / conjugaison / ponctuation / style)
- Correction: "..."
- Explication courte: 1 phrase max

C) Texte corrigé (version complète)
- Redonne le texte COMPLET corrigé (pas juste une phrase)

D) Astuces (2 à 4 max)
- Conseils concrets et simples pour éviter ces erreurs

Règles:
- Ne dépasse pas 8 fautes listées.
- Si le texte est déjà correct, section B = "Aucune faute majeure."
- Garde un ton professionnel, pas de blabla.
`;

function toPrettyText(raw) {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw?.text === "string") return raw.text;
  if (typeof raw?.result === "string") return raw.result;
  if (typeof raw?.suggestion === "string") return raw.suggestion;

  try {
    return JSON.stringify(raw, null, 2);
  } catch {
    return String(raw);
  }
}

function formatDate(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
    if (!d || Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString();
  } catch {
    return "-";
  }
}

export default function Teacher() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState("checker"); // "checker" | "profile"

  // CHECKER
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  // HISTORY (Firestore)
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMsg, setHistoryMsg] = useState("");

  // PROFILE
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [provider, setProvider] = useState("-");
  const [file, setFile] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  const styles = useMemo(
    () => ({
      wrapper: {
        minHeight: "100vh",
        background: `linear-gradient(to bottom, ${THEME.bg1}, ${THEME.bg2})`,
        color: THEME.text,
        fontFamily: "sans-serif",
        padding: 24,
        boxSizing: "border-box",
      },
      topbar: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 18,
      },
      brand: { fontWeight: 900, fontSize: 18 },
      subBrand: { color: THEME.muted, fontSize: 12, marginTop: 2 },
      btnRow: { display: "flex", gap: 10, flexWrap: "wrap" },
      btn: {
        borderRadius: 999,
        padding: "10px 14px",
        background: "rgba(255,255,255,0.06)",
        border: `1px solid ${THEME.border}`,
        color: THEME.text,
        cursor: "pointer",
        fontWeight: 800,
      },
      btnActive: {
        border: `1px solid rgba(255,255,255,0.22)`,
        background: "rgba(255,255,255,0.10)",
      },

      // CHECKER layout
      grid: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
        alignItems: "start",
      },

      // HISTORY layout
      historyCard: {
        gridColumn: "1 / -1",
      },

      // PROFILE layout
      profileGrid: {
        display: "grid",
        gridTemplateColumns: "320px 1fr",
        gap: 24,
        alignItems: "start",
      },

      card: {
        background: THEME.card,
        border: `1px solid ${THEME.border}`,
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 22px 55px rgba(0,0,0,0.35)",
      },
      title: { margin: "0 0 10px 0", fontSize: 18, fontWeight: 900 },
      sub: {
        margin: "0 0 14px 0",
        color: THEME.muted,
        fontSize: 13,
        lineHeight: 1.4,
      },

      textarea: {
        width: "100%",
        minHeight: 260,
        resize: "vertical",
        borderRadius: 12,
        border: `1px solid ${THEME.border}`,
        backgroundColor: "rgba(255,255,255,0.06)",
        padding: 12,
        color: THEME.text,
        outline: "none",
        boxSizing: "border-box",
        fontSize: 14,
        lineHeight: 1.5,
      },
      primary: {
        width: "100%",
        marginTop: 12,
        borderRadius: 999,
        border: `1px solid ${THEME.border}`,
        padding: "12px 16px",
        fontWeight: 900,
        cursor: "pointer",
        background: `linear-gradient(to right, ${THEME.accent1}, ${THEME.accent2})`,
        color: THEME.text,
      },
      resultBox: {
        whiteSpace: "pre-wrap",
        lineHeight: 1.55,
        fontSize: 14,
        background: "rgba(255,255,255,0.05)",
        border: `1px solid ${THEME.border}`,
        borderRadius: 12,
        padding: 12,
        minHeight: 260,
      },
      errorBox: {
        backgroundColor: "rgba(255, 107, 107, 0.12)",
        border: `1px solid ${THEME.danger}`,
        color: THEME.danger,
        padding: 10,
        borderRadius: 10,
        marginBottom: 10,
        fontSize: 13,
        whiteSpace: "pre-wrap",
      },
      footer: { marginTop: 14, color: THEME.muted, fontSize: 12 },

      // HISTORY UI
      historyTopRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 10,
      },
      smallBtn: {
        borderRadius: 999,
        padding: "8px 12px",
        background: "rgba(255,255,255,0.06)",
        border: `1px solid ${THEME.border}`,
        color: THEME.text,
        cursor: "pointer",
        fontWeight: 800,
        fontSize: 13,
      },
      historyList: {
        display: "flex",
        flexDirection: "column",
        gap: 10,
      },
      historyItem: {
        borderRadius: 14,
        border: `1px solid ${THEME.border}`,
        background: "rgba(255,255,255,0.04)",
        padding: 12,
      },
      historyMeta: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 8,
        color: THEME.muted,
        fontSize: 12,
      },
      historyText: {
        whiteSpace: "pre-wrap",
        fontSize: 13,
        lineHeight: 1.5,
        marginTop: 6,
      },
      dangerBtn: {
        borderRadius: 999,
        padding: "8px 12px",
        background: "rgba(255, 107, 107, 0.12)",
        border: `1px solid ${THEME.danger}`,
        color: THEME.text,
        cursor: "pointer",
        fontWeight: 900,
        fontSize: 13,
      },
      msg: { marginTop: 10, fontSize: 13, color: THEME.muted, whiteSpace: "pre-wrap" },

      // PROFILE UI
      profileTitle: { margin: "0 0 14px 0", fontSize: 26, fontWeight: 900 },
      leftBox: {
        borderRadius: 16,
        border: `1px solid ${THEME.border}`,
        background: "rgba(255,255,255,0.04)",
        padding: 14,
      },
      avatar: {
        width: "100%",
        aspectRatio: "1 / 1",
        borderRadius: 14,
        border: `1px solid ${THEME.border}`,
        background: "rgba(255,255,255,0.06)",
        objectFit: "cover",
      },
      fileRow: { marginTop: 12, display: "flex", flexDirection: "column", gap: 8 },
      fileHint: { fontSize: 12, color: THEME.muted },

      field: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 },
      label: { fontSize: 13, fontWeight: 900 },
      input: {
        height: 44,
        borderRadius: 999,
        border: `1px solid ${THEME.border}`,
        background: "rgba(255,255,255,0.06)",
        color: THEME.text,
        padding: "0 14px",
        outline: "none",
        fontSize: 14,
      },
      pill: {
        display: "inline-flex",
        alignItems: "center",
        width: "fit-content",
        padding: "10px 12px",
        borderRadius: 999,
        border: `1px solid ${THEME.border}`,
        background: "rgba(255,255,255,0.06)",
        color: THEME.text,
        fontWeight: 800,
      },
      saveBtn: {
        width: "100%",
        height: 48,
        borderRadius: 999,
        border: `1px solid ${THEME.border}`,
        fontWeight: 900,
        cursor: "pointer",
        background: `linear-gradient(to right, ${THEME.accent1}, ${THEME.accent2})`,
        color: THEME.text,
      },
    }),
    []
  );

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;

    setDisplayName(user.displayName || "");
    setPhotoURL(user.photoURL || "");

    const pid = user.providerData?.[0]?.providerId || "password";
    if (pid === "google.com") setProvider("Google (Gmail)");
    else if (pid === "github.com") setProvider("GitHub");
    else setProvider("Email / Mot de passe");
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    setHistoryMsg("");
    setHistoryLoading(true);
    try {
      const q = query(
        collection(db, "analyses"),
        where("uid", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(5)
      );

      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setHistory(items);
      if (items.length === 0) setHistoryMsg("Aucune analyse sauvegardée pour l’instant.");
    } catch (e) {
      console.error(e);
      setHistoryMsg(`Erreur Firestore: ${e?.message || "Impossible de charger l'historique."}`);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const deleteHistoryItem = async (id) => {
    if (!id) return;
    setHistoryMsg("");
    try {
      await deleteDoc(doc(db, "analyses", id));
      setHistory((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      console.error(e);
      setHistoryMsg(`❌ Impossible de supprimer: ${e?.message || "Erreur"}`);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setResult("");
    try {
      const raw = await analyzeResponse("Correction orthographe/grammaire", text, RULE_TEXT);
      const pretty = toPrettyText(raw) || "Aucun résultat.";
      setResult(pretty);

      // ✅ CREATE
      await addDoc(collection(db, "analyses"), {
        uid: user.uid,
        inputText: text,
        aiResult: pretty,
        createdAt: serverTimestamp(),
      });

      // ✅ refresh
      await loadHistory();
    } catch (err) {
      console.error(err);
      setResult(`Erreur IA:\n${err?.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const onPickFile = (e) => {
    setProfileMsg("");
    const f = e.target.files?.[0] || null;
    if (!f) {
      setFile(null);
      return;
    }
    const max = 2 * 1024 * 1024;
    if (f.size > max) {
      setFile(null);
      setProfileMsg("⚠️ Fichier trop gros (max 2MB).");
      return;
    }
    if (!f.type.startsWith("image/")) {
      setFile(null);
      setProfileMsg("⚠️ Le fichier doit être une image.");
      return;
    }
    setFile(f);

    const local = URL.createObjectURL(f);
    setPhotoURL(local);
  };

  const saveProfile = async () => {
    if (!user) return;

    setSavingProfile(true);
    setProfileMsg("");

    try {
      let finalPhoto = user.photoURL || "";

     if (file) {
      const path = `users/${user.uid}/avatar_${Date.now()}`;
      const r = ref(storage,path);
      await uploadBytes(r,file);
      finalPhoto = await getDownloadURL(r);
     } 

      await updateProfile(user, {
        displayName: displayName.trim(),
        photoURL: finalPhoto || "",
      });

      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          displayName: displayName.trim(),
          email: user.email || "",
          photoURL: finalPhoto || "",
          providerId: user.providerData?.[0]?.providerId || "password",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setProfileMsg("✅ Profil sauvegardé !");
      setFile(null);
    } catch (e) {
      setProfileMsg(`❌ Erreur: ${e?.message || "Impossible de sauvegarder."}`);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.topbar}>
        <div>
          <div style={styles.brand}>AI Grammar Checker</div>
          <div style={styles.subBrand}>Connecté: {user?.email ?? user?.uid}</div>
        </div>

        <div style={styles.btnRow}>
          <button
            style={{ ...styles.btn, ...(view === "profile" ? styles.btnActive : {}) }}
            onClick={() => setView("profile")}
          >
            Profil
          </button>

          <button
            style={{ ...styles.btn, ...(view === "checker" ? styles.btnActive : {}) }}
            onClick={() => setView("checker")}
          >
            Checker
          </button>

          <button
            style={styles.btn}
            onClick={async () => {
              await logout();
              navigate("/login", { replace: true });
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {view === "checker" && (
        <div style={styles.grid}>
          <div style={styles.card}>
            <h3 style={styles.title}>1 Colle ton texte</h3>
            <p style={styles.sub}>
              L’IA va détecter les fautes et proposer des améliorations).
            </p>

            <textarea
              style={styles.textarea}
              placeholder="Colle ton texte ici..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            <button
              style={{ ...styles.primary, opacity: loading ? 0.75 : 1 }}
              onClick={handleAnalyze}
              disabled={loading || !text.trim()}
            >
              {loading ? "Analyse..." : "Analyser avec IA"}
            </button>

            <div style={styles.footer}>
              Astuce: plus ton texte est long, plus l’analyse peut prendre du temps.
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={styles.title}>2 Résultat</h3>
            <p style={styles.sub}>Les corrections apparaissent ici.</p>

            <div style={styles.resultBox}>
              {result ? (
                result.startsWith("Erreur IA:") ? (
                  <div style={styles.errorBox}>{result}</div>
                ) : (
                  result
                )
              ) : (
                "Aucun résultat pour l’instant. Clique sur “Analyser”."
              )}
            </div>
          </div>

          {/* ✅ HISTORIQUE */}
          <div style={{ ...styles.card, ...styles.historyCard }}>
            <div style={styles.historyTopRow}>
              <div>
                <div style={{ ...styles.title, margin: 0 }}>

                  Historique (Firestore)
                </div>
                <div style={{ color: THEME.muted, fontSize: 13, marginTop: 6 }}>
                  Les 5 dernières analyses de ton compte.
                </div>
              </div>

              <button style={styles.smallBtn} onClick={loadHistory} disabled={historyLoading}>
                {historyLoading ? "Chargement..." : "Rafraîchir"}
              </button>
            </div>

            {historyMsg && <div style={styles.msg}>{historyMsg}</div>}

            <div style={styles.historyList}>
              {history.map((h) => (
                <div key={h.id} style={styles.historyItem}>
                  <div style={styles.historyMeta}>
                    <div>
                      <div>
                        <strong>Date:</strong> {formatDate(h.createdAt)}
                      </div>
                      <div>
                        <strong>ID:</strong> {h.id}
                      </div>
                    </div>

                    <button
                      style={styles.dangerBtn}
                      onClick={() => deleteHistoryItem(h.id)}
                      title="Supprimer"
                    >
                      Supprimer
                    </button>
                  </div>

                  <div style={{ color: THEME.muted, fontSize: 12, marginBottom: 6 }}>
                    <strong>Texte original:</strong>
                  </div>
                  <div style={styles.historyText}>{h.inputText || "-"}</div>

                  <div style={{ color: THEME.muted, fontSize: 12, marginTop: 10, marginBottom: 6 }}>
                    <strong>Résultat IA:</strong>
                  </div>
                  <div style={styles.historyText}>{h.aiResult || "-"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === "profile" && (
        <div style={styles.card}>
          <h1 style={styles.profileTitle}>Profil</h1>

          <div style={styles.profileGrid}>
            <div style={styles.leftBox}>
              <img
                src={photoURL || "https://via.placeholder.com/600x600.png?text=Avatar"}
                alt="avatar"
                style={styles.avatar}
              />

              <div style={styles.fileRow}>
                <input type="file" accept="image/*" onChange={onPickFile} />
                <div style={styles.fileHint}>Format image, max 2MB.</div>
              </div>
            </div>

            <div>
              <div style={styles.field}>
                <div style={styles.label}>Nom affiché (displayName)</div>
                <input
                  style={styles.input}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ton nom"
                />
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Email</div>
                <div style={styles.pill}>{user?.email || "-"}</div>
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Fournisseur</div>
                <div style={styles.pill}>{provider}</div>
              </div>

              <button style={styles.saveBtn} onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? "Sauvegarde..." : "Sauvegarder"}
              </button>

              {profileMsg && <div style={styles.msg}>{profileMsg}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
