// src/pages/Forum.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axios";
import { parseJwt } from "../utils/auth";

/* ---------- Típusok ---------- */
type Post = {
  id: number;
  authorId?: number;
  authorName?: string;
  content: string;
  title?: string;
  createdAt?: string;
};

type Comment = {
  id: number;
  authorId?: number;
  authorName?: string;
  content: string;
  createdAt?: string;
};

type ServiceCenter = { id: number; name: string; city?: string };

type ReactionType = "LIKE" | "LOVE" | "LAUGH" | "WOW" | "SAD" | "ANGRY";
type ReactionSummary = {
  postId: number;
  counts: Partial<Record<ReactionType, number>>;
  myReaction?: ReactionType | null;
};

/* ---------- URL-ek ---------- */
const URL_FORUM_LIST = "/api/forum/posts";
const URL_FORUM_POST = "/api/forum/posts";
const URL_FORUM_DELETE = (id: number) => `/api/forum/posts/${id}`;

const URL_SERVICES = "/api/centers";

const URL_REACTIONS = (id: number) => `/api/forum/posts/${id}/reactions`;
const URL_REACT_PUT = (id: number, type: ReactionType) =>
  `/api/forum/posts/${id}/react?type=${encodeURIComponent(type)}`;
const URL_REACT_DEL = (id: number) => `/api/forum/posts/${id}/react`;

const URL_COMMENTS_LIST = (postId: number) => `/api/forum/posts/${postId}/comments`;
const URL_COMMENT_ADD = (postId: number) => `/api/forum/posts/${postId}/comments`;
const URL_COMMENT_DEL = (commentId: number) => `/api/forum/comments/${commentId}`;

/* ---------- Segédek ---------- */
const honest = (e: any) => {
  const status = e?.response?.status;
  const data = e?.response?.data;
  try {
    return `(${status ?? "?"}) ${typeof data === "object" ? JSON.stringify(data) : String(data ?? e?.message ?? "Ismeretlen hiba")}`;
  } catch {
    return `(${status ?? "?"}) ${String(e?.message ?? "Ismeretlen hiba")}`;
  }
};

// Rejtett szerviz-címke: [svc:123]
const makeTag = (id: number) => `[svc:${id}] `;
const svcTagRe = /^\[svc:(\d+)\]\s*/;
function peelServiceTag(text: string): { clean: string; serviceId?: number } {
  const m = text.match(svcTagRe);
  if (!m) return { clean: text };
  const id = Number(m[1]);
  return { clean: text.replace(svcTagRe, ""), serviceId: Number.isFinite(id) ? id : undefined };
}

