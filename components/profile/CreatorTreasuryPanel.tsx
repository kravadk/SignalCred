"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, ShieldCheck, SlidersHorizontal, WalletCards } from "lucide-react";
import { RunwayEstimator } from "@/components/profile/RunwayEstimator";

type TreasuryResponse = {
  wallet: string;
  solPriceUsdt: number;
  usdtSource: string;
  approximate: boolean;
  totals: {
    tokenCount: number;
    lifetimeFeesSol: number;
    lifetimeFeesUsdt: number;
    estimatedCreatorShareSol: number;
    estimatedCreatorShareUsdt: number;
    claimed24hSol: number;
    claimed24hUsdt: number;
    feeVelocity24hSol: number;
    feeVelocity24hUsdt: number;
    plannedCampaignBudgetUsdt: number;
    fundedCampaignBudgetUsdt: number;
  };
  planner: {
    keepSolPercent: number;
    convertUsdtPercent: number;
    rewardsPercent: number;
    retainedSol: number;
    treasuryUsdt: number;
    rewardBudgetUsdt: number;
    runwayDays: number | null;
    dailyCampaignBurnUsdt: number | null;
  };
  fundingProofs: Array<{
    campaignId: string;
    tokenMint: string;
    title: string;
    txSignature: string;
    solscanHref: string;
    asset: "USDT-SPL";
    budgetUsdt: number;
  }>;
  previewOnly: true;
  noFakeData: true;
};

function usd(value: number | null | undefined) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "$0.00";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function sol(value: number | null | undefined) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0 SOL";
  if (n === 0) return "0 SOL";
  if (n < 0.0001) return "<0.0001 SOL";
  return `${n.toFixed(n >= 10 ? 2 : 4)} SOL`;
}

