import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  deleteDoc,
} from "firebase/firestore";

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
  nav: {
    display: "flex",
    gap: "10px",
    padding: "20px 24px",
    background: "#fff",

  },
  tabBtn: (active) => ({
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: "600",
    backgroundColor: active ? "#4B5A3B" : "#E2ECCE",
    color: active ? "#fff" : "#28311F",
  }),
  content: {
    padding: "24px",
    maxWidth: "1200px",
    margin: "0 auto",
    width: "100%",
  },
  card: {
    background: "white",
    padding: "24px",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    marginBottom: "24px",
  },
  inputGroup: {
    marginBottom: "16px",
  },
  label: {
    display: "block",
    marginBottom: "6px",
    fontWeight: "bold",
    fontSize: "14px",
  },
  input: {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    boxSizing: "border-box",
  },
  btnAction: {
    backgroundColor: "#7A8F55",
    color: "white",
    border: "none",
    padding: "10px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
  },
  btnSave: {
    backgroundColor: "#6A8E48",
    color: "white",
    border: "none",
    padding: "12px",
    width: "100%",
    fontSize: "16px",
    fontWeight: "bold",
    borderRadius: "6px",
    cursor: "pointer",
    marginTop: "20px",
  },
  btnDelete: {
    backgroundColor: "#bf4545",
    color: "white",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
  },
  statusBadge: (status) => {
    let color = "#999";
    let bg = "#eee";
    if (status === "approved") {
      color = "#166534";
      bg = "#dcfce7";
    }
    if (status === "correction") {
      color = "#9a3412";
      bg = "#ffedd5";
    }
    if (status === "submitted") {
      color = "#1e40af";
      bg = "#dbeafe";
    }
    return {
      padding: "4px 10px",
      borderRadius: "99px",
      color,
      backgroundColor: bg,
      fontSize: "12px",
      fontWeight: "bold",
      textTransform: "uppercase",
    };
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "16px",
  },
  th: {
    textAlign: "left",
    padding: "12px",
    borderBottom: "2px solid #ddd",
    color: "#4B5A3B",
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid #eee",
  },
};

