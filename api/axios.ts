// src/api/axios.ts
import axios from "axios";  // Axios HTTP kliens

// .env-ben: VITE_API_URL = http://localhost:8080   (NINCS context path)
// vagy:     VITE_API_URL = http://localhost:8080/carapp   (HA VAN context path)
const RAW = (import.meta as any).env.VITE_API_URL || "http://localhost:8080";

// biztonság kedvéért levágjuk a záró perjeleket
const API_BASE = RAW.replace(/\/+$/, "");

//  Készítünk egy előre konfigurált Axios példányt
const api = axios.create({
  baseURL: API_BASE, //  Minden kérés ehhez az alap-URL-hez képest megy
  headers: { "Content-Type": "application/json" },  //  Alap fejléc: JSON küldés
  withCredentials: false, //  NEM küldünk sütiket automatikusan
});

// Bearer token felrakása
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token"); //  Token tárolása localStorage-ban
  if (token) {
    cfg.headers = { ...cfg.headers, Authorization: `Bearer ${token}` }; //  Authorization: Bearer <token>
  }
  return cfg; //  Mindig vissza kell adni a módosított configot
});

// Debug (kényelmes a hibakereséshez)
api.interceptors.response.use(
  (res) => res, //  Sikeres válasz változatlanul tovább
  (err) => {
    console.warn(
      "[API ERROR]",
      err?.config?.method?.toUpperCase(),  //  pl. GET / POST
      (err?.config?.baseURL || "") + (err?.config?.url || ""), //  Teljes hívott URL
      "->",
      err?.response?.status, //  HTTP státuszkód (pl. 401, 403, 500)
      err?.response?.data  //  Backend által küldött hibatest
    );
    throw err; // A hibát továbbdobjuk, hogy a hívó komponens kezelje
  }
);

export default api;