function short(value: string) {
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function CreatorTreasuryPanel({ wallet }: { wallet: string }) {
  const [data, setData] = useState<TreasuryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keepSol, setKeepSol] = useState(45);
  const [convertUsdt, setConvertUsdt] = useState(35);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/creators/${wallet}/treasury`, { cache: "no-store", signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "USDT Creator Treasury unavailable");
        setData(body);
        setKeepSol(body.planner?.keepSolPercent ?? 45);
        setConvertUsdt(body.planner?.convertUsdtPercent ?? 35);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message || "USDT Creator Treasury unavailable");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [wallet]);

  const rewards = Math.max(0, 100 - keepSol - convertUsdt);
  const planner = useMemo(() => {
    const creatorShare = data?.totals.estimatedCreatorShareSol ?? 0;
    const price = data?.solPriceUsdt ?? 0;
    const retainedSol = creatorShare * (keepSol / 100);
    const treasuryUsdt = creatorShare * (convertUsdt / 100) * price;
    const rewardBudgetUsdt = creatorShare * (rewards / 100) * price;
    const dailyCampaignBurnUsdt = data?.planner.dailyCampaignBurnUsdt ?? null;
    return {
      retainedSol,
      treasuryUsdt,
      rewardBudgetUsdt,
      dailyCampaignBurnUsdt,
      runwayDays: dailyCampaignBurnUsdt && rewardBudgetUsdt > 0 ? Math.floor(rewardBudgetUsdt / dailyCampaignBurnUsdt) : null,
    };
  }, [convertUsdt, data, keepSol, rewards]);

  if (loading) {
    return (
      <aside className="card flex min-h-[360px] items-center justify-center p-5">
        <div className="text-center">
          <Loader2 size={24} className="mx-auto animate-spin text-white/35" />
          <p className="mt-3 text-sm font-fun font-black text-white/45">USDT Creator Treasury</p>
        </div>
      </aside>
    );
  }

  if (error || !data) {
    return (
      <aside className="card p-5">
        <p className="text-sm font-fun font-black text-white">USDT Creator Treasury</p>
        <p className="mt-2 text-xs font-fun text-[#ff8a78]">{error || "Treasury unavailable"}</p>
      </aside>
    );
  }

  return (
    <aside className="card relative overflow-hidden p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#26a17b]/55 to-transparent" />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-xl border border-[#26a17b]/20 bg-[#26a17b]/10 px-3 py-1 text-[10px] font-fun font-black uppercase text-[#50d8a4]">
            <WalletCards size={12} /> Tether Frontier
          </div>
          <h2 className="font-display text-2xl text-white">USDT Creator Treasury</h2>
          <p className="mt-1 text-xs font-fun leading-5 text-white/42">
            Stable-value planning from real Bags fees. Preview only - no transaction executed.
          </p>
        </div>
        <ShieldCheck size={18} className="text-[#50d8a4]" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-white/8 bg-white/[0.045] p-3">
          <p className="text-[10px] font-fun font-black uppercase text-white/32">Creator share</p>
          <p className="mt-1 font-mono text-2xl font-black tabular-nums text-white">{usd(data.totals.estimatedCreatorShareUsdt)}</p>
          <p className="text-xs font-mono text-[#50d8a4]">{sol(data.totals.estimatedCreatorShareSol)}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.045] p-3">
          <p className="text-[10px] font-fun font-black uppercase text-white/32">Campaign budget</p>
          <p className="mt-1 font-mono text-2xl font-black tabular-nums text-white">{usd(data.totals.plannedCampaignBudgetUsdt)}</p>
          <p className="text-xs font-mono text-[#ffcc7a]">{usd(data.totals.fundedCampaignBudgetUsdt)} funded</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.045] p-3">
          <p className="text-[10px] font-fun font-black uppercase text-white/32">Claimed 24h</p>
          <p className="mt-1 font-mono text-2xl font-black tabular-nums text-white">{usd(data.totals.claimed24hUsdt)}</p>
          <p className="text-xs font-mono text-white/42">{sol(data.totals.claimed24hSol)}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/[0.045] p-3">
          <p className="text-[10px] font-fun font-black uppercase text-white/32">Fee velocity</p>
          <p className="mt-1 font-mono text-2xl font-black tabular-nums text-white">{usd(data.totals.feeVelocity24hUsdt)}</p>
          <p className="text-xs font-mono text-white/42">{sol(data.totals.feeVelocity24hSol)} / 24h</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.035] p-3">
        <div className="mb-3 flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-[#50d8a4]" />
          <p className="text-sm font-fun font-black text-white">Treasury split planner</p>
        </div>
        {[
          ["Keep SOL reserve", keepSol, setKeepSol],
          ["Convert to USDT", convertUsdt, setConvertUsdt],
        ].map(([label, value, setter]) => (
          <label key={String(label)} className="mb-3 block">
            <div className="mb-1.5 flex items-center justify-between text-xs font-fun">
              <span className="font-bold text-white/55">{String(label)}</span>
              <span className="font-mono text-white">{Number(value)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Number(value)}
              onChange={(event) => (setter as (next: number) => void)(Number(event.target.value))}
              className="w-full"
            />
          </label>
        ))}
        <div className="rounded-xl border border-[#b48dff]/18 bg-[#b48dff]/10 px-3 py-2 text-xs font-fun text-[#cdb6ff]">
          Rewards / campaign allocation: {rewards}%
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-xl bg-white/[0.045] px-3 py-2">
            <p className="font-fun text-white/35">SOL reserve</p>
            <p className="mt-1 font-mono text-white">{sol(planner.retainedSol)}</p>
          </div>
          <div className="rounded-xl bg-white/[0.045] px-3 py-2">
            <p className="font-fun text-white/35">USDT treasury</p>
            <p className="mt-1 font-mono text-[#50d8a4]">{usd(planner.treasuryUsdt)}</p>
          </div>
          <div className="rounded-xl bg-white/[0.045] px-3 py-2">
            <p className="font-fun text-white/35">Rewards</p>
            <p className="mt-1 font-mono text-[#ffcc7a]">{usd(planner.rewardBudgetUsdt)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <RunwayEstimator
          runwayDays={planner.runwayDays}
          rewardBudgetUsdt={planner.rewardBudgetUsdt}
          dailyCampaignBurnUsdt={planner.dailyCampaignBurnUsdt}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.035] p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-fun font-black text-white">Funding proofs</p>
          <span className="text-[10px] font-fun font-black uppercase text-white/30">{data.fundingProofs.length} attached</span>
        </div>
        {data.fundingProofs.length === 0 ? (
          <p className="text-xs font-fun leading-5 text-white/35">
            No SPL USDT funding proof attached yet. Planned budgets stay preview-only until a creator links a Solscan transaction.
          </p>
        ) : (
          <div className="space-y-2">
            {data.fundingProofs.slice(0, 3).map((proof) => (
              <a
                key={proof.campaignId}
                href={proof.solscanHref}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-xl border border-[#26a17b]/14 bg-[#26a17b]/8 px-3 py-2 text-xs hover:border-[#26a17b]/28"
              >
                <span className="min-w-0">
                  <span className="block truncate font-fun font-black text-white">{proof.title}</span>
                  <span className="font-mono text-[#50d8a4]">{short(proof.txSignature)} / {usd(proof.budgetUsdt)}</span>
                </span>
                <ExternalLink size={13} className="shrink-0 text-[#50d8a4]" />
              </a>
            ))}
          </div>
        )}
      </div>

      <p className="mt-3 rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2 text-[11px] font-fun leading-5 text-white/35">
        SOL/USDT source: {data.usdtSource}{data.approximate ? " / approximate" : ""}. SignalCred displays external funding proof only and does not execute payouts.
      </p>
    </aside>
  );
}
