import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axios";
import { parseJwt } from "../utils/auth";

/* ---------- Típusok ---------- */
type Post = { id: number; authorId?: number; authorName?: string; content: string; createdAt?: string }; // -> poszt entitás
type Comment = { id: number; authorId?: number; authorName?: string; content: string; createdAt?: string }; // -> komment alak
type ServiceCenter = { id: number; name: string; city?: string }; // -> szerviz entitás

type ReactionType = "LIKE" | "LOVE" | "LAUGH" | "WOW" | "SAD" | "ANGRY"; // -> engedélyezett reakciók
type ReactionSummary = { postId: number; counts: Partial<Record<ReactionType, number>>; myReaction?: ReactionType | null };  // -> backend /reactions összegzés DTO

/* ---------- URL-ek ---------- */
const URL_FORUM_LIST = "/api/forum/posts"; // -> posztok listája
const URL_FORUM_POST = "/api/forum/posts"; // -> új poszt
const URL_FORUM_DELETE = (id: number) => `/api/forum/posts/${id}`; // -> poszt törlése

const URL_COMMENTS = (postId: number) => `/api/forum/posts/${postId}/comments`; // -> kommentek listája + POST
const URL_COMMENT_DELETE_NESTED = (postId: number, commentId: number) => // -> komment törlés
  `/api/forum/posts/${postId}/comments/${commentId}`;

const URL_SERVICES = "/api/centers"; // -> szervizközpontok listája

const URL_REACTIONS = (id: number) => `/api/forum/posts/${id}/reactions`; // -> reakció összegzés GET
const URL_REACT_PUT = (id: number, type: ReactionType) => // -> reakció beállítás (PUT)
  `/api/forum/posts/${id}/react?type=${encodeURIComponent(type)}`;
const URL_REACT_DEL = (id: number) => `/api/forum/posts/${id}/react`; // -> reakció törlés (DELETE)

/* ---------- Segédek ---------- */
const honest = (e: any) => {
  const s = e?.response?.status; // -> HTTP státusz (ha van
  const d = e?.response?.data;  // -> body
  try {
    return `(${s ?? "?"}) ${typeof d === "object" ? JSON.stringify(d) : String(d ?? e?.message ?? "Ismeretlen hiba")}`;
  } catch {
    return `(${s ?? "?"}) ${String(e?.message ?? "Ismeretlen hiba")}`;
  }
};

// Rejtett szerviz-címke: [svc:123]
const svcTagRe = /^\[svc:(\d+)\]\s*/; // -> Regex az elején lévő címkére
const makeTag = (id: number) => `[svc:${id}] `;  // -> Címke generálás
function peelServiceTag(text: string): { clean: string; serviceId?: number } {  // -> Címke „lehántása”
  const m = (text || "").match(svcTagRe); // A SZÖVEG ELEJÉN van-e ilyen címke
  if (!m) return { clean: text || "" }; // Ha nincs vissza az eredeti
  const id = Number(m[1]); // A zárójelek közötti szám
  return { clean: (text || "").replace(svcTagRe, ""), serviceId: Number.isFinite(id) ? id : undefined }; // Címke LEVÉVE: csak a tartalom marad + számot külön vissza
}

/* ---------- mini toast ----------*/
type Toast = { id: number; text: string; tone?: "info" | "warn" | "error" }; // -> értesítés típusa
function useToasts() { // -> saját hook a toastokhoz
  const [toasts, setToasts] = useState<Toast[]>([]);
  const notify = (text: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random(); // -> egyszerű egyedi ID
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2200); // -> 2.2s múlva automatikus eltűnés
  };
  return { toasts, notify };
}


