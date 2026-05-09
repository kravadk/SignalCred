"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, ExternalLink, Gift, Loader2, ReceiptText, ShieldAlert } from "lucide-react";
import { formatLamports, shortWallet } from "@/lib/utils";
import { feeVelocitySubtitle, feeVelocityValue } from "@/lib/fee-velocity-display";
import { ExplorerLink, shortAddress, solscanUrl } from "@/components/ui/ExplorerLink";
import { CreatorTrustGraph } from "@/components/profile/CreatorTrustGraph";
import { CreatorTreasuryPanel } from "@/components/profile/CreatorTreasuryPanel";

type RiskFlag = { id: string; label: string; severity: "low" | "medium" | "high" };

type CreatorToken = {
  mint: string;
  name: string;
  symbol: string;
  imageUrl?: string | null;
  lifetimeFeesLamports: number;
  lifetimeFeesUsdt: number;
  claimedFees24hLamports: number;
  claimedFees24hUsdt: number;
  feeVelocity24hLamports: number | null;
  feeVelocity24hUsdt: number | null;
  feeVelocityStatus: "active" | "pending" | "unavailable";
  socialScore: number;
  poolVerified: boolean;
  creatorProof: boolean;
  riskFlags: RiskFlag[];
};

type CreatorReputation = {
  creator: { wallet: string; solscan: string; verifiedTokenCount: number };
  tokens: CreatorToken[];
  totals: {
    tokenCount: number;
    lifetimeFeesLamports: number;
    lifetimeFeesUsdt: number;
    claimedFees24hLamports: number;
    claimedFees24hUsdt: number;
    feeVelocity24hLamports: number;
    feeVelocity24hUsdt: number;
    socialScore: number;
    verifiedTokens: number;
    poolVerifiedTokens: number;
  };
  treasuryPlanner: {
    previewOnly: boolean;
    claimableEstimateLamports: number;
    defaultKeepSolPercent: number;
    defaultConvertUsdtPercent: number;
    defaultRewardsPercent: number;
  };
  riskFlags: RiskFlag[];
  campaigns?: Array<{ id: string; title: string; description?: string | null; budgetUsdt: string; status: string; tokenMint: string; createdAt: string }>;
  campaignTotals?: { count: number; plannedBudgetUsdt: number };
  solPriceUsdt: number;
  usdtSource: string;
  usdtApproximate: boolean;
};

type CompactFeeLoop = {
  mint: string;
  lifetimeFeesLamports: number;
  claimedFees24hLamports: number;
  feeVelocity24hLamports: number | null;
  feeVelocityStatus: "active" | "pending" | "unavailable";
  campaigns: Array<{ id: string; status: string; budgetUsdt: number }>;
  fundingProofs: Array<{ id: string; href?: string | null }>;
  noFakeData: true;
};

function usd(value: number | null | undefined) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "~$0.00 USDT";
  if (n >= 1_000_000) return `~$${(n / 1_000_000).toFixed(2)}M USDT`;
  if (n >= 1_000) return `~$${(n / 1_000).toFixed(2)}K USDT`;
  return `~$${n.toFixed(2)} USDT`;
}

function riskClass(severity: RiskFlag["severity"]) {
  if (severity === "high") return "border-[#ff624e]/25 bg-[#ff624e]/10 text-[#ff9a87]";
  if (severity === "medium") return "border-[#ffb84d]/25 bg-[#ffb84d]/10 text-[#ffcc7a]";
  return "border-white/10 bg-white/6 text-white/45";
}

