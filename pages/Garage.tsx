// src/pages/Garage.tsx
import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { getToken, parseJwt } from "../utils/auth";

/* ===== Types ===== */
type Car = {
  id: number;
  brand: string;
  model: string;
  year: number;
  owner?: { email?: string };
};

type ServiceCenter = {
  id: number;
  name: string;
  city?: string;
  address?: string;
  placeId?: string;
  rating?: number;
};

type Appointment = {
  id: number;
  serviceDateTime: string;
  description: string;
  status?: "PENDING" | "CONFIRMED" | "CANCELLED";
  car?: Car;
  center?: ServiceCenter; // megjelenítéshez opcionális
};

type Tab = "create" | "edit";

/* ===== Const ===== */
const H_START = 8;
const H_END = 18;

/* ===== Background (public/garage.jpg) ===== */
const bgUrl = "/garage.jpg"; // a kép a frontend/public mappában legyen!
const bgLayer: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: -1,
  background: `
    linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)),
    url('${bgUrl}') center / cover no-repeat
  `,
};

/* ===== Page layout ===== */
const page: React.CSSProperties = {
  minHeight: "100vh",
  width: "100%",
  margin: 0,
  padding: 0,
  overflowX: "hidden",
  position: "relative",
  zIndex: 1,
};

/* ===== UI styles ===== */
const title: React.CSSProperties = {
  textAlign: "center",
  fontSize: "2.2rem",
  fontWeight: 900,
  margin: "20px 0 30px",
  background: "linear-gradient(90deg,#ff6b6b,#feca57,#1dd1a1)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const card: React.CSSProperties = {
  background: "rgba(17,17,17,.9)",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 12,
  padding: 12,
  overflow: "hidden",
  color: "#fff",
};

const inp: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  display: "block",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,.12)",
  background: "rgba(255,255,255,.06)",
  color: "#fff",
  outline: "none",
};

const selectInp: React.CSSProperties = {
  ...inp,
  color: "#fff",
  background: "rgba(30,30,30,.95)",
  borderColor: "rgba(255,255,255,.18)",
};

const btn: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "linear-gradient(90deg,#6c5ce7,#a66cff)",
  border: "none",
  color: "#fff",
  fontWeight: 700,
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
};

const dangerBtn: React.CSSProperties = {
  ...btn,
  background: "transparent",
  border: "1px solid #ff4d4f",
  color: "#ff4d4f",
};

const smallBtn: React.CSSProperties = {
  ...btn,
  width: "auto",
  padding: "6px 10px",
  fontWeight: 600,
};

const tabBtn: React.CSSProperties = {
  ...smallBtn,
  background: "rgba(255,255,255,.06)",
  border: "1px solid rgba(255,255,255,.12)",
};

const tabActive: React.CSSProperties = {
  background: "linear-gradient(90deg,#6c5ce7,#a66cff)",
  borderColor: "transparent",
};

const hr: React.CSSProperties = {
  margin: "14px 0",
  borderColor: "rgba(255,255,255,.08)",
};

const apptPill: React.CSSProperties = {
  background: "rgba(108,92,231,.2)",
  border: "1px solid rgba(108,92,231,.45)",
  borderRadius: 8,
  padding: 8,
  display: "grid",
  gap: 4,
};

const pillBtn: React.CSSProperties = {
  boxSizing: "border-box",
  background: "transparent",
  border: "1px solid #ff8787",
  color: "#ff8787",
  padding: "4px 8px",
  borderRadius: 6,
  width: "fit-content",
  cursor: "pointer",
  fontSize: 12,
};

