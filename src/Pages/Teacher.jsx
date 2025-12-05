import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db, storage } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { jsPDF } from "jspdf";
import { analyzeResponse } from "../openai";

const styles = {
  container: {
    minHeight: "100vh",
    background: "#F9FAF5",
    color: "#1E2617",
    fontFamily: "sans-serif",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    background: "#28311F",
    color: "#CDE47A",
    padding: "16px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  content: {
    padding: "24px",
    maxWidth: "1000px",
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
  },
  card: {
    background: "white",
    padding: "24px",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    marginBottom: "24px",
  },
  btnPrimary: {
    backgroundColor: "#4B5A3B",
    color: "#F9FAF5",
    border: "none",
    padding: "12px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
  },
  btnAi: {
    backgroundColor: "#CDE47A",
    color: "#1E2617",
    border: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "12px",
    marginTop: "8px",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  textarea: {
    width: "100%",
    minHeight: "120px",
    padding: "12px",
    borderRadius: "8px",
    boxSizing: "border-box",
    fontSize: "14px",
    fontFamily: "sans-serif",
    resize: "vertical",
  },
  inputGroup: { marginBottom: "24px" },
  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "bold",
    color: "#1E2617",
  },
  aiFeedbackBox: (status) => {
    let bg = "#F3F4F6";
    let border = "#D1D5DB";
    let color = "#374151";
    if (status === "Conforme") {
      bg = "#F0Fdf4";
      border = "#86EFAC";
      color = "#166534";
    } else if (status === "À améliorer") {
      bg = "#FEFCE8";
      border = "#FDE047";
      color = "#854D0E";
    } else if (status === "Non conforme" || status === "Erreur Technique") {
      bg = "#FEF2F2";
      border = "#FECACA";
      color = "#991B1B";
    }
    return {
      marginTop: "10px",
      padding: "12px",
      borderRadius: "8px",
      backgroundColor: bg,
      border: `1px solid ${border}`,
      color: color,
      fontSize: "13px",
    };
  },
  statusBadge: (status) => {
    let bg = status === "approved" ? "#1E2617" : "#2563EB";
    if (status === "correction") bg = "#D97706";
    return {
      padding: "4px 10px",
      borderRadius: "99px",
      fontSize: "12px",
      fontWeight: "bold",
      color: "#fff",
      backgroundColor: bg,
    };
  },
  table: { width: "100%", borderCollapse: "collapse", marginTop: "10px" },
  th: {
    textAlign: "left",
    padding: "12px",
    borderBottom: "2px solid #ddd",
    color: "#4B5A3B",
  },
  td: { padding: "12px", borderBottom: "1px solid #eee" },
};

