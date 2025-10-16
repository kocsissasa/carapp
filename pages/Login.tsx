import { useEffect, useState } from "react";
import api from "../api/axios";

// itt az /api/auth/login végpont { token: string } JSON-t ad
type LoginRes = { token: string };

// a képet KÖZVETLENÜL a public-ból kérjük
const BG_URL = "/login.jpg";

/**
 * export default function Login() { ... }
 * ---------------------------------------------------------------
 * - `function Login` : deklarálunk egy névvel ellátott komponens-függvényt.
 * - `export default` : a modul alapértelmezett exportja lesz.
 * - A React komponens: egy függvény, ami props-ot kaphat és JSX-et ad vissza.
 * - Minden renderelésnél lefut, az állapotot a hookok őrzik.
 */
export default function Login() {
  const [tab, setTab] = useState<"login" | "register">("login"); // -> aktív fül: bejelentkezés vagy regisztráció
  const [email, setEmail] = useState(""); // -> e-mail input értéke
  const [name, setName] = useState(""); // -> név input (regisztrációnál)
  const [password, setPassword] = useState("");  // -> jelszó input
  const [password2, setPassword2] = useState(""); // -> jelszó megerősítés (regisztráció)
  const [error, setError] = useState<string>("");   // -> hibaüzenet (UI)
  const [ok, setOk] = useState<string>(""); // -> sikerüzenet (UI)
  const [hasBg, setHasBg] = useState<boolean>(false); // -> van-e elérhető háttérkép
 
  // háttérkép létezik-e?
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // mindig friss kérést küldünk
        const r = await fetch(BG_URL + `?nc=${Date.now()}`, { cache: "no-store" });
        if (alive) setHasBg(r.ok); // -> ha 200-as a válasz, akkor megjelenik a kép
        // segítség a konzolban:
        // eslint-disable-next-line no-console
        console.log(`[Login] bg check ${BG_URL}:`, r.ok ? "OK" : `HIBA (${r.status})`);
      } catch {
        if (alive) setHasBg(false); // -> hiba esetén no háttérkép
      }
    })();
    // cleanup: unmountnál jelölve, hogy a komponens már nem él
    return () => { alive = false; };
  }, []);

  // Ha tabot váltunk (login <-> register), előző üzenetek törölve
  useEffect(() => {
    setError("");
    setOk("");
  }, [tab]);

  /**
   * async login() – bejelentkezés
   * - axios POST a /api/auth/login-ra
   * - a generikus <LoginRes> TS-ben biztosítja, hogy `data.token` létezik és string
   * - ha siker: token -> localStorage, UI feedback, majd redirect
   * - ha hiba: hibaüzenet beállítás
   */
  const login = async () => {
    try {
      const { data } = await api.post<LoginRes>("/api/auth/login", { email, password });
      localStorage.setItem("token", data.token); // -> Token mentése 
      setOk("Sikeres bejelentkezés!");  // -> Zöld sikerüzenet
      setTimeout(() => (window.location.href = "/"), 600); // -> kis késleltetéssel átdobjuk a kezdőlapra
    } catch (e: any) {
      // Hibás email vagy jelszó hibaüzenet
      setError(e?.response?.data?.error || "Hibás email vagy jelszó.");
    }
  };

  /**
   * async register() – regisztráció
   * - kliens oldali gyors validáció: a 2 jelszó egyezzen
   * - POST /api/auth/register (név, e-mail, jelszó)
   * - ha siker: automatikus bejelentkeztetés
   * - token mentés, redirect
   */
  const register = async () => {
    if (password !== password2) {
      setError("A jelszavak nem egyeznek."); // -> azonnali kliens hiba
      return;
    }
    try {
      await api.post("/api/auth/register", { name, email, password }); // -> regisztráció
      setOk("Sikeres regisztráció! Bejelentkeztetünk…");
      const { data } = await api.post<LoginRes>("/api/auth/login", { email, password }); // -> automatikus beléptetés
      localStorage.setItem("token", data.token);
      setTimeout(() => (window.location.href = "/"), 600);
    } catch (e: any) {
      setError(e?.response?.data?.error || "A regisztráció nem sikerült.");
    }
  };

  return (
    <div style={S.page}>
      {/* Háttérkép (ha van) */}
      {hasBg && <div style={{ ...S.bg, backgroundImage: `url('${BG_URL}')` }} aria-hidden="true" />}
      {/* Neon overlay – a képen is „átüt” */}
      <div style={S.overlay} aria-hidden="true" />

      {/* Kártya – pozicionálásért felel */}
      <div className="auth-shell" style={S.shell}>
         {/* A tényleges üvegkártya – benne a form elemek */}
        <div className="auth-card" style={S.card}>
           {/* Tabok – két gombbal váltunk login/register nézet között */}
          <div style={S.tabs}>
            <button
              style={{ ...S.tabBtn, ...(tab === "login" ? S.tabActive : {}) }}
              onClick={() => setTab("login")} // -> ne submit-oljon véletlenül
            >
              Bejelentkezés
            </button>
            <button
              style={{ ...S.tabBtn, ...(tab === "register" ? S.tabActive : {}) }}
              onClick={() => setTab("register")}
            >
              Regisztráció
            </button>
          </div>

 {/* Feltételes render: ha login fül aktív → login űrlap; különben regisztrációs űrlap */}
          {tab === "login" ? (
            <>
              <h1 style={S.title}>Üdv újra! 👋</h1>
              <Input value={email} onChange={setEmail} placeholder="Email" type="email" />
              <Input value={password} onChange={setPassword} placeholder="Jelszó" type="password" />
              <button style={S.primaryBtn} onClick={login}>Belépés</button>
            </>
          ) : (
            <>
              <h1 style={S.title}>Csatlakozz! ✨</h1>
              <Input value={name} onChange={setName} placeholder="Név" />
              <Input value={email} onChange={setEmail} placeholder="Email" type="email" />
              <Input value={password} onChange={setPassword} placeholder="Jelszó" type="password" />
              <Input value={password2} onChange={setPassword2} placeholder="Jelszó újra" type="password" />
              <button style={S.primaryBtn} onClick={register}>Regisztráció</button>
            </>
          )}

          {error && <p style={S.error}>{error}</p>}
          {ok && <p style={S.success}>{ok}</p>}
        </div>
      </div>

      {/* Beágyazott CSS - Mobil középre igazítás + kis hover anim */}
      <style>
        {`
          @media (max-width: 768px) {
            .auth-shell {  /* mobilon a kártyát fixen, teljes viewporton középre tesszük */
              position: fixed !important;
              inset: 0 !important;
              display: flex !important;
              justify-content: center !important;
              align-items: center !important;
              padding: 16px !important;
            }
            .auth-card {  /* mobil kártyaszélesség: min(92vw, 380px), margin nullázás */
              width: min(92vw, 380px) !important;
              margin: 0 !important;
            }
          }
          .auth-card button:hover {   /* kicsit világosabb a hoverelt gomb */
            filter: brightness(1.06);
            transform: translateY(-1px);
            transition: .18s ease;   /* rövid, gyorsnak hat */
          }
        `}
      </style>
    </div>
  );
}
// Controlled input: az értéket a szülő állapota (useState) tárolja; onChange visszajelez.
function Input({
  value, onChange, placeholder, type = "text",
}: { value: string; onChange: (v: string) => void; placeholder: string; type?: string }) {
  return (
    <input
      value={value} // ➜ controlled value
      onChange={(e) => onChange(e.target.value)}  // ➜ eseménykezelő: visszaadja az új értéket
      placeholder={placeholder} // ➜ szürke segédszöveg
      type={type}  // ➜ pl. email/password
      style={S.input}
    />
  );
}

