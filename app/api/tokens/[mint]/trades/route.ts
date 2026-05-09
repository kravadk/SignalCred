import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { mint: string } }) {
  const { mint } = params;
  try {
    // DexScreener gives us pair data including recent txns
    const dsRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
      next: { revalidate: 10 },
    });
    const ds = await dsRes.json();
    const pair = ds.pairs?.[0];
    if (!pair) return NextResponse.json({ trades: [], pairAddress: null });

    // Try to get trades from Helius if RPC available
    const rpc = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
    const sigsRes = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1,
        method: "getSignaturesForAddress",
        params: [mint, { limit: 25 }],
      }),
    });
    const sigsData = await sigsRes.json();
    const sigs: { signature: string; blockTime: number | null; err: unknown }[] =
      sigsData.result ?? [];

    const trades = sigs
      .filter((s) => !s.err && s.blockTime)
      .map((s) => ({
        signature: s.signature,
        blockTime: s.blockTime,
        type: "swap",
      }));

    return NextResponse.json({
      trades,
      pair: {
        address: pair.pairAddress,
        priceUsd: pair.priceUsd,
        priceNative: pair.priceNative,
        volume24h: pair.volume?.h24,
        txns24h: (pair.txns?.h24?.buys ?? 0) + (pair.txns?.h24?.sells ?? 0),
        buys24h: pair.txns?.h24?.buys ?? 0,
        sells24h: pair.txns?.h24?.sells ?? 0,
        liquidity: pair.liquidity?.usd,
        fdv: pair.fdv,
        marketCap: pair.marketCap,
      },
    });
  } catch {
    return NextResponse.json({ trades: [], pair: null });
  }
}
