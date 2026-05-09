import { and, desc, eq, gte, sql } from "drizzle-orm";
import { posts, rewardCampaigns, tokens } from "@/db/schema";
import { getBagsClaimEvents, getBagsCreators, getBagsLifetimeFees, getBagsPoolByMint } from "@/lib/bags-index";
import { db } from "@/lib/db";
import { getFeeVelocity24h } from "@/lib/fee-velocity";
import { feeVelocityValue } from "@/lib/fee-velocity-display";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export type Milestone = {
  id: string;
  label: string;
  status: "completed" | "pending";
  value: string;
  source: string;
  href?: string | null;
  completedAt?: string | null;
};

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

function readBagsMeta(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const root = metadata as Record<string, unknown>;
  const bags = root.bags;
  return bags && typeof bags === "object" && !Array.isArray(bags)
    ? (bags as Record<string, unknown>)
    : {};
}

function sumClaimEventsLamports(events: Array<{ amount?: string }>) {
  return events.reduce((sum, event) => {
    const value = Number(event.amount ?? 0);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.round(value), 0), 100);
}

function repeatedTextRisk(contents: string[]) {
  const normalized = contents
    .map((content) => content.trim().toLowerCase().replace(/\s+/g, " "))
    .filter(Boolean);
  if (normalized.length < 3) return 0;
  const counts = new Map<string, number>();
  for (const content of normalized) counts.set(content, (counts.get(content) ?? 0) + 1);
  const maxRepeats = Math.max(...Array.from(counts.values()));
  return clampScore((maxRepeats / normalized.length) * 100);
}

async function getHolderSampleCount(mint: string) {
  const rpc = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  try {
    const res = await withTimeout(fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenLargestAccounts",
        params: [mint],
      }),
    }), 2_500, null);
    if (!res) return null;
    const data = await res.json();
    return Array.isArray(data.result?.value) ? data.result.value.length : 0;
  } catch {
    return null;
  }
}

function milestone(id: string, label: string, completed: boolean, value: string, source: string, href?: string | null, completedAt?: string | null): Milestone {
  return {
    id,
    label,
    status: completed ? "completed" : "pending",
    value,
    source,
    href: href ?? null,
    completedAt: completed ? completedAt ?? new Date().toISOString() : null,
  };
}

