"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Flame, Rocket, Search } from "lucide-react";
import { TrustSignalsLive } from "@/components/token/TrustSignalsLive";
import { feeVelocityValue } from "@/lib/fee-velocity-display";
import { cn, formatMarketCap, formatPrice, formatTimeAgo, formatUsd } from "@/lib/utils";

interface TokenRow {
  mint: string;
  name: string;
  symbol: string;
  imageUrl?: string | null;
  launchStatus: string;
  price?: number | null;
  pairAddress?: string | null;
  pairCreatedAt?: number | null;
  dexId?: string | null;
  priceChange5mPercent?: number | null;
  priceChange1hPercent?: number | null;
  priceChange6hPercent?: number | null;
  priceChange24hPercent?: number | null;
  volume5m?: number | null;
  volume1h?: number | null;
  volume6h?: number | null;
  volume24h?: number | null;
  txns24h?: number | null;
  buys24h?: number | null;
  sells24h?: number | null;
  traders24h?: number | null;
  marketCap?: number | null;
  liquidity?: number | null;
  lifetimeFeesLamports?: number | null;
  claimedFees24hLamports?: number | null;
  feeVelocity24hLamports?: number | null;
  feeVelocityStatus?: "active" | "pending" | "unavailable" | string;
  socialScore?: number;
  poolVerified?: boolean;
  source?: string;
  metricSource?: {
    token?: string | null;
    proof?: string | null;
    market?: string | null;
    fees?: string | null;
  };
  createdAt: string;
  launchedAt?: string | null;
}

interface TokenIndexMeta {
  total: number | null;
  hasMore: boolean;
  source: string | null;
  coverage?: {
    feedCount?: number;
    migratedPoolCount?: number;
    marketCount?: number;
    volume24h?: number;
    txns24h?: number;
    feeVelocityActiveCount?: number;
  };
}

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  live: { bg: "bg-green/15 border-green/30", text: "text-[#69d99a]", dot: "bg-green" },
  pending: { bg: "bg-[#ffb84d]/15 border-[#ffb84d]/30", text: "text-[#ffb84d]", dot: "bg-[#ffb84d]" },
  draft: { bg: "bg-white/8 border-white/15", text: "text-white/40", dot: "bg-white/30" },
};

const TOKEN_COLORS = [
  "from-[#7a55c6] to-[#ff6a84]",
  "from-[#26aa68] to-[#7a55c6]",
  "from-[#ff624e] to-[#ff6a84]",
  "from-[#ff6a84] to-[#7a55c6]",
  "from-[#26aa68] to-[#69d99a]",
  "from-[#ff624e] to-[#ffb84d]",
];

type FilterTab = "all" | "market" | "verified" | "risk" | "fees";
const PAGE_SIZE = 150;
const DESKTOP_TABLE_COLUMNS =
  "34px minmax(190px,1.8fr) minmax(126px,1.05fr) minmax(120px,1.05fr) minmax(76px,.72fr) minmax(78px,.72fr) minmax(58px,.55fr) minmax(70px,.62fr) minmax(88px,.78fr) minmax(106px,.9fr) minmax(64px,.58fr) minmax(92px,.78fr)";

function formatCount(value?: number | null) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

function formatPercent(value?: number | null) {
  if (value == null || !Number.isFinite(Number(value))) return "-";
  return `${value >= 0 ? "+" : ""}${value.toFixed(Math.abs(value) >= 100 ? 0 : 2)}%`;
}

function percentClass(value?: number | null) {
  if (value == null) return "text-white/25";
  if (value > 0) return "text-[#00d97e]";
  if (value < 0) return "text-[#ff4d5a]";
  return "text-white/45";
}

function formatDexAge(pairCreatedAt?: number | null, fallback?: string | null) {
  if (pairCreatedAt) return formatTimeAgo(new Date(pairCreatedAt));
  if (fallback) return formatTimeAgo(fallback);
  return "-";
}

