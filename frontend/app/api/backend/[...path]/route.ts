import type { NextRequest } from "next/server";
import {
  backendFetch,
  badGateway,
  hasValidSession,
  unauthorized,
} from "@/lib/backend";

type Ctx = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, { params }: Ctx) {
  if (!(await hasValidSession())) return unauthorized();

  const { path } = await params;
  if (path.some((s) => s === "." || s === ".." || s.includes("/") || s.includes("\\"))) {
    return Response.json({ detail: "Invalid path" }, { status: 400 });
  }
  const target = path.map(encodeURIComponent).join("/") + request.nextUrl.search;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  const hasBody = request.method !== "GET" && request.method !== "DELETE";
  try {
    const upstream = await backendFetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
    });
    const responseHeaders = new Headers();
    const upstreamType = upstream.headers.get("content-type");
    if (upstreamType) responseHeaders.set("content-type", upstreamType);
    return new Response(upstream.status === 204 ? null : upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return badGateway();
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
