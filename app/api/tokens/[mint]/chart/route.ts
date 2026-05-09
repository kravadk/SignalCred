import { NextRequest, NextResponse } from "next/server";
import { getOHLCV } from "@/lib/birdeye";

export async function GET(
  req: NextRequest,
  { params }: { params: { mint: string } }
) {
  const { searchParams } = new URL(req.url);
  const tf = (searchParams.get("tf") as "15m" | "1H" | "1D") ?? "1H";
  const limitRaw = parseInt(searchParams.get("limit") ?? "168", 10);
  const limit = Math.min(Math.max(isNaN(limitRaw) ? 168 : limitRaw, 1), 500);

  const bars = await getOHLCV(params.mint, tf, limit);
  return NextResponse.json({ bars });
}
