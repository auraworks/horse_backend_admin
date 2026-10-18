import type { NextRequest } from "next/server";
import {
  backendFetch,
  badGateway,
  hasValidSession,
  unauthorized,
} from "@/lib/backend";

type Ctx = { params: Promise<{ id: string }> };

// Redirects to the presigned S3 download URL (Content-Disposition: attachment)
// instead of streaming the bytes: Amplify SSR rejects responses over ~6MB (413).
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
    const { url } = (await meta.json()) as { url: string };
    return new Response(null, {
      status: 302,
      headers: { location: url, "cache-control": "no-store" },
    });
  } catch {
    return badGateway();
  }
}