export default function CreatorProfilePage({ params }: { params: { wallet: string } }) {
  const [data, setData] = useState<CreatorReputation | null>(null);
  const [feeLoops, setFeeLoops] = useState<CompactFeeLoop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/creators/${params.wallet}/reputation`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Creator reputation unavailable");
        setData(body);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message || "Creator reputation unavailable");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [params.wallet]);

  useEffect(() => {
    if (!data?.tokens?.length) {
      setFeeLoops([]);
      return;
    }
    const controller = new AbortController();
    const recent = data.tokens.slice(0, 3);
    Promise.all(
      recent.map((token) =>
        fetch(`/api/tokens/${token.mint}/fee-loop`, { signal: controller.signal, cache: "no-store" })
          .then(async (res) => (res.ok ? (await res.json()) as CompactFeeLoop : null))
          .catch(() => null)
      )
    ).then((rows) => {
      if (!controller.signal.aborted) setFeeLoops(rows.filter((row): row is CompactFeeLoop => Boolean(row)));
    });
    return () => controller.abort();
  }, [data]);

  if (loading) {
    return (
      <div className="focus-shell flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2 size={28} className="mx-auto animate-spin text-white/30" />
          <p className="mt-4 text-sm font-fun font-black text-white/70">Creator Reliability Score</p>
          <p className="mt-2 text-sm font-fun font-black text-white/60">USDT Creator Treasury</p>
          <p className="mt-4 text-sm font-fun font-black text-white/45">Recent Fee Loop Evidence</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="focus-shell">
        <Link href="/fees" className="btn-ghost mb-5 inline-flex min-h-[40px] items-center gap-2 px-4 text-sm">
          <ArrowLeft size={15} /> Reputation hub
        </Link>
        <div className="card p-8 text-center">
          <ShieldAlert size={34} className="mx-auto mb-3 text-[#ff624e]" />
          <p className="font-fun font-bold text-white">{error || "Creator reputation unavailable"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="focus-shell">
      <Link href="/fees" className="btn-ghost mb-3 inline-flex min-h-[34px] items-center gap-2 px-3 text-xs">
        <ArrowLeft size={15} /> Reputation hub
      </Link>

      <div className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="card p-4">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="track-pill mb-2 border-[#00ff88]/20 bg-[#00ff88]/10 text-[#00ff88]">
                <BadgeCheck size={13} /> Creator reputation
              </span>
              <h1 className="font-mono text-2xl font-black text-white md:text-3xl">{shortWallet(data.creator.wallet)}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-fun">
                <ExplorerLink href={data.creator.solscan} label={shortAddress(data.creator.wallet)} />
                <span className="text-white/35">{data.creator.verifiedTokenCount} verified token proofs</span>
                <span className="text-white/35">SOL ~= {data.solPriceUsdt.toFixed(2)} USDT</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[
              ["Lifetime fees", formatLamports(data.totals.lifetimeFeesLamports), usd(data.totals.lifetimeFeesUsdt)],
              ["Generated 24h", formatLamports(data.totals.feeVelocity24hLamports), usd(data.totals.feeVelocity24hUsdt)],
              ["Claimed 24h", formatLamports(data.totals.claimedFees24hLamports), usd(data.totals.claimedFees24hUsdt)],
              ["Social score", String(data.totals.socialScore), `${data.totals.tokenCount} indexed tokens`],
            ].map(([label, value, sub]) => (
              <div key={label} className="rounded-lg border border-white/8 bg-white/5 p-3">
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.1em] text-white/35">{label}</p>
                <p className="mt-1 truncate font-mono text-lg font-black text-white">{value}</p>
                <p className="mt-1 text-[11px] font-body text-[#50d8a4]">{sub}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {data.riskFlags.length ? data.riskFlags.map((flag) => (
              <span key={flag.id} className={`rounded-xl border px-3 py-1.5 text-xs font-fun font-bold ${riskClass(flag.severity)}`}>
                {flag.label}
              </span>
            )) : (
              <span className="rounded-xl border border-[#00ff88]/20 bg-[#00ff88]/10 px-3 py-1.5 text-xs font-fun font-bold text-[#00ff88]">
                No major creator-level risk flags
              </span>
            )}
          </div>
        </section>

        <CreatorTreasuryPanel wallet={data.creator.wallet} />
      </div>

      <section className="card mb-4 p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <ReceiptText size={16} className="text-[#ffcc7a]" />
              <h2 className="font-mono text-base font-black text-white">Recent Fee Loop Evidence</h2>
            </div>
            <p className="text-xs font-fun leading-5 text-white/38">
              Compact proof across the latest creator tokens: generated fees, claimed fees, and campaign funding state.
            </p>
          </div>
          <span className="rounded-md border border-[#00ff88]/20 bg-[#00ff88]/10 px-2 py-1 text-[11px] font-mono font-bold text-[#00ff88]">
            no fake data
          </span>
        </div>

        {data.tokens.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 text-sm font-fun text-white/35">
            No indexed creator tokens yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {data.tokens.slice(0, 3).map((token) => {
              const loop = feeLoops.find((row) => row.mint === token.mint);
              const campaignState = loop
                ? loop.fundingProofs.length > 0
                  ? "funded proof"
                  : loop.campaigns.length > 0
                    ? "planned campaign"
                    : "no campaign"
                : "loading";
              return (
                <Link key={token.mint} href={`/token/${token.mint}`} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4 transition-colors hover:bg-white/[0.07]">
                  <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-fun font-black text-white">{token.name}</p>
                      <p className="truncate text-xs font-mono text-white/35">{token.symbol} - {shortAddress(token.mint)}</p>
                    </div>
                    <ExternalLink size={14} className="shrink-0 text-white/25" />
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2">
                      <span className="font-fun text-white/38">Lifetime</span>
                      <span className="font-mono text-[#00ff88]">{formatLamports(loop?.lifetimeFeesLamports ?? token.lifetimeFeesLamports)}</span>
                    </div>
                    <div className="flex justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2">
                      <span className="font-fun text-white/38">Claimed 24h</span>
                      <span className="font-mono text-white">{formatLamports(loop?.claimedFees24hLamports ?? token.claimedFees24hLamports)}</span>
                    </div>
                    <div className="flex justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2">
                      <span className="font-fun text-white/38">Velocity</span>
                      <span className="font-fun font-black text-[#ffcc7a]">
                        {feeVelocityValue(loop?.feeVelocityStatus ?? token.feeVelocityStatus, loop?.feeVelocity24hLamports ?? token.feeVelocity24hLamports)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2">
                      <span className="font-fun text-white/38">Campaign</span>
                      <span className="font-fun font-black text-[#cdb6ff]">{campaignState}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <div className="mb-4">
        <p className="section-kicker mb-2">Creator Reliability Score</p>
        <CreatorTrustGraph wallet={data.creator.wallet} />
      </div>

      <section className="card mb-4 p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Gift size={16} className="text-[#50d8a4]" />
              <h2 className="font-mono text-base font-black text-white">USDT Campaign Budget</h2>
            </div>
            <p className="text-xs font-fun leading-5 text-white/38">
              Planned creator reward budgets tied to Bags tokens. Preview only - no transaction executed.
            </p>
          </div>
          <span className="rounded-xl border border-[#26a17b]/20 bg-[#26a17b]/10 px-3 py-1 text-sm font-fun font-black text-[#50d8a4]">
            {usd(data.campaignTotals?.plannedBudgetUsdt ?? 0)}
          </span>
        </div>
        {!data.campaigns?.length ? (
          <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 text-sm font-fun text-white/35">
            No planned USDT reward campaigns yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {data.campaigns.map((campaign) => (
              <Link key={campaign.id} href={`/token/${campaign.tokenMint}`} className="rounded-2xl border border-white/8 bg-white/[0.04] p-4 transition-colors hover:bg-white/[0.07]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-fun font-black text-white">{campaign.title}</p>
                    <p className="mt-1 text-xs font-fun text-white/35">{shortAddress(campaign.tokenMint)}</p>
                  </div>
                  <span className="shrink-0 rounded-xl border border-[#26a17b]/20 bg-[#26a17b]/10 px-2.5 py-1 text-xs font-fun font-black text-[#50d8a4]">
                    {usd(Number(campaign.budgetUsdt))}
                  </span>
                </div>
                {campaign.description && <p className="mt-2 line-clamp-2 text-xs font-fun leading-5 text-white/38">{campaign.description}</p>}
                <p className="mt-2 text-[10px] font-fun font-black uppercase text-white/28">{campaign.status}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-white/8 px-4 py-3">
          <h2 className="font-mono text-base font-black text-white">Creator Tokens</h2>
          <p className="text-xs font-fun text-white/35">Fees are shown in SOL with approximate USDT stable value.</p>
        </div>
        {data.tokens.length === 0 ? (
          <div className="p-8 text-center text-sm font-fun text-white/35">No indexed creator tokens yet.</div>
        ) : data.tokens.map((token) => (
          <Link key={token.mint} href={`/token/${token.mint}`} className="grid grid-cols-1 gap-3 border-b border-white/5 px-5 py-4 transition-colors hover:bg-white/5 md:grid-cols-12 md:items-center">
            <div className="md:col-span-4 flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#7a55c6] to-[#ff6a84] text-white">
                {token.imageUrl ? <img src={token.imageUrl} alt={token.symbol} className="h-full w-full object-cover" /> : token.symbol[0]}
              </div>
              <div className="min-w-0">
                <p className="truncate font-fun font-black text-white">{token.name}</p>
                <p className="truncate text-xs font-mono text-white/35">{token.symbol} - {shortAddress(token.mint)}</p>
              </div>
            </div>
            <div className="md:col-span-2">
              <p className="text-[10px] font-fun uppercase text-white/30">Lifetime</p>
              <p className="font-mono text-[#00ff88]">{formatLamports(token.lifetimeFeesLamports)}</p>
              <p className="text-xs font-fun text-[#50d8a4]">{usd(token.lifetimeFeesUsdt)}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-[10px] font-fun uppercase text-white/30">Generated 24h</p>
              <p className="font-mono text-[#ffcc7a]">{feeVelocityValue(token.feeVelocityStatus, token.feeVelocity24hLamports)}</p>
              <p className="text-xs font-fun text-[#ffcc7a]">
                {token.feeVelocity24hUsdt == null ? feeVelocitySubtitle(token.feeVelocityStatus) : usd(token.feeVelocity24hUsdt)}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-[10px] font-fun uppercase text-white/30">Claimed 24h</p>
              <p className="font-mono text-white">{formatLamports(token.claimedFees24hLamports)}</p>
              <p className="text-xs font-fun text-white/40">{usd(token.claimedFees24hUsdt)}</p>
            </div>
            <div className="md:col-span-2 flex flex-wrap justify-start gap-2 md:justify-end">
              {token.creatorProof && <span className="rounded-lg border border-[#00ff88]/20 bg-[#00ff88]/10 px-2 py-1 text-xs font-fun text-[#00ff88]">Creator proof</span>}
              {token.poolVerified && <span className="rounded-lg border border-[#b48dff]/20 bg-[#b48dff]/10 px-2 py-1 text-xs font-fun text-[#cdb6ff]">Pool proof</span>}
              <ExternalLink size={15} className="text-white/25" />
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
