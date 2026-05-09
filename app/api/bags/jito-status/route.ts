export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { sdk } from "@/lib/bags";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const fees = await sdk.solana.getJitoRecentFees();
    return NextResponse.json({ recentFees: fees, available: true });
  } catch (e) {
    return NextResponse.json({ available: false, error: String(e).slice(0, 80) });
  }
}
