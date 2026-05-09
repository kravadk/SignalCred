export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
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
  const [liveFeedTokens, socialStats] = await Promise.all([
    Promise.race([
      getBagsLaunchFeed(),
      new Promise<[]>((resolve) => setTimeout(() => resolve([]), 5000)),
    ]).catch(() => []),
    db.execute(sql`
      SELECT
        (SELECT COUNT(*)::int FROM posts) AS "totalPosts"
    `),
  ]);
  let bagsTokens: Array<{ creatorWallet?: string | null; accountKeys?: string[]; metadata?: unknown }> = liveFeedTokens;
  let source = "bags_feed";
  if (!bagsTokens.length) {
    const cached = await db.select().from(tokens).where(eq(tokens.launchStatus, "live")).limit(100);
    bagsTokens = cached.filter((row) => hasCachedBagsProof(row.metadata));
    source = "verified_bags_cache";
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

  return NextResponse.json({
    liveTokens: bagsTokens.length,
    totalPosts: Number(Array.isArray(socialStats) ? socialStats[0]?.totalPosts ?? 0 : 0),
    totalUsers: creators.size,
    source,
    degraded: source !== "bags_feed",
  });
}
