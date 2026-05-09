import { NextRequest, NextResponse } from "next/server";
import { sdk } from "@/lib/bags";
import { PublicKey } from "@solana/web3.js";

export async function GET(_req: NextRequest, { params }: { params: { mint: string } }) {
  try {
    const creators = await sdk.state.getTokenCreators(new PublicKey(params.mint));
    return NextResponse.json({ creators: creators ?? [] });
  } catch {
    return NextResponse.json({ creators: [] });
  }
}
