import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

/** Kompakt, neon SideDock – állítja a --dock-w CSS változót (220px / 72px) */
export default function SideDock() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  // CSS változó beállítása
  const applyDockWidth = (isCollapsed: boolean) => {
    const w = isCollapsed ? "72px" : "220px";
    document.documentElement.style.setProperty("--dock-w", w);
  };

  // indulás + resizere automatikus állapot
  useEffect(() => {
    const onResize = () => {
      const isColl = window.innerWidth < 1100;
      setCollapsed(isColl);
      applyDockWidth(isColl);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // manuális toggle esetén is frissítjük a CSS változót
  useEffect(() => {
    applyDockWidth(collapsed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed]);

  return (
    <>
      {/* Komponenshez tartozó inline CSS */}
      <style>{css}</style>

      {/* Gyökér elem; .collapsed class a vizuális állapothoz */}
      <aside className={`sd-root ${collapsed ? "collapsed" : ""}`}>
        {/* Fejléc: kis „dot”, cím, és toggle gomb */}
        <div className="sd-header">
          <span className="sd-dot" />
          <span className="sd-title">Menü</span>

          {/* Összecsuk/kinyit gomb */}
          <button
            className="sd-toggle"
            onClick={() => setCollapsed(c => !c)}
            aria-label="Oldalsáv nyit/zár"
            title={collapsed ? "Oldalsáv kinyitása" : "Oldalsáv összecsukása"}
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        {/* Egy nav-link: ikon + felirat + aktív pip */}
        <nav className="sd-nav">
          <DockLink to="/"       label="Kezdőlap"  icon={<IconHome />}   active={location.pathname === "/"} />
          <DockLink to="/forum"  label="Fórum"     icon={<IconForum />}  active={location.pathname.startsWith("/forum")} />
          <DockLink to="/map"    label="Térkép"    icon={<IconMap />}    active={location.pathname.startsWith("/map")} />
          <DockLink to="/garage" label="Garázs"    icon={<IconGarage />} active={location.pathname.startsWith("/garage")} />
          <DockLink to="/login"  label="Belépés"   icon={<IconLogin />}  active={location.pathname.startsWith("/login")} />
        </nav>
      </aside>
    </>
  );
}

function DockLink({
  to, label, icon, active,
}: { to: string; label: string; icon: React.ReactNode; active: boolean }) {
  return (
    <NavLink to={to} className={`sd-link ${active ? "active" : ""}`}>
      <span className="sd-ico">{icon}</span>
      <span className="sd-text">{label}</span>
      {active && <span className="sd-pip" />}
    </NavLink>
  );
}

/* ---------- ikonok (18px) ---------- */
function IconHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M3 11L12 3l9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9z" stroke="#cfe0ff" strokeWidth="1.6"/>
    </svg>
  );
}
function IconForum() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 5h12v9H6l-2 2V5z" stroke="#cfe0ff" strokeWidth="1.6"/>
      <path d="M20 7v9l-2-2h-2" stroke="#cfe0ff" strokeWidth="1.6"/>
    </svg>
  );
}
function IconMap() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M9 6l6-2 6 2v12l-6 2-6-2-6 2V8l6-2v12" stroke="#cfe0ff" strokeWidth="1.6"/>
    </svg>
  );
}
function IconGarage() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M3 10l9-6 9 6v10H3V10z" stroke="#cfe0ff" strokeWidth="1.6"/>
      <path d="M7 20v-6h10v6" stroke="#cfe0ff" strokeWidth="1.6"/>
    </svg>
  );
}
function IconLogin() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M10 7V5a2 2 0 0 1 2-2h7v18h-7a2 2 0 0 1-2-2v-2" stroke="#cfe0ff" strokeWidth="1.6"/>
      <path d="M3 12h11M8 7l-5 5 5 5" stroke="#cfe0ff" strokeWidth="1.6"/>
    </svg>
  );
}

