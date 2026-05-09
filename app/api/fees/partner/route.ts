export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getClaimablePositions, sdk } from "@/lib/bags";
import { PublicKey } from "@solana/web3.js";

export async function GET(req: NextRequest) {
  const wallet = req.headers.get("x-wallet");
  if (!wallet) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let walletKey: PublicKey;
  try {
    walletKey = new PublicKey(wallet);
  } catch {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const [positionsResult, partnerStatsResult, partnerConfigResult] =
    await Promise.allSettled([
      getClaimablePositions(wallet),
      sdk.partner.getPartnerConfigClaimStats(walletKey),
      sdk.partner.getPartnerConfig(walletKey),
    ]);

  const positions =
    positionsResult.status === "fulfilled"
      ? positionsResult.value.map((p) => ({
          ...p,
          baseMint: "baseMint" in p ? String(p.baseMint) : null,
          virtualPool: "virtualPool" in p ? String(p.virtualPool) : null,
          claimableDisplayAmount:
            "claimableDisplayAmount" in p ? p.claimableDisplayAmount : 0,
          totalClaimableLamportsUserShare:
            "totalClaimableLamportsUserShare" in p
              ? p.totalClaimableLamportsUserShare
              : 0,
        }))
      : [];

  const partnerStats =
    partnerStatsResult.status === "fulfilled"
      ? partnerStatsResult.value
      : null;

  const partnerConfig =
    partnerConfigResult.status === "fulfilled"
      ? {
          exists: true,
          wallet,
        }
      : { exists: false };

  return NextResponse.json({
    positions,
    partnerStats,
    partnerConfig,
  });
}
