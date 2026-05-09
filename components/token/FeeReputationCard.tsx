"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Award,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  Loader2,
  MessageCircle,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { cn, formatLamports, formatMarketCap, shortWallet } from "@/lib/utils";
import { feeVelocityLongHint, feeVelocitySubtitle, feeVelocityValue } from "@/lib/fee-velocity-display";
import { ExplorerLink, bagsTokenUrl, shortAddress, solscanUrl } from "@/components/ui/ExplorerLink";

interface BagsCreator {
  username?: string;
  wallet?: string;
  provider?: string;
  providerUsername?: string;
  twitterUsername?: string;
  bagsUsername?: string;
  royaltyBps?: number;
  isCreator?: boolean;
}

interface ReputationResponse {
  mint: string;
  bagsVerified: boolean;
  lifetimeFeesLamports: number;
  claimedFees24hLamports?: number;
  claimedFees24hUsdt?: number;
  feeVelocity24hLamports?: number | null;
  feeVelocity24hUsdt?: number | null;
  feeVelocityStatus?: "active" | "pending" | "unavailable";
  feeVelocity?: {
    currentSnapshotAt?: string | null;
    baselineSnapshotAt?: string | null;
    message?: string;
  } | null;
  creator?: BagsCreator | null;
  creators?: BagsCreator[];
  solPriceUsdt?: number;
  lifetimeFeesUsdt?: number;
  creatorFeeUsdt?: number;
  platformFeeUsdt?: number;
  usdtSource?: string;
  usdtApproximate?: boolean;
  split?: {
    creatorBps: number;
    platformBps: number;
    creatorFeeLamports: number;
    platformFeeLamports: number;
  };
  scoreBreakdown?: {
    lifetimeFees: number;
    feeVelocity: number;
    social: number;
    marketMomentum: number;
    bagsProof: number;
    formula: string;
  };
  creatorProfilePath?: string | null;
  social: {
    posts: number;
    likes: number;
    comments: number;
    reposts: number;
    score: number;
  };
  market: {
    price?: number | null;
    priceChange24hPercent?: number | null;
    volume24h?: number | null;
    marketCap?: number | null;
  } | null;
  pool?: {
    dbcPoolKey?: string | null;
    dbcConfigKey?: string | null;
    dammV2PoolKey?: string | null;
  } | null;
  riskFlags?: Array<{
    id: string;
    label: string;
    severity: "low" | "medium" | "high";
  }>;
  reputationScore: number;
}

function creatorName(creator?: BagsCreator | null) {
  if (!creator) return "Unknown creator";
  return (
    creator.bagsUsername ||
    creator.twitterUsername ||
    creator.providerUsername ||
    creator.username ||
    (creator.wallet ? shortWallet(creator.wallet) : "Unknown creator")
  );
}

function poolProof(pool?: ReputationResponse["pool"]) {
  if (!pool) return null;
  const key = pool.dbcPoolKey || pool.dammV2PoolKey || pool.dbcConfigKey;
  return typeof key === "string" && key.length > 0 ? key : null;
}

function riskTone(severity: "low" | "medium" | "high") {
  if (severity === "high") return "bg-[#ff624e]/10 text-[#ff8a78] border-[#ff624e]/20";
  if (severity === "medium") return "bg-[#ffb84d]/10 text-[#ffcc7a] border-[#ffb84d]/20";
  return "bg-white/6 text-white/45 border-white/8";
}

function velocityTone(status?: string) {
  if (status === "active") return "text-[#00ff88]";
  if (status === "unavailable") return "text-[#ff8a78]";
  return "text-[#ffcc7a]";
}

