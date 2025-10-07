// src/api/axios.ts
import axios from "axios";

// .env-ben: VITE_API_URL = http://localhost:8080   (NINCS context path)
// vagy:     VITE_API_URL = http://localhost:8080/carapp   (HA VAN context path)
const RAW = (import.meta as any).env.VITE_API_URL || "http://localhost:8080";

// biztonság kedvéért levágjuk a záró perjeleket
const API_BASE = RAW.replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
});

// Bearer token felrakása
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) {
    cfg.headers = { ...cfg.headers, Authorization: `Bearer ${token}` };
  }
  return cfg;
});

// Debug (kényelmes a hibakereséshez)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.warn(
      "[API ERROR]",
      err?.config?.method?.toUpperCase(),
      (err?.config?.baseURL || "") + (err?.config?.url || ""),
      "->",
      err?.response?.status,
      err?.response?.data
    );
    throw err;
  }
);

export default api;
