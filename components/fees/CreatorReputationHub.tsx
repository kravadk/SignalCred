"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  Info,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { feeVelocitySubtitle, feeVelocityValue } from "@/lib/fee-velocity-display";
import { formatLamports, formatPrice, formatUsd, shortWallet } from "@/lib/utils";

type ViewMode = "top_tokens" | "top_creators" | "fee_velocity" | "verified" | "risky";

interface LeaderboardToken {
  mint: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  creatorWallet: string | null;
  totalFeesLamports: number;
  claimedFees24hLamports?: number;
  claimedFees24hUsdt?: number;
  feeVelocity24hLamports?: number | null;
  feeVelocity24hUsdt?: number | null;
  feeVelocityStatus?: "active" | "pending" | "unavailable";
  lifetimeFeesUsdt?: number;
  price?: number | null;
  volume24h?: number | null;
  marketCap?: number | null;
  socialScore: number;
  reputationScore: number;
  poolVerified: boolean;
}

interface LeaderboardMeta {
  total?: number;
  scanned?: number;
  ranked?: number;
  source?: string;
  coverage?: {
    feedCount?: number;
    migratedPoolCount?: number;
    feeVelocityActiveCount?: number;
  };
  solPriceUsdt?: number;
  usdtSource?: string;
}

function safeScore(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function formatUsdt(value: number | null | undefined) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "~$0.00";
  if (n >= 1_000_000) return `~$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `~$${(n / 1_000).toFixed(2)}K`;
  return `~$${n.toFixed(2)}`;
}

function formatSolCompact(lamports: number | null | undefined) {
  const sol = Number(lamports ?? 0) / 1e9;
  if (!Number.isFinite(sol)) return "-";
  if (sol === 0) return "0 SOL";
  if (sol < 0.0001) return "<0.0001";
  if (sol >= 1000) return `${(sol / 1000).toFixed(1)}K SOL`;
  if (sol >= 10) return `${sol.toFixed(2)} SOL`;
  return `${sol.toFixed(4)} SOL`;
}

const TOKEN_TABLE_COLUMNS =
  "42px minmax(210px,1.75fr) minmax(74px,.7fr) minmax(76px,.72fr) minmax(78px,.72fr) minmax(92px,.86fr) minmax(88px,.82fr) minmax(96px,.92fr) minmax(62px,.55fr) minmax(74px,.68fr)";

function generated24hLabel(status?: string, lamports?: number | null) {
  if (status === "active") return feeVelocityValue(status, lamports);
  if (status === "unavailable") return "Unavailable";
  return "Needs 24h baseline";
}

export function CreatorReputationHub() {
  const [rows, setRows] = useState<LeaderboardToken[]>([]);
  const [meta, setMeta] = useState<LeaderboardMeta>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("top_tokens");
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadLeaderboard = () => {
    setError(null);
    setRefreshing(true);
    fetch("/api/leaderboard")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Leaderboard unavailable");
        setRows(body.tokens ?? []);
        setMeta({
          total: body.total,
          scanned: body.scanned,
          ranked: body.ranked,
          source: body.source,
          coverage: body.coverage,
          solPriceUsdt: body.solPriceUsdt,
          usdtSource: body.usdtSource,
        });
      })
      .catch((err) => setError(err.message || "Leaderboard unavailable"))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const ranked = useMemo(() => {
    const q = query.trim().toLowerCase();
    const searched = q
      ? rows.filter((row) =>
          row.name.toLowerCase().includes(q) ||
          row.symbol.toLowerCase().includes(q) ||
          row.mint.toLowerCase().includes(q) ||
          row.creatorWallet?.toLowerCase().includes(q)
        )
      : rows;
    const next = [...searched];
    if (view === "fee_velocity") {
      return next.sort((a, b) => safeScore(b.feeVelocity24hLamports) - safeScore(a.feeVelocity24hLamports));
    }
    if (view === "verified") {
      return next.filter((row) => row.poolVerified).sort((a, b) => safeScore(b.reputationScore) - safeScore(a.reputationScore));
    }
    if (view === "risky") {
      return next.filter((row) => !row.poolVerified || safeScore(row.socialScore) > 10 && safeScore(row.totalFeesLamports) === 0);
    }
    return next.sort((a, b) => safeScore(b.reputationScore) - safeScore(a.reputationScore));
  }, [query, rows, view]);

  const totalFees = ranked.reduce((sum, row) => sum + safeScore(row.totalFeesLamports), 0);
  const generatedFees24h = ranked.reduce((sum, row) => sum + safeScore(row.feeVelocity24hLamports), 0);
  const creatorMap = ranked.reduce((map, row) => {
    if (!row.creatorWallet) return map;
    const prev = map.get(row.creatorWallet) ?? { wallet: row.creatorWallet, fees: 0, feesUsdt: 0, velocity: 0, velocityUsdt: 0, claimed: 0, claimedUsdt: 0, score: 0, tokens: 0, verified: 0 };
    prev.fees += safeScore(row.totalFeesLamports);
    prev.feesUsdt += safeScore(row.lifetimeFeesUsdt);
    prev.velocity += safeScore(row.feeVelocity24hLamports);
    prev.velocityUsdt += safeScore(row.feeVelocity24hUsdt);
    prev.claimed += safeScore(row.claimedFees24hLamports);
    prev.claimedUsdt += safeScore(row.claimedFees24hUsdt);
    prev.score += safeScore(row.reputationScore);
    prev.tokens += 1;
    if (row.poolVerified) prev.verified += 1;
    map.set(row.creatorWallet, prev);
    return map;
  }, new Map<string, { wallet: string; fees: number; feesUsdt: number; velocity: number; velocityUsdt: number; claimed: number; claimedUsdt: number; score: number; tokens: number; verified: number }>());
  const creators = Array.from(creatorMap.values()).sort((a, b) => b.score - a.score);
  const topCreator = creators[0] ?? null;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-white/30" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="card p-8 text-center">
          <ShieldCheck size={32} className="text-[#ff624e] mx-auto mb-3" />
          <p className="text-white font-fun font-bold">{error}</p>
          <p className="text-white/35 text-sm font-fun mt-1">Cached token pages still work while the leaderboard recovers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="focus-shell pt-3">
      <section className="mb-3 rounded-[28px] border border-white/[0.055] bg-[#100b22]/82 shadow-[0_22px_60px_rgba(0,0,0,0.24)]">
        <div className="flex flex-col gap-3 border-b border-white/[0.055] px-3 py-2 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-[#00ff88]/20 bg-[#00ff88]/8 px-2 py-1 text-[11px] font-fun font-bold uppercase text-[#69d99a]">
                <ShieldCheck size={11} /> Reputation
              </span>
              <h1 className="font-display text-2xl font-black tracking-tight text-white md:text-3xl">Creator Reputation</h1>
            </div>
            <p className="mt-1 text-xs font-body text-white/52">
              Fees, claims, proof, social score, and USDT value in one leaderboard.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={loadLeaderboard}
              disabled={refreshing}
              className="inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-md border border-white/[0.065] bg-white/[0.035] px-3 text-[11px] font-fun font-bold text-white/62 disabled:opacity-45"
            >
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /> Refresh
            </button>
            <Link href="/grant/status" className="inline-flex min-h-[32px] items-center justify-center rounded-md border border-white/[0.065] bg-white/[0.035] px-3 text-[11px] font-fun font-bold text-white/62 hover:text-white">
              Snapshot status
            </Link>
            <Link href="/docs" className="inline-flex min-h-[32px] items-center justify-center rounded-md border border-white/[0.065] bg-white/[0.035] px-3 text-[11px] font-fun font-bold text-white/62 hover:text-white">
              API docs
            </Link>
            <Link href="/token" className="btn-primary min-h-[32px] px-3 text-[11px] font-fun font-bold">
              <Sparkles size={12} /> Index
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-b border-white/[0.045] px-3 py-2 text-[11px] font-mono text-white/50">
          <span className="rounded-md border border-[#00ff88]/20 bg-[#00ff88]/8 px-2 py-1 text-[#69d99a]">
            Lifetime {formatLamports(totalFees)}
          </span>
          <span className="rounded-md border border-[#ffb84d]/20 bg-[#ffb84d]/8 px-2 py-1 text-[#ffcc7a]">
            Generated 24h {generatedFees24h > 0 ? formatLamports(generatedFees24h) : "Needs 24h baseline"}
          </span>
          <span className="rounded-md border border-white/[0.055] bg-white/[0.025] px-2 py-1">
            Top creator {topCreator ? shortWallet(topCreator.wallet) : "No data"}
          </span>
          {meta.total != null && <span className="rounded-md border border-white/[0.055] bg-white/[0.025] px-2 py-1">Total {meta.total}</span>}
          {meta.coverage?.migratedPoolCount != null && <span className="rounded-md border border-white/[0.055] bg-white/[0.025] px-2 py-1">Pools {meta.coverage.migratedPoolCount}</span>}
          {meta.solPriceUsdt != null && (
            <span className="rounded-md border border-[#50d8a4]/20 bg-[#50d8a4]/8 px-2 py-1 text-[#50d8a4]">
              SOL ~= {meta.solPriceUsdt.toFixed(2)} USDT
            </span>
          )}
        </div>

        <div className="grid gap-2 px-3 py-2 xl:grid-cols-[minmax(260px,420px)_1fr] xl:items-center">
          <label className="relative block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search token, symbol, mint, or creator..."
              className="h-10 w-full rounded-lg border border-white/[0.065] bg-[#0f0e16]/90 pl-9 pr-3 text-sm font-body font-bold text-white outline-none transition focus:border-[#b48dff]/45"
            />
          </label>
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {([
              ["top_tokens", "Top Tokens"],
              ["top_creators", "Top Creators"],
              ["fee_velocity", "Generated 24h"],
              ["verified", "Verified"],
              ["risky", "Risk Review"],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`min-h-[32px] rounded-md border px-3 text-[11px] font-fun font-bold transition-colors ${
                  view === id
                    ? "border-[#b48dff]/40 bg-[#7c3aed]/30 text-white"
                    : "border-white/[0.065] bg-white/[0.035] text-white/45 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
            <span className="inline-flex min-h-[32px] items-center rounded-md border border-[#ffb84d]/20 bg-[#ffb84d]/8 px-2 text-[11px] font-fun text-[#ffcc7a]">
              <Info size={12} className="mr-1" /> Generated 24h activates after hourly snapshots have a 24h baseline.
            </span>
          </div>
        </div>
      </section>

      {ranked.length === 0 ? (
        <div className="card p-14 text-center">
          <Award size={42} className="text-white/15 mx-auto mb-4" />
          <h2 className="font-display text-3xl text-white mb-2">No reputation rows yet</h2>
          <p className="text-white/35 font-fun text-sm">Waiting for live Bags feed data. No local demo rows are shown here.</p>
        </div>
      ) : view === "top_creators" ? (
        <div className="card overflow-hidden border-white/[0.055]">
          {creators.map((creator, index) => (
            <Link
              key={creator.wallet}
              href={`/profile/${creator.wallet}`}
              className="grid grid-cols-1 gap-3 border-b border-white/5 px-5 py-4 transition-all hover:bg-white/5 md:grid-cols-12 md:items-center"
            >
              <div className="hidden font-mono text-white/35 tabular-nums md:col-span-1 md:block">{index + 1}</div>
              <div className="md:col-span-3 min-w-0">
                <p className="truncate font-fun font-black text-white">{shortWallet(creator.wallet)}</p>
                <p className="text-xs font-fun text-white/35">{creator.tokens} tokens - {creator.verified} pool proofs</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[10px] uppercase text-white/30 font-fun">Lifetime</p>
                <p className="font-mono text-[#00ff88]">{formatLamports(creator.fees)}</p>
                <p className="text-xs text-[#50d8a4] font-fun">{formatUsdt(creator.feesUsdt)} USDT</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[10px] uppercase text-white/30 font-fun">Generated 24h</p>
                <p className="font-mono text-[#ffcc7a]">{creator.velocity > 0 ? formatLamports(creator.velocity) : "Needs 24h baseline"}</p>
                <p className="text-xs text-[#ffcc7a] font-fun">{creator.velocityUsdt > 0 ? `${formatUsdt(creator.velocityUsdt)} USDT` : "Hourly snapshots warming"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[10px] uppercase text-white/30 font-fun">Claimed 24h</p>
                <p className="font-mono text-white">{formatLamports(creator.claimed)}</p>
                <p className="text-xs text-white/40 font-fun">{formatUsdt(creator.claimedUsdt)} USDT</p>
              </div>
              <div className="md:col-span-2 text-left md:text-right">
                <p className="font-mono text-2xl font-black tabular-nums text-[#ffb84d]">{Math.round(creator.score)}</p>
                <p className="text-xs text-white/35 font-fun">Combined reputation</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden border-white/[0.055]">
          <div
            className="hidden xl:grid gap-x-2 px-4 py-3 border-b border-white/8 text-white/35 text-[10px] font-fun font-black uppercase tracking-wider 2xl:text-[11px]"
            style={{ gridTemplateColumns: TOKEN_TABLE_COLUMNS }}
          >
            <div>#</div>
            <div>Token</div>
            <div className="text-right">Price</div>
            <div className="text-right">MCap</div>
            <div className="text-right">Vol 24h</div>
            <div className="text-right">Lifetime</div>
            <div className="text-right">Claimed</div>
            <div className="text-right">Generated 24h</div>
            <div className="text-right">Score</div>
            <div className="text-right">Proof</div>
          </div>

          {ranked.map((token, index) => (
            <Link
              key={token.mint}
              href={`/token/${token.mint}`}
              className="grid grid-cols-1 gap-3 px-5 py-4 border-b border-white/5 hover:bg-white/5 transition-all items-center group md:grid-cols-12 md:gap-2 xl:grid-cols-none xl:gap-x-2 xl:px-4 xl:[grid-template-columns:var(--fee-table-cols)]"
              style={{ "--fee-table-cols": TOKEN_TABLE_COLUMNS } as CSSProperties}
            >
              <div className="hidden text-base font-mono tabular-nums text-white/35 md:block md:col-span-1 xl:col-auto">{index + 1}</div>
              <div className="md:col-span-4 xl:col-auto flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#7a55c6] to-[#ff6a84] flex items-center justify-center text-xs font-display font-bold text-white shrink-0 overflow-hidden">
                  {token.imageUrl ? <img src={token.imageUrl} alt={token.symbol} className="w-full h-full object-cover" /> : token.symbol[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-fun font-black text-sm truncate 2xl:text-base">{index + 1}. {token.name}</p>
                <p className="text-white/45 text-xs truncate">
                    ${token.symbol} {token.creatorWallet ? `- ${shortWallet(token.creatorWallet)}` : ""}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 md:contents">
              <div className="hidden xl:block xl:col-auto xl:text-right">
                <p className="truncate text-white font-mono text-xs 2xl:text-sm">{token.price != null ? `$${formatPrice(token.price)}` : "-"}</p>
              </div>
              <div className="hidden xl:block xl:col-auto xl:text-right">
                <p className="truncate text-[#35a8ff] font-mono text-xs 2xl:text-sm">{formatUsd(token.marketCap) ?? "No pair"}</p>
              </div>
              <div className="hidden xl:block xl:col-auto xl:text-right">
                <p className="truncate text-white font-mono text-xs 2xl:text-sm">{formatUsd(token.volume24h) ?? "-"}</p>
              </div>
              <div className="md:col-span-2 xl:col-auto md:text-right rounded-xl bg-white/5 p-2 md:bg-transparent md:p-0">
                <p className="text-white/35 md:hidden text-[10px] font-fun uppercase">Fees</p>
                <p className="truncate text-[#00ff88] font-mono text-xs font-bold 2xl:text-sm">{formatSolCompact(token.totalFeesLamports)}</p>
                <p className="truncate text-[#50d8a4] text-[10px] font-fun">{formatUsdt(token.lifetimeFeesUsdt)}</p>
              </div>
              <div className="md:col-span-2 xl:col-auto md:text-right rounded-xl bg-white/5 p-2 md:bg-transparent md:p-0">
                <p className="text-white/35 md:hidden text-[10px] font-fun uppercase">Claimed 24h</p>
                <p className="truncate text-white font-mono text-xs 2xl:text-sm">{formatSolCompact(token.claimedFees24hLamports)}</p>
                <p className="truncate text-white/35 text-[10px] font-fun">{formatUsdt(token.claimedFees24hUsdt)}</p>
              </div>
              <div className="md:col-span-1 xl:col-auto md:text-right rounded-xl bg-white/5 p-2 md:bg-transparent md:p-0">
                <p className="text-white/35 md:hidden text-[10px] font-fun uppercase">Velocity</p>
                <p className="truncate text-[#ffcc7a] font-mono text-xs 2xl:text-sm">
                  {generated24hLabel(token.feeVelocityStatus, token.feeVelocity24hLamports)}
                </p>
                <p className="truncate text-[#ffcc7a]/70 text-[10px] font-fun">
                  {token.feeVelocityStatus === "active" && token.feeVelocity24hUsdt != null ? formatUsdt(token.feeVelocity24hUsdt) : feeVelocitySubtitle(token.feeVelocityStatus)}
                </p>
              </div>
              <div className="md:col-span-1 xl:col-auto md:text-right rounded-xl bg-white/5 p-2 md:bg-transparent md:p-0">
                <p className="text-white/35 md:hidden text-[10px] font-fun uppercase">Score</p>
                <p className="font-mono text-lg font-black tabular-nums text-[#ffb84d] 2xl:text-xl">{Math.round(safeScore(token.reputationScore))}</p>
              </div>
              </div>
              <div className="md:col-span-1 xl:col-auto flex justify-start md:justify-end">
                {token.poolVerified ? (
                  <span className="inline-flex items-center justify-end gap-1 text-[#00ff88] text-xs font-fun font-bold text-right leading-tight"><CheckCircle2 size={14} className="shrink-0" /> Proof</span>
                ) : (
                  <span className="inline-flex items-center justify-end gap-1 text-white/30 text-xs font-fun font-bold text-right leading-tight"><ShieldCheck size={14} className="shrink-0" /> Pending</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