function formatUsdt(value: number | null | undefined) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "~$0.00";
  if (n >= 1_000_000) return `~$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `~$${(n / 1_000).toFixed(2)}K`;
  return `~$${n.toFixed(2)}`;
}

export function FeeReputationCard({ mint }: { mint: string }) {
  const [data, setData] = useState<ReputationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/tokens/${mint}/reputation`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Reputation unavailable");
        setData(body);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message || "Reputation unavailable");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [mint]);

  const proof = useMemo(() => poolProof(data?.pool), [data?.pool]);
  const creator = data?.creator;

  if (loading) {
    return (
      <div className="card p-3 flex items-center justify-center h-20">
        <Loader2 size={18} className="animate-spin text-white/30" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card p-3 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ff624e]/25 to-transparent" />
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={15} className="text-[#ff624e]" />
          <span className="text-white/60 text-xs font-fun font-bold uppercase tracking-wider">
            Fee Reputation
          </span>
        </div>
        <p className="text-white/35 text-xs font-fun leading-relaxed">
          {error || "Reputation data is unavailable right now."}
        </p>
      </div>
    );
  }

  const stats = [
    {
      label: "Lifetime fees",
      value: formatLamports(data.lifetimeFeesLamports),
      sub: `${formatUsdt(data.lifetimeFeesUsdt)} USDT`,
      icon: CircleDollarSign,
      color: "#00ff88",
    },
    {
      label: "Fee velocity",
      value: feeVelocityValue(data.feeVelocityStatus, data.feeVelocity24hLamports),
      sub: data.feeVelocity24hUsdt == null ? feeVelocitySubtitle(data.feeVelocityStatus) : `${formatUsdt(data.feeVelocity24hUsdt)} USDT`,
      icon: MessageCircle,
      color: data.feeVelocityStatus === "active" ? "#00ff88" : "#ffb84d",
    },
    {
      label: "Claimed 24h",
      value: formatLamports(data.claimedFees24hLamports ?? 0),
      sub: `${formatUsdt(data.claimedFees24hUsdt)} USDT`,
      icon: Activity,
      color: "#b48dff",
    },
  ];

  return (
    <div className="card p-3 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00ff88]/25 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#00ff88]/5 via-transparent to-[#7c3aed]/5 pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck size={15} className={data.bagsVerified ? "text-[#00ff88]" : "text-white/35"} />
              <span className="text-white/60 text-xs font-fun font-bold uppercase tracking-wider">
                Fee Reputation
              </span>
            </div>
            <div className="flex items-center gap-2">
                <p className="font-mono text-2xl font-black leading-none tabular-nums text-white">
                {data.reputationScore}
              </p>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-xl px-2 py-1 text-[10px] font-fun font-bold",
                  data.bagsVerified
                    ? "bg-[#00ff88]/12 text-[#00ff88] border border-[#00ff88]/20"
                    : "bg-white/6 text-white/35 border border-white/8"
                )}
              >
                {data.bagsVerified ? <CheckCircle2 size={11} /> : <Award size={11} />}
                {data.bagsVerified ? "Bags verified" : "Pending Bags proof"}
              </span>
            </div>
          </div>
          <a
            href={bagsTokenUrl(mint)}
            target="_blank"
            rel="noreferrer"
            className="h-8 w-8 rounded-xl bg-white/6 hover:bg-white/12 border border-white/8 flex items-center justify-center text-white/45 hover:text-white transition-all"
            aria-label="Open Bags token"
          >
            <ExternalLink size={14} />
          </a>
        </div>

        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {stats.map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="rounded-lg p-2 bg-white/[0.035] min-w-0">
              <Icon size={12} style={{ color }} className="mb-1" />
              <p className="font-mono font-bold text-sm text-white truncate">{value}</p>
              <p className="text-[9px] font-fun text-[#50d8a4] truncate">{sub}</p>
              <p className={cn("text-[9px] font-fun", label === "Fee velocity" ? velocityTone(data.feeVelocityStatus) : "text-white/30")}>{label}</p>
            </div>
          ))}
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg p-2 bg-[#50d8a4]/6">
            <p className="text-[#50d8a4] text-[10px] font-fun font-bold uppercase tracking-wider">Creator share est.</p>
            <p className="text-white font-mono text-sm mt-1">{formatLamports(data.split?.creatorFeeLamports ?? 0)}</p>
            <p className="text-[#50d8a4] text-xs font-fun">{formatUsdt(data.creatorFeeUsdt)} USDT</p>
          </div>
          <div className="rounded-lg p-2 bg-white/[0.035]">
            <p className="text-white/35 text-[10px] font-fun font-bold uppercase tracking-wider">Platform share est.</p>
            <p className="text-white font-mono text-sm mt-1">{formatLamports(data.split?.platformFeeLamports ?? 0)}</p>
            <p className="text-white/40 text-xs font-fun">{formatUsdt(data.platformFeeUsdt)} USDT</p>
          </div>
        </div>

        <div className="mb-3 rounded-lg p-2 bg-[#ffb84d]/6">
          <p className="text-[#ffcc7a] text-[10px] font-fun font-bold uppercase tracking-wider mb-1">
            Fee velocity 24h
          </p>
          <p className="text-white/45 text-[11px] font-fun leading-relaxed">
            {data.feeVelocity?.message || feeVelocityLongHint(data.feeVelocityStatus)}
          </p>
        </div>

        <div className="space-y-2">
          <div className="rounded-lg p-2 bg-white/[0.035]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white/30 text-[10px] font-fun uppercase tracking-wider">Creator</p>
                <p className="text-white/75 text-sm font-fun font-bold truncate">{creatorName(creator)}</p>
              </div>
              <UserRound size={16} className="text-[#b48dff] shrink-0" />
            </div>
            {creator?.wallet && (
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono">
                <ExplorerLink
                  href={solscanUrl(creator.wallet, "account")}
                  label={shortAddress(creator.wallet)}
                  className="text-white/38"
                />
                {data.creatorProfilePath && (
                  <a href={data.creatorProfilePath} className="text-[#50d8a4] hover:text-white transition-colors">
                    Creator profile
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg p-2 bg-white/[0.035]">
              <p className="text-white/30 text-[10px] font-fun uppercase tracking-wider">Posts</p>
              <p className="text-white text-lg font-mono font-bold">{data.social.posts}</p>
            </div>
            <div className="rounded-lg p-2 bg-white/[0.035]">
              <p className="text-white/30 text-[10px] font-fun uppercase tracking-wider">Volume</p>
              <p className="text-white text-lg font-mono font-bold">
                {typeof data.market?.volume24h === "number" ? formatMarketCap(data.market.volume24h) : "No data"}
              </p>
            </div>
          </div>

          {proof && (
            <div className="rounded-lg p-2 bg-[#00ff88]/6">
              <p className="text-[#00ff88]/75 text-[10px] font-fun font-bold uppercase tracking-wider mb-1">
                Pool proof
              </p>
              <ExplorerLink
                href={solscanUrl(proof, "account")}
                label={proof}
                className="text-white/50 text-[10px] font-mono break-all"
              />
            </div>
          )}

          <div className="rounded-lg p-2 bg-white/[0.035]">
            <p className="text-white/30 text-[10px] font-fun uppercase tracking-wider mb-2">Risk flags</p>
            {data.riskFlags && data.riskFlags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {data.riskFlags.map((flag) => (
                  <span
                    key={flag.id}
                    className={cn("px-2 py-1 rounded-lg border text-[10px] font-fun font-bold", riskTone(flag.severity))}
                  >
                    {flag.label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[#00ff88]/70 text-xs font-fun font-bold">
                No major flags from available data
              </p>
            )}
          </div>

          {data.scoreBreakdown && (
            <div className="rounded-lg p-2 bg-[#b48dff]/6">
              <p className="text-[#cdb6ff] text-[10px] font-fun font-bold uppercase tracking-wider mb-2">
                Formula transparency
              </p>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-fun text-white/45">
                <span>Fees +{data.scoreBreakdown.lifetimeFees}</span>
                <span>Velocity +{data.scoreBreakdown.feeVelocity}</span>
                <span>Social +{data.scoreBreakdown.social}</span>
                <span>Proof +{data.scoreBreakdown.bagsProof}</span>
              </div>
              <p className="mt-2 text-[10px] font-fun text-white/30">
                Sources: Bags fees, fee snapshots, Square posts, market data, pool proof. No AI magic.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