export async function buildTokenSocialContext(mint: string) {
  if (!BASE58.test(mint)) throw new Error("Invalid token mint");

  const token = await db.query.tokens.findFirst({ where: eq(tokens.mint, mint) });
  const bagsMeta = readBagsMeta(token?.metadata);
  const now = Math.floor(Date.now() / 1000);
  const since24h = now - 24 * 60 * 60;

  const [tokenPosts, campaigns, pool, creators, lifetimeFeesRaw, claimEvents24h, holderSampleCount] = await Promise.all([
    db.select().from(posts).where(eq(posts.tokenMint, mint)).orderBy(desc(posts.createdAt)).limit(200),
    db.select().from(rewardCampaigns).where(eq(rewardCampaigns.tokenMint, mint)).orderBy(desc(rewardCampaigns.createdAt)).limit(20),
    withTimeout(getBagsPoolByMint(mint), 2_500, null),
    withTimeout(getBagsCreators(mint), 2_500, []),
    withTimeout(getBagsLifetimeFees(mint), 2_500, null),
    withTimeout(getBagsClaimEvents(mint, { from: since24h, to: now, limit: 100 }), 2_500, []),
    withTimeout(getHolderSampleCount(mint), 2_800, null),
  ]);

  const officialPosts = tokenPosts.filter((post) => post.postType === "official");
  const uniqueWallets = new Set(tokenPosts.map((post) => post.authorWallet).filter(Boolean)).size;
  const reactionsTotal = tokenPosts.reduce((sum, post) => (
    sum + Number(post.likesCount ?? 0) + Number(post.commentsCount ?? 0) + Number(post.repostsCount ?? 0)
  ), 0);
  const lifetimeFeesLamports = Number(lifetimeFeesRaw ?? 0);
  const safeLifetimeFeesLamports = Number.isFinite(lifetimeFeesLamports) ? lifetimeFeesLamports : 0;
  const feeVelocity = await withTimeout(getFeeVelocity24h(mint, safeLifetimeFeesLamports), 2_500, null);
  const claimed24h = sumClaimEventsLamports(claimEvents24h);
  const creator = creators.find((entry) => entry.isCreator && entry.wallet) ?? creators.find((entry) => entry.wallet);
  const poolKey = pool?.dbcPoolKey || pool?.dammV2PoolKey || bagsMeta.dbcPoolKey || bagsMeta.dammV2PoolKey || null;

  const bagsFeedVerified = Boolean(bagsMeta.importedFromBags || bagsMeta.source === "token-launch/feed");
  const poolVerified = Boolean(pool || bagsMeta.poolVerified || poolKey);
  const creatorVerified = Boolean(creator?.wallet);
  const hasOfficialUpdate = officialPosts.length > 0;
  const hasTenHolders = typeof holderSampleCount === "number" && holderSampleCount >= 10;
  const hasOneSolFees = safeLifetimeFeesLamports >= 1_000_000_000;
  const feeVelocityActive = feeVelocity?.status === "active";
  const hasClaimEvent = claimEvents24h.length > 0 || claimed24h > 0;
  const hasCampaign = campaigns.length > 0;

  const milestones = [
    milestone("bags-feed", "Bags feed verified", bagsFeedVerified, bagsFeedVerified ? "verified" : "pending", "bags_feed", `https://bags.fm/${mint}`),
    milestone("pool-proof", "Pool verified", poolVerified, poolKey ? `${String(poolKey).slice(0, 6)}...${String(poolKey).slice(-4)}` : "pending", "bags_pool", poolKey ? `https://solscan.io/account/${poolKey}` : null),
    milestone("creator-proof", "Creator verified", creatorVerified, creator?.wallet ? `${creator.wallet.slice(0, 4)}...${creator.wallet.slice(-4)}` : "pending", "creators_api", creator?.wallet ? `https://solscan.io/account/${creator.wallet}` : null),
    milestone("official-update", "First official update", hasOfficialUpdate, hasOfficialUpdate ? `${officialPosts.length} official` : "pending", "square_posts", null, officialPosts[0]?.createdAt?.toISOString?.() ?? String(officialPosts[0]?.createdAt ?? "")),
    milestone("holders-10", "First 10 holder sample", hasTenHolders, holderSampleCount == null ? "holder source pending" : `${holderSampleCount} largest accounts`, "solana_rpc", `https://solscan.io/token/${mint}`),
    milestone("fees-1-sol", "First 1 SOL fees", hasOneSolFees, `${(safeLifetimeFeesLamports / 1e9).toFixed(4)} SOL`, "bags_fees", `https://bags.fm/${mint}`),
    milestone("velocity-active", "Fee velocity active", feeVelocityActive, feeVelocityValue(feeVelocity?.status, feeVelocity?.feeVelocity24hLamports), "fee_snapshots", `https://bags.fm/${mint}`),
    milestone("claim-event", "First claim event", hasClaimEvent, hasClaimEvent ? `${claimEvents24h.length} in 24h` : "pending", "claim_events", claimEvents24h[0]?.signature ? `https://solscan.io/tx/${claimEvents24h[0].signature}` : `https://bags.fm/${mint}`),
    milestone("usdt-campaign", "USDT campaign planned", hasCampaign, hasCampaign ? `${campaigns.length} planned` : "pending", "reward_campaigns", null, campaigns[0]?.createdAt?.toISOString?.() ?? String(campaigns[0]?.createdAt ?? "")),
  ];

  const completedMilestones = milestones.filter((entry) => entry.status === "completed").length;
  const officialScore = clampScore((officialPosts.length / 2) * 100);
  const uniqueWalletScore = clampScore((uniqueWallets / 8) * 100);
  const feeAlignmentScore = clampScore(
    (safeLifetimeFeesLamports > 0 ? 45 : 0) +
    (feeVelocityActive ? 45 : 0) +
    (claimed24h > 0 ? 10 : 0)
  );
  const holderAlignment = clampScore(((holderSampleCount ?? 0) / 20) * 100);
  const reactionScore = clampScore((reactionsTotal / 25) * 100);
  const milestoneScore = clampScore((completedMilestones / milestones.length) * 100);
  const duplicateRisk = repeatedTextRisk(tokenPosts.map((post) => post.content));
  const repeatedWalletRisk = uniqueWallets > 0 ? clampScore(((tokenPosts.length - uniqueWallets) / Math.max(tokenPosts.length, 1)) * 100) : 0;
  const highSocialZeroFeesRisk = tokenPosts.length >= 5 && safeLifetimeFeesLamports === 0 ? 70 : 0;
  const spamRisk = clampScore(Math.max(duplicateRisk, repeatedWalletRisk, highSocialZeroFeesRisk));

  const rawScore =
    officialScore * 0.25 +
    uniqueWalletScore * 0.20 +
    feeAlignmentScore * 0.20 +
    holderAlignment * 0.15 +
    reactionScore * 0.10 +
    milestoneScore * 0.10 -
    spamRisk * 0.20;

  return {
    token: { mint, creatorWallet: token?.creatorWallet ?? creator?.wallet ?? null },
    socialProof: {
      socialScore: clampScore(rawScore),
      scoreBreakdown: {
        officialUpdates: officialScore,
        uniqueWallets: uniqueWalletScore,
        feeVelocityAlignment: feeAlignmentScore,
        holderAlignment,
        reactions: reactionScore,
        milestones: milestoneScore,
        spamPenalty: spamRisk,
        formula: "25% official + 20% unique wallets + 20% fees + 15% holders + 10% reactions + 10% milestones - spam penalty",
      },
      officialUpdatesCount: officialPosts.length,
      communityPostsCount: tokenPosts.filter((post) => post.postType !== "official").length,
      uniqueWallets,
      reactionsTotal,
      holderAlignment,
      feeVelocityAlignment: feeAlignmentScore,
      spamRisk,
      sourceLabels: {
        posts: "square_posts",
        official: "wallet_signature + creators_api",
        holders: holderSampleCount == null ? "pending" : "solana_rpc",
        fees: lifetimeFeesRaw == null ? "pending" : "bags_fees",
        velocity: feeVelocity?.status === "active" ? "fee_snapshots" : `fee_snapshots_${feeVelocity?.status ?? "pending"}`,
        campaigns: "reward_campaigns",
      },
    },
    milestones,
    campaigns,
  };
}

export async function hasRecentDuplicatePost(input: { wallet: string; tokenMint?: string | null; content: string }) {
  const normalized = input.content.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) return false;
  const since = new Date(Date.now() - 10 * 60 * 1000);
  const rows = await db
    .select({ content: posts.content })
    .from(posts)
    .where(and(eq(posts.authorWallet, input.wallet), gte(posts.createdAt, since)))
    .orderBy(desc(posts.createdAt))
    .limit(25);
  return rows.some((row) => row.content.trim().toLowerCase().replace(/\s+/g, " ") === normalized);
}

export async function getCampaignStats() {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(rewardCampaigns);
  return { count: Number(row?.count ?? 0) };
}
