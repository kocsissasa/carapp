import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { getToken, parseJwt } from "../utils/auth";

type Car = {
  id: number;
  brand: string;
  model: string;
  year: number;
  engine?: string; // frontend mező – ha a backend nem ismeri, egyszerűen nem küldjük el
  owner?: { email?: string };
};

type Appointment = {
  id: number;
  serviceDateTime: string; // ISO
  description: string;
  status?: "PENDING" | "CONFIRMED" | "CANCELLED";
  car?: Car;
};

const H_START = 8;
const H_END = 18; // 18:00 az utolsó órakezdés

export default function Garage() {
  const token = getToken();
  const jwt = parseJwt();
  const myEmail = jwt?.email || jwt?.sub || localStorage.getItem("email") || "";

  // Autók
  const [cars, setCars] = useState<Car[]>([]);
  const [carBrand, setCarBrand] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carYear, setCarYear] = useState<number | "">("");
  const [carEngine, setCarEngine] = useState("");

  // Időpontok
  const [mine, setMine] = useState<Appointment[]>([]);
  const [pickedCarId, setPickedCarId] = useState<number | "">("");
  const [dt, setDt] = useState<string>("");
  const [desc, setDesc] = useState("");

  // Dátum a heti naptárhoz (aktuális hét hétfője)
  const [weekAnchor, setWeekAnchor] = useState(firstDayOfWeek(new Date()));

  useEffect(() => {
    if (!token) return;
    (async () => {
      await Promise.all([loadCars(), loadAppointments()]);
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

  // --- Autó hozzáadás ---
  const addCar = async () => {
    if (!carBrand.trim() || !carModel.trim() || !carYear) {
      alert("Gyártó, modell és évjárat kötelező.");
      return;
    }
    // payload: csak azt küldjük, amit a backend biztosan ismer
    const payload: any = {
      brand: carBrand.trim(),
      model: carModel.trim(),
      year: Number(carYear),
    };

    try {
      await api.post("/api/cars", payload);
      setCarBrand(""); setCarModel(""); setCarYear(""); setCarEngine("");
      await loadCars();
      alert("Autó hozzáadva!");
    } catch (e: any) {
      alert(e?.response?.data?.error || "Nem sikerült hozzáadni az autót.");
    }
  };

  // --- Időpont létrehozás ---
  const toLocalIso = (v: string) => (v && v.length === 16 ? `${v}:00` : v);
  const createAppt = async () => {
    if (!pickedCarId || !dt) return alert("Válassz autót és időpontot.");
    const payload = {
      car: { id: Number(pickedCarId) },
      serviceDateTime: toLocalIso(dt),
      description: desc || "",
    };
    try {
      await api.post("/api/appointments", payload);
      setDesc(""); setDt("");
      await loadAppointments();
      alert("Időpont felvéve!");
    } catch (e: any) {
      alert(e?.response?.data?.error || "Nem sikerült létrehozni az időpontot.");
    }
  };

  const cancelAppt = async (id: number) => {
    if (!confirm("Biztosan törlöd/lemondod?")) return;
    try {
      await api.delete(`/api/appointments/${id}`);
      await loadAppointments();
    } catch (e: any) {
      alert(e?.response?.data?.error || "Nem sikerült törölni.");
    }
  };

  // --- heti naptár adat ---
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
    return <div style={{ padding: 16 }}>Jelentkezz be az autóidhoz és az időpontok kezeléséhez.</div>;
  }

  const nowLocalMin = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return (
    <div style={{ padding: 16 }}>
      <h2>Autóim & Időpontok</h2>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
        {/* BAL – Autóim + új autó */}
        <div style={card}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Autóim</div>

          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {cars.map((c) => (
              <li key={c.id} style={{ marginBottom: 4 }}>
                {c.brand} {c.model} ({c.year})
                {c.engine ? ` – ${c.engine}` : ""}
              </li>
            ))}
            {cars.length === 0 && <li>Még nincs autód.</li>}
          </ul>

          <hr style={hr} />

          <div style={{ fontWeight: 700, marginBottom: 6 }}>Új autó hozzáadása</div>
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
            <input
              placeholder="Motor (pl. 1.6 16V)"
              value={carEngine}
              onChange={(e) => setCarEngine(e.target.value)}
              style={inp}
            />
            <button onClick={addCar} style={btn}>Hozzáadás</button>
          </div>

          <hr style={hr} />

          <div style={{ fontWeight: 700, marginBottom: 6 }}>Új szervizidőpont</div>
          <div style={{ display: "grid", gap: 8 }}>
            <select
              value={pickedCarId}
              onChange={(e) => setPickedCarId(e.target.value ? Number(e.target.value) : "")}
              style={inp}
            >
              <option value="">Válassz autót…</option>
              {cars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.brand} {c.model} ({c.year})
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

          {/* fejlécek */}
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

          {/* rács */}
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
  );
}

/* ---- segédek & stílusok ---- */

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
  const weekday = ["H", "K", "Sze", "Cs", "P", "Szo", "V"][((d.getDay() + 6) % 7)];
  return `${weekday} ${d.getMonth() + 1}.${d.getDate()}.`;
}

const card: React.CSSProperties = {
  background: "rgba(17,17,17,.9)",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 12,
  padding: 12,
  overflow: "hidden",
};

const inp: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",     // <<< EZ A LÉNYEG... hogy ne lógjon túl
  display: "block",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,.12)",
  background: "rgba(255,255,255,.06)",
  color: "#fff",
  outline: "none",
};

const btn: React.CSSProperties = {
  width: "100%",               // a kártya szélességére van pontosítva így
  boxSizing: "border-box",     // <<< EZ IS FONTOS...hogy ne lógjon túl
  background: "linear-gradient(90deg,#6c5ce7,#a66cff)",
  border: "none",
  color: "#fff",
  fontWeight: 700,
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
};

const smallBtn: React.CSSProperties = {
  ...btn,
  width: "auto",               // a naptár marad ugyanúgy pici
  padding: "6px 10px",
  fontWeight: 600,
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
  boxSizing: "border-box",     // <<< EZ IS FONTOS...hogy ne lógjon túl
  background: "transparent",
  border: "1px solid #ff8787",
  color: "#ff8787",
  padding: "4px 8px",
  borderRadius: 6,
  width: "fit-content",
  cursor: "pointer",
  fontSize: 12,
};