export default function Garage() {
  const token = getToken();
  const jwt = parseJwt();
  const myEmail = jwt?.email || jwt?.sub || localStorage.getItem("email") || "";

  // UI
  const [tab, setTab] = useState<Tab>("create");

  // Autók
  const [cars, setCars] = useState<Car[]>([]);
  const [carBrand, setCarBrand] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carYear, setCarYear] = useState<number | "">("");

  // Autó módosítás
  const [editCarId, setEditCarId] = useState<number | "">("");
  const [editBrand, setEditBrand] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editYear, setEditYear] = useState<number | "">("");

  // Időpontok
  const [mine, setMine] = useState<Appointment[]>([]);
  const [pickedCarId, setPickedCarId] = useState<number | "">("");
  const [dt, setDt] = useState<string>("");
  const [desc, setDesc] = useState("");

  // Szervizek
  const [centers, setCenters] = useState<ServiceCenter[]>([]);
  const [pickedCenterId, setPickedCenterId] = useState<number | "">("");

  // Heti naptár
  const [weekAnchor, setWeekAnchor] = useState(firstDayOfWeek(new Date()));

  /* ===== Lifecycle ===== */
  useEffect(() => {
    if (!token) return;
    (async () => {
      await Promise.all([loadCars(), loadAppointments(), loadCenters()]);
    })();
  }, [token]);

  const loadCars = async () => {
    const res = await api.get<Car[]>("/api/cars");
    const all = res.data || [];
    const mineOnly = myEmail ? all.filter((c) => c.owner?.email === myEmail) : all;
    setCars(mineOnly);
  };

  const loadAppointments = async () => {
    const res = await api.get<Appointment[]>("/api/appointments/me");
    const appts = (res.data || []).slice().sort((a, b) =>
      a.serviceDateTime.localeCompare(b.serviceDateTime)
    );
    setMine(appts);
  };

  // SecurityConfig: GET /api/centers publikus
  const loadCenters = async () => {
    try {
      const res = await api.get<ServiceCenter[]>("/api/centers");
      setCenters(res.data || []);
    } catch (e: any) {
      console.warn("Service centers GET failed:", e?.response?.status, e?.response?.data);
      setCenters([]);
    }
  };

  /* ===== Autó létrehozás ===== */
  const addCar = async () => {
    if (!carBrand.trim() || !carModel.trim() || !carYear) {
      alert("Gyártó, modell és évjárat kötelező.");
      return;
    }
    const payload = { brand: carBrand.trim(), model: carModel.trim(), year: Number(carYear) };
    try {
      await api.post("/api/cars", payload);
      setCarBrand(""); setCarModel(""); setCarYear("");
      await loadCars();
      alert("Autó hozzáadva!");
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.response?.data?.message || "Nem sikerült hozzáadni az autót.");
    }
  };

  /* ===== Autó módosítás/törlés ===== */
  useEffect(() => {
    if (!editCarId) {
      setEditBrand(""); setEditModel(""); setEditYear("");
      return;
    }
    const c = cars.find((x) => x.id === editCarId);
    if (c) {
      setEditBrand(c.brand);
      setEditModel(c.model);
      setEditYear(c.year);
    }
  }, [editCarId, cars]);

  const updateCar = async () => {
    if (!editCarId) return alert("Válassz autót!");
    if (!editBrand.trim() || !editModel.trim() || !editYear) {
      return alert("Gyártó, modell, évjárat kötelező.");
    }
    const payload = { brand: editBrand.trim(), model: editModel.trim(), year: Number(editYear) };
    try {
      await api.put(`/api/cars/${editCarId}`, payload);
      await loadCars();
      alert("Autó módosítva!");
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.response?.data?.message || "Nem sikerült módosítani.");
    }
  };

  const deleteCar = async () => {
    if (!editCarId) return alert("Válassz autót!");
    if (!confirm("Biztosan törlöd ezt az autót?")) return;
    try {
      await api.delete(`/api/cars/${editCarId}`);
      setEditCarId("");
      await Promise.all([loadCars(), loadAppointments()]);
      alert("Autó törölve!");
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.response?.data?.message || "Nem sikerült törölni.");
    }
  };

  /* ===== Időpont létrehozás / törlés ===== */
  const withSeconds = (v: string) => (v && v.length === 16 ? `${v}:00` : v);

  const extractErr = (e: any) => {
    const s = e?.response?.status;
    const d = e?.response?.data;
    return `(${s || "?"}) ${d?.error || d?.message || d || "Ismeretlen hiba"}`;
  };

  const createAppt = async () => {
    if (!pickedCarId || !dt) return alert("Válassz autót és időpontot.");
    if (!pickedCenterId) return alert("Válassz szervizt is.");

    const cid = Number(pickedCarId);
    const centerId = Number(pickedCenterId);

    const pickedCenter = centers.find((c) => c.id === centerId);
    const description = pickedCenter
      ? `${desc || ""}${desc ? " · " : ""}Szerviz: ${pickedCenter.name}`
      : (desc || "");

    // >>> a backend ezt várja: center: { id }
    const payload = {
      car: { id: cid },
      serviceDateTime: dt,         // "YYYY-MM-DDTHH:mm"
      description,
      center: { id: centerId },    // KÖTELEZŐ
    };

    try {
      await api.post("/api/appointments", payload);
      setDesc(""); setDt(""); setPickedCenterId("");
      await loadAppointments();
      alert("Időpont felvéve!");
    } catch (e1: any) {
      if (e1?.response?.status === 400) {
        try {
          await api.post("/api/appointments", { ...payload, serviceDateTime: withSeconds(dt) });
          setDesc(""); setDt(""); setPickedCenterId("");
          await loadAppointments();
          alert("Időpont felvéve!");
          return;
        } catch (e2: any) {
          alert(extractErr(e2));
          return;
        }
      }
      alert(extractErr(e1));
    }
  };

  const cancelAppt = async (id: number) => {
    if (!confirm("Biztosan törlöd/lemondod?")) return;
    try {
      await api.delete(`/api/appointments/${id}`);
      await loadAppointments();
    } catch (e: any) {
      alert(extractErr(e) || "Nem sikerült törölni.");
    }
  };

  /* ===== Heti rács ===== */
  const daysOfWeek = useMemo(() => {
    const d = new Date(weekAnchor);
    return Array.from({ length: 7 }).map((_, i) => addDays(d, i));
  }, [weekAnchor]);

  const hours = useMemo(
    () => Array.from({ length: H_END - H_START + 1 }).map((_, i) => H_START + i),
    []
  );

  const apptsByDayHour = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    mine.forEach((a) => {
      const dt = new Date(a.serviceDateTime);
      const k = keyDayHour(dt);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a);
    });
    return map;
  }, [mine]);

  if (!token) {
    return <div style={{ padding: 16, color: "#fff" }}>Jelentkezz be az autóidhoz és az időpontok kezeléséhez.</div>;
  }

  const nowLocalMin = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return (
    <>
      {/* reset + select/option olvashatóság */}
      <style>{`
        html, body { margin:0; padding:0; width:100%; overflow-x:hidden; background:#000; }
        #root { max-width:100% !important; margin:0 !important; padding:0 !important; }
        select, option { color:#fff; background-color:#1f1f1f; }
      `}</style>

      <div style={bgLayer} />

      <div style={page}>
        <div style={{ padding: 16, maxWidth: 1400, margin: "0 auto" }}>
          <h1 style={title}>🚗 Saját Garázs & Szervizidőpontok</h1>

          <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
            {/* BAL – Autóim, fülek */}
            <div style={card}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Autóim</div>
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {cars.map((c) => (
                  <li key={c.id} style={{ marginBottom: 4 }}>
                    {c.brand} {c.model} ({c.year})
                  </li>
                ))}
                {cars.length === 0 && <li>Még nincs autód.</li>}
              </ul>

              <hr style={hr} />

              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button
                  onClick={() => setTab("create")}
                  style={{ ...tabBtn, ...(tab === "create" ? tabActive : {}) }}
                >
                  Új autó
                </button>
                <button
                  onClick={() => setTab("edit")}
                  style={{ ...tabBtn, ...(tab === "edit" ? tabActive : {}) }}
                >
                  Autó módosítása
                </button>
              </div>

              {tab === "create" && (
                <div style={{ display: "grid", gap: 8 }}>
                  <input
                    placeholder="Gyártó (pl. Opel)"
                    value={carBrand}
                    onChange={(e) => setCarBrand(e.target.value)}
                    style={inp}
                  />
                  <input
                    placeholder="Modell (pl. Vectra B2)"
                    value={carModel}
                    onChange={(e) => setCarModel(e.target.value)}
                    style={inp}
                  />
                  <input
                    placeholder="Évjárat (pl. 1999)"
                    value={carYear}
                    onChange={(e) => setCarYear(e.target.value ? Number(e.target.value) : "")}
                    type="number"
                    style={inp}
                  />
                  <button onClick={addCar} style={btn}>Hozzáadás</button>
                </div>
              )}

              {tab === "edit" && (
                <div style={{ display: "grid", gap: 8 }}>
                  <select
                    value={editCarId}
                    onChange={(e) => setEditCarId(e.target.value ? Number(e.target.value) : "")}
                    style={selectInp}
                  >
                    <option value="">Válassz autót…</option>
                    {cars.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.brand} {c.model} ({c.year})
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Gyártó"
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                    style={inp}
                  />
                  <input
                    placeholder="Modell"
                    value={editModel}
                    onChange={(e) => setEditModel(e.target.value)}
                    style={inp}
                  />
                  <input
                    placeholder="Évjárat"
                    type="number"
                    value={editYear}
                    onChange={(e) => setEditYear(e.target.value ? Number(e.target.value) : "")}
                    style={inp}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={updateCar} style={{ ...btn, flex: 1 }}>Mentés</button>
                    <button onClick={deleteCar} style={{ ...dangerBtn, flex: 1 }}>Törlés</button>
                  </div>
                </div>
              )}

              <hr style={hr} />

              <div style={{ fontWeight: 700, marginBottom: 6 }}>Új szervizidőpont</div>
              <div style={{ display: "grid", gap: 8 }}>
                <select
                  value={pickedCarId}
                  onChange={(e) => setPickedCarId(e.target.value ? Number(e.target.value) : "")}
                  style={selectInp}
                >
                  <option value="">Válassz autót…</option>
                  {cars.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.brand} {c.model} ({c.year})
                    </option>
                  ))}
                </select>

                <select
                  value={pickedCenterId}
                  onChange={(e) => setPickedCenterId(e.target.value ? Number(e.target.value) : "")}
                  style={selectInp}
                >
                  <option value="">Válassz szervizt…</option>
                  {centers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.city ? ` — ${s.city}` : ""}
                    </option>
                  ))}
                </select>

                <input
                  type="datetime-local"
                  value={dt}
                  onChange={(e) => setDt(e.target.value)}
                  min={nowLocalMin}
                  style={inp}
                />
                <input
                  placeholder="Leírás (pl. Olajcsere)"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  style={inp}
                />
                <button onClick={createAppt} style={btn}>Időpont felvétele</button>
              </div>

              {centers.length === 0 && (
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                  Nem jött lista a <code>GET /api/centers</code>-ről.
                </div>
              )}
            </div>

            {/* JOBB – heti naptár */}
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <strong>Heti naptár</strong>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={smallBtn} onClick={() => setWeekAnchor(addDays(weekAnchor, -7))}>◀ Előző hét</button>
                  <button style={smallBtn} onClick={() => setWeekAnchor(firstDayOfWeek(new Date()))}>Ma</button>
                  <button style={smallBtn} onClick={() => setWeekAnchor(addDays(weekAnchor, 7))}>Következő hét ▶</button>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px repeat(7, 1fr)",
                  borderBottom: "1px solid rgba(255,255,255,.1)",
                }}
              >
                <div />
                {daysOfWeek.map((d, i) => (
                  <div key={i} style={{ padding: "6px 8px", borderLeft: "1px solid rgba(255,255,255,.08)" }}>
                    {dayLabel(d)}
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "80px repeat(7, 1fr)" }}>
                {hours.map((h) => (
                  <div
                    key={`h-${h}`}
                    style={{
                      padding: "6px 8px",
                      borderBottom: "1px solid rgba(255,255,255,.08)",
                      opacity: 0.8,
                    }}
                  >
                    {`${h}:00`}
                  </div>
                ))}
                {daysOfWeek.map((d, di) => (
                  <div key={`col-${di}`} style={{ display: "contents" }}>
                    {hours.map((h) => {
                      const cellKey = keyDayHour(new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, 0, 0));
                      const items = apptsByDayHour.get(cellKey) || [];
                      return (
                        <div
                          key={`${cellKey}`}
                          style={{
                            borderLeft: "1px solid rgba(255,255,255,.08)",
                            borderBottom: "1px solid rgba(255,255,255,.08)",
                            minHeight: 44,
                            padding: 6,
                          }}
                        >
                          {items.map((a) => (
                            <div key={a.id} style={apptPill}>
                              <div style={{ fontWeight: 700 }}>
                                {a.car ? `${a.car.brand} ${a.car.model}` : "Autó"}
                              </div>
                              <div style={{ opacity: 0.85, fontSize: 12 }}>
                                {a.description || "—"} · {a.status || "PENDING"}
                                {a.center ? ` · ${a.center.name}` : ""}
                              </div>
                              <button onClick={() => cancelAppt(a.id)} style={pillBtn}>Törlés</button>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ===== Helpers ===== */
function firstDayOfWeek(d: Date) {
  const copy = new Date(d);
  const day = (copy.getDay() + 6) % 7; // hétfő=0
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
function addDays(d: Date, days: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + days);
  return c;
}
function keyDayHour(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  const h = `${d.getHours()}`.padStart(2, "0");
  return `${y}-${m}-${day}T${h}`;
}
function dayLabel(d: Date) {
  const weekday = ["H", "K", "Sze", "Cs", "P", "Szo", "V"][(d.getDay() + 6) % 7];
  return `${weekday} ${d.getMonth() + 1}.${d.getDate()}.`;
}
