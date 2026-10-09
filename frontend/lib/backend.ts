import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export async function hasValidSession(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export function backendBaseUrl(): string {
  return (process.env.BACKEND_API_URL || "http://localhost:8000").replace(
    /\/+$/,
    ""
  );
}

/** Server-side fetch to the backend with the API key injected. */
export function backendFetch(pathAndQuery: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("X-API-Key", process.env.API_ACCESS_KEY ?? "");
  return fetch(`${backendBaseUrl()}/api/v1/${pathAndQuery}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

export const unauthorized = () =>
  Response.json({ detail: "Unauthorized" }, { status: 401 });

export const badGateway = () =>
  Response.json({ detail: "Backend unavailable" }, { status: 502 });