export default function Forum() {
  /* ===== auth info ===== */
  const jwt = parseJwt();
  const myUserId = (jwt?.id ?? jwt?.userId ?? null) as number | null;
  const rolesRaw: string[] =
    Array.isArray(jwt?.roles) ? jwt.roles : typeof jwt?.role === "string" ? [jwt.role] : [];
  const isAdmin = rolesRaw.includes("ADMIN");

  /* ===== Üzenőfal ===== */
  const [posts, setPosts] = useState<Post[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  /* ===== Reakciók ===== */
  const [rx, setRx] = useState<Map<number, ReactionSummary>>(new Map());

  /* ===== Szervizek a címkéhez ===== */
  const [services, setServices] = useState<ServiceCenter[]>([]);

  /* ===== Küldés űrlap ===== */
  const [message, setMessage] = useState("");
  const [linkedServiceId, setLinkedServiceId] = useState<number | "">("");
  const canSend = useMemo(() => message.trim().length > 0, [message]);

  /* ===== Komment állapotok ===== */
  const [openComments, setOpenComments] = useState<Set<number>>(new Set());
  const [commentsByPost, setCommentsByPost] = useState<Map<number, Comment[]>>(new Map());
  const [newComment, setNewComment] = useState<Map<number, string>>(new Map());
  const [busyComments, setBusyComments] = useState<Set<number>>(new Set());

  /* ===== Poszt menü (⋯) ===== */
  const [menuOpenFor, setMenuOpenFor] = useState<number | null>(null);
  const menuRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    const onDocClick = (ev: MouseEvent) => {
      if (menuOpenFor == null) return;
      const ref = menuRefs.current.get(menuOpenFor);
      if (ref && ref.contains(ev.target as Node)) return; // katt a menüben → maradjon
      setMenuOpenFor(null);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuOpenFor]);

  /* ===== Görgetés ===== */
  const listRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = () => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  /* ===== Betöltés ===== */
  useEffect(() => {
    (async () => {
      try {
        setBusy(true);
        const res = await api.get<any>(URL_FORUM_LIST, {
          params: { page: 0, size: 100, sort: "createdAt,asc" },
        });
        const data = res.data;
        const list: Post[] = Array.isArray(data) ? data : data?.content ?? [];
        setPosts(list);

        await Promise.all(
          list.map(async (p) => {
            try {
              const r = await api.get<ReactionSummary>(URL_REACTIONS(p.id));
              setRx((prev) => new Map(prev).set(p.id, r.data));
            } catch {}
          })
        );

        setTimeout(scrollToBottom, 0);
      } catch (e: any) {
        setErr(honest(e));
      } finally {
        setBusy(false);
      }
    })();
  }, []);

  /* ===== Szervizek (dropdown) ===== */
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<ServiceCenter[]>(URL_SERVICES);
        setServices(res.data ?? []);
      } catch (e) {
        console.warn("GET /api/centers hiba:", honest(e));
      }
    })();
  }, []);

  /* ===== Üzenet küldése ===== */
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    try {
      const title = "Tapasztalat"; // backend kompat
      const prefix = typeof linkedServiceId === "number" ? makeTag(linkedServiceId) : "";
      const payload = { title, content: `${prefix}${message.trim()}` };

      const res = await api.post<Post>(URL_FORUM_POST, payload);
      const saved = res.data;
      setPosts((p) => [...p, saved]);
      setMessage("");

      try {
        const s = await api.get<ReactionSummary>(URL_REACTIONS(saved.id));
        setRx((prev) => new Map(prev).set(saved.id, s.data));
      } catch {}

      setTimeout(scrollToBottom, 0);
    } catch (e: any) {
      alert(honest(e));
    }
  };

  /* ===== Poszt törlés (admin vagy tulaj) ===== */
  const canDeletePost = (p: Post) => {
    if (isAdmin) return true;
    if (myUserId && p.authorId && String(myUserId) === String(p.authorId)) return true;
    return false;
  };
  const deletePost = async (p: Post) => {
    if (!canDeletePost(p)) return;
    if (!confirm("Biztosan törlöd a posztot?")) return;
    try {
      await api.delete(URL_FORUM_DELETE(p.id));
      setMenuOpenFor(null);
      setPosts((list) => list.filter((x) => x.id !== p.id));
      setRx((prev) => {
        const m = new Map(prev);
        m.delete(p.id);
        return m;
      });
      setCommentsByPost((prev) => {
        const m = new Map(prev);
        m.delete(p.id);
        return m;
      });
      setOpenComments((prev) => {
        const s = new Set(prev);
        s.delete(p.id);
        return s;
      });
    } catch (e: any) {
      alert(honest(e));
    }
  };

  /* ===== Kommentek ===== */
  const toggleComments = async (postId: number) => {
    const opened = openComments.has(postId);
    if (opened) {
      setOpenComments((prev) => {
        const s = new Set(prev);
        s.delete(postId);
        return s;
      });
      return;
    }
    setOpenComments((prev) => new Set(prev).add(postId));
    if (!commentsByPost.has(postId)) {
      await loadComments(postId);
    }
  };

  const loadComments = async (postId: number) => {
    setBusyComments((prev) => new Set(prev).add(postId));
    try {
      const res = await api.get<Comment[]>(URL_COMMENTS_LIST(postId));
      setCommentsByPost((prev) => new Map(prev).set(postId, res.data ?? []));
    } catch (e: any) {
      alert(honest(e));
    } finally {
      setBusyComments((prev) => {
        const s = new Set(prev);
        s.delete(postId);
        return s;
      });
    }
  };

  const addComment = async (postId: number) => {
    const txt = (newComment.get(postId) || "").trim();
    if (!txt) return;
    setBusyComments((prev) => new Set(prev).add(postId));
    try {
      const res = await api.post<Comment>(URL_COMMENT_ADD(postId), { content: txt });
      setCommentsByPost((prev) => {
        const list = prev.get(postId) || [];
        return new Map(prev).set(postId, [res.data, ...list]);
      });
      setNewComment((prev) => {
        const m = new Map(prev);
        m.set(postId, "");
        return m;
      });
    } catch (e: any) {
      alert(honest(e));
    } finally {
      setBusyComments((prev) => {
        const s = new Set(prev);
        s.delete(postId);
        return s;
      });
    }
  };

  const canDeleteComment = (c: Comment) => {
    if (isAdmin) return true;
    if (myUserId && c.authorId && String(myUserId) === String(c.authorId)) return true;
    return false;
  };

  const deleteComment = async (postId: number, commentId: number) => {
    if (!confirm("Biztosan törlöd a hozzászólást?")) return;
    setBusyComments((prev) => new Set(prev).add(postId));
    try {
      await api.delete(URL_COMMENT_DEL(commentId));
      setCommentsByPost((prev) => {
        const list = (prev.get(postId) || []).filter((x) => x.id !== commentId);
        return new Map(prev).set(postId, list);
      });
    } catch (e: any) {
      alert(honest(e));
    } finally {
      setBusyComments((prev) => {
        const s = new Set(prev);
        s.delete(postId);
        return s;
      });
    }
  };

  /* ===== Megjelenítendő posztok (szerviz tag lecsupaszítása) ===== */
  const viewPosts = useMemo(() => {
    return posts.map((p) => {
      const peeled = peelServiceTag(p.content || "");
      return {
        ...p,
        _serviceId: peeled.serviceId,
        _content: peeled.clean,
      } as Post & { _serviceId?: number; _content: string };
    });
  }, [posts]);

  /* ===== Reakciók ===== */
  const RX: { key: ReactionType; label: string; emoji: string }[] = [
    { key: "LIKE",  emoji: "👍", label: "Tetszik" },
    { key: "LOVE",  emoji: "❤️", label: "Imádom" },
    { key: "LAUGH", emoji: "😂", label: "Vicces" },
    { key: "WOW",   emoji: "😮", label: "Hűha" },
    { key: "SAD",   emoji: "😢", label: "Szomorú" },
    { key: "ANGRY", emoji: "😡", label: "Dühítő" },
  ];

  const react = async (postId: number, type: ReactionType) => {
    const current = rx.get(postId)?.myReaction;
    try {
      if (current === type) {
        await api.delete(URL_REACT_DEL(postId));
      } else {
        await api.put(URL_REACT_PUT(postId, type));
      }
      const s = await api.get<ReactionSummary>(URL_REACTIONS(postId));
      setRx((prev) => new Map(prev).set(postId, s.data));
    } catch (e: any) {
      alert(honest(e));
    }
  };

  /* ---------------------------- UI ---------------------------- */
  return (
    <div style={styles.page}>
      <div style={styles.bgLayer} />

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
                <div style={styles.muted}>Még nincs üzenet. Légy te az első! 🚀</div>
              ) : (
                viewPosts.map((m) => {
                  const svc =
                    typeof (m as any)._serviceId === "number"
                      ? services.find((s) => s.id === (m as any)._serviceId)
                      : undefined;

                  const summary = rx.get(m.id);
                  const counts = summary?.counts || {};
                  const mine = summary?.myReaction || null;

                  const opened = openComments.has(m.id);
                  const cBusy = busyComments.has(m.id);
                  const list = commentsByPost.get(m.id) || [];
                  const newC = newComment.get(m.id) || "";

                  const showMenu = menuOpenFor === m.id;

                  return (
                    <div key={m.id} style={styles.bubble}>
                      <div style={styles.bubbleHead}>
                        {svc ? <span style={styles.badgeSvc}>{svc.name}</span> : null}
                        <strong>{m.authorName ?? "Felhasználó"}</strong>
                        <span style={styles.muted}>
                          {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}
                        </span>

                        {/* ⋯ menü gomb */}
                        <div style={{ marginLeft: "auto", position: "relative" }}>
                          <button
                            type="button"
                            title="Műveletek"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenFor((cur) => (cur === m.id ? null : m.id));
                            }}
                            style={styles.kebabBtn}
                          >
                            ⋯
                          </button>

                          {/* Menü */}
                          {showMenu && (
                            <div
                              ref={(el) => {
                                if (el) menuRefs.current.set(m.id, el);
                              }}
                              style={styles.menu}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {canDeletePost(m) && (
                                <button
                                  onClick={() => deletePost(m)}
                                  style={{ ...styles.menuItem, color: "#ffb0b0" }}
                                >
                                  Poszt törlése
                                </button>
                              )}
                              {!canDeletePost(m) && (
                                <div style={{ ...styles.menuItem, opacity: 0.6, cursor: "default" }}>
                                  Nincs művelet
                                </div>
                              )}
                            </div>
                          )}
                        </div>
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
                              title={r.label}
                              onClick={() => react(m.id, r.key)}
                              style={{
                                ...styles.rxBtn,
                                ...(active ? styles.rxBtnActive : {}),
                              }}
                            >
                              <span style={{ fontSize: 16 }}>{r.emoji}</span>
                              <span style={{ fontSize: 12, opacity: 0.9, minWidth: 16, textAlign: "right" }}>
                                {cnt > 0 ? cnt : ""}
                              </span>
                            </button>
                          );
                        })}

                        <button
                          onClick={() => toggleComments(m.id)}
                          style={{ ...styles.rxBtn, marginLeft: "auto" }}
                          title={opened ? "Hozzászólások elrejtése" : "Hozzászólások megjelenítése"}
                        >
                          💬 <span style={{ fontSize: 12, opacity: 0.9 }}>Hozzászólások</span>
                        </button>
                      </div>

                      {/* Kommentek */}
                      {opened && (
                        <div style={styles.commentsBox}>
                          {cBusy && list.length === 0 ? (
                            <div style={styles.muted}>Betöltés…</div>
                          ) : list.length === 0 ? (
                            <div style={styles.muted}>Még nincs hozzászólás.</div>
                          ) : (
                            <ul style={styles.commentList}>
                              {list.map((c) => (
                                <li key={c.id} style={styles.commentItem}>
                                  <div style={styles.commentHead}>
                                    <strong>{c.authorName ?? "Felhasználó"}</strong>
                                    <span style={styles.muted}>
                                      {c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}
                                    </span>
                                    {canDeleteComment(c) && (
                                      <button
                                        onClick={() => deleteComment(m.id, c.id)}
                                        title="Hozzászólás törlése"
                                        style={styles.btnDangerTiny}
                                      >
                                        Törlés
                                      </button>
                                    )}
                                  </div>
                                  <p style={styles.commentText}>{c.content}</p>
                                </li>
                              ))}
                            </ul>
                          )}

                          <div style={styles.commentForm}>
                            <input
                              placeholder="Írj hozzászólást…"
                              value={newC}
                              onChange={(e) =>
                                setNewComment((prev) => {
                                  const m2 = new Map(prev);
                                  m2.set(m.id, e.target.value);
                                  return m2;
                                })
                              }
                              style={styles.input}
                            />
                            <button
                              onClick={() => addComment(m.id)}
                              disabled={!newC.trim() || cBusy}
                              style={styles.btnSecondary}
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
                placeholder="Írd le a tapasztalatod…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={styles.input}
              />

              <button disabled={!canSend} title="Küldés" style={styles.btnPrimary}>
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
  bgLayer: {
    position: "fixed",
    inset: 0,
    zIndex: 0,
    background:
      "linear-gradient(rgba(5,10,20,0.60), rgba(5,10,20,0.75)), radial-gradient(1200px 520px at left bottom, rgba(70,90,200,.25), transparent 60%), #0b1020",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
  },
  outer: { position: "relative", zIndex: 1, width: "100%", margin: 0, paddingBlock: "20px 60px" },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingInline: "clamp(12px, 2vw, 24px)",
    marginBottom: 10,
  },
  pageTitle: { margin: 0, fontWeight: 900, fontSize: "clamp(22px, 2.2vw, 28px)" },

  chatCard: {
    display: "grid",
    gridTemplateRows: "1fr auto",
    height: "calc(100dvh - 180px)",
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 16,
    overflow: "hidden",
    backdropFilter: "blur(6px)",
  },
  chatMessages: {
    overflow: "auto",
    padding: "14px 14px 0 14px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  bubble: {
    background: "rgba(255,255,255,.05)",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 12,
    padding: "10px 12px",
    position: "relative",
  },
  bubbleHead: {
    display: "flex",
    gap: 8,
    alignItems: "baseline",
    marginBottom: 4,
    flexWrap: "wrap",
  },
  bubbleText: { margin: 0, color: "#eaf1ff", lineHeight: 1.5 },

  chatbox: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 380px) 1fr auto",
    gap: 10,
    padding: 12,
    borderTop: "1px solid rgba(255,255,255,.12)",
    background: "rgba(11,16,32,.55)",
  },
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
  btnSecondary: {
    padding: "8px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.2)",
    background: "rgba(255,255,255,.08)",
    color: "#fff",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  btnDangerTiny: {
    marginLeft: "auto",
    background: "transparent",
    border: "1px solid #ff7b7b",
    color: "#ffb0b0",
    padding: "2px 6px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 11,
  },

  muted: { color: "#9fb1d1", fontSize: 12.5 },
  error: { color: "#ffd7d7" },
  badgeSvc: {
    padding: "2px 6px",
    borderRadius: 999,
    background: "rgba(90,124,255,.18)",
    border: "1px solid rgba(90,124,255,.35)",
    color: "#cfe0ff",
    fontSize: 12,
  },

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
  rxBtnActive: {
    background: "rgba(90,124,255,.18)",
    borderColor: "rgba(90,124,255,.45)",
  },

  commentsBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTop: "1px solid rgba(255,255,255,.08)",
    display: "grid",
    gap: 10,
  },
  commentList: { listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 },
  commentItem: {
    background: "rgba(255,255,255,.04)",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: 10,
    padding: "8px 10px",
  },
  commentHead: {
    display: "flex",
    gap: 8,
    alignItems: "baseline",
    marginBottom: 4,
    flexWrap: "wrap",
  },
  commentText: { margin: 0, color: "#eaf1ff" },

  commentForm: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 8,
    alignItems: "center",
  },

  /* ⋯ gomb + menü */
  kebabBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,.15)",
    background: "rgba(255,255,255,.06)",
    color: "#eaf1ff",
    cursor: "pointer",
    lineHeight: 1,
  },
  menu: {
    position: "absolute",
    right: 0,
    top: 34,
    background: "rgba(20,24,38,.98)",
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 10,
    boxShadow: "0 10px 24px rgba(0,0,0,.35)",
    padding: 6,
    minWidth: 160,
    zIndex: 5,
  },
  menuItem: {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: "none",
    color: "#eaf1ff",
    padding: "8px 10px",
    borderRadius: 8,
    cursor: "pointer",
  } as React.CSSProperties,
};
