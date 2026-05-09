export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { sdk } from "@/lib/bags";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) return NextResponse.json({ error: "username required" }, { status: 400 });
  try {
    const wallet = await sdk.state.getLaunchWalletForTwitterUsername(username);
    return NextResponse.json({ username, wallet: wallet.toBase58() });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 120) }, { status: 404 });
  }
}
