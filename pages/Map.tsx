import { useEffect, useMemo, useRef, useState } from "react";
import { useMapsApi } from "../context/MapsLoader";

type PlaceLite = {
  name: string;
  lat: number;
  lng: number;
  distanceKm?: number;
  brand?: string;
};

const BRANDS = ["MOL", "Shell", "OMV", "Oplus"];

const getPrice = (k: string, def: number) => {
  const v = (import.meta as any).env[`VITE_PRICE_${k}`];
  const n = v ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : def;
};
const FUEL_PRICES = {
  "95-ös": getPrice("95", 593),
  Dízel: getPrice("DIESEL", 597),
  "Keverék": getPrice("KEVEREK", 645),
  LPG: getPrice("LPG", 334),
  CNG: getPrice("CNG", 810),
};

export default function MapPage() {
  const api = useMapsApi();

  // Native Maps referenciák
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObj = useRef<google.maps.Map | null>(null);
  const youMarker = useRef<google.maps.Marker | null>(null);
  const dstMarker = useRef<google.maps.Marker | null>(null);
  const dirRenderer = useRef<google.maps.DirectionsRenderer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // UI állapot
  const [you, setYou] = useState<{ lat: number; lng: number } | null>(null);
  const [dst, setDst] = useState<{ lat: number; lng: number } | null>(null);
  const [places, setPlaces] = useState<PlaceLite[]>([]);
  const [routeKm, setRouteKm] = useState<number | null>(null);
  const [routeMin, setRouteMin] = useState<number | null>(null);

  // SZŰRŐ
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());

  // ---- init + auto locate ----
  useEffect(() => {
    if (!api || !mapRef.current || mapObj.current) return;

    const map = new api.maps.Map(mapRef.current, {
      center: { lat: 47.4979, lng: 19.0402 },
      zoom: 12,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: true,
      styles: BLUE_MAP_STYLE,
    });
    mapObj.current = map;

    dirRenderer.current = new api.maps.DirectionsRenderer({
      suppressMarkers: true,
      preserveViewport: false,
      polylineOptions: { strokeColor: "#6c5ce7", strokeWeight: 6, strokeOpacity: 0.95 },
    });
    dirRenderer.current.setMap(map);

    autoLocate();

    return () => {
      markersRef.current.forEach(m => m.setMap(null as any));
      markersRef.current = [];
      dirRenderer.current?.setMap(null as any);
      dirRenderer.current = null;
      mapObj.current = null;
      youMarker.current = null;
      dstMarker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  // ---- saját hely ----
  const autoLocate = () => {
    if (!api || !mapObj.current || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setYou(p);
        mapObj.current!.setCenter(p);
        mapObj.current!.setZoom(13);

        if (!youMarker.current) {
          youMarker.current = new api.maps.Marker({
            position: p,
            map: mapObj.current!,
            title: "Saját helyzet",
            icon: {
              path: api.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#10b981",
              fillOpacity: 1,
              strokeColor: "#0d946a",
            },
          });
        } else {
          youMarker.current.setPosition(p);
        }

        searchGasStations(p);
      },
      () => {
        const c = mapObj.current!.getCenter()!;
        searchGasStations({ lat: c.lat(), lng: c.lng() });
      },
      { enableHighAccuracy: true, timeout: 4000 }
    );
  };

  // ---- benzinkutak keresése ----
  const searchGasStations = (center: { lat: number; lng: number }) => {
    if (!api || !mapObj.current) return;
    const service = new api.maps.places.PlacesService(mapObj.current);

    service.nearbySearch(
      { location: center, radius: 7000, type: "gas_station" },
      (res, status) => {
        if (status !== api.maps.places.PlacesServiceStatus.OK || !res) return;

        const list: PlaceLite[] = res.map((p) => {
          const name = p.name || "Benzinkút";
          return {
            name,
            lat: p.geometry?.location?.lat() ?? center.lat,
            lng: p.geometry?.location?.lng() ?? center.lng,
            brand: detectBrand(name),
          };
        });

        const withDist = (you
          ? list.map((pl) => ({ ...pl, distanceKm: haversine(you.lat, you.lng, pl.lat, pl.lng) }))
          : list
        ).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

        setPlaces(withDist);
      }
    );
  };

  // látható (szűrt) lista
  const visiblePlaces = useMemo(() => {
    if (selectedBrands.size === 0) return places;
    return places.filter((p) => p.brand && selectedBrands.has(p.brand));
  }, [places, selectedBrands]);

  // marker-eket a látható listához igazítjuk
  useEffect(() => {
    if (!api || !mapObj.current) return;

    // törlés
    markersRef.current.forEach(m => m.setMap(null as any));
    markersRef.current = [];

    // újrarajzolás
    visiblePlaces.forEach((pl) => {
      const m = new api.maps.Marker({
        position: { lat: pl.lat, lng: pl.lng },
        map: mapObj.current!,
        icon: { url: "https://maps.gstatic.com/mapfiles/ms2/micons/gas.png" },
        title: pl.name,
      });
      m.addListener("click", () => setNewDestination(pl));
      markersRef.current.push(m);
    });

    // ha a jelenlegi célpont kiesett a szűrés miatt: váltsunk az elsőre
    if (visiblePlaces.length > 0 && (!dst || !visiblePlaces.some(v => almostEq(v, dst)))) {
      setNewDestination(visiblePlaces[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visiblePlaces]);

  // ---- célpont + útvonal ----
  const setNewDestination = (pl: PlaceLite) => {
    if (!api || !mapObj.current) return;
    const p = { lat: pl.lat, lng: pl.lng };
    setDst(p);

    if (!dstMarker.current) {
      dstMarker.current = new api.maps.Marker({
        position: p,
        map: mapObj.current!,
        title: pl.name,
        icon: "https://maps.gstatic.com/mapfiles/ms2/micons/flag.png",
      });
    } else {
      dstMarker.current.setPosition(p);
      dstMarker.current.setTitle(pl.name);
    }

    mapObj.current!.panTo(p);
    if (you) buildRoute(you, p);
  };

  const buildRoute = async (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
    if (!api || !mapObj.current) return;
    const service = new api.maps.DirectionsService();
    const res = await service.route({
      origin: from,
      destination: to,
      travelMode: api.maps.TravelMode.DRIVING,
      provideRouteAlternatives: false,
    });

    dirRenderer.current?.setDirections(res);

    let meters = 0;
    let secs = 0;
    res.routes[0].legs.forEach((leg) => {
      meters += leg.distance?.value || 0;
      secs += leg.duration?.value || 0;
    });
    setRouteKm(Math.round((meters / 1000) * 10) / 10);
    setRouteMin(Math.round(secs / 60));
  };

  const clearRoute = () => {
    dirRenderer.current?.setDirections({ routes: [] } as unknown as google.maps.DirectionsResult);
    setRouteKm(null);
    setRouteMin(null);
  };

  const nearbyCount = useMemo(() => {
    if (!you || visiblePlaces.length === 0) return 0;
    return visiblePlaces.filter((p) => haversine(you.lat, you.lng, p.lat, p.lng) <= 5).length;
  }, [you, visiblePlaces]);

  // --- UI ---
  return (
    <div style={page}>
      <div style={bgLayer} />

      <div style={outer}>
        <div style={headerRow}>
          <div style={brand}>CarApp</div>
          <h1 style={pageTitle}>Benzinkút kereső</h1>
        </div>

        <div style={layout}>
          <div style={panel}>
            {/* gombok */}
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <button style={btnPrimary} onClick={autoLocate}>Saját helyzet</button>
              <button style={btnGhost} onClick={clearRoute}>Útvonal törlése</button>
            </div>

            {/* szűrő chipek */}
            <div style={chipRow}>
              {BRANDS.map((b) => {
                const act = selectedBrands.has(b);
                return (
                  <button
                    key={b}
                    onClick={() => {
                      const next = new Set(selectedBrands);
                      act ? next.delete(b) : next.add(b);
                      setSelectedBrands(next);
                    }}
                    style={{ ...chip, ...(act ? chipActive : {}) }}
                  >
                    {b}
                  </button>
                );
              })}
              <button
                onClick={() => setSelectedBrands(new Set())}
                style={{ ...chip, marginLeft: "auto" }}
                title="Szűrők törlése"
              >
                Összes
              </button>
            </div>

            {/* lista */}
            <div style={subtleBox}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Közeli benzinkutak</div>
              <div style={{ display: "grid", gap: 8 }}>
                {visiblePlaces.slice(0, 12).map((p, i) => (
                  <button
                    key={`${p.name}-${i}`}
                    style={placeItem}
                    onClick={() => setNewDestination(p)}
                    title="Útvonal ehhez a kúthoz"
                  >
                    <span style={{ fontWeight: 700 }}>{p.name}</span>
                    <span style={{ opacity: 0.85, fontSize: 12 }}>
                      {p.distanceKm !== undefined ? `${p.distanceKm.toFixed(1)} km` : ""}
                    </span>
                  </button>
                ))}
                {visiblePlaces.length === 0 && <div style={{ opacity: 0.8 }}>Nincs találat a szűrésre.</div>}
              </div>
            </div>

            {/* infó kártyák */}
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, 1fr)", marginTop: 12 }}>
              <InfoCard
                title="Legközelebbi kút"
                value={visiblePlaces[0]?.name ?? "—"}
                small={you && visiblePlaces[0]?.distanceKm !== undefined ? `${visiblePlaces[0].distanceKm!.toFixed(1)} km` : ""}
              />
              <InfoCard title="5 km-en belül" value={`${nearbyCount} db`} />
              <InfoCard title="Útvonal hossza" value={routeKm !== null ? `${routeKm} km` : "—"} />
              <InfoCard title="Várható idő" value={routeMin !== null ? `${routeMin} perc` : "—"} />
            </div>
          </div>

          {/* térkép */}
          <div style={mapCard}>
            <div ref={mapRef} style={mapBox} />
          </div>
        </div>

        {/* árak */}
        <div style={pricesGrid}>
          {Object.entries(FUEL_PRICES).map(([k, v]) => (
            <div key={k} style={priceCard}>
              <div style={{ opacity: 0.85, fontSize: 12 }}>{k}</div>
              <div style={{ fontWeight: 800, fontSize: 22 }}>{v} Ft/L</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- segédek ---------- */

function detectBrand(name: string): string | undefined {
  const upper = name.toUpperCase();
  for (const b of BRANDS) if (upper.includes(b.toUpperCase())) return b;
  return undefined;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.asin(Math.sqrt(a));
  return R * c; // km
}

function almostEq(p: { lat: number; lng: number }, q: { lat: number; lng: number }) {
  return Math.abs(p.lat - q.lat) < 1e-6 && Math.abs(p.lng - q.lng) < 1e-6;
}

function InfoCard({ title, value, small = "" }: { title: string; value: string; small?: string }) {
  return (
    <div style={infoCard}>
      <div style={{ opacity: 0.85, fontSize: 12 }}>{title}</div>
      <div style={{ fontWeight: 800, fontSize: 20 }}>{value}</div>
      {small && <div style={{ opacity: 0.8, fontSize: 12 }}>{small}</div>}
    </div>
  );
}

/* ---------- stílusok + háttér ---------- */

const SAFE = "var(--dockSafeLeft, 92px)";

const page: React.CSSProperties = {
  position: "relative",
  minHeight: "100vh",
  color: "#fff",
  overflow: "hidden",
  paddingLeft: SAFE,                              // ← védőtáv a SideDocknak
};

const bgLayer: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 0,
  background: `
    linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)),
    url('/neo-speed-bg.jpg') center/cover no-repeat
  `,
};

const outer: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  width: `min(1550px, calc(96vw - ${SAFE}))`,     // ← hasznos szélesség = teljes - dock
  margin: "0 auto",
  padding: "24px 14px 80px",
};

const headerRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, marginBottom: 10 };
const brand: React.CSSProperties = { opacity: 0.7, fontWeight: 800, letterSpacing: 0.3 };
const pageTitle: React.CSSProperties = { margin: 0, fontWeight: 900, fontSize: "clamp(22px, 2.2vw, 28px)", textShadow: "0 8px 30px rgba(0,0,0,.6)" };

const layout: React.CSSProperties = { display: "grid", gridTemplateColumns: "420px 1fr", gap: 18, alignItems: "stretch" };

const panel: React.CSSProperties = { background: "rgba(17,17,20,.78)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, padding: 14, backdropFilter: "blur(6px)" };

const subtleBox: React.CSSProperties = { background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: 10 };

const chipRow: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8, margin: "6px 0 10px" };
const chip: React.CSSProperties = { padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.06)", color: "#fff", cursor: "pointer" };
const chipActive: React.CSSProperties = { background: "#6c5ce7", borderColor: "#6c5ce7" };

const placeItem: React.CSSProperties = {
  background: "rgba(255,255,255,.06)",
  border: "1px solid rgba(255,255,255,.1)",
  borderRadius: 12,
  padding: "10px 12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
  color: "#fff",
  textAlign: "left",
};

const mapCard: React.CSSProperties = { borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,.35)", minHeight: "calc(82vh - 120px)" };
const mapBox: React.CSSProperties = { width: "100%", height: "calc(82vh - 120px)" };

const btnPrimary: React.CSSProperties = { background: "linear-gradient(90deg,#6c5ce7,#a66cff)", border: "none", color: "#fff", fontWeight: 800, padding: "10px 12px", borderRadius: 12, cursor: "pointer", boxShadow: "0 10px 30px rgba(108,92,231,.35)" };
const btnGhost: React.CSSProperties = { background: "transparent", border: "1px solid rgba(255,255,255,.25)", color: "#fff", fontWeight: 700, padding: "10px 12px", borderRadius: 12, cursor: "pointer" };

const infoCard: React.CSSProperties = { background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: 10 };

const pricesGrid: React.CSSProperties = { marginTop: 18, display: "grid", gap: 12, gridTemplateColumns: "repeat(5, minmax(180px, 1fr))" };
const priceCard: React.CSSProperties = { background: "rgba(17,17,20,.82)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, padding: 12, backdropFilter: "blur(6px)", textAlign: "center" };

const BLUE_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#eaf2ff" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#3b4a66" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#b7e3f5" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#cbd7e6" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#dde8f7" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#dde8f7" }] },
];
