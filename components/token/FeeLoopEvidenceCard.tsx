"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleDollarSign, Clock3, ExternalLink, Gift, Loader2, ReceiptText, ShieldCheck } from "lucide-react";
import { feeVelocitySubtitle, feeVelocityValue } from "@/lib/fee-velocity-display";
import { formatLamports, formatUsd } from "@/lib/utils";

type StepStatus = "ok" | "pending" | "unavailable" | "warning";

type FeeLoopStep = {
  id: "fees_generated" | "fees_claimed" | "claim_receipt" | "campaign_planned" | "campaign_funded";
  label: string;
  status: StepStatus;
  value?: string | null;
  usdtValue?: number | null;
  description: string;
  source: string;
  timestamp?: string | null;
  href?: string | null;
};

type FeeLoopResponse = {
  lifetimeFeesLamports: number;
  lifetimeFeesUsdt: number;
  feeVelocity24hLamports: number | null;
  feeVelocity24hUsdt: number | null;
  feeVelocityStatus: "active" | "pending" | "unavailable";
  claimedFees24hLamports: number;
  claimedFees24hUsdt: number;
  claimEvents: Array<{ id: string; href?: string | null; txSignature?: string | null; amountFormatted?: string | null; walletShort?: string | null }>;
  claimReceipts: Array<{ id: string; href?: string | null; txSignature?: string | null; walletShort?: string | null; amountLamports?: number | null }>;
  campaigns: Array<{ id: string; title: string; budgetUsdt: number; status: string; href?: string | null; previewOnly: boolean }>;
  fundingProofs: Array<{ id: string; title: string; href?: string | null; txSignature?: string | null; asset: string }>;
  campaignTotals: { count: number; plannedBudgetUsdt: number; fundedBudgetUsdt: number };
  steps: FeeLoopStep[];
  sourceLabels: Record<string, string>;
  noFakeData: true;
};

const STEP_ICON: Record<FeeLoopStep["id"], typeof CircleDollarSign> = {
  fees_generated: CircleDollarSign,
  fees_claimed: ReceiptText,
  claim_receipt: ShieldCheck,
  campaign_planned: Gift,
  campaign_funded: CheckCircle2,
};

function usd(value: number | null | undefined) {
  return formatUsd(Number(value ?? 0)) ?? "$0";
}

function statusClass(status: StepStatus) {
  if (status === "ok") return "border-[#00ff88]/20 bg-[#00ff88]/10 text-[#00ff88]";
  if (status === "warning") return "border-[#ffb84d]/24 bg-[#ffb84d]/10 text-[#ffcc7a]";
  if (status === "unavailable") return "border-[#ff624e]/20 bg-[#ff624e]/10 text-[#ff9a87]";
  return "border-white/10 bg-white/6 text-white/42";
}

function shortTx(value: string) {
  return value.length > 14 ? `${value.slice(0, 6)}...${value.slice(-6)}` : value;
}

