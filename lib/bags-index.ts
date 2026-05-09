import { tokens, users } from "@/db/schema";
import { bagsRequest } from "@/lib/bags";
import { db } from "@/lib/db";
import { getTokenOverview } from "@/lib/birdeye";
import { eq } from "drizzle-orm";

export interface BagsLaunchFeedItem {
  name?: string;
  symbol?: string;
  description?: string;
  image?: string;
  tokenMint: string;
  status?: string;
  twitter?: string;
  website?: string;
  launchSignature?: string;
  accountKeys?: string[];
  numRequiredSigners?: number;
  uri?: string;
  dbcPoolKey?: string;
  dbcConfigKey?: string;
}

export interface BagsPool {
  tokenMint: string;
  dbcConfigKey?: string;
  dbcPoolKey?: string;
  dammV2PoolKey?: string;
}

export interface BagsCreator {
  username?: string;
  pfp?: string;
  royaltyBps?: number;
  isCreator?: boolean;
  wallet?: string;
  provider?: string;
  providerUsername?: string;
  twitterUsername?: string;
  bagsUsername?: string;
  isAdmin?: boolean;
}

export interface BagsClaimEvent {
  wallet?: string;
  isCreator?: boolean;
  amount?: string;
  signature?: string;
  timestamp?: string;
}

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function cleanText(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function cleanPublicUrl(value: unknown, fallback = ""): string {
  if (typeof value !== "string" || !value.trim()) return fallback;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return fallback;
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "0.0.0.0" ||
      host.startsWith("127.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      /^169\.254\./.test(host)
    ) return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
}

function bagsStatusToLaunchStatus(status?: string): "live" | "pending" | "draft" {
  if (!status) return "live";
  const s = status.toUpperCase();
  if (s.includes("PRE") || s.includes("PENDING")) return "pending";
  if (s.includes("DRAFT")) return "draft";
  return "live";
}

function mergeMetadata(existing: unknown, bags: Record<string, unknown>) {
  const current = existing && typeof existing === "object" && !Array.isArray(existing)
    ? existing as Record<string, unknown>
    : {};
  const currentBags = current.bags && typeof current.bags === "object" && !Array.isArray(current.bags)
    ? current.bags as Record<string, unknown>
    : {};
  return {
    ...current,
    source: current.source ?? "bags_import",
    bags: {
      ...currentBags,
      ...bags,
      lastSyncedAt: new Date().toISOString(),
    },
  };
}

export async function getBagsLaunchFeed(): Promise<BagsLaunchFeedItem[]> {
  return bagsRequest<BagsLaunchFeedItem[]>("/token-launch/feed");
}

export async function getBagsPools(onlyMigrated = false): Promise<BagsPool[]> {
  const suffix = onlyMigrated ? "?onlyMigrated=true" : "";
  return bagsRequest<BagsPool[]>(`/solana/bags/pools${suffix}`);
}

export async function getBagsPoolByMint(mint: string): Promise<BagsPool | null> {
  if (!BASE58.test(mint)) return null;
  try {
    return await bagsRequest<BagsPool>(
      `/solana/bags/pools/token-mint?tokenMint=${encodeURIComponent(mint)}`
    );
  } catch {
    return null;
  }
}

export async function getBagsCreators(mint: string): Promise<BagsCreator[]> {
  if (!BASE58.test(mint)) return [];
  try {
    return await bagsRequest<BagsCreator[]>(
      `/token-launch/creator/v3?tokenMint=${encodeURIComponent(mint)}`
    );
  } catch {
    return [];
  }
}

export async function getBagsLifetimeFees(mint: string): Promise<string | null> {
  if (!BASE58.test(mint)) return null;
  try {
    return await bagsRequest<string>(
      `/token-launch/lifetime-fees?tokenMint=${encodeURIComponent(mint)}`
    );
  } catch {
    return null;
  }
}

export async function getBagsClaimEvents(
  mint: string,
  params: { from?: number; to?: number; limit?: number; offset?: number } = {}
): Promise<BagsClaimEvent[]> {
  if (!BASE58.test(mint)) return [];
  const search = new URLSearchParams({
    tokenMint: mint,
    mode: params.from || params.to ? "time" : "offset",
    limit: String(Math.min(Math.max(params.limit ?? 100, 1), 100)),
  });
  if (params.from) search.set("from", String(params.from));
  if (params.to) search.set("to", String(params.to));
  if (!params.from && !params.to) search.set("offset", String(Math.max(params.offset ?? 0, 0)));

  try {
    const data = await bagsRequest<{ events?: BagsClaimEvent[] }>(
      `/fee-share/token/claim-events?${search.toString()}`
    );
    return Array.isArray(data.events) ? data.events : [];
  } catch {
    return [];
  }
}

export async function getRecentBagsIndex(limit = 100) {
  const imported = await syncRecentBagsLaunches(limit);
  const byMint = new Map<string, NonNullable<(typeof imported)[number]>>();
  for (const token of imported) {
    if (token?.mint && BASE58.test(token.mint)) byMint.set(token.mint, token);
  }
  return Array.from(byMint.values());
}

export async function importBagsFeedToken(item: BagsLaunchFeedItem) {
  if (!item.tokenMint || !BASE58.test(item.tokenMint)) return null;

  const existing = await db.query.tokens.findFirst({
    where: eq(tokens.mint, item.tokenMint),
  });
  const name = cleanText(item.name, existing?.name ?? `Bags ${item.tokenMint.slice(0, 4)}`);
  const symbol = cleanText(item.symbol, existing?.symbol ?? "BAGS").slice(0, 12);

  const metadata = mergeMetadata(existing?.metadata, {
    source: "token-launch/feed",
    bagsStatus: item.status ?? null,
    launchSignature: item.launchSignature ?? null,
    accountKeys: item.accountKeys ?? null,
    numRequiredSigners: item.numRequiredSigners ?? null,
    uri: item.uri ?? null,
    dbcPoolKey: item.dbcPoolKey ?? null,
    dbcConfigKey: item.dbcConfigKey ?? null,
    importedFromBags: true,
  });

  const values = {
    mint: item.tokenMint,
    creatorWallet: existing?.creatorWallet ?? null,
    name,
    symbol,
    description: cleanText(item.description, existing?.description ?? ""),
    imageUrl: cleanPublicUrl(item.image, existing?.imageUrl ?? ""),
    websiteUrl: cleanPublicUrl(item.website, existing?.websiteUrl ?? ""),
    twitterUrl: cleanPublicUrl(item.twitter, existing?.twitterUrl ?? ""),
    launchStatus: bagsStatusToLaunchStatus(item.status),
    bagsLaunchId: existing?.bagsLaunchId ?? item.launchSignature ?? null,
    partnerConfig: existing?.partnerConfig ?? item.dbcConfigKey ?? null,
    metadata,
    launchedAt: existing?.launchedAt ?? new Date(),
  };

  await db.insert(tokens).values(values).onConflictDoUpdate({
    target: tokens.mint,
    set: {
      name: values.name,
      symbol: values.symbol,
      description: values.description,
      imageUrl: values.imageUrl,
      websiteUrl: values.websiteUrl,
      twitterUrl: values.twitterUrl,
      launchStatus: values.launchStatus,
      bagsLaunchId: values.bagsLaunchId,
      partnerConfig: values.partnerConfig,
      metadata: values.metadata,
    },
  });

  return db.query.tokens.findFirst({ where: eq(tokens.mint, item.tokenMint) });
}

export async function importBagsTokenByMint(mint: string) {
  if (!BASE58.test(mint)) return null;

  const existing = await db.query.tokens.findFirst({ where: eq(tokens.mint, mint) });
  const [pool, creators, lifetimeFees, market] = await Promise.all([
    getBagsPoolByMint(mint),
    getBagsCreators(mint),
    getBagsLifetimeFees(mint),
    getTokenOverview(mint),
  ]);

  if (!pool && !market && !existing) return null;

  const creator = creators.find((c) => c.isCreator && c.wallet) ?? creators.find((c) => c.wallet);
  if (creator?.wallet) {
    await db.insert(users).values({
      wallet: creator.wallet,
      username: creator.providerUsername ?? creator.username ?? creator.bagsUsername ?? null,
      avatarUrl: creator.pfp ?? null,
    }).onConflictDoNothing();
  }

  const metadata = mergeMetadata(existing?.metadata, {
    source: pool ? "solana/bags/pools/token-mint" : "market-fallback",
    importedFromBags: !!pool,
    poolVerified: !!pool,
    dbcPoolKey: pool?.dbcPoolKey ?? null,
    dbcConfigKey: pool?.dbcConfigKey ?? null,
    dammV2PoolKey: pool?.dammV2PoolKey ?? null,
    creators,
    lifetimeFees,
  });

  const values = {
    mint,
    creatorWallet: existing?.creatorWallet ?? creator?.wallet ?? null,
    name: existing?.name ?? market?.name ?? `Bags ${mint.slice(0, 4)}`,
    symbol: (existing?.symbol ?? market?.symbol ?? "BAGS").slice(0, 12),
    description: existing?.description ?? "",
    imageUrl: cleanPublicUrl(existing?.imageUrl, cleanPublicUrl(market?.logoURI, "")),
    websiteUrl: cleanPublicUrl(existing?.websiteUrl, "") || null,
    twitterUrl: cleanPublicUrl(existing?.twitterUrl, "") || null,
    telegramUrl: existing?.telegramUrl ?? null,
    launchStatus: existing?.launchStatus ?? "live",
    bagsLaunchId: existing?.bagsLaunchId ?? null,
    partnerConfig: existing?.partnerConfig ?? pool?.dbcConfigKey ?? null,
    metadata,
    launchedAt: existing?.launchedAt ?? new Date(),
  };

  await db.insert(tokens).values(values).onConflictDoUpdate({
    target: tokens.mint,
    set: {
      creatorWallet: values.creatorWallet,
      name: values.name,
      symbol: values.symbol,
      imageUrl: values.imageUrl,
      partnerConfig: values.partnerConfig,
      metadata: values.metadata,
    },
  });

  return db.query.tokens.findFirst({ where: eq(tokens.mint, mint) });
}

export async function syncRecentBagsLaunches(limit = 50) {
  const feed = await getBagsLaunchFeed();
  const imported = [];
  for (const item of feed.slice(0, limit)) {
    const token = await importBagsFeedToken(item);
    if (token) imported.push(token);
  }
  return imported;
}
