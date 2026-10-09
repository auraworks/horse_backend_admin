import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // root 경로로 접속하면 /admin/login으로 리다이렉트
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // /admin/* (로그인 제외)는 유효한 세션이 필요
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isLogin =
    pathname === "/admin/login" || pathname.startsWith("/admin/login/");
  if (isAdmin && !isLogin) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!verifySessionToken(token)) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
