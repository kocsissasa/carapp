import { useEffect, useState } from "react";
import api from "../api/axios";

type LoginRes = { token: string };

export default function Login() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string>("");
  const [ok, setOk] = useState<string>("");

  useEffect(() => {
    setError("");
    setOk("");
  }, [tab]);

  const login = async () => {
    try {
      const { data } = await api.post<LoginRes>("/api/auth/login", { email, password });
      localStorage.setItem("token", data.token);
      setOk("Sikeres bejelentkezés!");
      setTimeout(() => (window.location.href = "/"), 700);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Hibás email vagy jelszó.");
    }
  };

  const register = async () => {
    if (password !== password2) {
      setError("A jelszavak nem egyeznek.");
      return;
    }
    try {
      await api.post("/api/auth/register", { name, email, password });
      setOk("Sikeres regisztráció! Bejelentkeztetünk…");
      const { data } = await api.post<LoginRes>("/api/auth/login", { email, password });
      localStorage.setItem("token", data.token);
      setTimeout(() => (window.location.href = "/"), 700);
    } catch (e: any) {
      setError(e?.response?.data?.error || "A regisztráció nem sikerült.");
    }
  };

  return (
    <div style={styles.wall}>
      <div style={styles.gradient} />

      {/* BAL-FELSŐ elhelyezés (mobilon középre ugrik) */}
      <div className="auth-shell" style={styles.shell}>
        <div className="auth-card" style={styles.card}>
          {/* Fülek */}
          <div style={styles.tabs}>
            <button
              style={{ ...styles.tabBtn, ...(tab === "login" ? styles.tabActive : {}) }}
              onClick={() => setTab("login")}
            >
              Bejelentkezés
            </button>
            <button
              style={{ ...styles.tabBtn, ...(tab === "register" ? styles.tabActive : {}) }}
              onClick={() => setTab("register")}
            >
              Regisztráció
            </button>
          </div>

          {tab === "login" ? (
            <>
              <h1 style={styles.title}>Üdv újra! 👋</h1>
              <Input value={email} onChange={setEmail} placeholder="Email" type="email" />
              <Input value={password} onChange={setPassword} placeholder="Jelszó" type="password" />
              <button style={styles.primaryBtn} onClick={login}>
                Belépés
              </button>
            </>
          ) : (
            <>
              <h1 style={styles.title}>Csatlakozz! ✨</h1>
              <Input value={name} onChange={setName} placeholder="Név" />
              <Input value={email} onChange={setEmail} placeholder="Email" type="email" />
              <Input value={password} onChange={setPassword} placeholder="Jelszó" type="password" />
              <Input
                value={password2}
                onChange={setPassword2}
                placeholder="Jelszó újra"
                type="password"
              />
              <button style={styles.primaryBtn} onClick={register}>
                Regisztráció
              </button>
            </>
          )}

          {error && <p style={{ color: "#ff6b6b", marginTop: 10 }}>{error}</p>}
          {ok && <p style={{ color: "#51cf66", marginTop: 10 }}>{ok}</p>}
        </div>
      </div>

      {/* Mobil breakpoints – most már class alapján is működik */}
      <style>
        {`
          @media (max-width: 768px) {
            .auth-shell { 
              position: fixed !important; 
              inset: 0 !important; 
              display: flex !important;
              justify-content: center !important; 
              align-items: center !important; 
              padding: 16px !important;
            }
            .auth-card  { 
              width: min(92vw, 380px) !important; 
              margin: 0 !important; 
            }
          }
        `}
      </style>
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      style={styles.input}
    />
  );
}

const styles: Record<string, React.CSSProperties> = {
  wall: {
    backgroundImage: "url('/Audi.jpg')", // tedd ide a képet: public/Audi.jpg
    backgroundSize: "cover",
    backgroundPosition: "center",
    minHeight: "100vh",
    position: "relative",
  },
  gradient: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.00) 100%)",
    pointerEvents: "none",
  },
  shell: {
    position: "absolute",
    left: 24,
    top: 24,
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },

  // KESKENYEBB kártya + belső padding: a mezők nem „lógják ki”
  card: {
  width: 320,                 // ← keskenyebb
  padding: "22px 18px",       // ← több belső tér oldalra
  backdropFilter: "blur(8px)",
  background: "rgba(18,18,18,0.78)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 16,
  color: "#fff",
  boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
  overflow: "hidden",         // ← semmi se „lógjon ki”
},

  tabs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginBottom: 16,
  },
  tabBtn: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#fff",
    padding: "10px 12px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
  },
  tabActive: {
    background: "#6c5ce7",
    borderColor: "#6c5ce7",
  },
  title: {
    fontSize: "1.7rem",
    margin: "8px 0 16px",
    fontWeight: 800,
    letterSpacing: 0.2,
  },

  // MEZŐK: 100% a kártyán belül, de a kártya keskeny → optikailag karcsúbb
 input: {
  width: "92%",               // ← nem ér ki a széléig
  display: "block",
  margin: "0 auto 12px",      // ← középre rendezve, alsó rés
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.22)",
  background: "rgba(255,255,255,0.10)",
  color: "#fff",
  fontSize: "1rem",
  outline: "none",
  boxSizing: "border-box",    // ← biztosan számolja a belső térrel
},

  primaryBtn: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(90deg,#6c5ce7,#a66cff)",
    color: "#fff",
    fontWeight: 700,
    fontSize: "1.05rem",
    cursor: "pointer",
    marginTop: 6,
  },
};
