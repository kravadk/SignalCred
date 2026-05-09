// Backward-compat shim — forwards to unified /api/ai with task=post-draft
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const wallet = req.headers.get("x-wallet");
  const ip = req.headers.get("x-forwarded-for");
  const body = await req.json().catch(() => ({}));
  const r = await fetch(new URL("/api/ai", req.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(wallet && { "x-wallet": wallet }),
      ...(ip && { "x-forwarded-for": ip }),
    },
    body: JSON.stringify({ task: "post-draft", payload: body }),
  });
  return NextResponse.json(await r.json(), { status: r.status });
}
