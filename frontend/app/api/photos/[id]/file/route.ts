import type { NextRequest } from "next/server";
import {
  backendFetch,
  badGateway,
  hasValidSession,
  unauthorized,
} from "@/lib/backend";

type Ctx = { params: Promise<{ id: string }> };

function contentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(_request: NextRequest, { params }: Ctx) {
  if (!(await hasValidSession())) return unauthorized();

  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return Response.json({ detail: "Invalid photo id" }, { status: 400 });
  }

  try {
    const meta = await backendFetch(`photos/${id}/download-url`);
    if (!meta.ok) {
      return Response.json(
        { detail: "Failed to get download url" },
        { status: meta.status === 404 ? 404 : 502 }
      );
    }
    const { url, fileName } = (await meta.json()) as {
      url: string;
      fileName: string;
    };

    const file = await fetch(url, { cache: "no-store" });
    if (!file.ok || !file.body) return badGateway();

    const headers = new Headers();
    headers.set(
      "content-type",
      file.headers.get("content-type") ?? "application/octet-stream"
    );
    const length = file.headers.get("content-length");
    if (length) headers.set("content-length", length);
    headers.set("content-disposition", contentDisposition(fileName));
    return new Response(file.body, { status: 200, headers });
  } catch {
    return badGateway();
  }
}