const S: Record<string, React.CSSProperties> = {
  // A teljes oldal-keret: a fix rétegek (bg, overlay) mögötte/felette helyezkednek el
  page: { minHeight: "100vh", position: "relative", overflow: "hidden" },
  // Háttérkép réteg (ha van). pointerEvents: none → ne fogja el az egér/koppintás eseményeket
  bg: {
    position: "fixed", inset: 0, zIndex: 0,
    backgroundSize: "cover", backgroundPosition: "center",
    filter: "brightness(.9)",
  },
  // Neon-fedőréteg: két nagy radial + egy sötét linear film, üveg/neon hangulat
  overlay: {
    position: "fixed", inset: 0, zIndex: 1,
    background:
      "radial-gradient(1000px 600px at 15% 20%, rgba(108,92,231,.28), transparent 60%), radial-gradient(900px 600px at 85% 80%, rgba(166,108,255,.22), transparent 60%), linear-gradient(180deg, rgba(0,0,10,.55), rgba(0,0,10,.55))",
  },
  // Desktopon bal-felső sarokba tesszük a kártyát.
  shell: { position: "absolute", left: 32, top: 32, zIndex: 2, display: "flex" },
  // Üvegkártya: blur + áttetsző háttér + dupla árnyék
  card: {
    width: 360, padding: "26px 22px", color: "#fff",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,.14)",
    background: "rgba(15,18,28,.62)",
    backdropFilter: "blur(12px)",
    boxShadow: "0 18px 50px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.06)",
  },
   // Két egyenlő szélességű tab gomb, köztük 10px hézag
  tabs: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 },
  // Tab gomb nyugalmi állapot
  tabBtn: {
    background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.14)",
    color: "#fff", padding: "10px 12px", borderRadius: 12, cursor: "pointer",
    fontWeight: 800, letterSpacing: 0.2,
  },
  // Aktív tab: lila gradiens + glow
  tabActive: {
    background: "linear-gradient(90deg,#6c5ce7,#a66cff)",
    border: "1px solid rgba(166,108,255,.55)",
    boxShadow: "0 0 18px rgba(166,108,255,.35)",
  },
  // Nagy, kontrasztos cím
  title: {
    fontSize: "1.8rem", margin: "8px 0 16px", fontWeight: 900,
    letterSpacing: 0.2, textShadow: "0 8px 30px rgba(0,0,0,.5)",
  },
   // Üveges input: nagy tap area, lágy sarkok, gyors fókusz animáció
  input: {
    width: "100%", display: "block", marginBottom: 12, padding: "12px 14px",
    borderRadius: 12, border: "1px solid rgba(255,255,255,.22)",
    background: "rgba(255,255,255,.10)", color: "#fff", fontSize: "1rem",
    outline: "none", boxSizing: "border-box",
    transition: "box-shadow .18s ease, border-color .18s ease",
  } as React.CSSProperties,
   // Primary CTA gomb: lila gradiens + mély árnyék
  primaryBtn: {
    width: "100%", padding: "12px 14px", borderRadius: 12,
    border: "1px solid rgba(166,108,255,.45)",
    background: "linear-gradient(90deg,#6c5ce7,#a66cff)",
    color: "#fff", fontWeight: 900, fontSize: "1.05rem",
    cursor: "pointer", marginTop: 6, boxShadow: "0 10px 28px rgba(108,92,231,.35)",
  },
   // Üzenetek
  error: { color: "#ff8a8a", marginTop: 10, fontWeight: 700 },
  success: { color: "#69db7c", marginTop: 10, fontWeight: 700 },
};
