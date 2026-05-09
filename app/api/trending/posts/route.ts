// Deprecated: use /api/posts?tab=trending
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL("/api/posts?tab=trending&limit=10", req.url);
  const r = await fetch(url);
  return NextResponse.json(await r.json(), { status: r.status });
}
