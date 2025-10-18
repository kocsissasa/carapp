import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { getToken, parseJwt } from "../utils/auth"; // Token kiolvasása és JWT parse

/* --- Types -> segítenek, hogy mi van state-ben és API válaszban--- */
type Car = {
  id: number;
  brand: string;
  model: string;
  year: number;
  owner?: { email?: string; id?: number }; // admin nézetben hasznos
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
  serviceDateTime: string; // ISO string
  description: string;
  status?: "PENDING" | "CONFIRMED" | "CANCELLED";
  car?: Car;
  center?: ServiceCenter;
  userId?: number;          // (ha a backend visszaadja) – tulaj azonosításhoz
};

type Tab = "create" | "edit";

/* --- Const --- */
const H_START = 8; // heti rács kezdő órája
const H_END = 18; // heti rács záró órája

/* --- Background (public/garagefinal.jpg) --- */
const bgUrl = `${import.meta.env.BASE_URL}garagefinal.jpg`;

/* --- Colors --- */
// narancs neon stílushoz állandók
const ORANGE1 = "#ff7a00";
const ORANGE2 = "#ff4d00";
const ORANGE_BORDER = "rgba(255, 122, 0, .45)";
const ORANGE_BORDER_SOFT = "rgba(255, 122, 0, .25)";

/* --- Toast mini system --- */
// Egyszerű, időzített snackbar értesítések
type Toast = { id: number; text: string; tone?: "info" | "warn" | "error" };
function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const notify = (text: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();  // egyedi azonosító
    setToasts((t) => [...t, { id, text, tone }]); // kiírjuk
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600); // 2.6 sec után eltűnik
  };
  return { toasts, notify };
}

/* --- Pretty confirm --- */
// Egyszerű megerősítő modal, ha törölni akarunk valamit
function ConfirmModal({
  open,
  text,
  onYes,
  onNo,
}: {
  open: boolean;
  text: string;
  onYes: () => void;
  onNo: () => void;
}) {
  if (!open) return null; // feltételes render: ha nem nyitott, semmit se rajzol
  return (
    <div style={styles.modalBack}>  {/* sötétített háttér + blur */}
      <div style={styles.modalCard}> {/* kártya maga */}
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Biztos vagy benne?</div>
        <div style={{ opacity: 0.92, marginBottom: 12 }}>{text}</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onNo} style={styles.btnGhost}>
            Mégse
          </button>
          <button onClick={onYes} className="btn-anim">
            Igen, töröld
          </button>
        </div>
      </div>
    </div>
  );
}


