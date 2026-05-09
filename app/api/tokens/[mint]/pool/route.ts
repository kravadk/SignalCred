import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tokens } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: { mint: string } }) {
  const { mint } = params;

  // Authoritative migration state — set by cron after polling Bags SDK getAllClaimablePositions.
  // Stored under metadata.isMigrated. DexScreener is a fallback (only indexes post-migration).
  const dbToken = await db.query.tokens.findFirst({ where: eq(tokens.mint, mint) });
  const dbMeta = (dbToken?.metadata && typeof dbToken.metadata === "object"
    ? dbToken.metadata
    : {}) as Record<string, unknown>;
  const dbMigrated = dbMeta.isMigrated === true;

  try {
    // Get pool data from DexScreener (post-migration only)
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
      next: { revalidate: 30 },
    });
    const ds = await res.json();
    const pair = ds.pairs?.[0];

    if (!pair) {
      return NextResponse.json({ pool: null, graduated: dbMigrated });
    }

    const volumeH24 = pair.volume?.h24 ?? 0;
    const liquidity = pair.liquidity?.usd ?? 0;
    // APR = (24h fees / TVL) * 365 * 100. Meteora DAMM fee is typically 0.25%
    const feeRate = 0.0025;
    const apr = liquidity > 0 ? ((volumeH24 * feeRate * 365) / liquidity) * 100 : 0;

    return NextResponse.json({
      // DB takes precedence; if DexScreener has a pair, that itself implies migration.
      graduated: dbMigrated || true,
      pool: {
        pairAddress: pair.pairAddress,
        dexId: pair.dexId,
        priceUsd: pair.priceUsd,
        priceNative: pair.priceNative,
        liquidity,
        volume24h: volumeH24,
        buys24h: pair.txns?.h24?.buys ?? 0,
        sells24h: pair.txns?.h24?.sells ?? 0,
        apr: Math.round(apr * 10) / 10,
        fdv: pair.fdv,
        marketCap: pair.marketCap,
        url: pair.url,
      },
    });
  } catch {
    return NextResponse.json({ pool: null, graduated: dbMigrated });
  }
}
