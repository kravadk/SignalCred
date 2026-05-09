// Backward-compat shim — forwards to /api/posts/[id]/react with kind=repost
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const wallet = req.headers.get("x-wallet");
  const r = await fetch(new URL(`/api/posts/${params.id}/react`, req.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(wallet && { "x-wallet": wallet }),
    },
    body: JSON.stringify({ kind: "repost" }),
  });
  const data = await r.json();
  if (typeof data.active === "boolean") {
    return NextResponse.json({ reposted: data.active }, { status: r.status });
  }
  return NextResponse.json(data, { status: r.status });
}
