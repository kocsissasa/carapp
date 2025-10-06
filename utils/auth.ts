export type JwtPayload = {
  sub?: string; 
  email?: string;
  role?: "USER" | "ADMIN" | ""; 
  [k: string]: any;
};

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function parseJwt(token: string | null = getToken()): JwtPayload {
  try {
    if (!token) return {};
    const [, payload] = token.split(".");
    return JSON.parse(atob(payload)) as JwtPayload;
  } catch {
    return {};
  }
}

export function isAdmin(): boolean {
  return parseJwt()?.role === "ADMIN";
}
