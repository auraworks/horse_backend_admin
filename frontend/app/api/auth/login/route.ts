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

export async function POST(request: Request) {
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
    return NextResponse.json(
      { detail: "아이디 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );
  }

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
