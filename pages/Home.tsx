import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import api from "../api/axios";

type NewsItem = { title: string; link: string; source: string; publishedAt?: string };
type Post = { id: number; title: string; content?: string };

export default function Home() {
  const aboutRef = useRef<HTMLDivElement | null>(null);

  const [uti, setUti] = useState<NewsItem[]>([]);
  const [tc, setTc] = useState<NewsItem[]>([]);
  const [errUti, setErrUti] = useState("");
  const [errTc, setErrTc] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [errForum, setErrForum] = useState("");

  const [vote, setVote] = useState<number>(() => {
    const v = localStorage.getItem("service_vote");
    return v ? Number(v) : 4;
  });
  useEffect(() => localStorage.setItem("service_vote", String(vote)), [vote]);

  useEffect(() => {
    (async () => {
      try { setUti((await api.get<NewsItem[]>("/api/news/utinform?limit=20")).data || []); }
      catch (e: any) { setErrUti(e?.response?.data?.error || "Nem sikerült betölteni az Útinform híreit."); }

      try { setTc((await api.get<NewsItem[]>("/api/news/totalcar?limit=20")).data || []); }
      catch (e: any) { setErrTc(e?.response?.data?.error || "Nem sikerült betölteni a legújabb autóteszteket."); }

      try {
        const r = await api.get<Post[] | { content: Post[] }>("/api/forum/posts?page=0&size=3&sort=createdAt,desc");
        const data = r.data as any;
        setPosts(Array.isArray(data) ? data : data?.content ?? []);
      } catch (e: any) {
        setErrForum(e?.response?.data?.error || "Nem sikerült betölteni a fórum előnézetet.");
      }
    })();
  }, []);

  const utiUrl = "https://www.utinform.hu/hu/map?d=0&n=1&l=abc&v=19.50330,47.16250,7";

  return (
    <div style={styles.page}>
      <div style={bgLayer} />
      <div style={styles.wrap}>
        {/* Fejléc + CTA-k */}
        <header style={styles.header}>
          <div>
            <div style={styles.logo}>CarApp</div>
            <div style={styles.tagline}>
              Közösségi autós app: autókezelés, szerviz-időpontok, fórum és térkép benzinkutakkal & útvonaltervezéssel.
            </div>
          </div>
          <div style={styles.ctaRow}>
            <Link to="/forum" style={styles.ctaPrimary}>Ugorj a fórumba</Link>
            <Link to="/map" style={styles.ctaSecondary}>Nézd meg a térképet</Link>
            <button onClick={() => aboutRef.current?.scrollIntoView({ behavior: "smooth" })} style={styles.ctaSecondary}>Rólunk</button>
            <a href={utiUrl} target="_blank" rel="noreferrer" style={styles.ctaSecondary}>Útinform térkép</a>
          </div>
        </header>

        {/* Rács – magasság:  calc(100vh - header)  → nem görget az oldal */}
        <div style={styles.grid}>
          {/* Útinform – belső görgetés */}
          <section style={{ ...styles.card, gridArea: "uti" }}>
            <header style={styles.cardHead}>
              <h3 style={styles.cardTitle}>Útinform hírei</h3>
              <a href={utiUrl} target="_blank" rel="noreferrer" style={styles.smallLink}>Megnyitás →</a>
            </header>
            {errUti ? (
              <p style={styles.err}>{errUti}</p>
            ) : (
              <ul style={styles.scrollList}>
                {uti.map((n, i) => (
                  <li key={i}><a href={n.link} target="_blank" rel="noreferrer" style={styles.newsLink}>{n.title}</a></li>
                ))}
                {uti.length === 0 && <li>Betöltés…</li>}
              </ul>
            )}
          </section>

          {/* Totalcar – belső görgetés */}
          <section style={{ ...styles.card, gridArea: "tc" }}>
            <header style={styles.cardHead}>
              <h3 style={styles.cardTitle}>Autótesztek (Totalcar – legújabbak)</h3>
              <a href="https://totalcar.hu/tesztek/" target="_blank" rel="noreferrer" style={styles.smallLink}>Összes →</a>
            </header>
            {errTc ? (
              <p style={styles.err}>{errTc}</p>
            ) : (
              <ul style={styles.scrollList}>
                {tc.map((n, i) => (
                  <li key={i}><a href={n.link} target="_blank" rel="noreferrer" style={styles.newsLink}>{n.title}</a></li>
                ))}
                {tc.length === 0 && <li>Betöltés…</li>}
              </ul>
            )}
          </section>

          {/* Fórum előnézet */}
          <section style={{ ...styles.card, gridArea: "forum" }}>
            <header style={styles.cardHead}>
              <h3 style={styles.cardTitle}>Fórum legutóbbi posztok</h3>
              <Link to="/forum" style={styles.smallLink}>Összes →</Link>
            </header>
            {errForum ? (
              <p style={styles.err}>{errForum}</p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {posts.map(p => (
                  <div key={p.id} style={styles.forumItem}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{p.title}</div>
                    <div style={{ opacity: 0.85, fontSize: 13 }}>
                      {(p.content || "").slice(0, 140)}{(p.content || "").length > 140 ? "…" : ""}
                    </div>
                  </div>
                ))}
                {posts.length === 0 && <div>Még nincsenek posztok.</div>}
              </div>
            )}
          </section>

          {/* Szavazás */}
          <section style={{ ...styles.card, gridArea: "vote" }}>
            <header style={styles.cardHead}><h3 style={styles.cardTitle}>Szervizre való szavazás</h3></header>
            <p style={{ marginTop: 0, opacity: .9 }}>Add le a szavazatod (1–5 csillag). A választás a böngésződben tárolódik.</p>
            <Star value={vote} onChange={setVote} />
            <div style={{ marginTop: 6, opacity: .8, fontSize: 13 }}>{vote}/5</div>
          </section>

          {/* Mini térkép (katt a nagyhoz) */}
          <section style={{ ...styles.card, gridArea: "mini" }}>
            <header style={styles.cardHead}>
              <h3 style={styles.cardTitle}>Google térkép</h3>
              <Link to="/map" style={styles.smallLink}>Nagy nézet →</Link>
            </header>
            <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,.08)" }}>
              <Link to="/map" style={{ display: "block" }}>
                <img
                  src={`https://maps.googleapis.com/maps/api/staticmap?center=47.959,22.316&zoom=12&size=600x340&scale=2&maptype=roadmap&markers=color:blue|47.959,22.316&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""}`}
                  alt="Közeli térkép"
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </Link>
            </div>
          </section>
        </div>

        {/* Rólunk – marad legalul, balra húzva */}
        <section ref={aboutRef} id="about" style={styles.about}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Rólunk & Kapcsolat</div>
          <p style={{ marginTop: 0 }}>
            A CarApp egy közösségi autós alkalmazás: saját autók kezelése, szerviz-időpontok, fórum és benzinkút-kereső térkép útvonaltervezéssel.
            Célunk, hogy a mindennapi autózást kényelmesebbé tegyük.
          </p>
          <p style={{ margin: "8px 0" }}><strong>Email:</strong> info@carapp.example</p>
          <p style={{ margin: "8px 0" }}><strong>Telefon:</strong> +36 1 234 5678</p>
          <p style={{ margin: "8px 0" }}><strong>Facebook:</strong> facebook.com/carapp</p>
        </section>
      </div>
    </div>
  );
}

