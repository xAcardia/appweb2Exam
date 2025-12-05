import { useEffect, useState } from "react";
import { db } from "../firebase.js";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
} from "firebase/firestore";

const styles = {
  card: {
    backgroundColor: "#1E2617",
    borderRadius: "12px",
    padding: "16px",
    boxShadow: "0 8px 25px rgba(0,0,0,0.45)",
    color: "#F9FAF5",
    height: "100%",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "0.8fr 1.4fr",
    gap: "10px",
    marginTop: "8px",
    height: "100%",
  },
  list: {
    borderRight: "1px solid #374151",
    paddingRight: "8px",
    overflowY: "auto",
  },
  item: (active) => ({
    padding: "6px 8px",
    borderRadius: "8px",
    border: active ? "1px solid #9DBF3B" : "1px solid #374151",
    backgroundColor: active ? "#111827" : "#111827",
    marginBottom: "6px",
    cursor: "pointer",
    fontSize: "13px",
  }),
  smallLabel: { fontSize: "12px", color: "#D1D5C0" },
  right: {
    overflowY: "auto",
    paddingLeft: "4px",
  },
  answerBlock: {
    borderTop: "1px solid #374151",
    paddingTop: "6px",
    marginTop: "6px",
    fontSize: "13px",
  },
  actions: {
    marginTop: "10px",
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  btn: {
    padding: "6px 10px",
    borderRadius: "999px",
    border: "none",
    backgroundColor: "#e5e7eb",
    fontSize: "12px",
    cursor: "pointer",
    color: "#111827",
  },
  approve: {
    backgroundColor: "#16a34a",
    color: "#fff",
  },
  correct: {
    backgroundColor: "#f97316",
    color: "#fff",
  },
};

export default function PlanTable() {
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "plans"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPlans(list);
      if (!selected && list.length) setSelected(list[0]);
    });
    return () => unsub();
  }, [selected]);

  const updateStatus = async (status) => {
    if (!selected) return;
    await updateDoc(doc(db, "plans", selected.id), { status });
    alert("Statut mis à jour.");
  };

  return (
    <div style={styles.card}>
      <h3 style={{ marginTop: 0 }}>Plans soumis</h3>

      <div style={styles.layout}>
        <div style={styles.list}>
          {plans.map((p) => (
            <div
              key={p.id}
              style={styles.item(selected?.id === p.id)}
              onClick={() => setSelected(p)}
            >
              <div>{p.formTitle || "Plan de cours"}</div>
              <div style={styles.smallLabel}>
                {p.teacherName || p.teacherEmail} • {p.status}
              </div>
            </div>
          ))}
          {plans.length === 0 && (
            <div style={{ fontSize: "13px", color: "#D1D5C0" }}>
              Aucun plan soumis pour l’instant.
            </div>
          )}
        </div>

        <div style={styles.right}>
          {selected ? (
            <>
              <p style={{ margin: "0 0 4px 0" }}>
                <strong>Enseignant :</strong> {selected.teacherName} (
                {selected.teacherEmail})
              </p>
              <p style={{ margin: "0 0 8px 0" }}>
                <strong>Statut :</strong> {selected.status}
              </p>

              {(selected.answers || []).map((a, i) => (
                <div key={i} style={styles.answerBlock}>
                  <p style={{ margin: 0 }}>
                    <strong>
                      Q{i + 1}. {a.question}
                    </strong>
                  </p>
                  <p style={{ margin: "4px 0" }}>
                    <em>Réponse :</em> {a.answer}
                  </p>
                  {a.ai && (
                    <p style={{ margin: "4px 0" }}>
                      <strong>Commentaire IA :</strong> {a.ai}
                    </p>
                  )}
                </div>
              ))}

              <div style={styles.actions}>
                <button
                  style={{ ...styles.btn, ...styles.correct }}
                  onClick={() => updateStatus("À corriger")}
                >
                  Demander des corrections
                </button>
                <button
                  style={{ ...styles.btn, ...styles.approve }}
                  onClick={() => updateStatus("Approuvé")}
                >
                  Approuver
                </button>
              </div>
            </>
          ) : (
            <div style={{ fontSize: "13px", color: "#D1D5C0" }}>
              Sélectionnez un plan dans la liste.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
