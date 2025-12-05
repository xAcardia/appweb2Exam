import { useAuth } from "../context/AuthContext.jsx";
import { useEffect, useState } from "react";
import { db } from "../firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  setDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { openai } from "../openai.js";

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "linear-gradient(to bottom, #28311F, #7A8F55)",
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 20px",
    backgroundColor: "rgba(20,24,16,0.9)",
    color: "#F9FAF5",
  },
  topbarTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 600,
  },
  topbarRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "13px",
  },
  logoutBtn: {
    padding: "6px 12px",
    borderRadius: "999px",
    border: "none",
    backgroundColor: "#ef4444",
    color: "#fff",
    cursor: "pointer",
    fontSize: "13px",
  },
  container: {
    padding: "16px",
  },
  card: {
    backgroundColor: "#1E2617",
    borderRadius: "12px",
    padding: "16px",
    boxShadow: "0 8px 25px rgba(0,0,0,0.45)",
    color: "#F9FAF5",
  },
  questionBlock: {
    marginTop: "12px",
    borderTop: "1px solid #374151",
    paddingTop: "8px",
  },
  textarea: {
    width: "100%",
    minHeight: "90px",
    borderRadius: "8px",
    border: "1px solid #4B5A3B",
    backgroundColor: "#111827",
    color: "#F9FAF5",
    padding: "8px",
    fontSize: "14px",
    boxSizing: "border-box",
    resize: "vertical",
  },
  smallButton: {
    marginTop: "6px",
    padding: "6px 10px",
    borderRadius: "999px",
    border: "none",
    backgroundColor: "#e5e7eb",
    cursor: "pointer",
    fontSize: "13px",
    color: "#111827",
  },
  primaryButton: {
    marginTop: "16px",
    padding: "8px 14px",
    borderRadius: "999px",
    border: "none",
    backgroundColor: "#9DBF3B",
    color: "#1E2617",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  aiBox: {
    marginTop: "6px",
    backgroundColor: "#111827",
    borderRadius: "8px",
    padding: "8px",
    fontSize: "13px",
  },
};

export default function Teacher() {
  const { user, logout } = useAuth();
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    const loadForm = async () => {
      const q = query(collection(db, "forms"), where("active", "==", true));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        const data = d.data();
        setForm({ id: d.id, ...data });
        setAnswers(
          (data.questions || []).map((q) => ({
            question: q.text,
            rule: q.rule,
            answer: "",
            ai: null,
          }))
        );
      }
    };
    loadForm();
  }, []);

  const updateAnswer = (index, value) => {
    setAnswers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], answer: value };
      return copy;
    });
  };

  const analyzeOne = async (index) => {
    const item = answers[index];
    if (!item.answer.trim()) {
      alert("Veuillez saisir une réponse.");
      return;
    }

    const prompt = `
Tu es un valideur de plan de cours.
Analyse la réponse de l’enseignant selon la règle.
Donne un texte structuré avec :
- Statut : Conforme / À améliorer / Non conforme
- Points positifs
- Points à améliorer
- Suggestion de reformulation.

Question: ${item.question}
Règle: ${item.rule}
Réponse: ${item.answer}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Tu rédiges en français, clair et professionnel." },
        { role: "user", content: prompt },
      ],
    });

    const text = completion.choices[0].message.content;

    setAnswers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ai: text };
      return copy;
    });
  };

  const submitPlan = async () => {
    if (!form) return;
    const id = `${user.uid}_${Date.now()}`;

    await setDoc(doc(db, "plans", id), {
      teacherId: user.uid,
      teacherName: user.displayName,
      teacherEmail: user.email,
      formId: form.id,
      formTitle: form.title,
      answers,
      status: "Soumis",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    alert("Plan soumis au coordonnateur.");
  };

  if (!form) {
    return (
      <div style={styles.page}>
        <header style={styles.topbar}>
          <h2 style={styles.topbarTitle}>Enseignant</h2>
          <div style={styles.topbarRight}>
            <span>{user?.email}</span>
            <button style={styles.logoutBtn} onClick={logout}>
              Déconnexion
            </button>
          </div>
        </header>
        <div style={styles.container}>Aucun formulaire actif pour le moment.</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.topbar}>
        <h2 style={styles.topbarTitle}>Enseignant – Plan de cours</h2>
        <div style={styles.topbarRight}>
          <span>{user?.email}</span>
          <button style={styles.logoutBtn} onClick={logout}>
            Déconnexion
          </button>
        </div>
      </header>

      <div style={styles.container}>
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>{form.title}</h3>

          {answers.map((a, index) => (
            <div key={index} style={styles.questionBlock}>
              <p>
                <strong>
                  Q{index + 1}. {a.question}
                </strong>
              </p>
              <textarea
                style={styles.textarea}
                value={a.answer}
                onChange={(e) => updateAnswer(index, e.target.value)}
                placeholder="Votre réponse..."
              />
              <button style={styles.smallButton} onClick={() => analyzeOne(index)}>
                Analyser cette réponse
              </button>

              {a.ai && (
                <div style={styles.aiBox}>
                  <strong>Résultat IA :</strong>
                  <div>{a.ai}</div>
                </div>
              )}
            </div>
          ))}

          <button style={styles.primaryButton} onClick={submitPlan}>
            Soumettre le plan complet
          </button>
        </div>
      </div>
    </div>
  );
}
