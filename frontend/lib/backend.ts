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
  const apiKey = process.env.API_ACCESS_KEY;
  if (!apiKey) {
    return Promise.resolve(
      Response.json({ detail: "API_ACCESS_KEY is not configured" }, { status: 500 })
    );
  }
  headers.set("X-API-Key", apiKey);
  return fetch(`${backendBaseUrl()}/api/v1/${pathAndQuery}`, {
    ...init,
    headers,
    cache: "no-store",
    redirect: "manual",
  });
}

export const unauthorized = () =>
  Response.json({ detail: "Unauthorized" }, { status: 401 });

export const badGateway = () =>
  Response.json({ detail: "Backend unavailable" }, { status: 502 });