export function FeeLoopEvidenceCard({ mint }: { mint: string }) {
  const [data, setData] = useState<FeeLoopResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/tokens/${mint}/fee-loop`, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Fee loop unavailable");
        setData(body);
      })
      .catch(() => setData(null))
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [mint]);

  const generatedLabel = useMemo(() => {
    if (!data) return "Baseline warming";
    return feeVelocityValue(data.feeVelocityStatus, data.feeVelocity24hLamports);
  }, [data]);

  if (loading) {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-2 text-xs font-body font-semibold text-white/48">
          <Loader2 size={14} className="animate-spin" />
          Loading fee loop evidence...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card p-4">
        <p className="font-display text-xl leading-none text-white">Fee Loop Evidence</p>
        <p className="mt-2 text-xs font-body font-semibold text-[#ff9a87]">Fee loop is temporarily unavailable. No fallback values are fabricated.</p>
      </div>
    );
  }

  const summary = [
    ["Lifetime fees", formatLamports(data.lifetimeFeesLamports), `~${usd(data.lifetimeFeesUsdt)} USDT`],
    ["Generated 24h", generatedLabel, data.feeVelocity24hUsdt == null ? feeVelocitySubtitle(data.feeVelocityStatus) : `~${usd(data.feeVelocity24hUsdt)} USDT`],
    ["Claimed 24h", formatLamports(data.claimedFees24hLamports), `~${usd(data.claimedFees24hUsdt)} USDT`],
    ["USDT campaign", `${usd(data.campaignTotals.plannedBudgetUsdt)} USDT`, data.campaignTotals.fundedBudgetUsdt ? `${usd(data.campaignTotals.fundedBudgetUsdt)} funded` : "Preview only - no transaction executed"],
  ];

  return (
    <div className="card p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl leading-none text-white">Fee Loop Evidence</p>
          <p className="mt-1 text-xs font-body font-semibold leading-5 text-white/48">
            Generated fees {"->"} claimed fees {"->"} Solscan receipt {"->"} USDT campaign proof.
          </p>
        </div>
        <span className="rounded-xl border border-[#00ff88]/20 bg-[#00ff88]/10 px-2.5 py-1 text-xs font-body font-black text-[#00ff88]">
          no fake data
        </span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-1.5">
        {summary.map(([label, value, sub]) => (
          <div key={label} className="rounded-xl bg-white/[0.04] p-2">
            <p className="text-[10px] font-body font-black uppercase tracking-[0.12em] text-white/40">{label}</p>
            <p className="mt-1 truncate font-mono text-sm font-black text-white">{value}</p>
            <p className="mt-1 line-clamp-2 text-[11px] font-body font-semibold leading-4 text-[#50d8a4]">{sub}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {data.steps.map((step) => {
          const Icon = STEP_ICON[step.id] ?? Clock3;
          const row = (
            <div className="flex gap-2 rounded-xl bg-white/[0.035] p-2.5 transition-colors hover:bg-white/[0.06]">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${statusClass(step.status)}`}>
                <Icon size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="font-body text-sm font-black text-white">{step.label}</p>
                  <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-body font-black uppercase ${statusClass(step.status)}`}>
                    {step.status}
                  </span>
                </div>
                <p className="mt-1 text-xs font-body font-semibold leading-5 text-white/48">{step.description}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-mono text-white/28">
                  {step.value && <span>{step.value}</span>}
                  {step.usdtValue != null && <span>~{usd(step.usdtValue)} USDT</span>}
                  <span>{step.source}</span>
                </div>
              </div>
              {step.href ? <ExternalLink size={13} className="mt-1 shrink-0 text-white/30" /> : <Clock3 size={13} className="mt-1 shrink-0 text-white/20" />}
            </div>
          );
          return step.href ? (
            <a key={step.id} href={step.href} target="_blank" rel="noreferrer">{row}</a>
          ) : (
            <div key={step.id}>{row}</div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2">
        {data.claimEvents.length === 0 && (
          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs font-body font-semibold text-white/42">
            No claim events indexed yet
          </div>
        )}
        {data.fundingProofs.length === 0 && (
          <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs font-body font-semibold text-white/42">
            No funding proof attached
          </div>
        )}
        {[...data.claimEvents.slice(0, 2), ...data.claimReceipts.slice(0, 2), ...data.fundingProofs.slice(0, 2)].map((row) => {
          const tx = typeof row.txSignature === "string"
            ? row.txSignature
            : "signature" in row && typeof row.signature === "string"
              ? row.signature
              : null;
          if (!tx || !row.href) return null;
          return (
            <a key={`${row.id}-${tx}`} href={row.href} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2 text-xs font-body font-semibold text-white/52 hover:text-white">
              <span className="truncate">Solscan receipt</span>
              <span className="font-mono text-[#50d8a4]">{shortTx(tx)}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
