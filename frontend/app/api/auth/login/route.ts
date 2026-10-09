import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
} from "@/lib/session";

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// In-memory login throttle (per client IP). Best effort: state is per server instance.
const MAX_FAILURES = 5;
const WINDOW_MS = 10 * 60 * 1000;
const failures = new Map<string, number[]>();

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0].trim() : "") || request.headers.get("x-real-ip") || "unknown";
}

function recentFailures(ip: string, now: number): number[] {
  const list = (failures.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length > 0) failures.set(ip, list);
  else failures.delete(ip);
  return list;
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const now = Date.now();
  if (failures.size > 5000) {
    for (const key of [...failures.keys()]) recentFailures(key, now);
  }
  const prior = recentFailures(ip, now);
  if (prior.length >= MAX_FAILURES) {
    const retryAfter = Math.max(1, Math.ceil((prior[0] + WINDOW_MS - now) / 1000));
    return NextResponse.json(
      { detail: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  let body: { id?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid request body" }, { status: 400 });
  }

  const adminId = process.env.ADMIN_ID || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "123456789";
  const id = typeof body.id === "string" ? body.id : "";
  const password = typeof body.password === "string" ? body.password : "";

  const idOk = safeEqual(id, adminId);
  const pwOk = safeEqual(password, adminPassword);
  if (!idOk || !pwOk) {
    failures.set(ip, [...prior, now]);
    return NextResponse.json(
      { detail: "아이디 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );
  }

  failures.delete(ip);
  let token: string;
  try {
    token = createSessionToken();
  } catch {
    return NextResponse.json({ detail: "Server misconfigured" }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
