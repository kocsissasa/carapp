import { Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Forum from "./pages/Forum";
import Map from "./pages/Map";
import Garage from "./pages/Garage.tsx"; // nálad .tsx kell
import Login from "./pages/Login";
import SideDock from "./components/SideDock";
import { MapsLoaderProvider } from "./context/MapsLoader";

export default function App() {
  const location = useLocation();
  const token = localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    window.location.href = "/";
  };

  // ahol nem kell dokk: login (ha akarsz még, ide veheted: /register stb.)
  const hideDock = location.pathname === "/login";

  return (
    <MapsLoaderProvider>
      <div style={{ color: "#fff", background: "#0b0b0b", minHeight: "100vh" }}>
        {/* Oldalsáv csak ha nem login */}
        {!hideDock && <SideDock />}

        {/* Jobb felső Login/Logout – login oldalon ne jelenjen meg */}
        {!hideDock && (
          <div style={{ position: "fixed", right: 16, top: 16, zIndex: 70 }}>
            {!token ? (
              <a
                href="/login"
                style={{
                  background: "linear-gradient(90deg,#6c5ce7,#a66cff)",
                  color: "#fff",
                  padding: "8px 12px",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontWeight: 700,
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                Login
              </a>
            ) : (
              <button
                onClick={handleLogout}
                style={{
                  background: "transparent",
                  border: "1px solid #fff",
                  color: "#fff",
                  padding: "6px 12px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Logout
              </button>
            )}
          </div>
        )}

        {/* A bal margót is csak akkor add, ha a dokk látszik */}
        <div style={{ marginLeft: hideDock ? 0 : 260, paddingBottom: 32 }}>
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
