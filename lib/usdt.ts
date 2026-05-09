import { PublicKey } from "@solana/web3.js";

// Tether USDT on Solana (mainnet)
export const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
export const USDT_PUBKEY = new PublicKey(USDT_MINT);
export const USDT_DECIMALS = 6;

// USDC on Solana (for reference)
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export function usdtToNative(amount: number): number {
  return Math.floor(amount * 10 ** USDT_DECIMALS);
}

export function nativeToUsdt(native: number): number {
  return native / 10 ** USDT_DECIMALS;
}

/** Fetch USDT/SOL price from DexScreener — free, no API key */
export async function getSolUsdtPrice(): Promise<number> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return 150;
    const data = await res.json();
    const pairs = (data.pairs ?? []) as { chainId: string; priceUsd: string; liquidity?: { usd: number } }[];
    const solPair = pairs
      .filter((p) => p.chainId === "solana")
      .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
    return parseFloat(solPair?.priceUsd ?? "150");
  } catch {
    return 150;
  }
}

export function solToUsdt(sol: number, solPrice: number): number {
  return sol * solPrice;
}