/* ---------- CSS ---------- */
const css = `
/* Rögzített oldalsáv a bal oldalon */
.sd-root{
  position: fixed;
  top: 0; left: 0;   /* bal felső sarokból indul */
  width: var(--dock-w, 220px);     /* <-- SZÉLESSÉG A CSS VAR-BÓL */
  height: 100dvh;  /* a teljes dokumentum-viewport magasság */
  background: rgba(10,12,20,.72);
  border-right: 1px solid rgba(255,255,255,.08); /* finom elválasztó vonal a fő tartalomtól */
  backdrop-filter: blur(8px); /* ÜVEG: a mögöttes tartalmat elmosva mutatja */
  z-index: 60;
}

/* Fejléc */
.sd-header{
  display:flex; align-items:center; gap:8px;  /* vízszintes sorba rakja az elemeket, középre igazítva */
  padding:12px 10px 10px 12px; /* felső/oldal/belső margók */
}

.sd-dot{
  width:8px; height:8px; border-radius:999px; /* kör alak */
  background: radial-gradient(circle at 40% 40%, #6c5ce7, #a66cff); /* lila-lilás átmenet */
  box-shadow: 0 0 12px rgba(166,108,255,.6); /* izzás fényhatás */
}

.sd-title{
 font-weight:800;   /* vastag cím */
 letter-spacing:.3px; 
 opacity:.95;  /* minimális áttetszőség az üveg hatáshoz */
 }

 /* Összecsuk/nyit gomb */
.sd-toggle{
  margin-left:auto;  /* a jobb szélre tolja */
  background:transparent;  /* átlátszó gomb */
  color:#cfe0ff; /* világoskék */
  border:1px solid rgba(255,255,255,.18); /* finom körvonal */
  width:24px; height:24px;  /* négyzetes kicsi gomb */
  border-radius:8px;  
  cursor:pointer; /* interaktív jelzés */
}

/* Link lista */
.sd-nav{
 display:grid; gap:6px; /* kártyák rácsban, 6px távolsággal *
 padding:6px; } /* körben belső térköz */

 /* Link kártya */
.sd-link{
  position:relative;
  display:flex; align-items:center; gap:10px; /* ikon + felirat egysorban */
  color:#eaf1ff; text-decoration:none; /* világos szöveg a sötét háttéren, nincs aláhúzás */
  padding:8px 10px; border-radius:10px;
  border:1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.04); /* enyhén áttetsző kártya */
  transition: 
    transform .15s ease,   /* pici lebegés hoverre */
    background .15s ease, 
    border-color .15s ease; /* sima animációk */
}

/* Hover állapot – enyhe felemelkedés és kontraszt */
.sd-link:hover{
  transform: translateY(-1px);
  background: rgba(255,255,255,.06);
  border-color: rgba(255,255,255,.14); 
}

/* Aktív link: lilás glow és erősebb keret */
.sd-link.active
{
  background: radial-gradient(120% 100% at 0% 0%, rgba(108,92,231,.25), rgba(255,255,255,.06));
  border-color: rgba(166,108,255,.45);
}

/* Ikon és felirat méretezés */
.sd-ico
{
 width:18px; height:18px;
 display:grid; place-items:center;  /* középre igazítás */
}

.sd-text{
  font-weight:700;   /* félkövér felirat */
  font-size:13.5px;
  white-space:nowrap; /* ne törjön sorba */
  overflow:hidden; text-overflow:ellipsis; /* ha nem fér ki, három ponttal vágjuk */
}

/* Összecsukott állapot: csak ikonok látszanak */
.sd-root.collapsed .sd-text{ display:none; }

/* Aktív "pip" */
.sd-pip{
  position:absolute; right:8px; /* jobb oldalra tesszük */
  width:8px; height:8px; border-radius:999px; /* kör alak */
  background: radial-gradient(circle at 40% 40%, #6c5ce7, #a66cff); /* egyezik a dot-tal */
  box-shadow: 0 0 10px rgba(166,108,255,.8); /* erős izzás */
}
`;