export default function Forum() { // -> alapértelmezett export
  /* ---------- auth info ---------- */
  const jwt = parseJwt(); // -> JWT payload (userId, roles)
  const token = localStorage.getItem("token"); // -> nyers token localStorage-ból
  const isAuthed = !!token;  // -> be van-e jelentkezve
  const myUserId = jwt?.id || jwt?.userId || jwt?.sub || null; // -> user azonosító
  const rolesRaw: string[] = Array.isArray(jwt?.roles) ? jwt.roles : typeof jwt?.role === "string" ? [jwt.role] : []; // -> jogosultság normalizálás
  const isAdmin = rolesRaw.includes("ADMIN"); // -> rendelkezik-e ADMIN jogosultsággal

  const { toasts, notify } = useToasts();

  /* ---------- Üzenőfal ---------- */
  const [posts, setPosts] = useState<Post[]>([]); // -> posztok listája
  const [busy, setBusy] = useState(false); // -> betöltés folyamatban?
  const [err, setErr] = useState(""); // -> hiba üzenet

  /* ---------- Reakciók állapota (postId -> summary) ---------- */
  const [rx, setRx] = useState<Map<number, ReactionSummary>>(new Map()); // -> reakció összegzések tárolása

  /* ---------- Komment állapotok ---------- */
  const [openComments, setOpenComments] = useState<Record<number, boolean>>({}); // -> posztId -> nyitva-e a komment panel
  const [comments, setComments] = useState<Record<number, Comment[]>>({}); // -> posztId -> kommentek
  const [newComment, setNewComment] = useState<Record<number, string>>({}); // -> posztId -> input szövege

  /* ---------- Küldés űrlap ---------- */
  const [message, setMessage] = useState(""); // -> új poszt szöveg
  const [linkedServiceId, setLinkedServiceId] = useState<number | "">(""); // -> opcionális szerviz ID

  const canSend = useMemo(() => message.trim().length > 0, [message]); // -> van-e tényleges küldhető szöveg

  /* ---------- Görgetés alulra ---------- */
  const listRef = useRef<HTMLDivElement | null>(null); // -> a görgethető üzenetlista
  const scrollToBottom = () => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight; // -> aljára ugrik
  };

  /* ---------- Betöltés ---------- */
  useEffect(() => {
    (async () => {
      try {
        setBusy(true); // -> posztok lekérése
        const res = await api.get<any>(URL_FORUM_LIST, { params: { page: 0, size: 100, sort: "createdAt,asc" } });
        const data = res.data;
        const list: Post[] = Array.isArray(data) ? data : data?.content ?? [];
        setPosts(list);

        // reakciók betöltése
        await Promise.all(
          list.map(async (p) => {
            try {
              const r = await api.get<ReactionSummary>(URL_REACTIONS(p.id));
              setRx((prev) => new Map(prev).set(p.id, r.data)); // -> új Map, hogy a React észrevegye a változást
            } catch (e) {
              console.debug("Reactions load failed for post", p.id, honest(e)); // -> nem kritikus hiba
            }
          })
        );

        setTimeout(scrollToBottom, 0);
      } catch (e: any) {
        setErr(honest(e)); // -> emberi hiba a UI-n
      } finally {
        setBusy(false);
      }
    })();
  }, []);

  /* ---------- Szerviz lista a dropdownhoz ---------- */
  const [services, setServices] = useState<ServiceCenter[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<ServiceCenter[]>(URL_SERVICES);
        setServices(res.data ?? []);
      } catch (e) {
        console.warn("GET /api/centers hiba:", honest(e)); // -> nem kritikus
      }
    })();
  }, []);

  /* ---------- Üzenet küldése ---------- */
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault(); // -> form submit ne reloadoljon
    if (!canSend) return; // -> üres üzenetet ne küldjünk
    if (!isAuthed) { // -> auth guard
      notify("Ehhez jelentkezz be.", "warn");
      return;
    }

    try {
      const title = "Tapasztalat"; // -> backend oldalon title kezelve
      const prefix = typeof linkedServiceId === "number" ? makeTag(linkedServiceId) : "";
      const payload = { title, content: `${prefix}${message.trim()}` };

      const res = await api.post<Post>(URL_FORUM_POST, payload); // -> poszt mentése
      const saved = res.data;
      setPosts((p) => [...p, saved]); // -> lista végére tesszük
      setMessage(""); // -> input ürítése

      // friss reakció összegzés ehhez a posthoz
      try {
        const s = await api.get<ReactionSummary>(URL_REACTIONS(saved.id));
        setRx((prev) => new Map(prev).set(saved.id, s.data));
      } catch {}

      setTimeout(scrollToBottom, 0); // -> chat aljára ugrás
    } catch (e: any) {
      alert(honest(e)); // -> egyszerű hiba popup
    }
  };

  /* ---------- Poszt törlése (admin vagy tulaj) ---------- */
  const canDeletePost = (p: Post) => { // -> jogosultság ellenőrzés
    if (isAdmin) return true;
    if (myUserId && p.authorId && String(myUserId) === String(p.authorId)) return true;
    return false;
  };

  const deletePost = async (p: Post) => { // -> törlés megerősítéssel
    if (!canDeletePost(p)) return;
    if (!confirm("Biztosan törlöd a posztot?")) return;
    try {
      await api.delete(URL_FORUM_DELETE(p.id));
      setPosts((list) => list.filter((x) => x.id !== p.id)); // -> lokális lista frissítése
      setRx((prev) => {
        const m = new Map(prev); // -> reakció cache takarítása
        m.delete(p.id);
        return m;
      });
    } catch (e: any) {
      alert(honest(e));
    }
  };

  /* ---------- Reagálás / törlés ---------- */
  const react = async (postId: number, type: ReactionType) => {
    if (!isAuthed) {
      notify("Ehhez jelentkezz be.", "warn"); // -> auth guard
      return;
    }

    const current = rx.get(postId)?.myReaction; // -> mostani reakcióm
    try {
      if (current === type) {
        await api.delete(URL_REACT_DEL(postId)); // -> ugyanazt katt → törlés
      } else {
        await api.put(URL_REACT_PUT(postId, type)); // -> új típus → beállítás
      }
      const s = await api.get<ReactionSummary>(URL_REACTIONS(postId)); // -> friss összegzés
      setRx((prev) => new Map(prev).set(postId, s.data));
    } catch (e: any) {
      alert(honest(e));
    }
  };

  /* ---------- Kommentek ---------- */
  const toggleComments = async (postId: number) => {
    const open = !openComments[postId];  // -> toggle állapot
    setOpenComments((s) => ({ ...s, [postId]: open }));
    if (open && !comments[postId]) { // -> első nyitáskor töltse le a kommenteket
      try {
        const res = await api.get<Comment[]>(URL_COMMENTS(postId));
        setComments((m) => ({ ...m, [postId]: res.data || [] }));
      } catch (e: any) {
        alert(honest(e));
      }
    }
  };

  /* ---------- Kommentek hozzáadása ---------- */
  const addComment = async (postId: number) => {
    if (!isAuthed) { // -> auth guard
      notify("Ehhez jelentkezz be.", "warn");
      return;
    }

    const text = (newComment[postId] || "").trim(); // -> input érték
    if (!text) return; // -> üres ne menjen
    try {
      const res = await api.post<Comment>(URL_COMMENTS(postId), { content: text });
      setComments((m) => ({ ...m, [postId]: [...(m[postId] || []), res.data] })); // -> append
      setNewComment((n) => ({ ...n, [postId]: "" })); // -> input ürítése
    } catch (e: any) {
      alert(honest(e));
    }
  };

  /* ---------- Komment törlése  ---------- */
  const removeComment = async (postId: number, commentId: number) => { // -> admin vagy szerző törölhet (backend is ellenőrzi)
    if (!isAuthed) { notify("Ehhez jelentkezz be.", "warn"); return; }
    if (!confirm("Biztosan törlöd a hozzászólást?")) return;
    try {
      await api.delete(URL_COMMENT_DELETE_NESTED(postId, commentId)); // -> nested útvonal használata
      setComments((m) => ({ ...m, [postId]: (m[postId] || []).filter(c => c.id !== commentId) })); // -> lokális törlés
    } catch (e: any) {
      alert(honest(e));
    }
  };

  /* ---------- Megjelenítendő posztok: tartalomból kiszedjük a [svc:ID]-t ---------- */
  const viewPosts = useMemo(() => {
    return posts.map((p) => {
      const peeled = peelServiceTag(p.content || ""); // -> { clean, serviceId }
      return {
        ...p,
        _serviceId: peeled.serviceId,
        _content: peeled.clean, // -> a valós megjelenítendő tartalom
      } as Post & { _serviceId?: number; _content: string };
    });
  }, [posts]);

  /* ---------- Reakció gombok meta ---------- */
  const RX: { key: ReactionType; label: string; emoji: string }[] = [
    { key: "LIKE", emoji: "👍", label: "Tetszik" },
    { key: "LOVE", emoji: "❤️", label: "Imádom" },
    { key: "LAUGH", emoji: "😂", label: "Vicces" },
    { key: "WOW", emoji: "😮", label: "Hűha" },
    { key: "SAD", emoji: "😢", label: "Szomorú" },
    { key: "ANGRY", emoji: "😡", label: "Dühítő" },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.bgLayer} />

      {/* toastok – ALSÓ KÖZÉPEN */}
      <div style={styles.toastWrap} aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              ...styles.toast,
              ...(t.tone === "warn" ? styles.toastWarn : t.tone === "error" ? styles.toastError : {}),
            }}
          >
            {t.text}
          </div>
        ))}
      </div>

      <div style={styles.outer}>
        <header style={styles.headerRow}>
          <h1 style={styles.pageTitle}>Üzenőfal</h1>
        </header>

        <main style={{ paddingInline: "clamp(12px, 2vw, 24px)" }}>
          <div style={styles.chatCard}>
            {/* Üzenetek */}
            <div ref={listRef} style={styles.chatMessages} aria-live="polite">
              {busy ? (
                <div style={styles.muted}>Üzenetek betöltése…</div>
              ) : err ? (
                <div style={styles.error}>{err}</div>
              ) : viewPosts.length === 0 ? (
                <div style={styles.muted}>Még nincs üzenet. 🚀</div>
              ) : (
                viewPosts.map((m) => {
                  // -> ha a szöveg elején [svc:ID] volt, badge-ben kiírjuk a szerviz nevét
                  const svc =
                    typeof (m as any)._serviceId === "number"
                      ? services.find((s) => s.id === (m as any)._serviceId)
                      : undefined;

                  const summary = rx.get(m.id);  // -> reakció összegzés
                  const counts = summary?.counts || {};
                  const mine = summary?.myReaction || null;

                  const canDelete = isAdmin || (myUserId && m.authorId && String(myUserId) === String(m.authorId)); // -> törlés gomb adminnak vagy szerzőnek

                  return (
                    <div key={m.id} style={styles.bubble}>
                      <div style={styles.bubbleHead}>
                        <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                          {svc ? (
                            <span style={styles.badgeSvc}>
                              {svc.name}
                              {svc.city ? ` — ${svc.city}` : ""}
                            </span>
                          ) : null}
                          <strong>{m.authorName ?? "Felhasználó"}</strong>
                          <span style={styles.muted}>{m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}</span>
                        </div>

                        {canDelete && (
                          <button onClick={() => deletePost(m)} title="Poszt törlése" style={styles.btnDangerSmall}>
                            Törlés
                          </button>
                        )}
                      </div>

                      <p style={styles.bubbleText}>{(m as any)._content ?? m.content}</p>

                      {/* Reakció sor */}
                      <div style={styles.rxRow}>
                        {RX.map((r) => {
                          const active = mine === r.key;
                          const cnt = counts[r.key] ?? 0;
                          return (
                            <button
                              key={r.key}
                              title={isAuthed ? r.label : "Jelentkezz be a reagáláshoz"}
                              onClick={() => react(m.id, r.key)}
                              style={{
                                ...styles.rxBtn,
                                ...(active ? styles.rxBtnActive : {}),
                                opacity: isAuthed ? 1 : 0.9,
                              }}
                            >
                              <span style={{ fontSize: 16 }}>{r.emoji}</span>
                              <span style={{ fontSize: 12, opacity: 0.9, minWidth: 16, textAlign: "right" }}>
                                {cnt > 0 ? cnt : ""}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Kommentek */}
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                        <button style={styles.smallBtn} onClick={() => toggleComments(m.id)}>
                          Hozzászólások
                        </button>
                      </div>

                      {openComments[m.id] && (
                        <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                          {(comments[m.id] || []).map((c) => {
                            const cManage =
                              isAdmin || (myUserId && c.authorId && String(myUserId) === String(c.authorId));
                            return (
                              <div key={c.id} style={styles.commentRow}>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 8,
                                    alignItems: "baseline",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <div>
                                    <strong>{c.authorName ?? "Felhasználó"}</strong>{" "}
                                    <span style={styles.muted}>
                                      {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
                                    </span>
                                  </div>
                                  {cManage && (
                                    <button
                                      style={styles.btnDeleteGhost}
                                      onClick={() => removeComment(m.id, c.id)}
                                    >
                                      Törlés
                                    </button>
                                  )}
                                </div>
                                <div style={{ color: "#eaf1ff", marginTop: 4 }}>{c.content}</div>
                              </div>
                            );
                          })}

                          <div style={{ display: "flex", gap: 8 }}>
                            <input
                              placeholder={isAuthed ? "Írj hozzászólást…" : "Jelentkezz be a hozzászóláshoz"}
                              value={newComment[m.id] || ""}
                              onChange={(e) => setNewComment((n) => ({ ...n, [m.id]: e.target.value }))}
                              style={styles.input}
                              disabled={!isAuthed}
                            />
                            <button
                              style={{
                                ...styles.btnPrimary,
                                opacity: isAuthed ? 1 : 0.8,
                                cursor: isAuthed ? "pointer" : "not-allowed",
                              }}
                              onClick={() => addComment(m.id)}
                              title={isAuthed ? "Küldés" : "Bejelentkezés szükséges"}
                              disabled={!isAuthed}
                            >
                              Küldés
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Új üzenet */}
            <form style={styles.chatbox} onSubmit={sendMessage}>
              <select
                value={linkedServiceId}
                onChange={(e) => setLinkedServiceId(e.target.value ? Number(e.target.value) : "")}
                style={styles.select}
                aria-label="Kapcsold szervizhez (opcionális)"
              >
                <option value="">Kapcsold szervizhez… (opcionális)</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.city ? `— ${s.city}` : ""}
                  </option>
                ))}
              </select>

              <input
                placeholder={isAuthed ? "Írd le a tapasztalatod…" : "Jelentkezz be a posztoláshoz"}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={styles.input}
                disabled={!isAuthed}
              />

              <button
                disabled={!canSend || !isAuthed}
                title={isAuthed ? "Küldés" : "Bejelentkezés szükséges"}
                style={{
                  ...styles.btnPrimary,
                  opacity: isAuthed ? 1 : 0.8,
                  cursor: isAuthed ? "pointer" : "not-allowed",
                }}
              >
                Küldés
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ---------------------------- Stílusok ---------------------------- */
const styles: Record<string, React.CSSProperties> = {
  page: { position: "relative", minHeight: "100vh", color: "#eaf1ff", overflowX: "hidden" },

  
  // Fix háttér: kép + sötét film (jobb olvashatóság)
  bgLayer: {
    position: "fixed",
    inset: 0,
    zIndex: 0,
    background: "linear-gradient(rgba(5,10,20,0.55), rgba(5,10,20,0.75)), url('/forum.jpg') center/cover no-repeat",
  },

  // -> belső wrapper: max szélesség, középre igazítva
  outer: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 1550,
    margin: "0 auto",
    paddingBlock: "20px 60px",
    boxSizing: "border-box",
    minWidth: 0,
  },

  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingInline: "clamp(12px, 2vw, 24px)",
    marginBottom: 10,
  },
  pageTitle: { margin: 0, fontWeight: 900, fontSize: "clamp(22px, 2.2vw, 28px)" },

  // -> üvegkártya: felül lista, alul input sáv (grid: 1fr + auto)
  chatCard: {
    display: "grid",
    gridTemplateRows: "1fr auto",
    height: "calc(100dvh - 180px)", // -> teljes magasságból fejlécek levonva
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 16,
    overflow: "hidden",
    backdropFilter: "blur(6px)",
  },
   // -> görgethető üzenetlista
  chatMessages: {
    overflow: "auto",
    padding: "14px 14px 0 14px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minWidth: 0,
  },
  // -> egy „buborék” (poszt)
  bubble: {
    background: "rgba(255,255,255,.05)",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 12,
    padding: "10px 12px",
  },
  bubbleHead: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    flexWrap: "wrap",
  },
  bubbleText: { margin: 0, color: "#eaf1ff", lineHeight: 1.5 },

  // -> reakció gombsor
  rxRow: { display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" },
  rxBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 8px",
    borderRadius: 999,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.10)",
    color: "#eaf1ff",
    cursor: "pointer",
  } as React.CSSProperties,
  rxBtnActive: { background: "rgba(90,124,255,.18)", borderColor: "rgba(90,124,255,.45)" }, // -> aktív jelzés

   // -> input sáv (dropdown + üzenet + küldés)
  chatbox: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 380px) 1fr auto", // -> dropdown min/max, üzenet nő, gomb fix
    gap: 10,
    padding: 12,
    borderTop: "1px solid rgba(255,255,255,.12)",
    background: "rgba(11,16,32,.55)",
  },

  // -> mezők/gombok egységes neon/üveg stílusban
  input: {
    background: "rgba(255,255,255,.08)",
    border: "1px solid rgba(255,255,255,.12)",
    color: "#eaf1ff",
    padding: "10px 12px",
    borderRadius: 10,
    outline: "none",
    width: "100%",
  },
  select: {
    background: "rgba(17,20,30,.95)",
    border: "1px solid rgba(255,255,255,.16)",
    color: "#eaf1ff",
    padding: "10px 12px",
    borderRadius: 10,
    outline: "none",
    width: "100%",
    appearance: "auto",
  },
  btnPrimary: {
    padding: "10px 16px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.2)",
    background: "linear-gradient(180deg, #5a7cff, #4160ff)",
    color: "#fff",
    cursor: "pointer",
  },
  btnDangerSmall: {
    background: "transparent",
    border: "1px solid #ff7b7b",
    color: "#ffb0b0",
    padding: "3px 8px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 12,
  },
  btnDeleteGhost: {
    padding: "6px 10px",
    borderRadius: 8,
    background: "transparent",
    border: "1px solid #ff6b6b",
    color: "#ffb0b0",
    cursor: "pointer",
  },
  smallBtn: {
    padding: "6px 10px",
    borderRadius: 8,
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.12)",
    color: "#eaf1ff",
    cursor: "pointer",
  },

  muted: { color: "#9fb1d1", fontSize: 12.5 }, // -> halvány szöveg
  error: { color: "#ffd7d7" }, // -> hiba szín

  // -> szerviz badge (ha [svc:ID] volt)
  badgeSvc: {
    padding: "2px 6px",
    borderRadius: 999,
    background: "rgba(90,124,255,.18)",
    border: "1px solid rgba(90,124,255,.35)",
    color: "#cfe0ff",
    fontSize: 12,
  },

  // -> komment kártya
  commentRow: {
    background: "rgba(255,255,255,.04)",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 10,
    padding: "8px 10px",
  },

  /* --- TOAST: alsó közép, snackbar --- */
  toastWrap: {
    position: "fixed",
    bottom: 24,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 200,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    alignItems: "center",
    pointerEvents: "none", // -> ne fogja el a kattintást
  },
  toast: {
    padding: "10px 18px",
    borderRadius: 12,
    background: "rgba(20,24,40,0.88)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#eaf1ff",
    boxShadow: "0 8px 25px rgba(0,0,0,0.45)",
    fontWeight: 700,
    fontSize: 14,
    backdropFilter: "blur(8px)",
  },
  toastWarn: {
    background: "rgba(255,200,60,0.15)",
    border: "1px solid rgba(255,200,60,0.4)",
    color: "#ffe7b5",
  },
  toastError: {
    background: "rgba(255,99,132,0.15)",
    border: "1px solid rgba(255,99,132,0.4)",
    color: "#ffd6df",
  },
};
