import { createContext, useContext, useEffect, useState } from "react";

type GoogleNS = typeof google | null;

const MapsApiContext = createContext<GoogleNS>(null);

export function MapsLoaderProvider({ children }: { children: React.ReactNode }) {
  const [api, setApi] = useState<GoogleNS>(null);

  useEffect(() => {
    // már típusos az import.meta.env a src/env.d.ts miatt
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) {
      console.error("Hiányzik a VITE_GOOGLE_MAPS_API_KEY a .env fájlból");
      return;
    }

    // ha már betöltöttük egyszer, ne töltsük újra
    if ((window as any).google) {
      setApi((window as any).google);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.onload = () => setApi((window as any).google);
    script.onerror = () => console.error("Google Maps script betöltése nem sikerült.");
    document.head.appendChild(script);

    return () => {
      // a script eltávolítása opcionális; ha egyoldalas app, nyugodtan maradhat
      // document.head.removeChild(script);
    };
  }, []);

  return (
    <MapsApiContext.Provider value={api}>{children}</MapsApiContext.Provider>
  );
}

export function useMapsApi() {
  return useContext(MapsApiContext);
}
