import { Routes, Route, useLocation, Link } from "react-router-dom";
import Home from "./pages/Home";
import Forum from "./pages/Forum";
import Map from "./pages/Map";
import Garage from "./pages/Garage";
import Login from "./pages/Login";
import SideDock from "./components/SideDock";
import { MapsLoaderProvider } from "./context/MapsLoader";
import { useEffect } from "react";
import "./App.css";

export default function App() {
  const location = useLocation();
  const token = localStorage.getItem("token");

  const hideDock = location.pathname === "/login";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    window.location.href = "/";
  };

  // ha a dokkot elrejtjük (pl. /login), a --dock-w legyen 0px
  useEffect(() => {
    if (hideDock) {
      document.documentElement.style.setProperty("--dock-w", "0px");
    } else {
      const cur = getComputedStyle(document.documentElement).getPropertyValue("--dock-w").trim();
      if (!cur) document.documentElement.style.setProperty("--dock-w", "220px");
    }
  }, [hideDock]);

  return (
    <MapsLoaderProvider>
      <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff" }}>
        {!hideDock && <SideDock />}

        {!hideDock && (
          <div style={{ position: "fixed", right: 16, top: 16, zIndex: 70, display: "flex", gap: 8 }}>
            {!token ? (
              <Link
                to="/login"
                style={{
                  background: "linear-gradient(90deg,#6c5ce7,#a66cff)",
                  color: "#fff",
                  padding: "8px 12px",
                  borderRadius: 10,
                  textDecoration: "none",
                  fontWeight: 800,
                  border: "1px solid rgba(255,255,255,.14)",
                  boxShadow: "0 8px 28px rgba(108,92,231,.35)",
                }}
              >
                Bejelentkezés
              </Link>
            ) : (
              <button
                onClick={handleLogout}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,.35)",
                  color: "#fff",
                  padding: "8px 12px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontWeight: 800,
                  backdropFilter: "blur(4px)",
                }}
              >
                Kijelentkezés
              </button>
            )}
          </div>
        )}

        {/*  Tartalmi wrapper: a dock szélessége paddingként, box-sizing és overflow fix */}
        <div
          style={{
            paddingLeft: "var(--dock-w, 220px)",
            transition: "padding-left .18s ease",
            minHeight: "100vh",
            width: "100%",
            boxSizing: "border-box",
            overflowX: "hidden",
          }}
        >
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/forum" element={<Forum />} />
            <Route path="/map" element={<Map key="map-route" />} />
            <Route path="/garage" element={<Garage />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </div>
      </div>
    </MapsLoaderProvider>
  );
}
