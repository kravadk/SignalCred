"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, TrendingDown, TrendingUp, Zap } from "lucide-react";
import type { TokenOverview } from "@/lib/birdeye";
import type { Token } from "@/db/schema";
import { formatPrice, formatUsd, shortWallet } from "@/lib/utils";
import {
  ExplorerLink,
  bagsTokenUrl,
  dexScreenerPairUrl,
  shortAddress,
  solscanUrl,
} from "@/components/ui/ExplorerLink";

interface PairData {
  priceUsd: string;
  volume24h: number;
  buys24h: number;
  sells24h: number;
  liquidity: number;
  fdv: number;
  marketCap: number;
}

interface TokenHeaderProps {
  token: Token | null;
  marketData: TokenOverview | null;
  mint?: string;
}

export function TokenHeader({ token, marketData, mint }: TokenHeaderProps) {
  const [pairData, setPairData] = useState<PairData | null>(null);
  const [holderCount, setHolderCount] = useState<number | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  const mintAddr = mint ?? token?.mint ?? "";

  useEffect(() => {
    if (!mintAddr) return;
    fetch(`/api/tokens/${mintAddr}/trades`)
      .then((r) => r.json())
      .then((d) => {
        if (d.pair) setPairData(d.pair);
      })
      .catch(() => {});
    fetch(`/api/tokens/${mintAddr}/holders`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.holders)) setHolderCount(d.holders.length);
      })
      .catch(() => {});
  }, [mintAddr]);

  const name = token?.name ?? marketData?.name ?? "Unknown Token";
  const symbol = token?.symbol ?? marketData?.symbol ?? "???";
  const image = token?.imageUrl ?? marketData?.logoURI;
  const price = pairData?.priceUsd ? parseFloat(pairData.priceUsd) : marketData?.price;
  const mc = pairData?.marketCap ?? marketData?.mc;
  const v24h = pairData?.volume24h ?? marketData?.v24h;
  const change = marketData?.priceChange24hPercent;
  const isUp = (change ?? 0) >= 0;
  const graduated = Boolean(pairData);
  const holders = holderCount ?? (marketData?.holder ?? null);

  const stats = [
    { label: "Market Cap", value: formatUsd(mc), empty: "bonding curve", color: "text-[#b48dff]" },
    { label: "24h Volume", value: formatUsd(v24h), empty: graduated ? "-" : "pre-DEX", color: "text-[#69d99a]" },
    { label: "Holders", value: holders !== null ? holders.toLocaleString() : null, empty: "loading...", color: "text-[#ff9aad]" },
    { label: "Status", value: token?.launchStatus ?? null, empty: "-", color: token?.launchStatus === "live" ? "text-[#69d99a]" : "text-white/50" },
  ];

  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7a55c6]/50 to-[#ff6a84]/50" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#7a55c6]/8 via-transparent to-[#ff6a84]/5 pointer-events-none" />

      <div className="relative flex items-start gap-4 flex-wrap">
        <div
          className="w-16 h-16 rounded-2xl shrink-0 overflow-hidden flex items-center justify-center relative"
          style={{
            background: "linear-gradient(135deg, #7a55c6, #ff6a84)",
            boxShadow: "0 8px 24px rgba(122,85,198,0.4)",
          }}
        >
          {image && !imageFailed ? (
            <img
              src={image}
              alt={name}
              className="object-cover w-full h-full"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span className="font-display text-2xl text-white font-bold">{symbol[0]}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-3xl text-white">{name}</h1>
            <span
              className="px-2.5 py-0.5 rounded-xl text-sm font-fun font-black text-white"
              style={{
                background: "linear-gradient(135deg, #7a55c6, #ff6a84)",
                boxShadow: "0 4px 12px rgba(122,85,198,0.3)",
              }}
            >
              ${symbol}
            </span>
            {!graduated && (
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-fun font-bold text-[#ffb84d]"
                style={{ background: "rgba(255,184,77,0.15)", border: "1px solid rgba(255,184,77,0.25)" }}
              >
                <Zap size={9} /> Bonding Curve
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {token?.creatorWallet && (
              <div className="flex items-center gap-1.5 text-xs font-fun">
                <Link
                  href={`/profile/${token.creatorWallet}`}
                  className="text-white/35 hover:text-[#b48dff] transition-colors"
                >
                  by {shortWallet(token.creatorWallet)}
                </Link>
                <ExplorerLink
                  href={solscanUrl(token.creatorWallet, "account")}
                  label="creator scan"
                  className="text-xs"
                />
              </div>
            )}
            {mintAddr && (
              <div className="flex items-center gap-1.5">
                <ExplorerLink
                  href={solscanUrl(mintAddr, "token")}
                  label={shortAddress(mintAddr)}
                  className="text-xs font-mono"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(mintAddr)}
                  className="text-white/20 hover:text-[#69d99a] transition-colors"
                  aria-label="Copy token mint"
                >
                  <Copy size={10} />
                </button>
              </div>
            )}
          </div>
        </div>

        {price !== undefined && price !== null ? (
          <div className="text-right shrink-0">
            <p className="font-mono text-3xl font-black tabular-nums text-white">${formatPrice(price)}</p>
            {change !== undefined && (
              <div className={`flex items-center justify-end gap-1 mt-0.5 font-fun font-black text-sm ${isUp ? "text-[#69d99a]" : "text-[#ff624e]"}`}>
                {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {isUp ? "+" : ""}
                {change.toFixed(2)}% 24h
              </div>
            )}
          </div>
        ) : !graduated ? (
          <div className="text-right shrink-0">
            <p className="text-white/25 text-xs font-fun">Price available</p>
            <p className="text-white/25 text-xs font-fun">after first trade</p>
          </div>
        ) : null}
      </div>

      <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
        {stats.map(({ label, value, empty, color }) => (
          <div
            key={label}
            className="rounded-2xl p-3 text-center"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-white/35 text-[10px] font-fun font-black uppercase tracking-wider">{label}</p>
            <p className={`font-mono text-base font-black tabular-nums mt-0.5 ${value ? color : "text-white/20"}`}>
              {value ?? empty}
            </p>
          </div>
        ))}
      </div>

      {graduated && pairData && (
        <div className="mt-3">
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Market Cap", value: formatUsd(pairData.marketCap) ?? "No pair" },
              { label: "Volume 24h", value: formatUsd(pairData.volume24h) ?? "-" },
              { label: "Liquidity", value: formatUsd(pairData.liquidity) ?? "-" },
              { label: "Txns 24h", value: `${pairData.buys24h} up / ${pairData.sells24h} down` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-white/35 text-[10px] font-fun font-black uppercase tracking-wider mb-1">{label}</p>
                <p className="text-white font-mono font-bold text-sm tabular-nums">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-end gap-3 text-[11px] font-fun">
            {marketData?.pairAddress && (
              <ExplorerLink href={dexScreenerPairUrl(marketData.pairAddress)} label="DexScreener pair" />
            )}
            {mintAddr && <ExplorerLink href={bagsTokenUrl(mintAddr)} label="Bags.fm token" />}
          </div>
        </div>
      )}

      {!graduated && (
        <div
          className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: "rgba(255,184,77,0.06)", border: "1px solid rgba(255,184,77,0.15)" }}
        >
          <Zap size={11} className="text-[#ffb84d] shrink-0" />
          <p className="text-white/35 text-[11px] font-fun">
            Trading on Bags bonding curve. Price and volume data appears on DexScreener after the first swap.
          </p>
        </div>
      )}
    </div>
  );
}
