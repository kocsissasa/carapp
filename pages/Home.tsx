import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axios";

/* ------------ Típusok ------------ */
type NewsItem = { title: string; link: string; source?: string; publishedAt?: string };
type Post = { id: number; title: string; content?: string; createdAt?: string };

type ServiceCenter = { id: number; name: string; city?: string; address?: string; placeId?: string };
type TopCenter = { centerId: number; name: string; city?: string; address?: string; avgRating?: number; votes?: number };

/* ------------ Segédek ------------ */
const svcTagRe = /^\[svc:(\d+)\]\s*/;
function peelServiceTag(text: string): { clean: string; serviceId?: number } {
  const m = (text || "").match(svcTagRe);
  if (!m) return { clean: text || "" };
  const id = Number(m[1]);
  return { clean: (text || "").replace(svcTagRe, ""), serviceId: Number.isFinite(id) ? id : undefined };
}
const fmtAvg = (v?: number) => (typeof v === "number" && !Number.isNaN(v) ? v.toFixed(1) : "-");

/* ====================================================================== */

export default function Home() {
  const aboutRef = useRef<HTMLDivElement | null>(null);

  const [uti, setUti] = useState<NewsItem[]>([]);
  const [tc, setTc] = useState<NewsItem[]>([]);
  const [errUti, setErrUti] = useState("");
  const [errTc, setErrTc] = useState("");

  const [posts, setPosts] = useState<Post[]>([]);
  const [errForum, setErrForum] = useState("");

  const [centers, setCenters] = useState<ServiceCenter[]>([]);
  const [topCenters, setTopCenters] = useState<TopCenter[]>([]);
  const [pickedCenterId, setPickedCenterId] = useState<number | "">("");

  const voteKey = (id: number | "") => (id ? `service_vote_${id}` : "service_vote");
  const [vote, setVote] = useState<number>(3);

  useEffect(() => {
    const raw = localStorage.getItem(voteKey(pickedCenterId));
    setVote(raw ? Number(raw) : 3);
  }, [pickedCenterId]);

  useEffect(() => {
    (async () => {
      try {
        setUti((await api.get<NewsItem[]>("/api/news/utinform?limit=22")).data || []);
      } catch (e: any) {
        setErrUti(e?.response?.data?.error || "Nem sikerült betölteni az Útinform híreit.");
      }
      try {
        setTc((await api.get<NewsItem[]>("/api/news/totalcar?limit=22")).data || []);
      } catch (e: any) {
        setErrTc(e?.response?.data?.error || "Nem sikerült betölteni a legújabb autóteszteket.");
      }
      try {
        const r = await api.get<Post[] | { content: Post[] }>(
          "/api/forum/posts?page=0&size=4&sort=createdAt,desc"
        );
        const data = r.data as any;
        setPosts(Array.isArray(data) ? data : data?.content ?? []);
      } catch (e: any) {
        setErrForum(e?.response?.data?.error || "Nem sikerült betölteni a fórum előnézetet.");
      }
      try {
        setCenters((await api.get<ServiceCenter[]>("/api/centers")).data || []);
      } catch {
        setCenters([]);
      }
      try {
        setTopCenters((await api.get<TopCenter[]>("/api/centers/top")).data || []);
      } catch {
        setTopCenters([]);
      }
    })();
  }, []);

  const submitVote = async (value: number) => {
    if (!pickedCenterId) return;
    setVote(value);
    localStorage.setItem(voteKey(pickedCenterId), String(value));
    try {
      await api.post(`/api/centers/${pickedCenterId}/vote`, { rating: value });
      const t = await api.get<TopCenter[]>("/api/centers/top");
      setTopCenters(t.data || []);
    } catch {}
  };

  const svcNameById = (id?: number) =>
    (id && centers.find((c) => c.id === id)?.name) || undefined;

  const pickedAvg = useMemo(() => {
    if (!pickedCenterId) return null;
    const row = topCenters.find((t) => t.centerId === pickedCenterId);
    return row ? { avg: row.avgRating, votes: row.votes } : null;
  }, [pickedCenterId, topCenters]);

  const top3: TopCenter[] = useMemo(() => {
    const arr = topCenters.slice(0, 3);
    while (arr.length < 3) {
      arr.push({
        centerId: -arr.length - 1,
        name: "—",
        city: "",
        address: "",
        avgRating: undefined,
        votes: undefined,
      });
    }
    return arr;
  }, [topCenters]);

  const utiUrl = "https://www.utinform.hu/hu/map?d=0&n=1&l=abc&v=19.50330,47.16250,7";

  return (
    <div style={styles.page}>
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        style={styles.bgMediaFull}
        src={`${(import.meta as any).env.BASE_URL || "/"}home.mp4`}
      />
      <div style={styles.bgOverlay} />
      <div style={styles.bgTop} />

      <div style={styles.wrap}>
        <header style={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <NeonLogo size={32} />
            <div style={styles.logoText}>CarApp</div>
          </div>
          <div style={styles.tagline}>Autók, szerviz-időpontok, fórum és térkép – egy helyen.</div>
        </header>

        <div style={styles.grid}>
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
                  <li key={i}>
                    <a href={n.link} target="_blank" rel="noreferrer" style={styles.newsLink}>
                      {n.title}
                    </a>
                  </li>
                ))}
                {uti.length === 0 && <li>Betöltés…</li>}
              </ul>
            )}
          </section>

          <section style={{ ...styles.card, gridArea: "tc" }}>
            <header style={styles.cardHead}>
              <h3 style={styles.cardTitle}>Autótesztek (Totalcar)</h3>
              <a href="https://totalcar.hu/tesztek/" target="_blank" rel="noreferrer" style={styles.smallLink}>Összes →</a>
            </header>
            {errTc ? (
              <p style={styles.err}>{errTc}</p>
            ) : (
              <ul style={styles.scrollList}>
                {tc.map((n, i) => (
                  <li key={i}>
                    <a href={n.link} target="_blank" rel="noreferrer" style={styles.newsLink}>
                      {n.title}
                    </a>
                  </li>
                ))}
                {tc.length === 0 && <li>Betöltés…</li>}
              </ul>
            )}
          </section>

          <section style={{ ...styles.card, gridArea: "forum" }}>
            <header style={styles.cardHead}>
              <h3 style={styles.cardTitle}>Fórum – legutóbbi posztok</h3>
              <Link to="/forum" style={styles.smallLink}>Összes →</Link>
            </header>
            {errForum ? (
              <p style={styles.err}>{errForum}</p>
            ) : (
              <div style={styles.scrollBox}>
                {posts.map((p) => {
                  const peeled = peelServiceTag(p.content || "");
                  const svc = svcNameById(peeled.serviceId);
                  return (
                    <div key={p.id} style={styles.forumItem}>
                      <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                        {svc ? <span style={styles.badgeSvc}>{svc}</span> : null}
                        <div style={{ fontWeight: 800 }}>{p.title}</div>
                      </div>
                      <div style={{ opacity: 0.85, fontSize: 13, marginTop: 4 }}>
                        {peeled.clean.slice(0, 160)}
                        {peeled.clean.length > 160 ? "…" : ""}
                      </div>
                    </div>
                  );
                })}
                {posts.length === 0 && <div>Betöltés…</div>}
              </div>
            )}
          </section>

          <section style={{ ...styles.card, gridArea: "vote" }}>
            <header style={styles.cardHead}>
              <h3 style={styles.cardTitle}>Szervizre szavazás</h3>
            </header>
            <select
              value={pickedCenterId}
              onChange={(e) => setPickedCenterId(e.target.value ? Number(e.target.value) : "")}
              style={styles.select}
              aria-label="Válassz szervizt…"
            >
              <option value="">Válassz szervizt…</option>
              {centers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.city ? ` — ${c.city}` : ""}
                </option>
              ))}
            </select>

            <div style={{ marginTop: 8 }}>
              <Star value={vote} onChange={(v) => submitVote(v)} disabled={!pickedCenterId} />
              <div style={{ marginTop: 6, opacity: 0.9, fontSize: 13 }}>
                {pickedCenterId
                  ? <>
                      <strong>{vote}</strong>/5 &nbsp;|&nbsp; Havi átlag: <strong>{fmtAvg(pickedAvg?.avg)}</strong>/5
                      {typeof pickedAvg?.votes === "number" ? <> &nbsp;(<strong>{pickedAvg?.votes}</strong> szavazat)</> : null}
                    </>
                  : "Válassz szervizt a szavazáshoz."}
              </div>
            </div>
          </section>

          <section style={{ ...styles.card, gridArea: "top" }}>
            <header style={styles.cardHead}>
              <h3 style={styles.cardTitle}>Top 3 szerviz (havi)</h3>
            </header>
            <div style={{ display: "grid", gap: 6, minHeight: 0, overflow: "hidden" }}>
              {top3.map((t, idx) => (
                <div key={`${t.centerId}-${idx}`} style={styles.topRow}>
                  <div style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.name}{t.city ? ` — ${t.city}` : ""}
                  </div>
                  <div style={{ fontWeight: 800 }}>{fmtAvg(t.avgRating)} / 5</div>
                </div>
              ))}
            </div>
          </section>

          <section ref={aboutRef} style={{ ...styles.card, gridArea: "about", ...styles.about }}>
            <div style={{ fontWeight: 800, marginBottom: 8, textAlign: "center" }}>Rólunk & Kapcsolat</div>
            <p style={{ marginTop: 0, textAlign: "center", opacity: .95 }}>
              A CarApp egy közösségi autós alkalmazás: saját autók kezelése, szerviz-időpontok,
              fórum és benzinkút-kereső térkép útvonaltervezéssel.
            </p>
            <div style={styles.aboutCols}>
              <p><strong>Email:</strong> info@carapp.example</p>
              <p><strong>Telefon:</strong> +36 1 234 5678</p>
              <p><strong>Facebook:</strong> facebook.com/carapp</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ------------ SVG LOGÓ ------------ */
function NeonLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"
         style={{ filter: "drop-shadow(0 0 10px rgba(108,92,231,.55))" }} aria-label="CarApp logo">
      <defs>
        <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6c5ce7" />
          <stop offset="50%" stopColor="#a66cff" />
          <stop offset="100%" stopColor="#6c5ce7" />
        </linearGradient>
      </defs>
      <rect x="4" y="18" width="56" height="28" rx="14" fill="url(#g1)" stroke="rgba(255,255,255,.25)" />
      <circle cx="22" cy="44" r="8" fill="#0b0b0f" stroke="#c7befc" />
      <circle cx="46" cy="44" r="8" fill="#0b0b0f" stroke="#c7befc" />
      <path d="M16 24h32l6 8H10z" fill="rgba(255,255,255,.16)" />
    </svg>
  );
}

/* ------------ Csillagsor ------------ */
function Star({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => !disabled && onChange(n)}
          disabled={!!disabled}
          style={{
            width: 28, height: 28, borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
            border: "1px solid rgba(255,255,255,.18)",
            background: n <= value ? "linear-gradient(90deg,#f59e0b,#fde047)" : "transparent",
            color: n <= value ? "#111" : "#fff", fontWeight: 800, opacity: disabled ? 0.5 : 1,
          }}
          aria-label={`${n} csillag`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

/* ======================== Stílusok ======================== */
const styles: Record<string, React.CSSProperties> = {
  page: {
    position: "relative",
    height: "100dvh",
    overflow: "hidden",
    color: "#fff",
    fontFamily: "Bahnschrift, system-ui, Segoe UI, Arial, sans-serif",
    background: "#07080d",
  },

  bgMediaFull: {
    position: "fixed",
    inset: 0,
    width: "100%",
    height: "100dvh",
    objectFit: "cover",
    zIndex: 0,
    pointerEvents: "none",
    filter: "brightness(.72) saturate(1.05)",
  },

  bgOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1,
    pointerEvents: "none",
    background:
      "radial-gradient(1200px 600px at 50% -10%, rgba(0,0,0,0.25), transparent 60%)," +
      "linear-gradient(to bottom, rgba(7,8,13,0.25), rgba(7,8,13,0.55))",
  },

  bgTop: {
    position: "fixed",
    inset: 0,
    background:
      "radial-gradient(900px 260px at 30% 10%, rgba(90,124,255,.18), transparent 60%), radial-gradient(900px 260px at 70% 5%, rgba(166,108,255,.18), transparent 60%)",
    zIndex: 1,
    pointerEvents: "none",
  },

  // ⬇ Itt a módosítás: nincs viewport-alapú maxWidth, csak a szülő szélességéhez igazodunk.
  wrap: {
    position: "relative",
    zIndex: 2,
    width: "min(1320px, 100%)",
    margin: "0 auto",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    paddingBlock: 10,
  },

  header: {
    padding: "6px 0 8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  logoText: { fontSize: 22, fontWeight: 900, letterSpacing: .3 },
  tagline: { opacity: .92, marginTop: 2, fontSize: 13.5 },

  grid: {
    display: "grid",
    gridTemplateAreas: `
      "uti tc forum"
      "vote top about"
    `,
    gridTemplateColumns: "1fr 1fr 1.1fr",
    gridTemplateRows: ".9fr 1fr",
    gap: 12,
    flex: 1,
    minHeight: 0,
  },

  card: {
    background: "rgba(17,17,20,.86)",
    border: "1px solid rgba(255,255,255,.10)",
    borderRadius: 14,
    padding: 10,
    backdropFilter: "blur(6px)",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
  },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  cardTitle: { margin: 0, fontSize: 15, fontWeight: 800 },

  scrollList: {
    margin: 0,
    paddingLeft: 16,
    display: "grid",
    gap: 6,
    overflowY: "auto",
    scrollbarWidth: "thin",
    maxHeight: "100%",
    minHeight: 0,
    fontSize: 13.5,
  },
  newsLink: { color: "#c7befc", textDecoration: "none" },
  smallLink: { color: "#b8a6ff", textDecoration: "none", fontSize: 12.5 },

  scrollBox: {
    display: "grid",
    gap: 8,
    overflowY: "auto",
    minHeight: 0,
    maxHeight: "100%",
  },
  forumItem: {
    padding: "8px 10px",
    borderRadius: 10,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  badgeSvc: {
    padding: "2px 6px",
    borderRadius: 999,
    background: "rgba(90,124,255,.18)",
    border: "1px solid rgba(90,124,255,.35)",
    color: "#cfe0ff",
    fontSize: 12,
  },

  select: {
    width: "100%",
    boxSizing: "border-box",
    display: "block",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.16)",
    background: "rgba(20,20,24,.92)",
    color: "#fff",
    outline: "none",
  },

  topRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 10,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    fontSize: 13.5,
  },

  about: {
    justifySelf: "center",
    alignSelf: "center",
    width: "min(420px, 92%)",
    textAlign: "left",
  },
  aboutCols: {
    display: "grid",
    gap: 4,
    marginTop: 8,
    justifyItems: "center",
    textAlign: "center",
  },

  err: { color: "#ff9f9f", margin: "6px 0" },
};

/* árnyékolt definíció */
function svcNameById(id?: number) {
  return undefined;
}