function formatSolCompact(lamports?: number | null) {
  if (lamports == null) return "-";
  const sol = lamports / 1e9;
  if (!Number.isFinite(sol)) return "-";
  if (sol === 0) return "0 SOL";
  if (sol < 0.0001) return "<0.0001";
  if (sol >= 1000) return `${(sol / 1000).toFixed(1)}K SOL`;
  if (sol >= 10) return `${sol.toFixed(2)} SOL`;
  return `${sol.toFixed(4)} SOL`;
}

function shortTrustTag(tag: string) {
  return tag
    .replace("Bags Verified", "Bags")
    .replace("Pool Verified", "Pool")
    .replace("Fee Active", "Fees")
    .replace("Velocity Active", "Velocity")
    .replace("Claims Seen", "Claims")
    .replace("Social Real", "Social")
    .replace("Market Linked", "Market");
}

function shortRiskLabel(risk: string) {
  return risk
    .replace("Zero fees indexed", "Zero fees")
    .replace("High social / zero fees", "Social/0 fees")
    .replace("No pool proof", "No pool")
    .replace("Stale market", "Stale");
}

function getTrustTags(t: TokenRow) {
  return [
    t.source?.startsWith("bags") || t.metricSource?.token === "bags_universe" ? "Bags Verified" : null,
    t.poolVerified ? "Pool Verified" : null,
    (t.lifetimeFeesLamports ?? 0) > 0 ? "Fee Active" : null,
    t.feeVelocityStatus === "active" ? "Velocity Active" : null,
    (t.claimedFees24hLamports ?? 0) > 0 ? "Claims Seen" : null,
    (t.socialScore ?? 0) > 0 ? "Social Real" : null,
    t.metricSource?.market ? "Market Linked" : null,
  ].filter((tag): tag is string => Boolean(tag));
}

function getRiskLabels(t: TokenRow) {
  return [
    !t.poolVerified ? "No pool proof" : null,
    (t.lifetimeFeesLamports ?? 0) <= 0 ? "Zero fees indexed" : null,
    (t.socialScore ?? 0) >= 25 && (t.lifetimeFeesLamports ?? 0) <= 0 ? "High social / zero fees" : null,
    !t.metricSource?.market ? "Stale market" : null,
  ].filter((risk): risk is string => Boolean(risk));
}

function proofSummary(t: TokenRow) {
  const checks = [
    t.source?.startsWith("bags") || t.metricSource?.token === "bags_universe",
    t.poolVerified,
    Boolean(t.metricSource?.market),
    Boolean(t.metricSource?.fees),
  ];
  const passed = checks.filter(Boolean).length;
  return `${passed}/4`;
}

function poolStatus(t: TokenRow) {
  if (typeof t.liquidity === "number" && t.liquidity > 0) return formatUsd(t.liquidity);
  if (t.poolVerified) return "Pool verified";
  if (t.pairAddress || t.dexId === "bags") return "Bonding";
  return "No pool";
}

function feeSubtitle(t: TokenRow) {
  if (t.feeVelocityStatus === "active") {
    return `24h ${feeVelocityValue(t.feeVelocityStatus, t.feeVelocity24hLamports)}`;
  }
  if ((t.lifetimeFeesLamports ?? 0) > 0) return "lifetime";
  return "no fees yet";
}

