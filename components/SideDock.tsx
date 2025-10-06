import { Link, useLocation } from "react-router-dom";
import { useState, useMemo } from "react";
import { getToken, isAdmin } from "../utils/auth";

export default function SideDock() {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const loc = useLocation();
  const token = getToken();
  const admin = isAdmin();

  const isActive = (path: string) =>
    loc.pathname === path || (path !== "/" && loc.pathname.startsWith(path + "/"));

  // ha pinnelve van, mindig nyitva marad
  const width = pinned ? 240 : open ? 240 : 0;

  return (
    <>
      {/* Hotzone – hoverre kinyílik, ha nincs pin */}
      {!pinned && (
        <div
          onMouseEnter={() => setOpen(true)}
          style={{ position: "fixed", left: 0, top: 0, width: 10, height: "100vh", zIndex: 50 }}
        />
      )}

      <aside
  onMouseLeave={()=>setOpen(false)}
  style={{
    position: "fixed",
    left: 0,
    top: 16,                 // 0 → 16 (kicsit lejjebb)
    height: "auto",          // "100vh" → "auto"
    maxHeight: "90vh",       // hogy ne lógjon ki, görgőzhető
    overflowY: "auto",       // görgethető, ha hosszabb
    width: open ? 240 : 0,
    background: "rgba(17,17,17,0.92)",
    borderRight: "1px solid rgba(255,255,255,0.08)",
    color: "#fff",
    zIndex: 60,
    transition: "width 180ms ease",
    boxShadow: open ? "8px 0 24px rgba(0,0,0,0.35)" : "none",
    borderRadius: open ? 10 : 0,   // esztétika
  }}
>
        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontWeight: 800 }}>Menü</div>
            <button
              onClick={() => setPinned(p => !p)}
              title={pinned ? "Oldalsáv feloldása" : "Oldalsáv rögzítése"}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#fff",
                borderRadius: 8,
                padding: "4px 8px",
                cursor: "pointer",
              }}
            >
              {pinned ? "📌" : "📍"}
            </button>
          </div>

          <DockLink to="/" active={isActive("/")}>🏠 Kezdőlap</DockLink>
          <DockLink to="/forum" active={isActive("/forum")}>💬 Fórum</DockLink>
          <DockLink to="/map" active={isActive("/map")}>🗺️ Térkép</DockLink>

          {token && <DockLink to="/garage" active={isActive("/garage")}>🚗 Autóim & Időpontok</DockLink>}
          {admin && <DockLink to="/admin" active={isActive("/admin")}>🛠️ Admin</DockLink>}
        </div>
      </aside>
    </>
  );
}

function DockLink({
  to,
  children,
  active,
}: {
  to: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      to={to}
      style={{
        display: "block",
        padding: "10px 12px",
        marginBottom: 8,
        borderRadius: 8,
        textDecoration: "none",
        color: "#fff",
        background: active ? "rgba(108,92,231,0.25)" : "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        fontWeight: 600,
      }}
    >
      {children}
    </Link>
  );
}
