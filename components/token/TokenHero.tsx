"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Copy, ExternalLink, Loader2, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import type { Token } from "@/db/schema";
import { feeVelocitySubtitle, feeVelocityValue } from "@/lib/fee-velocity-display";
import { normalizeImageUrl, proxiedImageUrl } from "@/lib/image-url";
import { cn, formatLamports, formatPrice, formatTimeAgo, formatUsd, shortWallet } from "@/lib/utils";
import { ExplorerLink, shortAddress } from "@/components/ui/ExplorerLink";

type SummaryResponse = {
  token?: {
    mint: string;
    name: string;
    symbol: string;
    imageUrl?: string | null;
    launchStatus?: string | null;
    creatorWallet?: string | null;
    launchedAt?: string | Date | null;
  };
  market?: {
    price?: number | null;
    marketCap?: number | null;
    liquidity?: number | null;
    volume24h?: number | null;
    txns24h?: number | null;
    buys24h?: number | null;
    sells24h?: number | null;
    priceChange24hPercent?: number | null;
    pairAddress?: string | null;
    pairCreatedAt?: number | null;
    dexId?: string | null;
  } | null;
  fees?: {
    lifetimeFeesLamports?: number | null;
    claimedFees24hLamports?: number | null;
    feeVelocity24hLamports?: number | null;
    feeVelocityStatus?: string | null;
  };
  proof?: {
    bagsFeed?: boolean;
    pool?: boolean;
    creator?: boolean;
    sourceLabels?: Record<string, string | null>;
  };
  links?: {
    solscanMint?: string;
    bagsToken?: string;
    dexScreener?: string | null;
    creatorProfile?: string | null;
  };
  source?: {
    generatedAt?: string;
  };
};

function formatPercent(value?: number | null) {
  if (value == null || !Number.isFinite(Number(value))) return "pending";
  return `${value >= 0 ? "+" : ""}${value.toFixed(Math.abs(value) > 99 ? 0 : 2)}%`;
}

function percentTone(value?: number | null) {
  if (value == null) return "text-white/35";
  if (value > 0) return "text-[#00d97e]";
  if (value < 0) return "text-[#ff4d5a]";
  return "text-white/55";
}

function ProofPill({ ok, label }: { ok?: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-[26px] items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-body font-black",
        ok
          ? "border-[#00ff88]/25 bg-[#00ff88]/10 text-[#69d99a]"
          : "border-[#ffb84d]/22 bg-[#ffb84d]/10 text-[#ffcc7a]"
      )}
    >
      <BadgeCheck size={12} />
      {label}
    </span>
  );
}

function Metric({
  label,
  value,
  sub,
  tone = "text-white",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="min-h-[76px] rounded-xl border border-white/8 bg-white/[0.045] px-3 py-2.5">
      <p className="text-[10px] font-body font-black uppercase tracking-[0.12em] text-white/40">{label}</p>
      <p className={cn("mt-1 truncate font-mono text-sm font-black tabular-nums", tone)}>{value}</p>
      {sub && <p className="mt-0.5 truncate text-[11px] font-body font-semibold text-white/42">{sub}</p>}
    </div>
  );
}