export default function Admin() {
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState("forms");

  // Formulaires
  const [formTitle, setFormTitle] = useState("");
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentAiRule, setCurrentAiRule] = useState("");
  const [existingForms, setExistingForms] = useState([]);
  const [loading, setLoading] = useState(false);

  // Plans
  const [submittedPlans, setSubmittedPlans] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [teacherFilter, setTeacherFilter] = useState("all");
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    fetchForms();
    fetchPlans();
  }, []);

  // -------- FORMS --------

  const fetchForms = async () => {
    try {
      const q = query(collection(db, "form_templates"));
      const snapshot = await getDocs(q);
      setExistingForms(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    } catch (e) {
      console.error("Erreur fetch forms:", e);
    }
  };

  // -------- PLANS --------

  const fetchPlans = async () => {
    try {
      const q = query(collection(db, "course_plans"));
      const snapshot = await getDocs(q);
      const plans = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      plans.sort(
        (a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0)
      );
      setSubmittedPlans(plans);

      // garder le plan sélectionné à jour si toujours présent
      if (selectedPlan) {
        const found = plans.find((p) => p.id === selectedPlan.id);
        setSelectedPlan(found || null);
      }
    } catch (e) {
      console.error("Erreur fetch plans:", e);
    }
  };

  // -------- CREATION FORMULAIRE --------

  const addQuestion = () => {
    if (!currentQuestion || !currentAiRule) {
      return alert("Remplissez la question et la règle IA");
    }
    setQuestions((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: currentQuestion,
        aiRule: currentAiRule,
      },
    ]);
    setCurrentQuestion("");
    setCurrentAiRule("");
  };

  const removeQuestion = (id) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const saveFormTemplate = async () => {
    if (!formTitle) return alert("Veuillez donner un titre au formulaire.");
    if (questions.length < 1) return alert("Ajoutez au moins une question.");

    setLoading(true);
    try {
      await addDoc(collection(db, "form_templates"), {
        title: formTitle,
        questions,
        active: true,
        createdAt: new Date(),
      });

      alert("✅ Modèle sauvegardé avec succès !");
      setFormTitle("");
      setQuestions([]);
      fetchForms();
    } catch (e) {
      console.error("Erreur lors de la sauvegarde :", e);
      alert("Erreur technique : " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleFormActive = async (formId, currentStatus) => {
    const ref = doc(db, "form_templates", formId);
    await updateDoc(ref, { active: !currentStatus });
    fetchForms();
  };

  const deleteForm = async (formId) => {
    if (confirm("Voulez-vous vraiment supprimer ce formulaire ?")) {
      await deleteDoc(doc(db, "form_templates", formId));
      fetchForms();
    }
  };

  // -------- ACTIONS PLANS --------

  const handleApprove = async (planId) => {
    const ref = doc(db, "course_plans", planId);
    await updateDoc(ref, { status: "approved" });
    fetchPlans();
  };

  const handleRequestCorrection = async (planId) => {
    const comment = prompt("Commentaires pour l'enseignant :");
    if (comment) {
      const ref = doc(db, "course_plans", planId);
      await updateDoc(ref, { status: "correction", adminComment: comment });
      fetchPlans();
    }
  };

  // -------- RENDU --------

  // liste des enseignants distincts pour le filtre
  const teacherOptions = Array.from(
    new Set(
      submittedPlans.map(
        (p) => p.teacherName || p.teacherId || "Enseignant inconnu"
      )
    )
  );

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={{ fontWeight: "bold", fontSize: "20px" }}>
          Admin Dashboard
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <span style={{ fontSize: "14px" }}>{user?.email}</span>
          <button
            onClick={logout}
            style={{
              ...styles.btnAction,
              backgroundColor: "#bf4545",
              fontSize: "12px",
            }}
          >
            Déconnexion
          </button>
        </div>
      </header>

      <nav style={styles.nav}>
        <button
          style={styles.tabBtn(activeTab === "forms")}
          onClick={() => setActiveTab("forms")}
        >
          Gestion des Formulaires
        </button>
        <button
          style={styles.tabBtn(activeTab === "plans")}
          onClick={() => setActiveTab("plans")}
        >
          Validation des Plans
        </button>
      </nav>

      <main style={styles.content}>
        {/* -------- ONGLET FORMULAIRES -------- */}
        {activeTab === "forms" && (
          <div>
            <div style={styles.card}>
              <h2 style={{ marginTop: 0, color: "#4B5A3B" }}>
                Créer un nouveau modèle
              </h2>
              <p
                style={{
                  fontSize: "14px",
                  color: "#666",
                  marginBottom: "20px",
                }}
              >
                Définissez les questions et les règles IA pour les enseignants.
              </p>

              <div style={styles.inputGroup}>
                <label style={styles.label}>
                  Titre du formulaire
                </label>
                <input
                  style={styles.input}
                  placeholder="Entrez le titre..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              <div
                style={{
                  background: "#F0F4E8",
                  padding: "20px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  border: "1px solid #CDE47A",
                }}
              >
                <h3
                  style={{ marginTop: 0, fontSize: "16px", color: "#28311F" }}
                >
                  Ajouter une question
                </h3>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Question</label>
                  <input
                    style={styles.input}
                    placeholder=""
                    value={currentQuestion}
                    onChange={(e) => setCurrentQuestion(e.target.value)}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>
                    Règle de validation pour l&apos;IA
                  </label>
                  <textarea
                    style={{
                      ...styles.input,
                      minHeight: "80px",
                      fontFamily: "sans-serif",
                    }}
                    placeholder="Le prompt..."
                    value={currentAiRule}
                    onChange={(e) => setCurrentAiRule(e.target.value)}
                  />
                </div>
                <button style={styles.btnAction} onClick={addQuestion}>
                  + Ajouter la question
                </button>
              </div>

              {questions.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <h4
                    style={{
                      borderBottom: "1px solid #eee",
                      paddingBottom: "10px",
                    }}
                  >
                    Questions configurées ({questions.length})
                  </h4>
                  {questions.map((q, idx) => (
                    <div
                      key={q.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderBottom: "1px solid #eee",
                        padding: "12px 0",
                      }}
                    >
                      <div>
                        <strong style={{ color: "#28311F" }}>
                          Q{idx + 1}: {q.text}
                        </strong>
                        <br />
                        <span
                          style={{
                            color: "#555",
                            fontSize: "13px",
                            fontStyle: "italic",
                          }}
                        >
                          🤖 Règle IA: {q.aiRule}
                        </span>
                      </div>
                      <button
                        style={styles.btnDelete}
                        onClick={() => removeQuestion(q.id)}
                      >
                        Retirer
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                style={{ ...styles.btnSave, opacity: loading ? 0.7 : 1 }}
                onClick={saveFormTemplate}
                disabled={loading}
              >
                {loading ? "Enregistrement..." : "Sauvegarder le modèle"}
              </button>
            </div>

            <h3 style={{ marginTop: "32px", color: "#4B5A3B" }}>
              Modèles existants
            </h3>
            {existingForms.length === 0 && (
              <p>Aucun modèle créé pour l&apos;instant.</p>
            )}

            {existingForms.map((form) => (
              <div
                key={form.id}
                style={{
                  ...styles.card,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "15px",
                }}
              >
                <div>
                  <strong style={{ fontSize: "16px" }}>{form.title}</strong>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#666",
                      marginTop: "4px",
                    }}
                  >
                    {form.questions?.length || 0} questions • Créé le{" "}
                    {form.createdAt
                      ? new Date(
                          form.createdAt.seconds * 1000
                        ).toLocaleDateString()
                      : "-"}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      backgroundColor: form.active ? "#dcfce7" : "#fee2e2",
                      color: form.active ? "#166534" : "#991b1b",
                    }}
                  >
                    {form.active ? "ACTIF" : "INACTIF"}
                  </span>

                  <button
                    onClick={() => toggleFormActive(form.id, form.active)}
                    style={{
                      ...styles.btnAction,
                      backgroundColor: "transparent",
                      border: "1px solid #7A8F55",
                      color: "#7A8F55",
                    }}
                  >
                    {form.active ? "Désactiver" : "Activer"}
                  </button>

                  <button
                    onClick={() => deleteForm(form.id)}
                    style={styles.btnDelete}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* -------- ONGLET PLANS -------- */}
        {activeTab === "plans" && (
          <div>
            {/* Filtres */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                marginBottom: "20px",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "14px", fontWeight: "600" }}>
                Filtrer par statut :
              </span>
              <button
                onClick={() => setFilterStatus("all")}
                style={styles.btnAction}
              >
                Tout voir
              </button>
              <button
                onClick={() => setFilterStatus("submitted")}
                style={{ ...styles.btnAction, background: "#1e40af" }}
              >
                Soumis
              </button>
              <button
                onClick={() => setFilterStatus("correction")}
                style={{ ...styles.btnAction, background: "#9a3412" }}
              >
                À corriger
              </button>
              <button
                onClick={() => setFilterStatus("approved")}
                style={{ ...styles.btnAction, background: "#166534" }}
              >
                Approuvés
              </button>

              {/* Filtre enseignant */}
              <div style={{ marginLeft: "auto", minWidth: "220px" }}>
                <label
                  style={{
                    ...styles.label,
                    marginBottom: "4px",
                    fontWeight: "600",
                    fontSize: "13px",
                  }}
                >
                  Enseignant :
                </label>
                <select
                  value={teacherFilter}
                  onChange={(e) => setTeacherFilter(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                    fontSize: "13px",
                  }}
                >
                  <option value="all">Tous les enseignants</option>
                  {teacherOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tableau des plans */}
            <div style={styles.card}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Enseignant</th>
                    <th style={styles.th}>Cours</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Statut</th>
                    <th style={styles.th}>PDF</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submittedPlans
                    .filter(
                      (p) => filterStatus === "all" || p.status === filterStatus
                    )
                    .filter((p) => {
                      const teacherName =
                        p.teacherName || p.teacherId || "Enseignant inconnu";
                      return (
                        teacherFilter === "all" ||
                        teacherName === teacherFilter
                      );
                    })
                    .map((plan) => (
                      <tr key={plan.id}>
                        <td style={styles.td}>
                          {plan.teacherName || plan.teacherId || "Inconnu"}
                        </td>
                        <td style={styles.td}>
                          <strong>{plan.courseCode}</strong>
                        </td>
                        <td style={styles.td}>
                          {plan.submittedAt
                            ? new Date(
                                plan.submittedAt.seconds * 1000
                              ).toLocaleDateString()
                            : "-"}
                        </td>
                        <td style={styles.td}>
                          <span style={styles.statusBadge(plan.status)}>
                            {plan.status === "approved"
                              ? "Approuvé"
                              : plan.status === "correction"
                              ? "À corriger"
                              : "Soumis"}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {plan.pdfUrl ? (
                            <a
                              href={plan.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                color: "#1e40af",
                                textDecoration: "underline",
                                fontSize: "14px",
                              }}
                            >
                              Voir le PDF
                            </a>
                          ) : (
                            <span
                              style={{ color: "#999", fontSize: "12px" }}
                            >
                              Non généré
                            </span>
                          )}
                        </td>
                        <td style={styles.td}>
                          <div
                            style={{
                              display: "flex",
                              gap: "6px",
                              flexWrap: "wrap",
                            }}
                          >
                            {/* Résultats IA */}
                            <button
                              onClick={() =>
                                setSelectedPlan((prev) =>
                                  prev?.id === plan.id ? null : plan
                                )
                              }
                              style={{
                                ...styles.btnAction,
                                backgroundColor: "#CDE47A",
                                color: "#1E2617",
                                padding: "6px 10px",
                              }}
                              title="Consulter les résultats IA"
                            >
                              Résultats IA
                            </button>

                            {/* Validation / correction */}
                            {plan.status !== "approved" && (
                              <>
                                <button
                                  onClick={() => handleApprove(plan.id)}
                                  style={{
                                    ...styles.btnAction,
                                    background: "#166534",
                                    padding: "6px 10px",
                                    fontSize: "12px",
                                  }}
                                  title="Valider ce plan"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() =>
                                    handleRequestCorrection(plan.id)
                                  }
                                  style={{
                                    ...styles.btnAction,
                                    background: "#9a3412",
                                    padding: "6px 10px",
                                    fontSize: "12px",
                                  }}
                                  title="Demander des corrections"
                                >
                                  ✎
                                </button>
                              </>
                            )}
                            {plan.status === "approved" && (
                              <span
                                style={{ color: "#166534", fontSize: "12px" }}
                              >
                                Validé
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  {submittedPlans.length === 0 && (
                    <tr>
                      <td
                        colSpan="6"
                        style={{
                          padding: "30px",
                          textAlign: "center",
                          color: "#888",
                        }}
                      >
                        Aucun plan à valider pour le moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Détails IA pour le plan sélectionné */}
            {selectedPlan && (
              <div style={styles.card}>
                <h3 style={{ marginTop: 0, color: "#4B5A3B" }}>
                  Résultats de validation IA
                </h3>
                <p style={{ fontSize: "14px", color: "#555" }}>
                  <strong>Enseignant :</strong>{" "}
                  {selectedPlan.teacherName || selectedPlan.teacherId}
                  <br />
                  <strong>Cours :</strong> {selectedPlan.courseCode}
                  <br />
                  <strong>Date de soumission :</strong>{" "}
                  {selectedPlan.submittedAt
                    ? new Date(
                        selectedPlan.submittedAt.seconds * 1000
                      ).toLocaleString()
                    : "-"}
                  <br />
                  {selectedPlan.adminComment && (
                    <>
                      <strong>Commentaire admin :</strong>{" "}
                      <span style={{ color: "#9a3412" }}>
                        {selectedPlan.adminComment}
                      </span>
                    </>
                  )}
                </p>

                {selectedPlan.aiAnalysis &&
                Object.keys(selectedPlan.aiAnalysis).length > 0 ? (
                  Object.entries(selectedPlan.aiAnalysis).map(
                    ([qId, result], index) => (
                      <div
                        key={qId}
                        style={{
                          borderTop: "1px solid #eee",
                          paddingTop: "12px",
                          marginTop: "12px",
                        }}
                      >
                        <h4
                          style={{
                            margin: 0,
                            marginBottom: "4px",
                            color: "#28311F",
                          }}
                        >
                          Question {index + 1}
                        </h4>

                        {selectedPlan.answers &&
                          selectedPlan.answers[qId] && (
                            <p
                              style={{
                                fontSize: "14px",
                                background: "#F9FAF5",
                                padding: "8px",
                                borderRadius: "6px",
                                border: "1px solid #E2ECCE",
                              }}
                            >
                              <strong>Réponse :</strong>{" "}
                              {selectedPlan.answers[qId]}
                            </p>
                          )}

                        <p style={{ fontSize: "14px" }}>
                          <strong>Statut :</strong>{" "}
                          {result.status || "Non disponible"}
                        </p>

                        {result.points_positifs &&
                          result.points_positifs.length > 0 && (
                            <div style={{ fontSize: "13px" }}>
                              <strong>Points positifs :</strong>
                              <ul>
                                {result.points_positifs.map((p, i) => (
                                  <li key={i}>{p}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                        {result.points_a_ameliorer &&
                          result.points_a_ameliorer.length > 0 && (
                            <div style={{ fontSize: "13px" }}>
                              <strong>Points à améliorer :</strong>
                              <ul>
                                {result.points_a_ameliorer.map((p, i) => (
                                  <li key={i}>{p}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                        {result.suggestion && (
                          <p style={{ fontSize: "13px" }}>
                            <strong>💡 Suggestion :</strong>{" "}
                            {result.suggestion}
                          </p>
                        )}
                      </div>
                    )
                  )
                ) : (
                  <p style={{ fontSize: "14px", color: "#777" }}>
                    Aucune analyse IA enregistrée pour ce plan.
                  </p>
                )}

                <div style={{ marginTop: "16px", textAlign: "right" }}>
                  <button
                    onClick={() => setSelectedPlan(null)}
                    style={{
                      ...styles.btnAction,
                      backgroundColor: "#E2ECCE",
                      color: "#28311F",
                    }}
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