export default function Teacher() {
  const { user, logout } = useAuth();

  const [view, setView] = useState("dashboard");
  const [myPlans, setMyPlans] = useState([]);


  const [templates, setTemplates] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);

  const [courseCode, setCourseCode] = useState("");
  const [answers, setAnswers] = useState({});
  const [aiResults, setAiResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [analyzingIds, setAnalyzingIds] = useState([]);

  useEffect(() => {
    if (user) {
      fetchMyPlans();
      fetchTemplates();
    }
  }, [user]);

  const fetchMyPlans = async () => {
    try {
      const q = query(
        collection(db, "course_plans"),
        where("teacherId", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);
      const plans = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      plans.sort(
        (a, b) =>
          (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0)
      );
      setMyPlans(plans);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const q = query(
        collection(db, "form_templates"),
        where("active", "==", true)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setTemplates(list);
      if (list.length > 0) {
        setActiveTemplate(list[0]);
      } else {
        setActiveTemplate(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAnswerChange = (qId, text) => {
    setAnswers((prev) => ({ ...prev, [qId]: text }));
    if (aiResults[qId]) {
      const newAiResults = { ...aiResults };
      delete newAiResults[qId];
      setAiResults(newAiResults);
    }
  };

  const handleVerifyAI = async (questionId, questionText, rule) => {
    const answer = answers[questionId] || "";
    if (answer.trim().length < 5) return alert("Réponse trop courte.");

    setAnalyzingIds((prev) => [...prev, questionId]);
    const result = await analyzeResponse(questionText, answer, rule);
    setAiResults((prev) => ({ ...prev, [questionId]: result }));
    setAnalyzingIds((prev) => prev.filter((id) => id !== questionId));
  };

  const generateAndUploadPDF = async () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Plan de Cours - ${courseCode}`, 10, 15);
    doc.setFontSize(12);
    doc.text(`Enseignant: ${user.email}`, 10, 25);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 10, 32);
    doc.line(10, 35, 200, 35);

    let yPos = 45;
    activeTemplate.questions.forEach((q, idx) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 15;
      }
      doc.setFont("helvetica", "bold");
      doc.text(`Q${idx + 1}: ${q.text}`, 10, yPos);
      yPos += 7;
      doc.setFont("helvetica", "normal");
      const answerLines = doc.splitTextToSize(
        answers[q.id] || "Aucune réponse",
        190
      );
      doc.text(answerLines, 10, yPos);
      yPos += answerLines.length * 7 + 10;
    });

    const pdfBlob = doc.output("blob");
    const safeEmail = user.email.split("@")[0].replace(/[^a-z0-9]/gi, "_");
    const fileName = `${safeEmail}_${courseCode}_${Date.now()}.pdf`;
    const storageRef = ref(storage, `plans/${fileName}`);
    await uploadBytes(storageRef, pdfBlob);
    return await getDownloadURL(storageRef);
  };

  const handleSubmitPlan = async () => {
    if (!courseCode) return alert("Code cours manquant.");
    if (!activeTemplate) return alert("Aucun modèle sélectionné.");
    if (activeTemplate.questions.some((q) => !answers[q.id]))
      return alert("Répondez à toutes les questions.");

    setLoading(true);
    try {
      const pdfUrl = await generateAndUploadPDF();
      await addDoc(collection(db, "course_plans"), {
        teacherId: user.uid,
        teacherName: user.email,
        courseCode,
        templateId: activeTemplate.id,
        answers,
        aiAnalysis: aiResults,
        status: "submitted",
        pdfUrl,
        submittedAt: serverTimestamp(),
      });
      alert("Plan soumis !");
      setView("dashboard");
      setCourseCode("");
      setAnswers({});
      setAiResults({});
      fetchMyPlans();
    } catch (e) {
      console.error(e);
      alert("Erreur: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (templateId) => {
    const tpl = templates.find((t) => t.id === templateId) || null;
    setActiveTemplate(tpl);
    setAnswers({});
    setAiResults({});
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>Espace Enseignant - {user?.email}</div>
        <button
          onClick={logout}
          style={{
            ...styles.btnPrimary,
            backgroundColor: "#bf4545",
            padding: "8px 16px",
            fontSize: "12px",
          }}
        >
          Déconnexion
        </button>
      </header>

      <main style={styles.content}>
        {/* ----- DASHBOARD : LISTE DES PLANS ----- */}
        {view === "dashboard" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <h2 style={{ margin: 0, color: "#1E2617" }}>Mes Plans</h2>
              <button
                style={{
                  ...styles.btnPrimary,
                  opacity: templates.length > 0 ? 1 : 0.6,
                  cursor: templates.length > 0 ? "pointer" : "not-allowed",
                }}
                onClick={() =>
                  templates.length > 0
                    ? setView("create")
                    : alert("Aucun formulaire actif n'est disponible.")
                }
              >
                + Nouveau Plan
              </button>
            </div>

            <div style={styles.card}>
              {myPlans.length === 0 ? (
                <p style={{ textAlign: "center", color: "#666" }}>
                  Aucun plan.
                </p>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Code</th>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Statut</th>
                      <th style={styles.th}>Commentaire admin</th>
                      <th style={styles.th}>PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myPlans.map((p) => (
                      <tr key={p.id}>
                        <td style={styles.td}>
                          <strong>{p.courseCode}</strong>
                        </td>
                        <td style={styles.td}>
                          {p.submittedAt
                            ? new Date(
                                p.submittedAt.seconds * 1000
                              ).toLocaleDateString()
                            : "-"}
                        </td>
                        <td style={styles.td}>
                          <span style={styles.statusBadge(p.status)}>
                            {p.status}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {p.adminComment ? (
                            <span
                              style={{
                                fontSize: "13px",
                                color: "#9a3412",
                                background: "#FFFBEB",
                                borderRadius: "6px",
                                padding: "6px 8px",
                                display: "inline-block",
                              }}
                            >
                              {p.adminComment}
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: "12px",
                                color: "#6b7280",
                                fontStyle: "italic",
                              }}
                            >
                              {p.status === "correction"
                                ? "En attente de commentaire"
                                : "—"}
                            </span>
                          )}
                        </td>
                        <td style={styles.td}>
                          {p.pdfUrl ? (
                            <a
                              href={p.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                color: "#4B5A3B",
                                fontWeight: "bold",
                              }}
                            >
                              Voir PDF
                            </a>
                          ) : (
                            "..."
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ----- CREATION D'UN NOUVEAU PLAN ----- */}
        {view === "create" && activeTemplate && (
          <div>
            <button
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                marginBottom: "10px",
                color: "#666",
              }}
              onClick={() => setView("dashboard")}
            >
              ← Retour
            </button>

            <h2
              style={{
                color: "#4B5A3B",
                borderBottom: "2px solid #CDE47A",
                paddingBottom: "8px",
              }}
            >
              Nouveau Plan : {activeTemplate.title}
            </h2>

            <div style={styles.card}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Modèle de formulaire</label>
                <select
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                  }}
                  value={activeTemplate.id}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                >
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.title || `Formulaire ${tpl.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Code du cours</label>
                <input
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                  }}
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                />
              </div>

              <hr
                style={{ margin: "20px 0", borderTop: "1px solid #eee" }}
              />

              {activeTemplate.questions.map((q, idx) => (
                <div key={q.id} style={styles.inputGroup}>
                  <label style={styles.label}>
                    {idx + 1}. {q.text}
                  </label>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#7A8F55",
                      marginBottom: "6px",
                    }}
                  >
                    <em>Critère : {q.aiRule}</em>
                  </div>

                  <textarea
                    style={styles.textarea}
                    placeholder="Votre réponse..."
                    value={answers[q.id] || ""}
                    onChange={(e) =>
                      handleAnswerChange(q.id, e.target.value)
                    }
                  />

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      style={{
                        ...styles.btnAi,
                        opacity: analyzingIds.includes(q.id) ? 0.7 : 1,
                      }}
                      onClick={() =>
                        handleVerifyAI(q.id, q.text, q.aiRule)
                      }
                      disabled={analyzingIds.includes(q.id)}
                    >
                      {analyzingIds.includes(q.id)
                        ? "Analyse..."
                        : "✨ Vérifier avec l'IA"}
                    </button>
                  </div>

                  {aiResults[q.id] && (
                    <div
                      style={styles.aiFeedbackBox(
                        aiResults[q.id].status
                      )}
                    >
                      <div
                        style={{
                          fontWeight: "bold",
                          marginBottom: "8px",
                        }}
                      >
                        Statut : {aiResults[q.id].status}
                      </div>

                      {aiResults[q.id].points_positifs?.length > 0 && (
                        <div style={{ marginBottom: "8px" }}>
                          <strong style={{ color: "#166534" }}>
                            ✅ Points forts :
                          </strong>
                          <ul
                            style={{
                              margin: "4px 0 0 20px",
                              padding: 0,
                            }}
                          >
                            {aiResults[q.id].points_positifs.map(
                              (pt, i) => (
                                <li key={i}>{pt}</li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                      {aiResults[q.id].points_a_ameliorer?.length >
                        0 && (
                        <div style={{ marginBottom: "8px" }}>
                          <strong style={{ color: "#9a3412" }}>
                            ⚠️ À améliorer :
                          </strong>
                          <ul
                            style={{
                              margin: "4px 0 0 20px",
                              padding: 0,
                            }}
                          >
                            {aiResults[q.id].points_a_ameliorer.map(
                              (pt, i) => (
                                <li key={i}>{pt}</li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                      {aiResults[q.id].suggestion && (
                        <div
                          style={{
                            marginTop: "10px",
                            paddingTop: "10px",
                            borderTop: "1px dashed #ccc",
                          }}
                        >
                          <strong>💡 Suggestion :</strong>{" "}
                          {aiResults[q.id].suggestion}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <div
                style={{
                  marginTop: "32px",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  style={{
                    ...styles.btnPrimary,
                    opacity: loading ? 0.7 : 1,
                  }}
                  onClick={handleSubmitPlan}
                  disabled={loading}
                >
                  {loading
                    ? "Génération PDF & Envoi..."
                    : "Soumettre le plan"}
                </button>
              </div>
            </div>
          </div>
        )}

        {view === "create" && !activeTemplate && (
          <div style={styles.card}>
            <p>Aucun formulaire actif n’est disponible pour le moment.</p>
          </div>
        )}
      </main>
    </div>
  );
}
