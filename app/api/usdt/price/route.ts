export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSolUsdtPrice } from "@/lib/usdt";

export const revalidate = 60;

export async function GET() {
  const price = await getSolUsdtPrice();
  return NextResponse.json({ solPriceUsdt: price });
}