function TokenAvatar({ token, gradClass }: { token: TokenRow; gradClass: string }) {
  const [failed, setFailed] = useState(false);
  const initial = token.symbol?.[0] ?? "?";

  return (
    <div
      className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradClass} flex items-center justify-center text-base font-display font-bold text-white shrink-0 overflow-hidden`}
      style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}
    >
      {token.imageUrl && !failed ? (
        <img
          src={token.imageUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        initial
      )}
    </div>
  );
}

export default function TokenListPage() {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [indexMeta, setIndexMeta] = useState<TokenIndexMeta>({
    total: null,
    hasMore: false,
    source: null,
  });
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const loadPage = async (offset = 0) => {
    if (offset === 0) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await fetch(`/api/trending/tokens?limit=${PAGE_SIZE}&offset=${offset}`, { cache: "no-store" });
      const data = await res.json();
      const nextTokens: TokenRow[] = data.tokens ?? [];
      setTokens((current) => {
        if (offset === 0) return nextTokens;
        const byMint = new Map(current.map((token) => [token.mint, token]));
        for (const token of nextTokens) byMint.set(token.mint, token);
        return Array.from(byMint.values());
      });
      setIndexMeta({
        total: typeof data.total === "number" ? data.total : null,
        hasMore: Boolean(data.hasMore),
        source: data.source ?? null,
        coverage: data.coverage,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadPage(0);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tokens.filter((t) => {
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.symbol.toLowerCase().includes(q) ||
        t.mint.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (activeFilter === "market") return t.priceChange24hPercent != null;
      if (activeFilter === "verified") return getTrustTags(t).length >= 3;
      if (activeFilter === "risk") return getRiskLabels(t).length > 0;
      if (activeFilter === "fees") return (t.lifetimeFeesLamports ?? 0) > 0;
      return true;
    });
  }, [activeFilter, search, tokens]);

  const canImportMint = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(search.trim());

  const importMint = async () => {
    const mint = search.trim();
    if (!canImportMint) return;
    setImporting(true);
    setImportError(null);
    try {
      const res = await fetch("/api/tokens/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mint }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed");
      window.location.href = `/token/${mint}`;
    } catch (e) {
      setImportError(String(e).slice(0, 180));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="focus-shell">
      <p className="sr-only">Proof Risk Trust Tags Market Fees</p>

      <section className="mb-4 rounded-[28px] border border-white/[0.055] bg-[#100b22]/82 p-4 shadow-[0_22px_60px_rgba(0,0,0,0.24)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 max-w-4xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#26aa68]/25 bg-[#26aa68]/12 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[#69d99a]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00ff88]" />
                Live index
              </span>
              <span className="rounded-lg border border-white/[0.055] bg-white/[0.04] px-2 py-1 text-[11px] font-mono text-white/55">
                {loading ? "loading" : `${tokens.length}${indexMeta.total ? `/${indexMeta.total}` : ""}`} indexed
              </span>
              <span className="sr-only">Trust Layer</span>
            </div>
            <h1 className="font-display text-4xl leading-[0.95] text-white md:text-6xl">
              Bags Trust Index
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-white/58 md:text-base">
              Proof-first terminal for Bags tokens: source, pool, market, fees, risk, and passport links without fake metrics.
            </p>
          </div>
          <Link href="/launch" className="btn-primary min-h-[44px] shrink-0 rounded-2xl px-5 text-sm">
            <Rocket size={13} /> Launch Token
          </Link>
        </div>

        <div className="mt-5 grid gap-2 rounded-2xl border border-white/[0.045] bg-black/18 p-2 xl:grid-cols-[minmax(360px,1fr)_auto] xl:items-center">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/34 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search token, ticker, or mint..."
              className="input min-h-[42px] border-white/[0.055] bg-white/[0.04] pl-9 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              ["all", "All"],
              ["market", "Dex Pairs"],
              ["verified", "Verified"],
              ["risk", "Risk Review"],
              ["fees", "Fee Proof"],
            ].map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab as FilterTab)}
                className="min-h-[34px] rounded-lg px-3 text-xs font-black transition-all"
                style={{
                  background: activeFilter === tab ? "rgba(122,85,198,0.26)" : "rgba(255,255,255,0.045)",
                  border: `1px solid ${activeFilter === tab ? "rgba(180,141,255,0.35)" : "rgba(255,255,255,0.09)"}`,
                  color: activeFilter === tab ? "#d7c5ff" : "rgba(255,255,255,0.52)",
                }}
              >
                {label}
              </button>
            ))}
            <button
              onClick={importMint}
              disabled={!canImportMint || importing}
              className="min-h-[34px] rounded-lg border border-white/[0.055] bg-white/[0.04] px-3 text-xs font-black text-white/62 disabled:opacity-35"
            >
              {importing ? "Importing" : "Import Mint"}
            </button>
          </div>
        </div>
        {importError && <p className="px-3 pb-2 text-xs font-body text-[#ff8a78]">{importError}</p>}

        <div className="mt-4 grid gap-2 text-xs font-body font-black text-white/58 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <span className="rounded-xl bg-[#26aa68]/8 px-3 py-2 text-[#69d99a]">Bags feed <b className="ml-1 font-mono font-black tabular-nums">{formatCount(indexMeta.coverage?.feedCount ?? 0)}</b></span>
          <span className="rounded-xl bg-white/[0.035] px-3 py-2">Pools <b className="ml-1 font-mono font-black tabular-nums text-white/75">{formatCount(indexMeta.coverage?.migratedPoolCount ?? 0)}</b></span>
          <span className="rounded-xl bg-white/[0.035] px-3 py-2">Dex pairs <b className="ml-1 font-mono font-black tabular-nums text-white/75">{formatCount(indexMeta.coverage?.marketCount ?? 0)}</b></span>
          <span className="rounded-xl bg-white/[0.035] px-3 py-2">24h volume <b className="ml-1 font-mono font-black tabular-nums text-white/75">{formatMarketCap(indexMeta.coverage?.volume24h ?? tokens.reduce((sum, t) => sum + Number(t.volume24h ?? 0), 0))}</b></span>
          <span className="rounded-xl bg-white/[0.035] px-3 py-2">24h txns <b className="ml-1 font-mono font-black tabular-nums text-white/75">{formatCount(indexMeta.coverage?.txns24h ?? tokens.reduce((sum, t) => sum + Number(t.txns24h ?? 0), 0))}</b></span>
          <span className="rounded-xl bg-[#ffb84d]/8 px-3 py-2 text-[#ffcc7a]">Fee proof <b className="ml-1 font-mono font-black tabular-nums">{formatCount(tokens.filter((t) => (t.lifetimeFeesLamports ?? 0) > 0 || Boolean(t.metricSource?.fees)).length)}</b></span>
        </div>
      </section>

      <div className="mb-3">
        <TrustSignalsLive />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton-wave h-16 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <h3 className="font-display text-3xl text-white mb-2">{search ? "No tokens found" : "No indexed tokens yet"}</h3>
          <p className="readable-copy mb-6">
            {search ? "Try a different name, ticker, or mint" : "Open the index again after the Bags feed syncs."}
          </p>
          {search && canImportMint && (
            <div className="mb-5">
              <button
                onClick={importMint}
                disabled={importing}
                className="btn-primary h-11 px-8 inline-flex items-center gap-2 text-sm"
              >
                {importing ? "Importing..." : "Import Bags Token"}
              </button>
              {importError && <p className="mt-3 text-xs font-body font-semibold text-[#ff624e]">{importError}</p>}
            </div>
          )}
          {!search && (
            <Link href="/launch" className="btn-primary h-11 px-8 inline-flex items-center gap-2 text-sm">
              <Rocket size={14} /> Launch Now
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="hidden xl:block">
          <div className="relative overflow-hidden rounded-[28px] border border-white/[0.055] bg-[#100b22]/82 shadow-[0_22px_60px_rgba(0,0,0,0.24)]">
            <div
              className="grid items-center gap-x-1 border-b border-white/[0.045] bg-white/[0.045] px-2 py-3 text-right text-[9px] font-body font-black uppercase tracking-[0.14em] text-white/68 2xl:gap-x-2 2xl:px-3 2xl:text-[11px]"
              style={{ gridTemplateColumns: DESKTOP_TABLE_COLUMNS }}
            >
              <div className="text-left">#</div>
              <div className="text-left">Token</div>
              <div className="text-left">Proof</div>
              <div className="text-left">Risk</div>
              <div>Mcap</div>
              <div>Price</div>
              <div>Age</div>
              <div>Txns</div>
              <div>Volume</div>
              <div>Fees</div>
              <div>24h</div>
              <div>Pool</div>
            </div>

            {filtered.map((t, i) => {
              const gradClass = TOKEN_COLORS[i % TOKEN_COLORS.length];
              const verified = t.source?.startsWith("bags") || t.poolVerified;
              const rowTone = (t.priceChange24hPercent ?? 0) >= 0 ? "hover:bg-[#00ff88]/[0.045]" : "hover:bg-[#ff4d5a]/[0.045]";
              return (
                <Link
                  key={t.mint}
                  href={`/token/${t.mint}`}
                  className={`grid items-center gap-x-1 border-b border-white/[0.035] px-2 py-3 text-right text-[11px] transition-colors 2xl:gap-x-2 2xl:px-3 2xl:text-sm ${rowTone}`}
                  style={{ gridTemplateColumns: DESKTOP_TABLE_COLUMNS }}
                >
                  <div className="min-w-0 py-3 text-left font-mono text-xs text-white/35">#{i + 1}</div>
                  <div className="flex min-w-0 items-center gap-2 py-2 text-left">
                    <TokenAvatar token={t} gradClass={gradClass} />
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-body text-[13px] font-black text-white 2xl:text-[15px]">{t.symbol}</span>
                        <span className="font-body text-xs font-bold text-white/30">/ SOL</span>
                        {verified && <BadgeCheck size={13} className="shrink-0 text-[#69d99a]" />}
                        {(t.lifetimeFeesLamports ?? 0) > 0 && <Flame size={13} className="shrink-0 text-[#ffb84d]" />}
                      </div>
                      <div className="truncate text-xs font-body font-semibold text-white/50">{t.name}</div>
                    </div>
                  </div>
                  <div className="flex min-w-0 items-center gap-2 text-left">
                    <span className="shrink-0 rounded-lg border border-[#00ff88]/20 bg-[#00ff88]/10 px-2 py-1 text-[10px] font-body font-black text-[#69d99a] 2xl:text-[11px]">
                      {proofSummary(t)}
                    </span>
                    <div className="flex min-w-0 flex-wrap gap-1">
                      {getTrustTags(t).slice(0, 2).map((tag) => (
                        <span key={tag} className="max-w-full truncate rounded-md border border-[#00ff88]/18 bg-[#00ff88]/8 px-1.5 py-0.5 text-[9px] font-body font-black text-[#69d99a] 2xl:text-[10px]">
                        {shortTrustTag(tag)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex min-w-0 flex-wrap gap-1 text-left">
                    {getRiskLabels(t).slice(0, 2).map((risk) => (
                      <span key={risk} className="max-w-full truncate rounded-md border border-[#ffb84d]/18 bg-[#ffb84d]/8 px-1.5 py-0.5 text-[9px] font-body font-black text-[#ffcc7a] 2xl:text-[10px]">
                        {shortRiskLabel(risk)}
                      </span>
                    ))}
                    {getRiskLabels(t).length === 0 && (
                      <span className="rounded-md border border-[#00ff88]/18 bg-[#00ff88]/8 px-1.5 py-0.5 text-[9px] font-body font-black text-[#69d99a] 2xl:text-[10px]">
                        Clear
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 truncate font-mono text-[#35a8ff]">
                    {formatUsd(t.marketCap) ?? <span className="text-white/24">No pair</span>}
                  </div>
                  <div className="min-w-0 truncate font-mono font-bold text-white">{t.price ? `$${formatPrice(t.price)}` : "-"}</div>
                  <div className="min-w-0 truncate font-mono text-[#69d99a]">{formatDexAge(t.pairCreatedAt, t.launchedAt)}</div>
                  <div className="min-w-0 truncate font-mono text-white">{t.txns24h != null ? formatCount(t.txns24h) : "-"}</div>
                  <div className="min-w-0 truncate font-mono font-bold text-white">
                    {formatUsd(t.volume24h) ?? <span className="text-white/24">-</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[#00ff88]">{formatSolCompact(t.lifetimeFeesLamports)}</p>
                    <p className={cn("truncate text-[10px] font-body font-bold", t.feeVelocityStatus === "active" ? "text-[#69d99a]" : "text-white/34")}>
                      {feeSubtitle(t)}
                    </p>
                  </div>
                  <div className={`min-w-0 truncate font-mono font-bold ${percentClass(t.priceChange24hPercent)}`}>{formatPercent(t.priceChange24hPercent)}</div>
                  <div className="min-w-0 truncate font-mono font-bold text-white">
                    {poolStatus(t)}
                  </div>
                </Link>
              );
            })}
          </div>
          </div>

          <div className="space-y-2 xl:hidden">
            {filtered.map((t, i) => {
              const status = STATUS_STYLE[t.launchStatus] ?? STATUS_STYLE.draft;
              const gradClass = TOKEN_COLORS[i % TOKEN_COLORS.length];
              const verified = t.source?.startsWith("bags") || t.poolVerified;
              return (
                <Link
                  key={t.mint}
                  href={`/token/${t.mint}`}
                  className="card block p-4 transition-all hover:border-white/25"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 shrink-0 text-center font-display text-sm text-white/20">{i + 1}</span>
                    <TokenAvatar token={t} gradClass={gradClass} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-body text-base font-black text-white">{t.name}</p>
                        <span className="text-sm font-body font-bold text-white/45">${t.symbol}</span>
                        {verified && <BadgeCheck size={13} className="text-[#69d99a]" />}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-body font-bold ${status.bg} ${status.text}`}>
                          <span className={`h-1 w-1 rounded-full ${status.dot}`} />
                          {t.launchStatus}
                        </span>
                        <span className="text-xs font-body font-semibold text-white/30">age {formatDexAge(t.pairCreatedAt, t.launchedAt)}</span>
                        {t.volume24h != null && t.volume24h > 0 && <span className="text-xs font-body font-semibold text-white/35">vol {formatMarketCap(t.volume24h)}</span>}
                        {t.txns24h != null && t.txns24h > 0 && <span className="text-xs font-body font-semibold text-white/35">txns {formatCount(t.txns24h)}</span>}
                        {getTrustTags(t).slice(0, 2).map((tag) => (
                          <span key={tag} className="rounded-lg border border-[#00ff88]/18 bg-[#00ff88]/8 px-2 py-1 text-xs font-body font-bold text-[#69d99a]">
                            {shortTrustTag(tag)}
                          </span>
                        ))}
                        {getRiskLabels(t).slice(0, 1).map((risk) => (
                          <span key={risk} className="rounded-lg border border-[#ffb84d]/18 bg-[#ffb84d]/8 px-2 py-1 text-xs font-body font-bold text-[#ffcc7a]">
                            {shortRiskLabel(risk)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ArrowUpRight size={16} className="shrink-0 text-white/20" />
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs font-mono">
                    <div className="rounded-xl bg-white/5 p-2"><p className="text-white/30">MCap</p><p className="truncate text-[#35a8ff]">{formatUsd(t.marketCap) ?? "-"}</p></div>
                    <div className="rounded-xl bg-white/5 p-2"><p className="text-white/30">Vol</p><p className="truncate text-white">{formatUsd(t.volume24h) ?? "-"}</p></div>
                    <div className="rounded-xl bg-white/5 p-2"><p className="text-white/30">Fees</p><p className="truncate text-[#00ff88]">{formatSolCompact(t.lifetimeFeesLamports)}</p></div>
                    <div className="rounded-xl bg-white/5 p-2"><p className="text-white/30">24h</p><p className={percentClass(t.priceChange24hPercent)}>{formatPercent(t.priceChange24hPercent)}</p></div>
                  </div>
                </Link>
              );
            })}
          </div>
          {indexMeta.hasMore && activeFilter === "all" && !search.trim() && (
            <div className="pt-4 text-center">
              <button
                onClick={() => loadPage(tokens.length)}
                disabled={loadingMore}
                className="btn-ghost min-h-[48px] px-7 text-sm disabled:opacity-45"
              >
                {loadingMore ? "Loading Bags pools..." : `Load more Bags tokens (${tokens.length}/${indexMeta.total ?? "..."})`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
