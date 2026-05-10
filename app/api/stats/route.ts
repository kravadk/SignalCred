export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { getBagsLaunchFeed } from "@/lib/bags-index";
import { tokens } from "@/db/schema";

function hasCachedBagsProof(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  const root = metadata as Record<string, unknown>;
  const bags = root.bags && typeof root.bags === "object" && !Array.isArray(root.bags)
    ? root.bags as Record<string, unknown>
    : {};
  return Boolean(bags.importedFromBags || bags.poolVerified || bags.dbcPoolKey || bags.dbcConfigKey || bags.dammV2PoolKey);
}

export async function GET() {
  try {
    const [liveFeedTokens, socialStats] = await Promise.all([
      Promise.race([
        getBagsLaunchFeed(),
        new Promise<[]>((resolve) => setTimeout(() => resolve([]), 5000)),
      ]).catch(() => []),
      isDatabaseConfigured()
        ? db.execute(sql`
          SELECT
            (SELECT COUNT(*)::int FROM posts) AS "totalPosts"
        `).catch(() => [])
        : Promise.resolve([]),
    ]);
  let bagsTokens: Array<{ creatorWallet?: string | null; accountKeys?: string[]; metadata?: unknown }> = liveFeedTokens;
  let source = "bags_feed";
  if (!bagsTokens.length) {
    if (isDatabaseConfigured()) {
      const cached = await db.select().from(tokens).where(eq(tokens.launchStatus, "live")).limit(100).catch(() => []);
      bagsTokens = cached.filter((row) => hasCachedBagsProof(row.metadata));
      source = "verified_bags_cache";
    } else {
      bagsTokens = [];
      source = "unavailable";
    }
  }
  const creators = new Set(
    bagsTokens
      .map((token) => {
        if ("creatorWallet" in token && typeof token.creatorWallet === "string") return token.creatorWallet;
        if ("accountKeys" in token && Array.isArray(token.accountKeys)) return token.accountKeys[2];
        return null;
      })
      .filter((wallet): wallet is string => typeof wallet === "string" && wallet.length > 0)
  );

  const totalPosts = Array.isArray(socialStats)
    ? Number((socialStats[0] as { totalPosts?: unknown } | undefined)?.totalPosts ?? 0)
    : 0;

  return NextResponse.json({
    liveTokens: bagsTokens.length,
    totalPosts,
    totalUsers: creators.size,
    source,
    degraded: source !== "bags_feed",
  });
  } catch (error) {
    console.warn("[api/stats] unavailable", error instanceof Error ? error.message : error);
    return NextResponse.json({
      liveTokens: 0,
      totalPosts: 0,
      totalUsers: 0,
      source: "unavailable",
      degraded: true,
      warning: "Stats are temporarily unavailable.",
    });
  }
}
