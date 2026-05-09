import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { posts, tokens } from "@/db/schema";
import { db } from "@/lib/db";
import { getTokenOverview } from "@/lib/birdeye";
import {
  getBagsClaimEvents,
  getBagsCreators,
  getBagsLifetimeFees,
  getBagsPoolByMint,
} from "@/lib/bags-index";
import { getFeeVelocity24h } from "@/lib/fee-velocity";
import { feeVelocityLongHint, feeVelocityValue } from "@/lib/fee-velocity-display";
import { formatLamports, formatMarketCap, shortWallet } from "@/lib/utils";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
type EvidenceStatus = "ok" | "pending" | "unavailable" | "warning";

function readBagsMeta(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const root = metadata as Record<string, unknown>;
  const bags = root.bags;
  return bags && typeof bags === "object" && !Array.isArray(bags)
    ? bags as Record<string, unknown>
    : {};
}

function shortKey(value?: unknown) {
  return typeof value === "string" && value.length > 8 ? shortWallet(value) : null;
}

function sumEvents(events: Array<{ amount?: string }>) {
  return events.reduce((sum, event) => {
    const amount = Number(event.amount ?? 0);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);
}

function evidenceRow({
  id,
  label,
  status,
  value,
  source,
  href,
  timestamp,
  description,
}: {
  id: string;
  label: string;
  status: EvidenceStatus;
  value: string;
  source: string;
  href?: string | null;
  timestamp?: string | null;
  description: string;
}) {
  return {
    id,
    label,
    status,
    ok: status === "ok",
    value,
    source,
    href: href ?? null,
    timestamp: timestamp ?? null,
    description,
  };
}

export async function GET(_req: NextRequest, { params }: { params: { mint: string } }) {
  if (!BASE58.test(params.mint)) {
    return NextResponse.json({ error: "Invalid token mint" }, { status: 400 });
  }

  const token = await db.query.tokens.findFirst({ where: eq(tokens.mint, params.mint) });
  const bagsMeta = readBagsMeta(token?.metadata);
  const now = Math.floor(Date.now() / 1000);
  const since24h = now - 24 * 60 * 60;

  const [pool, creators, lifetimeFeesRaw, claimEvents24h, marketData, socialRows] = await Promise.all([
    getBagsPoolByMint(params.mint),
    getBagsCreators(params.mint),
    getBagsLifetimeFees(params.mint),
    getBagsClaimEvents(params.mint, { from: since24h, to: now, limit: 100 }),
    getTokenOverview(params.mint),
    db.select().from(posts).where(eq(posts.tokenMint, params.mint)).limit(50),
  ]);

  const lifetimeFeesLamports = Number(lifetimeFeesRaw ?? 0);
  const feeVelocity = await getFeeVelocity24h(
    params.mint,
    Number.isFinite(lifetimeFeesLamports) ? lifetimeFeesLamports : 0
  );
  const creator = creators.find((entry) => entry.isCreator && entry.wallet) ?? creators.find((entry) => entry.wallet);
  const hasFeedProof = Boolean(bagsMeta.importedFromBags || bagsMeta.source === "token-launch/feed");
  const hasPoolProof = Boolean(pool || bagsMeta.poolVerified || bagsMeta.dbcPoolKey || bagsMeta.dammV2PoolKey);
  const claimed24h = sumEvents(claimEvents24h);
  const poolKey = pool?.dbcPoolKey || pool?.dammV2PoolKey || bagsMeta.dbcPoolKey || bagsMeta.dammV2PoolKey;
  const generatedAt = new Date().toISOString();
  const officialCount = socialRows.filter((row) => row.postType === "official").length;
  const uniqueSocialWallets = new Set(socialRows.map((row) => row.authorWallet).filter(Boolean)).size;

  return NextResponse.json({
    rows: [
      evidenceRow({
        id: "bags-feed",
        label: "Bags feed",
        status: hasFeedProof ? "ok" : "pending",
        value: hasFeedProof ? "token-launch/feed" : "not in cached feed",
        source: "bags_api",
        href: `https://bags.fm/token/${params.mint}`,
        timestamp: generatedAt,
        description: "Confirms this mint is visible through the Bags launch feed or imported Bags metadata.",
      }),
      evidenceRow({
        id: "bags-pool",
        label: "Pool proof",
        status: hasPoolProof ? "ok" : "pending",
        value: shortKey(poolKey) ?? "pending",
        source: "bags_pools",
        href: poolKey
          ? `https://solscan.io/account/${poolKey}`
          : null,
        timestamp: generatedAt,
        description: "Checks Bags pool/config proof and links to the pool/config account when available.",
      }),
      evidenceRow({
        id: "bags-creators",
        label: "Creators API",
        status: creators.length > 0 ? "ok" : "pending",
        value: creator?.wallet ? shortWallet(creator.wallet) : `${creators.length} returned`,
        source: "creators_api",
        href: creator?.wallet ? `https://solscan.io/account/${creator.wallet}` : null,
        timestamp: generatedAt,
        description: "Verifies creator/admin context from the Bags creators API.",
      }),
      evidenceRow({
        id: "lifetime-fees",
        label: "Lifetime fees",
        status: Number.isFinite(lifetimeFeesLamports) ? "ok" : "unavailable",
        value: formatLamports(Number.isFinite(lifetimeFeesLamports) ? lifetimeFeesLamports : 0),
        source: "lifetime_fees",
        href: `https://bags.fm/token/${params.mint}`,
        timestamp: generatedAt,
        description: "Reads lifetime token fees from Bags fee sharing data; no generated values are faked.",
      }),
      evidenceRow({
        id: "claim-events",
        label: "Claimed 24h",
        status: claimEvents24h.length > 0 ? "ok" : "pending",
        value: `${claimEvents24h.length} events / ${formatLamports(claimed24h)}`,
        source: "claim_events",
        href: claimEvents24h[0]?.signature ? `https://solscan.io/tx/${claimEvents24h[0].signature}` : `https://bags.fm/token/${params.mint}`,
        timestamp: claimEvents24h[0]?.timestamp ?? generatedAt,
        description: "Shows recent Bags claim events and links the newest event transaction when present.",
      }),
      evidenceRow({
        id: "fee-velocity",
        label: "Fee velocity",
        status: feeVelocity.status === "active" ? "ok" : feeVelocity.status === "pending" ? "pending" : "unavailable",
        value: feeVelocityValue(feeVelocity.status, feeVelocity.feeVelocity24hLamports),
        source: "fee_snapshots",
        href: `https://bags.fm/token/${params.mint}`,
        timestamp: feeVelocity.currentSnapshotAt ?? generatedAt,
        description: feeVelocity.status === "pending" ? feeVelocityLongHint(feeVelocity.status) : feeVelocity.message,
      }),
      evidenceRow({
        label: "Market",
        id: "market-source",
        status: marketData ? "ok" : "pending",
        value: marketData ? `${formatMarketCap(marketData.v24h)} vol 24h` : "no pair",
        source: "dexscreener",
        href: marketData?.pairAddress ? `https://dexscreener.com/solana/${marketData.pairAddress}` : null,
        timestamp: generatedAt,
        description: "Uses the highest-liquidity Solana pair found by DexScreener when a DEX pair exists.",
      }),
      evidenceRow({
        id: "solscan-mint",
        label: "Solscan mint",
        status: "ok",
        value: shortWallet(params.mint),
        source: "solscan",
        href: `https://solscan.io/token/${params.mint}`,
        timestamp: generatedAt,
        description: "Direct explorer link to the SPL token mint.",
      }),
      evidenceRow({
        id: "bags-token-page",
        label: "Bags.fm token",
        status: "ok",
        value: shortWallet(params.mint),
        source: "bags_fm",
        href: `https://bags.fm/token/${params.mint}`,
        timestamp: generatedAt,
        description: "Direct Bags.fm token page for independent user verification.",
      }),
      evidenceRow({
        id: "meteora-pool",
        label: "Meteora pool",
        status: pool?.dammV2PoolKey ? "ok" : hasPoolProof ? "warning" : "pending",
        value: shortKey(pool?.dammV2PoolKey) ?? "pending",
        source: "meteora",
        href: pool?.dammV2PoolKey ? `https://app.meteora.ag/pools/${pool.dammV2PoolKey}` : null,
        timestamp: generatedAt,
        description: "Links to Meteora when Bags pool data exposes a DAMM v2 pool key.",
      }),
      evidenceRow({
        id: "social-evidence",
        label: "Social evidence",
        status: socialRows.length > 0 ? "ok" : "pending",
        value: `${socialRows.length} posts / ${officialCount} official / ${uniqueSocialWallets} wallets`,
        source: "square_posts",
        href: null,
        timestamp: socialRows[0]?.createdAt?.toISOString?.() ?? generatedAt,
        description: "Token-linked Square activity used for social proof; generic posts do not count.",
      }),
    ],
    message: "Fee velocity uses hourly snapshots. Baseline warming is expected until a snapshot at least 24h old exists.",
  });
}
