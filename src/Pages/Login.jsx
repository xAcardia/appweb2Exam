import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "linear-gradient(to bottom, #28311F, #7A8F55)",
    color: "#F9FAF5",
    fontFamily: "sans-serif",
  },
  header: {
    height: "56px",
    display: "flex",
    alignItems: "center",
    padding: "0 24px",
    fontWeight: 600,
    fontSize: "18px",
    color: "#CDE47A",
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
  subtitle: {
    textAlign: "center",
    fontSize: "14px",
    marginBottom: "20px",
    color: "#D7E6B4",
  },
  roleBox: {
    display: "flex",
    backgroundColor: "#1E2617",
    padding: "6px",
    borderRadius: "999px",
    marginBottom: "24px",
  },
  roleBtn: (active) => ({
    flex: 1,
    textAlign: "center",
    padding: "8px 4px",
    borderRadius: "999px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 500,
    backgroundColor: active ? "#CDE47A" : "transparent",
    color: active ? "#1E2617" : "#E6F3C2",
    transition: "all 0.2s ease",
  }),
  label: {
    display: "block",
    fontSize: "14px",
    marginBottom: "6px",
    color: "#E2ECCE",
    fontWeight: 500,
    textAlign: "left",
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
    marginTop: "8px",
    padding: "12px 16px",
    fontSize: "14px",
    fontWeight: 600,
    backgroundColor: "#4B5A3B",
    color: "#F9FAF5",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  googleBtn: {
    width: "100%",
    borderRadius: "999px",
    border: "1px solid #CDE47A",
    marginTop: "14px",
    padding: "12px 16px",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
    backgroundColor: "#CDE47A",
    color: "#1E2617",
    boxSizing: "border-box",
  },
  signupBtn: {
    width: "100%",
    borderRadius: "999px",
    border: "2px solid #7A8F55",
    marginTop: "14px",
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    backgroundColor: "transparent",
    color: "#E6F3C2",
    boxSizing: "border-box",
    transition: "all 0.2s",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    margin: "20px 0 10px 0",
    color: "#8FA375",
    fontSize: "12px",
    width: "100%",
  },
  line: {
    flex: 1,
    height: "1px",
    backgroundColor: "#4B5A3B",
  },
  footerText: {
    marginTop: "24px",
    textAlign: "center",
    fontSize: "12px",
    color: "#8FA375",
    lineHeight: "1.4",
  },
};

function Login() {
  const { loginGoogle, loginEmailPwd, user, role } = useAuth();
  const navigate = useNavigate();

  const [chosenRole, setChosenRole] = useState("teacher");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    if (role === "admin") navigate("/admin", { replace: true });
    else navigate("/teacher", { replace: true });
  }, [user, role, navigate]);

  
  useEffect(() => {
    setEmail("");
    setPassword("");
    setError("");
  }, [chosenRole]);
 

  const handleGoogle = async () => {
    try {
      await loginGoogle();
    } catch (err) {
      console.error(err);
      setError("Erreur de connexion Google.");
    }
  };

  const handleEmailLogin = async () => {
    setError("");
    try {
      await loginEmailPwd(email, password);
    } catch (err) {
      console.error(err);
      setError("Échec de connexion. Vérifiez vos identifiants.");
    }
  };

  const handleGoToSignup = () => {
    navigate("/signup");
  };

  return (
    <div style={styles.wrapper}>
      <header style={styles.header}>PlanValidator</header>

      <div style={styles.centerZone}>
        <div style={styles.card}>
          <h1 style={styles.title}>Heureux de vous revoir !</h1>
          <p style={styles.subtitle}>
            Choisissez votre rôle puis connectez-vous.
          </p>

          <div style={styles.roleBox}>
            <div
              style={styles.roleBtn(chosenRole === "teacher")}
              onClick={() => setChosenRole("teacher")}
            >
              Enseignant
            </div>
            <div
              style={styles.roleBtn(chosenRole === "admin")}
              onClick={() => setChosenRole("admin")}
            >
              Administrateur
            </div>
          </div>

          {error && (
            <div style={{ color: "#ff6b6b", marginBottom: "12px", fontSize: "14px", textAlign: "center" }}>
              {error}
            </div>
          )}

          <label style={styles.label}>Courriel :</label>
          <input
            style={styles.input}
            placeholder="Entrez votre courriel"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label style={styles.label}>Mot de passe :</label>
          <input
            style={styles.input}
            placeholder="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button style={styles.activeBtn} onClick={handleEmailLogin}>
            Se connecter
          </button>

          {/* Bouton Google uniquement pour les enseignants */}
          {chosenRole === "teacher" && (
            <button style={styles.googleBtn} onClick={handleGoogle}>
              Se connecter avec Google
            </button>
          )}

          {/* Section inscription */}
          <div style={styles.divider}>
            <div style={styles.line}></div>
            <span style={{ padding: "0 10px" }}>ou</span>
            <div style={styles.line}></div>
          </div>

          <button style={styles.signupBtn} onClick={handleGoToSignup}>
            Créer un compte
          </button>

          <p style={styles.footerText}>
            Accès réservé aux enseignants et à l&apos;administrateur du
            département.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;