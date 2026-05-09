/**
 * Price data via DexScreener (free, no API key required)
 * Docs: https://docs.dexscreener.com/api/reference
 */

const DS_BASE = "https://api.dexscreener.com";

export interface TokenPrice {
  value: number;
  updateUnixTime: number;
  updateHumanTime: string;
  priceChange24h: number;
}

export interface TokenOverview {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
  price: number;
  mc: number;
  liquidity: number;
  pairCreatedAt: number | null;
  v24h: number;
  v6h: number;
  v1h: number;
  v5m: number;
  txns24h: number;
  buys24h: number;
  sells24h: number;
  traders24h: number | null;
  priceChange5mPercent: number;
  priceChange1hPercent: number;
  priceChange6hPercent: number;
  v24hChangePercent: number;
  priceChange24hPercent: number;
  holder: number;
  pairAddress?: string;
  dexId?: string;
}

export interface OHLCVBar {
  unixTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface DexPair {
  chainId: string;
  dexId?: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken?: { address: string; name: string; symbol: string };
  priceUsd: string;
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
  txns?: {
    m5?: { buys?: number; sells?: number };
    h1?: { buys?: number; sells?: number };
    h6?: { buys?: number; sells?: number };
    h24?: { buys?: number; sells?: number };
  };
  volume?: { m5?: number; h1?: number; h6?: number; h24?: number };
  fdv: number;
  marketCap?: number;
  pairCreatedAt?: number;
  liquidity?: { usd?: number };
  info?: { imageUrl?: string };
}

function pairToOverview(mint: string, p: DexPair): TokenOverview {
  const price = parseFloat(p.priceUsd ?? "0");
  const buys24h = Number(p.txns?.h24?.buys ?? 0);
  const sells24h = Number(p.txns?.h24?.sells ?? 0);
  return {
    address: mint,
    name: p.baseToken?.name ?? "",
    symbol: p.baseToken?.symbol ?? "",
    decimals: 6,
    logoURI: p.info?.imageUrl ?? "",
    price,
    mc: p.marketCap ?? p.fdv ?? 0,
    liquidity: p.liquidity?.usd ?? 0,
    pairCreatedAt: p.pairCreatedAt ?? null,
    v24h: p.volume?.h24 ?? 0,
    v6h: p.volume?.h6 ?? 0,
    v1h: p.volume?.h1 ?? 0,
    v5m: p.volume?.m5 ?? 0,
    txns24h: buys24h + sells24h,
    buys24h,
    sells24h,
    traders24h: null,
    priceChange5mPercent: p.priceChange?.m5 ?? 0,
    priceChange1hPercent: p.priceChange?.h1 ?? 0,
    priceChange6hPercent: p.priceChange?.h6 ?? 0,
    v24hChangePercent: p.priceChange?.h24 ?? 0,
    priceChange24hPercent: p.priceChange?.h24 ?? 0,
    holder: 0,
    pairAddress: p.pairAddress,
    dexId: p.dexId,
  };
}

async function getTokenPairs(mint: string): Promise<DexPair[]> {
  try {
    const res = await fetch(`${DS_BASE}/latest/dex/tokens/${mint}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    // Filter Solana pairs only, sort by liquidity
    const pairs: DexPair[] = (data.pairs ?? [])
      .filter((p: DexPair) => p.chainId === "solana")
      .sort((a: DexPair, b: DexPair) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
    return pairs;
  } catch {
    return [];
  }
}

export async function getTokenPrice(mint: string): Promise<TokenPrice | null> {
  const pairs = await getTokenPairs(mint);
  if (!pairs.length) return null;
  const p = pairs[0];
  const price = parseFloat(p.priceUsd ?? "0");
  return {
    value: price,
    updateUnixTime: Date.now() / 1000,
    updateHumanTime: new Date().toISOString(),
    priceChange24h: p.priceChange?.h24 ?? 0,
  };
}

export async function getTokenOverview(mint: string): Promise<TokenOverview | null> {
  const pairs = await getTokenPairs(mint);
  if (!pairs.length) return null;
  const p = pairs[0];
  return pairToOverview(mint, p);
}

export async function getOHLCV(
  mint: string,
  timeframe: "15m" | "1H" | "1D" = "1H",
  limit = 168
): Promise<OHLCVBar[]> {
  try {
    // Get pair address first
    const pairs = await getTokenPairs(mint);
    if (!pairs.length) return [];
    const pairAddress = pairs[0].pairAddress;

    // DexScreener chart API
    const resolution = timeframe === "15m" ? "15" : timeframe === "1H" ? "60" : "1D";
    const res = await fetch(
      `${DS_BASE}/chart/solana/${pairAddress}?resolution=${resolution}&countback=${limit}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const data = await res.json();

    const bars: OHLCVBar[] = [];
    const t = data.t ?? [];
    const o = data.o ?? [];
    const h = data.h ?? [];
    const l = data.l ?? [];
    const c = data.c ?? [];
    const v = data.v ?? [];

    for (let i = 0; i < t.length; i++) {
      bars.push({
        unixTime: t[i],
        open: o[i],
        high: h[i],
        low: l[i],
        close: c[i],
        volume: v[i],
      });
    }
    return bars;
  } catch {
    return [];
  }
}

export async function getMultiTokenPrices(
  mints: string[]
): Promise<Record<string, number>> {
  if (!mints.length) return {};
  try {
    // DexScreener supports batch: up to 30 tokens
    const chunks = [];
    for (let i = 0; i < mints.length; i += 30) {
      chunks.push(mints.slice(i, i + 30));
    }

    const results: Record<string, number> = {};
    await Promise.all(
      chunks.map(async (chunk) => {
        const res = await fetch(
          `${DS_BASE}/latest/dex/tokens/${chunk.join(",")}`,
          { next: { revalidate: 30 } }
        );
        if (!res.ok) return;
        const data = await res.json();
        const pairs: DexPair[] = data.pairs ?? [];
        // Pick highest liquidity pair per token
        const seen = new Set<string>();
        pairs
          .filter((p) => p.chainId === "solana")
          .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))
          .forEach((p) => {
            const addr = p.baseToken?.address;
            if (addr && !seen.has(addr)) {
              seen.add(addr);
              results[addr] = parseFloat(p.priceUsd ?? "0");
            }
          });
      })
    );
    return results;
  } catch {
    return {};
  }
}

export async function getMultiTokenOverviews(
  mints: string[]
): Promise<Record<string, TokenOverview>> {
  if (!mints.length) return {};
  try {
    const chunks = [];
    for (let i = 0; i < mints.length; i += 30) {
      chunks.push(mints.slice(i, i + 30));
    }

    const results: Record<string, TokenOverview> = {};
    await Promise.all(
      chunks.map(async (chunk) => {
        const res = await fetch(
          `${DS_BASE}/latest/dex/tokens/${chunk.join(",")}`,
          { next: { revalidate: 30 } }
        );
        if (!res.ok) return;
        const data = await res.json();
        const pairs: DexPair[] = data.pairs ?? [];
        const seen = new Set<string>();
        pairs
          .filter((p) => p.chainId === "solana")
          .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))
          .forEach((p) => {
            const addr = p.baseToken?.address;
            if (!addr || seen.has(addr)) return;
            seen.add(addr);
            results[addr] = pairToOverview(addr, p);
          });
      })
    );
    return results;
  } catch {
    return {};
  }
}