export default function Garage() {
  const token = getToken(); // JWT Bearer a localStorage-ből
  const jwt = parseJwt(); // JWT payload pars

  // Saját email – több mezőből is próbáljuk kinyerni, hogy kompatibilis legyen
  const myEmail =
    (jwt as any)?.email ||
    (jwt as any)?.sub ||
    localStorage.getItem("email") ||
    "";

  // admin detektálása – elfogadjuk: ADMIN vagy ROLE_ADMIN
  const roles: string[] = Array.isArray((jwt as any)?.roles)
    ? (jwt as any).roles
    : typeof (jwt as any)?.role === "string"
    ? [(jwt as any).role]
    : [];
  const isAdmin = roles.some((r) =>
    String(r).toUpperCase().includes("ADMIN")
  );

  const { toasts, notify } = useToasts(); // toast rendszer

  // UI
  const [tab, setTab] = useState<Tab>("create"); // bal oldali tab: új autó / autó módosítás
  const [confirm, setConfirm] = useState<{ open: boolean; id?: number }>({ // confirm modal állapot
    open: false,
  });

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
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [pickedCarId, setPickedCarId] = useState<number | "">("");
  const [dt, setDt] = useState<string>(""); // datetime-local input értéke (helyi idő, percre)
  const [desc, setDesc] = useState("");

  // Szervizek
  const [centers, setCenters] = useState<ServiceCenter[]>([]);
  const [pickedCenterId, setPickedCenterId] = useState<number | "">("");

  // Heti naptár
  const [weekAnchor, setWeekAnchor] = useState(firstDayOfWeek(new Date())); // aktuális hét hétfője

  /* --- Global CSS (animációk + utility classok) --- */
   // Belső <style> blokk: neon gomb animáció, fókusz gyűrű, háttér fade
  const GlobalCSS = (
    <style>{`
      :root { --o1:${ORANGE1}; --o2:${ORANGE2}; }

      @keyframes bgFade { 0%{opacity:0;transform:scale(1.02)} 100%{opacity:1;transform:scale(1)} }
      .garage-bg{
        position:fixed; inset:0; z-index:0;
        background: linear-gradient(rgba(0,0,0,.52), rgba(0,0,0,.58)), url('${bgUrl}') center / cover no-repeat;
        animation: bgFade .9s ease both; /* belassuló belépő animáció */
      }

      @keyframes gradientShift{0%{background-position:0% 50%}100%{background-position:200% 50%}}
      @keyframes glowPulse{0%{box-shadow:0 0 14px rgba(255,100,0,.25)}50%{box-shadow:0 0 28px rgba(255,120,0,.55)}100%{box-shadow:0 0 14px rgba(255,100,0,.25)}}

      .btn-anim{
        background: linear-gradient(90deg,var(--o1),var(--o2),var(--o1));
        background-size:200% 200%; /* animált gradiens */
        animation: gradientShift 8s ease infinite, glowPulse 3.5s ease-in-out infinite;
        border:1px solid ${ORANGE_BORDER};
        color:#1b0f08; font-weight:800; padding:10px 14px; border-radius:10px; cursor:pointer;
        transition: transform .18s ease, filter .18s ease, box-shadow .18s ease;
      }
      .btn-anim.small{padding:6px 10px}
      .btn-anim:hover{transform:translateY(-1px) scale(1.02); filter:brightness(1.06)}
      .btn-anim:active{transform:translateY(0) scale(.995); filter:brightness(.98)}

      .gar-inp { transition: box-shadow .18s ease, border-color .18s ease; }
      .gar-inp:focus { box-shadow: 0 0 0 3px rgba(255,120,0,.25), 0 0 16px rgba(255,120,0,.35); border-color:${ORANGE_BORDER}; }
    `}</style>
  );

  /* --- Lifecycle --- */
  useEffect(() => {
    if (!token) return; // ha nincs bejelentkezve, ne hívjunk API-t
    (async () => {
      await Promise.all([loadCars(), loadAppointments(), loadCenters()]); // párhuzamos betöltés
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin]);  // admin mód váltásakor is újra töltsön

   // Autók betöltése (admin: minden, user: csak saját)
  const loadCars = async () => {
    const res = await api.get<Car[]>("/api/cars");
    const all = res.data || [];
    setCars(isAdmin ? all : all.filter((c) => c.owner?.email === myEmail));
  };

  // Időpontok betöltése (admin: /api/appointments, user: /api/appointments/me)
  const loadAppointments = async () => {
    const url = isAdmin ? "/api/appointments" : "/api/appointments/me";
    const res = await api.get<Appointment[]>(url);
    const list = (res.data || []).slice().sort((a, b) =>
      a.serviceDateTime.localeCompare(b.serviceDateTime)
    );
    setAppts(list);
  };

// Szerviz központok betöltése
  const loadCenters = async () => {
    try {
      const res = await api.get<ServiceCenter[]>("/api/centers");
      setCenters(res.data || []);
    } catch {
      setCenters([]);
    }
  };

  /* --- Autó létrehozás/módosítás/törlés --- */
  const addCar = async () => {
    // kliens oldali megerősítés
    if (!carBrand.trim() || !carModel.trim() || !carYear) {
      notify("Gyártó, modell és évjárat kötelező.", "warn");
      return;
    }
    const payload = { brand: carBrand.trim(), model: carModel.trim(), year: Number(carYear) };
    try {
      await api.post("/api/cars", payload); // POST /api/cars
      setCarBrand(""); setCarModel(""); setCarYear(""); // űrlap ürítés
      await loadCars(); // lista frissítés
      notify("Autó hozzáadva!");
    } catch (e: any) {
       // backend-től jövő hiba barátibbá tétele
      notify(e?.response?.data?.error || e?.response?.data?.message || "Nem sikerült hozzáadni az autót.", "error");
    }
  };

  // Ha kiválasztunk egy autót módosításra, előtöltjük a mezőket
  useEffect(() => {
    if (!editCarId) { setEditBrand(""); setEditModel(""); setEditYear(""); return; }
    const c = cars.find((x) => x.id === editCarId);
    if (c) { setEditBrand(c.brand); setEditModel(c.model); setEditYear(c.year); }
  }, [editCarId, cars]);

  const updateCar = async () => {
    if (!editCarId) return notify("Válassz autót!", "warn");
    if (!editBrand.trim() || !editModel.trim() || !editYear) {
      return notify("Gyártó, modell, évjárat kötelező.", "warn");
    }
    const payload = { brand: editBrand.trim(), model: editModel.trim(), year: Number(editYear) };
    try {
      await api.put(`/api/cars/${editCarId}`, payload); // PUT /api/cars/{id}
      await loadCars(); // frissítés
      notify("Autó módosítva!");
    } catch (e: any) {
      notify(e?.response?.data?.error || e?.response?.data?.message || "Nem sikerült módosítani.", "error");
    }
  };

  const askDeleteCar = () => {
    if (!editCarId) return notify("Válassz autót!", "warn");
    setConfirm({ open: true, id: Number(editCarId) }); // megerősítés megnyitása
  };
  const doDeleteCar = async () => {
    const id = confirm.id!;
    setConfirm({ open: false });
    try {
      await api.delete(`/api/cars/${id}`); // DELETE /api/cars/{id}
      setEditCarId(""); // kiválasztás törlése
      await Promise.all([loadCars(), loadAppointments()]); // lista + naptár újratöltés
      notify("Autó törölve.");
    } catch (e: any) {
      notify(e?.response?.data?.error || e?.response?.data?.message || "Nem sikerült törölni.", "error");
    }
  };

  /* --- Időpont létrehozás / törlés --- */
   // Egyes backendek 00 másodperc nélkül 400-at dobhatnak
  const withSeconds = (v: string) => (v && v.length === 16 ? `${v}:00` : v);
  const extractErr = (e: any) => {
    const s = e?.response?.status;
    const d = e?.response?.data;
    return `(${s || "?"}) ${d?.error || d?.message || d || "Ismeretlen hiba"}`;
  };

  const createAppt = async () => {
    if (!pickedCarId || !dt) return notify("Válassz autót és időpontot.", "warn");
    if (!pickedCenterId) return notify("Válassz szervizt is.", "warn");

    const cid = Number(pickedCarId);
    const centerId = Number(pickedCenterId);
    const pickedCenter = centers.find((c) => c.id === centerId);
     // leírás végére odatesszük a szerviz nevét
    const description = pickedCenter
      ? `${desc || ""}${desc ? " · " : ""}Szerviz: ${pickedCenter.name}`
      : (desc || "");

    const payload = {
      car: { id: cid }, // backend a car.id alapján
      serviceDateTime: dt, // datetime-local
      description,
      center: { id: centerId }, // kötelező center
    };

    try {
      await api.post("/api/appointments", payload);  // POST /api/appointments
      setDesc(""); setDt(""); setPickedCenterId(""); // ürítés
      await loadAppointments();
      notify("Időpont felvéve!");
    } catch (e1: any) {
       // ha 400 és a másodpercek hiányozhatnak, megpróbáljuk pótolni
      if (e1?.response?.status === 400) {
        try {
          await api.post("/api/appointments", { ...payload, serviceDateTime: withSeconds(dt) });
          setDesc(""); setDt(""); setPickedCenterId("");
          await loadAppointments();
          notify("Időpont felvéve!");
          return;
        } catch (e2: any) {
          return notify(extractErr(e2), "error");
        }
      }
      notify(extractErr(e1), "error");
    }
  };

  const askCancelAppt = (id: number) => setConfirm({ open: true, id }); // naptárgomb megnyitja a megerősítőt
  const doCancelAppt = async () => {
    const id = confirm.id!;
    setConfirm({ open: false });
    try {
      await api.delete(`/api/appointments/${id}`);   // DELETE /api/appointments/{id} – státuszt CANCELLED-re teszi a backend
      await loadAppointments();
      await loadAppointments();
      notify("Időpont törölve.");
    } catch (e: any) {
      notify(extractErr(e) || "Nem sikerült törölni.", "error");
    }
  };

  /* --- Heti rács --- */
  // A hét napjai (hétfőtől vasárnapig) – a weekAnchor (hétfő) alapján
  const daysOfWeek = useMemo(() => {
    const d = new Date(weekAnchor);
    return Array.from({ length: 7 }).map((_, i) => addDays(d, i));
  }, [weekAnchor]);

  // Órasávok (8..18)
  const hours = useMemo(
    () => Array.from({ length: H_END - H_START + 1 }).map((_, i) => H_START + i),
    []
  );

 // Időpontok csoportosítása nap+óra kulcs szerint
  const apptsByDayHour = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    appts.forEach((a) => {
      const dt = new Date(a.serviceDateTime);
      const k = keyDayHour(dt);  // pl. 2025-10-17T09
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a);
    });
    return map;
  }, [appts]);

  /* --- NOT LOGGED IN --- */
   // Ha nincs token, egy egyszerű „jelentkezz be” oldal jelenik meg
  if (!token) {
    return (
      <>
        {GlobalCSS}
        <div className="garage-bg" />
        <div style={styles.notLoggedWrap}>
          <div style={styles.notLoggedCard}>
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 6 }}>
              🔒 Bejelentkezés szükséges
            </div>
            <div style={{ opacity: 0.95, marginBottom: 12 }}>
              A garázs és a szervizidőpontok megtekintéséhez kérjük{" "}
              <a href="/login" style={styles.linkStrong}>jelentkezz be</a>.
            </div>
            <a href="/login" className="btn-anim" style={{ textDecoration: "none" }}>
              Bejelentkezés
            </a>
          </div>
        </div>
      </>
    );
  }

   // datetime-local min érték: most (helyi idő, percre kerekítve)
  const nowLocalMin = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return (
    <>
      {GlobalCSS}

      {/* toast-ok a jobb alsó sarokban*/}
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

      {/* neon háttér */}
      <div className="garage-bg" />

      <div style={styles.page}>
        <div style={{ padding: 16, maxWidth: 1400, margin: "0 auto" }}>
          <h1 style={styles.title}>🚗 Saját Garázs & Szervizidőpontok {isAdmin && <span style={styles.adminBadge}>ADMIN</span>}</h1>

          <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
            {/* BAL – Autóim, fülek */}
            <div style={styles.card}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>
                Autóim {isAdmin && <span style={styles.muted}>(összes)</span>}
              </div>

              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {cars.map((c) => (
                  <li key={c.id} style={{ marginBottom: 4 }}>
                    {c.brand} {c.model} ({c.year})
                    {isAdmin && c.owner?.email ? <span style={styles.muted}> · {c.owner.email}</span> : null}
                  </li>
                ))}
                {cars.length === 0 && <li>Még nincs autó.</li>}
              </ul>

              <hr style={styles.hr} />
              {/* Tab gombok */}
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button onClick={() => setTab("create")} className="btn-anim small">Új autó</button>
                <button onClick={() => setTab("edit")} className="btn-anim small" style={{ filter: tab === "edit" ? "brightness(1.08)" : undefined }}>Autó módosítása</button>
              </div>

              {/* Új autó űrlap */}
              {tab === "create" && (
                <div style={{ display: "grid", gap: 8 }}>
                  <input placeholder="Gyártó (pl. Opel)" value={carBrand} onChange={(e) => setCarBrand(e.target.value)} style={styles.inp} className="gar-inp" />
                  <input placeholder="Modell (pl. Vectra B2)" value={carModel} onChange={(e) => setCarModel(e.target.value)} style={styles.inp} className="gar-inp" />
                  <input placeholder="Évjárat (pl. 1999)" value={carYear} onChange={(e) => setCarYear(e.target.value ? Number(e.target.value) : "")} type="number" style={styles.inp} className="gar-inp" />
                  <button onClick={addCar} className="btn-anim">Hozzáadás</button>
                </div>
              )}


              {/* Autó szerkesztő */}
              {tab === "edit" && (
                <div style={{ display: "grid", gap: 8 }}>
                  <select value={editCarId} onChange={(e) => setEditCarId(e.target.value ? Number(e.target.value) : "")} style={styles.selectInp} className="gar-inp">
                    <option value="">Válassz autót…</option>
                    {cars.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.brand} {c.model} ({c.year}){isAdmin && c.owner?.email ? ` — ${c.owner.email}` : ""}
                      </option>
                    ))}
                  </select>
                  <input placeholder="Gyártó" value={editBrand} onChange={(e) => setEditBrand(e.target.value)} style={styles.inp} className="gar-inp" />
                  <input placeholder="Modell" value={editModel} onChange={(e) => setEditModel(e.target.value)} style={styles.inp} className="gar-inp" />
                  <input placeholder="Évjárat" type="number" value={editYear} onChange={(e) => setEditYear(e.target.value ? Number(e.target.value) : "")} style={styles.inp} className="gar-inp" />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={updateCar} className="btn-anim" style={{ flex: 1 }}>Mentés</button>
                    <button onClick={askDeleteCar} style={styles.btnDanger} style={{ ...styles.btnDanger, flex: 1 } as any}>Törlés</button>
                  </div>
                </div>
              )}

              <hr style={styles.hr} />

              {/* Új szervizidőpont űrlap */}
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Új szervizidőpont</div>
              <div style={{ display: "grid", gap: 8 }}>
                <select value={pickedCarId} onChange={(e) => setPickedCarId(e.target.value ? Number(e.target.value) : "")} style={styles.selectInp} className="gar-inp">
                  <option value="">Válassz autót…</option>
                  {cars.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.brand} {c.model} ({c.year})
                    </option>
                  ))}
                </select>

                <select value={pickedCenterId} onChange={(e) => setPickedCenterId(e.target.value ? Number(e.target.value) : "")} style={styles.selectInp} className="gar-inp">
                  <option value="">Válassz szervizt…</option>
                  {centers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.city ? ` — ${s.city}` : ""}
                    </option>
                  ))}
                </select>

                <input type="datetime-local" value={dt} onChange={(e) => setDt(e.target.value)} min={nowLocalMin} style={styles.inp} className="gar-inp" /> // múltbeli foglalás tiltása
                <input placeholder="Leírás (pl. Olajcsere)" value={desc} onChange={(e) => setDesc(e.target.value)} style={styles.inp} className="gar-inp" />
                <button onClick={createAppt} className="btn-anim">Időpont felvétele</button>
              </div>

              {centers.length === 0 && (
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                  Nem jött lista a <code>GET /api/centers</code>-ről.
                </div>
              )}
            </div>

            {/* JOBB – heti naptár */}
            <div style={styles.card}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <strong>Heti naptár {isAdmin && <span style={styles.muted}>(összes időpont)</span>}</strong>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-anim small" onClick={() => setWeekAnchor(addDays(weekAnchor, -7))}>◀ Előző hét</button>
                  <button className="btn-anim small" onClick={() => setWeekAnchor(firstDayOfWeek(new Date()))}>Ma</button>
                  <button className="btn-anim small" onClick={() => setWeekAnchor(addDays(weekAnchor, 7))}>Következő hét ▶</button>
                </div>
              </div>

              {/* Naptár fej sor: nap címkék */}
              <div style={{ display: "grid", gridTemplateColumns: "80px repeat(7, 1fr)", borderBottom: `1px solid ${ORANGE_BORDER_SOFT}` }}>
                <div /> {/* üres sarok a bal felső cellának */}
                {daysOfWeek.map((d, i) => (
                  <div key={i} style={{ padding: "6px 8px", borderLeft: `1px solid ${ORANGE_BORDER_SOFT}` }}>
                    {dayLabel(d)} {/* pl. H 10.17. */}
                  </div>
                ))}
              </div>

             {/* Órasor + cellák */}
              <div style={{ display: "grid", gridTemplateColumns: "80px repeat(7, 1fr)" }}>
                {hours.map((h) => (
                  <div key={`h-${h}`} style={{ padding: "6px 8px", borderBottom: `1px solid ${ORANGE_BORDER_SOFT}`, opacity: 0.9 }}>
                    {`${h}:00`}
                  </div>
                ))}

                {/* Napok oszlopai */}
                {daysOfWeek.map((d, di) => (
                  <div key={`col-${di}`} style={{ display: "contents" }}>
                    {hours.map((h) => {
                      const cellKey = keyDayHour(new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, 0, 0));
                      const items = apptsByDayHour.get(cellKey) || []; // ide eső időpontok
                      return (
                        <div key={`${cellKey}`} style={{ borderLeft: `1px solid ${ORANGE_BORDER_SOFT}`, borderBottom: `1px solid ${ORANGE_BORDER_SOFT}`, minHeight: 44, padding: 6 }}>
                          {items.map((a) => {
                            // Tulaj-jog: a car.owner.email alapján hasonlítjuk
                            const mineAppt =
                              a.car?.owner?.email
                                ? a.car.owner.email === myEmail
                                : undefined; // ha nincs owner, akkor a backend nem adja – ilyenkor csak admin biztos
                            const canDelete = isAdmin || !!mineAppt || a.userId === (jwt as any)?.id;

                            return (
                              <div key={a.id} style={styles.apptPill}>
                                <div style={{ fontWeight: 700, color: "#ffd9c6" }}>
                                  {a.car ? `${a.car.brand} ${a.car.model}` : "Autó"}
                                  {isAdmin && a.car?.owner?.email ? <span style={styles.muted}> · {a.car.owner.email}</span> : null}
                                </div>
                                <div style={{ opacity: 0.9, fontSize: 12, color: "#fff" }}>
                                  {a.description || "—"} · {a.status || "PENDING"}
                                  {a.center ? ` · ${a.center.name}` : ""}
                                </div>
                                {canDelete && (
                                  <button onClick={() => askCancelAppt(a.id)} style={styles.btnDanger}>
                                    Törlés
                                  </button>
                                )}
                              </div>
                            );
                          })}
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

      {/* Confirm modal (autó/ időpont törlése) */}
      <ConfirmModal
        open={confirm.open}
        text="A művelet nem visszavonható."
        onNo={() => setConfirm({ open: false })}
        onYes={() => {
          // ha "editCarId" alatt hívtuk, akkor autó; ha naptárból, akkor appointment
          if (tab === "edit" && confirm.id === Number(editCarId)) {
            doDeleteCar();
          } else {
            doCancelAppt();
          }
        }}
      />
    </>
  );
}

/* --- Helpers --- */
// Hét első napja (hétfő) 
function firstDayOfWeek(d: Date) {
  const copy = new Date(d);
  const day = (copy.getDay() + 6) % 7; // getDay(): vasárnap=0 → hétfő=0-ra tolunk
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

// Dátum + napok
function addDays(d: Date, days: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + days);
  return c;
}
// Kulcs generálása nap+óra szerint (pl. 2025-10-17T09)
function keyDayHour(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  const h = `${d.getHours()}`.padStart(2, "0");
  return `${y}-${m}-${day}T${h}`;
}
// Rövid fejléc címke (H/K/Sze/… + MM.DD.)
function dayLabel(d: Date) {
  const weekday = ["H", "K", "Sze", "Cs", "P", "Szo", "V"][(d.getDay() + 6) % 7];
  return `${weekday} ${d.getMonth() + 1}.${d.getDate()}.`;
}

/* --- Styles --- */
const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", width: "100%", margin: 0, padding: 0, overflowX: "hidden", position: "relative", zIndex: 1 },
  title: { textAlign: "center", fontSize: "2.2rem", fontWeight: 900, margin: "20px 0 30px", color: "#fff", textShadow: "0 2px 14px rgba(0,0,0,.6)" },
  adminBadge: { marginLeft: 8, padding: "3px 8px", borderRadius: 8, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.18)", fontSize: 12, verticalAlign: "middle" },
  card: { background: "rgba(10,10,12,.86)", border: `1px solid ${ORANGE_BORDER_SOFT}`, borderRadius: 12, padding: 12, overflow: "hidden", color: "#fff", boxShadow: "0 0 24px rgba(255,100,0,.25)" },
  inp: { width: "100%", boxSizing: "border-box", display: "block", padding: "10px 12px", borderRadius: 8, border: `1px solid ${ORANGE_BORDER_SOFT}`, background: "rgba(255,255,255,.06)", color: "#fff", outline: "none" },
  selectInp: { width: "100%", boxSizing: "border-box", display: "block", padding: "10px 12px", borderRadius: 8, border: `1px solid ${ORANGE_BORDER_SOFT}`, background: "rgba(20,20,24,.9)", color: "#fff", outline: "none" },
  hr: { margin: "14px 0", borderColor: ORANGE_BORDER_SOFT },
  apptPill: { background: "rgba(255,130,40,.12)", border: `1px solid ${ORANGE_BORDER}`, borderRadius: 8, padding: 8, display: "grid", gap: 4, boxShadow: "0 0 24px rgba(255,100,0,.25)" },

  // toast
  toastWrap: { position: "fixed", right: 16, bottom: 16, zIndex: 80, display: "grid", gap: 8 },
  toast: { padding: "8px 12px", borderRadius: 10, background: "rgba(20,24,40,.9)", border: "1px solid rgba(255,255,255,.18)", color: "#dfe8ff", boxShadow: "0 12px 28px rgba(0,0,0,.35)", fontWeight: 700, fontSize: 13.5 },
  toastWarn: { background: "rgba(255,170,60,.12)", border: "1px solid rgba(255,170,60,.45)", color: "#ffe6c7" },
  toastError: { background: "rgba(255,95,95,.12)", border: "1px solid rgba(255,95,95,.45)", color: "#ffd7d7" },

  // confirm 
  modalBack: { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", backdropFilter: "blur(2px)", zIndex: 120, display: "grid", placeItems: "center" },
  modalCard: { background: "rgba(18,18,24,.96)", color: "#fff", borderRadius: 14, border: "1px solid rgba(255,255,255,.16)", padding: "16px 18px", width: 360, maxWidth: "92vw", boxShadow: "0 18px 44px rgba(0,0,0,.5)" },
  btnDanger: { background: "transparent", border: "1px solid #ff6b6b", color: "#ffb0b0", padding: "8px 12px", borderRadius: 10, cursor: "pointer", width: "fit-content" },
  btnGhost: { background: "transparent", border: "1px solid rgba(255,255,255,.25)", color: "#fff", padding: "8px 12px", borderRadius: 10, cursor: "pointer" },

  // nem bejelentkezett fül
  notLoggedWrap: { minHeight: "100vh", display: "grid", placeItems: "center", position: "relative", zIndex: 1, padding: 24, color: "#fff" },
  notLoggedCard: { background: "rgba(15,15,18,.88)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, padding: "18px 20px", boxShadow: "0 18px 40px rgba(0,0,0,.45)", maxWidth: 460, textAlign: "center" },
  linkStrong: { color: "#a78bfa", textDecoration: "none", fontWeight: 800 },
  muted: { color: "#9fb1d1", fontSize: 12.5 },
};
