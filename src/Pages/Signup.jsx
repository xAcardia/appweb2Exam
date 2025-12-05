import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { registerWithEmailPassword, db } from "../firebase"; 
import { doc, setDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext"; 

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "linear-gradient(to bottom, #28311F, #7A8F55)",
    color: "#F9FAF5",
    fontFamily: "sans-serif",
  },
  centerZone: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "16px",
  },
  card: {
    width: "100%",
    maxWidth: "480px",
    background: "rgba(32, 40, 25, 0.94)",
    borderRadius: "18px",
    padding: "32px 36px 28px",
    boxShadow: "0 22px 55px rgba(0,0,0,0.45)",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
  },
  title: {
    textAlign: "center",
    fontSize: "28px",
    fontWeight: 700,
    marginBottom: "8px",
    marginTop: 0,
    color: "#E6F3C2",
  },
  input: {
    width: "100%",
    borderRadius: "8px",
    border: "1px solid #4B5A3B",
    backgroundColor: "#F9FAF5",
    padding: "12px 14px",
    fontSize: "14px",
    color: "#233018",
    marginBottom: "18px",
    boxSizing: "border-box",
    outline: "none",
  },
  activeBtn: {
    width: "100%",
    borderRadius: "999px",
    border: "none",
    marginTop: "12px",
    padding: "12px 16px",
    fontSize: "14px",
    fontWeight: 600,
    backgroundColor: "#4B5A3B",
    color: "#F9FAF5",
    cursor: "pointer",
  },
  linkBtn: {
    background: "none",
    border: "none",
    color: "#CDE47A",
    textDecoration: "underline",
    cursor: "pointer",
    fontSize: "14px",
    marginTop: "16px",
  },
  errorBox: {
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    border: "1px solid #ff6b6b",
    color: "#ff6b6b",
    padding: "10px",
    borderRadius: "8px",
    marginBottom: "16px",
    fontSize: "13px",
    textAlign: "center",
  }
};

export default function Signup() {
  const navigate = useNavigate();
 
  const { user } = useAuth(); 
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    if (user) {
      navigate("/teacher", { replace: true });
    }
  }, [user, navigate]);
 

  const handleSignup = async () => {
    setError("");

    if (!email || !password || !confirmPassword) {
      return setError("Veuillez remplir tous les champs.");
    }
    if (password !== confirmPassword) {
      return setError("Les mots de passe ne correspondent pas.");
    }
    if (password.length < 6) {
      return setError("Le mot de passe doit contenir au moins 6 caractères.");
    }

    setLoading(true);

    try {
      const userCredential = await registerWithEmailPassword(email, password);
      const newUser = userCredential.user;

   
      await setDoc(doc(db, "users", newUser.uid), {
        email: newUser.email,
        role: "teacher", 
        createdAt: new Date()
      });

  
      navigate("/teacher");

    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("Cet email est déjà utilisé.");
      } else if (err.code === "auth/weak-password") {
        setError("Le mot de passe est trop faible.");
      } else {
        setError("Une erreur est survenue : " + err.message);
      }
      setLoading(false); 
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.centerZone}>
        <div style={styles.card}>
          <h1 style={styles.title}>Créer un compte</h1>
          
          {error && <div style={styles.errorBox}>{error}</div>}

          <label style={{color: "#E2ECCE", marginBottom: "6px", fontSize: "14px"}}>Courriel :</label>
          <input
            style={styles.input}
            placeholder="votre@courriel.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label style={{color: "#E2ECCE", marginBottom: "6px", fontSize: "14px"}}>Mot de passe :</label>
          <input
            style={styles.input}
            placeholder="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <label style={{color: "#E2ECCE", marginBottom: "6px", fontSize: "14px"}}>Confirmer :</label>
          <input
            style={styles.input}
            placeholder="Confirmer le mot de passe"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <button 
            style={{...styles.activeBtn, opacity: loading ? 0.7 : 1}} 
            onClick={handleSignup}
            disabled={loading}
          >
            {loading ? "Création en cours..." : "S'inscrire"}
          </button>

          <div style={{ textAlign: "center", marginTop: "10px" }}>
            <button style={styles.linkBtn} onClick={() => navigate("/login")}>
              Retour à la connexion
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}