function Star({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          style={{
            width: 32, height: 32, borderRadius: 8, cursor: "pointer",
            border: "1px solid rgba(255,255,255,.18)",
            background: n <= value ? "linear-gradient(90deg,#f59e0b,#fde047)" : "transparent",
            color: n <= value ? "#111" : "#fff", fontWeight: 800
          }}
          aria-label={`${n} csillag`}
        >★</button>
      ))}
    </div>
  );
}

/* ====== Stílusok ====== */
const styles: Record<string, React.CSSProperties> = {
  page: { position: "relative", height: "100vh", overflow: "hidden", color: "#fff", fontFamily: "Bahnschrift, system-ui, Segoe UI, Arial, sans-serif" },
  wrap: { position: "relative", zIndex: 1, width: "min(1380px,95vw)", margin: "0 auto", height: "100%", display: "flex", flexDirection: "column" },

  header: { padding: "16px 0 10px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  logo: { fontSize: 28, fontWeight: 900, letterSpacing: .5, textShadow: "0 10px 30px rgba(0,0,0,.6)" },
  tagline: { opacity: .9, marginTop: 6 },
  ctaRow: { display: "flex", gap: 10, flexWrap: "wrap" },

  ctaPrimary: { background: "linear-gradient(90deg,#6c5ce7,#a66cff)", color: "#fff", padding: "10px 14px", borderRadius: 10, textDecoration: "none", fontWeight: 800, border: "1px solid rgba(255,255,255,0.12)" },
  ctaSecondary: { background: "rgba(255,255,255,0.08)", color: "#fff", padding: "10px 14px", borderRadius: 10, textDecoration: "none", fontWeight: 700, border: "1px solid rgba(255,255,255,0.12)" },

  /* A rács fixen kitölti a látható magasságot, a listák saját maguk görgetnek. */
  grid: {
    display: "grid",
    gridTemplateAreas: `
      "uti tc forum"
      "uti tc vote"
      "uti tc mini"
    `,
    gridTemplateColumns: "1fr 1fr 420px",
    gridTemplateRows: "1fr 0.6fr 0.9fr", // arányok a látható térben
    gap: 14,
    flex: 1,           // a header alatt maradó tér
    minHeight: 0       // fontos ahhoz, hogy a belső elemek overflow-zhassanak
  },

  card: { background: "rgba(17,17,20,.85)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, padding: 12, backdropFilter: "blur(6px)", minHeight: 0, display: "flex", flexDirection: "column" },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardTitle: { margin: 0, fontSize: 16, fontWeight: 800 },

  /* Belső görgetés a hírekhez */
  scrollList: { margin: 0, paddingLeft: 16, display: "grid", gap: 6, overflowY: "auto", scrollbarWidth: "thin", maxHeight: "100%", minHeight: 0 },
  newsLink: { color: "#c7befc", textDecoration: "none" },
  smallLink: { color: "#b8a6ff", textDecoration: "none", fontSize: 13 },

  forumItem: { padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" },

  about: {
    margin: "10px -12px 0 -12px", // picit balra húzva
    padding: 16,
    background: "rgba(17,17,20,.85)",
    border: "1px solid rgba(255,255,255,.1)",
    borderRadius: 14
  },

  err: { color: "#ff9f9f", margin: "6px 0" }
};

const bgLayer: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 0,
  background:
    `#0b0b0f url('/bg-headlight-left.png') left bottom / 1020px auto no-repeat`
};