export function TokenHero({ token, mint }: { token: Token | null; mint: string }) {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState<"direct" | "proxy" | "failed">("direct");

  useEffect(() => {
    const controller = new AbortController();
    async function loadSummary() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/tokens/${mint}/summary`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Summary API returned ${res.status}`);
        setSummary(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Token summary unavailable");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadSummary();
    return () => controller.abort();
  }, [mint]);

  const identity = summary?.token;
  const name = identity?.name ?? token?.name ?? `Bags ${mint.slice(0, 4)}`;
  const symbol = identity?.symbol ?? token?.symbol ?? "BAGS";
  const imageUrl = identity?.imageUrl ?? token?.imageUrl ?? null;
  const directImageUrl = normalizeImageUrl(imageUrl);
  const proxyImageUrl = proxiedImageUrl(imageUrl);
  const resolvedImageUrl = imageMode === "direct" ? directImageUrl : imageMode === "proxy" ? proxyImageUrl : null;
  const creatorWallet = identity?.creatorWallet ?? token?.creatorWallet ?? null;
  const market = summary?.market ?? null;
  const fees = summary?.fees ?? {};
  const proof = summary?.proof ?? {};
  const links = summary?.links ?? {};
  const priceChange = market?.priceChange24hPercent ?? null;
  const isUp = (priceChange ?? 0) >= 0;

  const age = useMemo(() => {
    if (market?.pairCreatedAt) return formatTimeAgo(new Date(market.pairCreatedAt));
    if (identity?.launchedAt) return formatTimeAgo(identity.launchedAt);
    if (token?.launchedAt) return formatTimeAgo(token.launchedAt);
    return "pending";
  }, [identity?.launchedAt, market?.pairCreatedAt, token?.launchedAt]);

  const proofCount = [proof.bagsFeed, proof.pool, proof.creator].filter(Boolean).length;
  const velocityLabel = feeVelocityValue(fees.feeVelocityStatus, fees.feeVelocity24hLamports);

  return (
    <div className="card relative overflow-hidden p-4 sm:p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#00ff88]/5 via-[#00ff88]/45 to-[#ffb84d]/35" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_0%,rgba(0,255,136,0.08),transparent_34%),radial-gradient(circle_at_100%_20%,rgba(255,184,77,0.07),transparent_34%)]" />

      <div className="relative flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#26aa68] via-[#7a55c6] to-[#ff6a84] text-2xl font-display font-bold text-white shadow-[0_10px_28px_rgba(0,0,0,0.28)]">
            {resolvedImageUrl ? (
              <img
                src={resolvedImageUrl}
                alt={name}
                className="h-full w-full object-cover"
                loading="eager"
                referrerPolicy="no-referrer"
                onError={() => setImageMode(imageMode === "direct" && proxyImageUrl && proxyImageUrl !== directImageUrl ? "proxy" : "failed")}
              />
            ) : (
              symbol.slice(0, 1)
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-display text-3xl leading-none text-white sm:text-4xl">{name}</h1>
              <span className="rounded-xl bg-white/10 px-2.5 py-1 text-sm font-body font-black text-white">
                ${symbol}
              </span>
              <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-body font-black uppercase text-white/55">
                {identity?.launchStatus ?? token?.launchStatus ?? "live"}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-body font-semibold">
              {creatorWallet && (
                <Link
                  href={`/profile/${creatorWallet}`}
                  className="inline-flex items-center gap-1.5 text-[#cdb6ff] hover:text-white"
                >
                  creator {shortWallet(creatorWallet)}
                  <ExternalLink size={11} />
                </Link>
              )}
              <ExplorerLink href={links.solscanMint ?? `https://solscan.io/token/${mint}`} label={shortAddress(mint)} className="font-mono text-xs" />
              <button
                onClick={() => navigator.clipboard.writeText(mint)}
                className="inline-flex items-center gap-1 text-white/35 hover:text-[#69d99a]"
                aria-label="Copy token mint"
              >
                <Copy size={11} /> copy
              </button>
              {links.bagsToken && <ExplorerLink href={links.bagsToken} label="Bags.fm" className="text-xs" />}
              {links.dexScreener && <ExplorerLink href={links.dexScreener} label="DexScreener" className="text-xs" />}
              <Link
                href={`/passport/${mint}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#00ff88]/18 bg-[#00ff88]/8 px-2 py-1 text-xs font-body font-black text-[#69d99a] hover:bg-[#00ff88]/12 hover:text-white"
              >
                Trust Passport
                <ShieldCheck size={11} />
              </Link>
            </div>
          </div>

          <div className="hidden shrink-0 text-right sm:block">
            <p className="font-display text-3xl leading-none text-white">
              {market?.price ? `$${formatPrice(market.price)}` : "No pair"}
            </p>
            <p className={cn("mt-1 inline-flex items-center justify-end gap-1 font-body text-sm font-black", percentTone(priceChange))}>
              {priceChange != null && (isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />)}
              {formatPercent(priceChange)} 24h
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Metric label="Price" value={market?.price ? `$${formatPrice(market.price)}` : "No pair"} sub={market?.dexId ?? "Market pending"} />
          <Metric label="MCap" value={formatUsd(market?.marketCap) ?? "-"} sub={age} tone="text-[#35a8ff]" />
          <Metric label="Volume 24h" value={formatUsd(market?.volume24h) ?? "-"} sub={market?.txns24h != null ? `${market.txns24h.toLocaleString()} txns` : "No DEX data"} tone="text-[#69d99a]" />
          <Metric label="Liquidity" value={formatUsd(market?.liquidity) ?? "-"} sub={market?.pairAddress ? "DexScreener pair" : "No pair yet"} tone="text-[#ffcc7a]" />
          <Metric label="Lifetime fees" value={fees.lifetimeFeesLamports != null ? formatLamports(fees.lifetimeFeesLamports) : "-"} sub="Bags API" tone="text-[#00ff88]" />
          <Metric label="Generated 24h" value={velocityLabel} sub={feeVelocitySubtitle(fees.feeVelocityStatus)} tone={fees.feeVelocityStatus === "active" ? "text-[#00ff88]" : "text-[#ffcc7a]"} />
          <Metric label="Claimed 24h" value={fees.claimedFees24hLamports != null ? formatLamports(fees.claimedFees24hLamports) : "-"} sub="claim events" />
          <Metric label="Proof score" value={`${proofCount}/3 verified`} sub="feed / pool / creator" tone={proofCount >= 2 ? "text-[#00ff88]" : "text-[#ffcc7a]"} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-[#0f0e16]/70 px-3 py-2.5">
          <div className="flex flex-wrap gap-2">
            <ProofPill ok={proof.bagsFeed} label="Bags feed" />
            <ProofPill ok={proof.pool} label="Pool proof" />
            <ProofPill ok={proof.creator} label="Creator proof" />
          </div>
          <div className="flex items-center gap-2 text-[11px] font-body font-semibold text-white/42">
            {loading && <Loader2 size={13} className="animate-spin" />}
            {error ? "Summary delayed - evidence panels stay usable" : `Sources: ${Object.values(proof.sourceLabels ?? {}).filter(Boolean).join(" / ") || "loading"}`}
            <ShieldCheck size={13} className="text-[#69d99a]" />
          </div>
        </div>
      </div>
    </div>
  );
}
