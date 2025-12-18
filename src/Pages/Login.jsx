import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ReCAPTCHA from "react-google-recaptcha";

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

export default function Login() {
  const { loginGoogle, loginGithub, loginEmailPwd, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // ✅ reCAPTCHA v2 token (checkbox)
  const [captchaToken, setCaptchaToken] = useState(null);

  const styles = useMemo(
    () => ({
      wrapper: {
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: `linear-gradient(to bottom, ${THEME.bg1}, ${THEME.bg2})`,
        color: THEME.text,
        fontFamily: "sans-serif",
      },
      header: {
        height: 56,
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        fontWeight: 800,
        fontSize: 18,
        letterSpacing: 0.3,
      },
      centerZone: {
        flex: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
      },
      card: {
        width: "100%",
        maxWidth: 520,
        background: THEME.card,
        border: `1px solid ${THEME.border}`,
        borderRadius: 18,
        padding: "32px 36px 28px",
        boxShadow: "0 22px 55px rgba(0,0,0,0.45)",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        backdropFilter: "blur(6px)",
      },
      title: {
        textAlign: "center",
        fontSize: 28,
        fontWeight: 900,
        margin: "0 0 8px 0",
      },
      subtitle: {
        textAlign: "center",
        fontSize: 14,
        marginBottom: 18,
        color: THEME.muted,
        lineHeight: 1.5,
      },
      error: {
        backgroundColor: "rgba(255, 107, 107, 0.12)",
        border: `1px solid ${THEME.danger}`,
        color: THEME.danger,
        padding: 10,
        borderRadius: 10,
        marginBottom: 14,
        fontSize: 13,
        textAlign: "center",
      },
      label: {
        display: "block",
        fontSize: 14,
        marginBottom: 6,
        fontWeight: 700,
        textAlign: "left",
      },
      input: {
        width: "100%",
        borderRadius: 10,
        border: `1px solid ${THEME.border}`,
        backgroundColor: "rgba(255,255,255,0.06)",
        padding: "12px 14px",
        fontSize: 14,
        color: THEME.text,
        marginBottom: 16,
        boxSizing: "border-box",
        outline: "none",
      },
      primaryBtn: {
        width: "100%",
        borderRadius: 999,
        border: `1px solid ${THEME.border}`,
        marginTop: 6,
        padding: "12px 16px",
        fontSize: 14,
        fontWeight: 900,
        background: `linear-gradient(to right, ${THEME.accent1}, ${THEME.accent2})`,
        color: THEME.text,
        cursor: "pointer",
      },
      socialBtn: {
        width: "100%",
        borderRadius: 999,
        border: `1px solid ${THEME.border}`,
        marginTop: 12,
        padding: "12px 16px",
        fontSize: 14,
        fontWeight: 900,
        cursor: "pointer",
        backgroundColor: "rgba(255,255,255,0.06)",
        color: THEME.text,
        boxSizing: "border-box",
      },
      divider: {
        display: "flex",
        alignItems: "center",
        margin: "18px 0 10px 0",
        color: THEME.muted,
        fontSize: 12,
        width: "100%",
      },
      line: { flex: 1, height: 1, backgroundColor: THEME.border },
      signupBtn: {
        width: "100%",
        borderRadius: 999,
        border: `1px solid ${THEME.border}`,
        marginTop: 10,
        padding: "12px 16px",
        fontSize: 14,
        fontWeight: 900,
        cursor: "pointer",
        backgroundColor: "rgba(255,255,255,0.06)",
        color: THEME.text,
        boxSizing: "border-box",
      },
      footerText: {
        marginTop: 18,
        textAlign: "center",
        fontSize: 12,
        color: THEME.muted,
        lineHeight: 1.45,
      },

      // ✅ petit wrapper pour le captcha (sans toucher au design global)
      captchaWrap: {
        marginTop: 10,
        marginBottom: 2,
        display: "flex",
        justifyContent: "center",
      },
    }),
    []
  );

  useEffect(() => {
    if (user) navigate("/teacher", { replace: true });
  }, [user, navigate]);

  // google
  const handleGoogle = async () => {
    setError("");
    try {
      await loginGoogle();
    } catch (err) {
      console.error(err);
      setError("Erreur de connexion Google.");
    }
  };

  // github
  const handleGithub = async () => {
    setError("");
    try {
      await loginGithub();
    } catch (err) {
      console.error(err);
      setError("Erreur de connexion Github.");
    }
  };

  const handleEmailLogin = async () => {
    setError("");

    //recaptcha
    if (!captchaToken) {
      setError("Veuillez confirmer que vous n’êtes pas un robot.");
      return;
    }

    try {
      
      const url =
        import.meta.env.VITE_RECAPTCHA_VERIFY_URL ||
        "https://us-central1-examenappweb2.cloudfunctions.net/verifyRecaptcha";

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: captchaToken }),
      });

      const data = await res.json();

      if (!data?.success) {
        setError("reCAPTCHA invalide. Réessaie.");
        return;
      }

    
      await loginEmailPwd(email, password);

     
      setCaptchaToken(null);
    } catch (err) {
      console.error(err);
      setError("Échec de connexion. Vérifiez vos identifiants.");
    }
  };

  return (
    <div style={styles.wrapper}>
      <header style={styles.header}>AI Grammar</header>

      <div style={styles.centerZone}>
        <div style={styles.card}>
          <h1 style={styles.title}>Connexion</h1>
          <p style={styles.subtitle}>Connecte-toi pour accéder à ton espace.</p>

          {error && <div style={styles.error}>{error}</div>}

          <label style={styles.label}>Courriel</label>
          <input
            style={styles.input}
            placeholder="votre@courriel.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label style={styles.label}>Mot de passe</label>
          <input
            style={styles.input}
            placeholder="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* ✅ Checkbox "Je ne suis pas un robot" */}
          <div style={styles.captchaWrap}>
            <ReCAPTCHA
              sitekey={import.meta.env.VITE_RECAPTCHA_V2_SITE_KEY}
              onChange={(token) => setCaptchaToken(token)}
              onExpired={() => setCaptchaToken(null)}
            />
          </div>

          <button style={styles.primaryBtn} onClick={handleEmailLogin}>
            Se connecter
          </button>

          <button style={styles.socialBtn} onClick={handleGoogle}>
            Continuer avec Google
          </button>

          <button style={styles.socialBtn} onClick={handleGithub}>
            Continuer avec GitHub
          </button>

          <div style={styles.divider}>
            <div style={styles.line} />
            <span style={{ padding: "0 10px" }}>ou</span>
            <div style={styles.line} />
          </div>

          <button style={styles.signupBtn} onClick={() => navigate("/signup")}>
            Créer un compte
          </button>

          <p style={styles.footerText}>
            Chaque utilisateur voit uniquement ses propres informations.
          </p>
        </div>
      </div>
    </div>
  );
}
