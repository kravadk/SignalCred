// Deprecated: use /api/posts?tab=following
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL("/api/posts?tab=following", req.url);
  const wallet = req.headers.get("x-wallet");
  const r = await fetch(url, { headers: wallet ? { "x-wallet": wallet } : {} });
  return NextResponse.json(await r.json(), { status: r.status });
}
