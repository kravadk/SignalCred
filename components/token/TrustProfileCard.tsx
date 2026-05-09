"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type TrustProfile = {
  trustScore: number;
  scoreBreakdown: Record<string, number>;
  trustTags: string[];
  riskLabels: string[];
  sourceLabels: Record<string, string>;
  noFakeData: boolean;
};

type SummaryResponse = {
  trustProfile?: TrustProfile;
  links?: {
    bagsToken?: string;
    solscanMint?: string;
    dexScreener?: string | null;
    creatorProfile?: string | null;
  };
};

const SCORE_LABELS: Record<string, string> = {
  bagsSource: "Bags source",
  creatorProof: "Creator proof",
  feeEvidence: "Fee evidence",
  claimEvidence: "Claim evidence",
  socialProof: "Social proof",
  marketProof: "Market proof",
};

function scoreTone(score: number) {
  if (score >= 80) return "text-[#00ff88]";
  if (score >= 50) return "text-[#ffcc7a]";
  return "text-[#ff8a78]";
}

export function TrustProfileCard({ mint }: { mint: string }) {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/tokens/${mint}/summary`, { signal: controller.signal, cache: "no-store" })
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(() => setData(null))
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [mint]);

  const profile = data?.trustProfile;
  const breakdown = useMemo(() => Object.entries(profile?.scoreBreakdown ?? {}), [profile]);

  if (loading) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 text-sm font-fun text-white/42">
          <Loader2 size={16} className="animate-spin" />
          Building Trust Profile from Bags, fees, claims, social, and market sources...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 rounded-2xl border border-[#ffb84d]/18 bg-[#ffb84d]/8 px-4 py-3 text-sm font-fun text-[#ffcc7a]">
          <AlertTriangle size={16} />
          Trust Profile unavailable. No fake score is shown.
        </div>
      </div>
    );
  }

  return (
    <div className="card relative overflow-hidden p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00ff88]/45 to-transparent" />
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-xl border border-[#00ff88]/18 bg-[#00ff88]/8 px-3 py-1 text-[11px] font-fun font-black uppercase text-[#69d99a]">
            <ShieldCheck size={13} />
            Trust Profile
          </div>
          <h2 className="font-display text-3xl leading-none text-white">Can users trust this Bags token?</h2>
          <p className="mt-2 max-w-2xl text-sm font-fun leading-6 text-white/45">
            Score is explainable: source, creator, fees, claims, social context, and market proof. Missing data stays pending.
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-black/20 px-5 py-4 text-center">
          <p className={cn("font-mono text-5xl font-black leading-none tabular-nums", scoreTone(profile.trustScore))}>{profile.trustScore}</p>
          <p className="mt-1 text-[10px] font-fun font-black uppercase tracking-wide text-white/35">trust score</p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {profile.trustTags.length ? profile.trustTags.map((tag) => (
          <span key={tag} className="inline-flex min-h-[30px] items-center gap-1.5 rounded-xl border border-[#00ff88]/18 bg-[#00ff88]/8 px-3 text-xs font-fun font-black text-[#69d99a]">
            <CheckCircle2 size={13} />
            {tag}
          </span>
        )) : (
          <span className="rounded-xl border border-[#ffb84d]/18 bg-[#ffb84d]/8 px-3 py-1.5 text-xs font-fun font-black text-[#ffcc7a]">
            Needs Proof
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <div className="space-y-2.5">
          {breakdown.map(([key, value]) => (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs font-fun">
                <span className="text-white/50">{SCORE_LABELS[key] ?? key}</span>
                <span className="font-mono font-black text-white">{value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/8">
                <div className="h-full rounded-full bg-gradient-to-r from-[#00ff88] via-[#b48dff] to-[#ffcc7a]" style={{ width: `${Math.min(100, Math.max(0, value * 4))}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
            <p className="mb-2 text-[11px] font-fun font-black uppercase text-white/35">Risk labels</p>
            <div className="flex flex-wrap gap-2">
              {profile.riskLabels.length ? profile.riskLabels.map((risk) => (
                <span key={risk} className="rounded-lg border border-[#ffb84d]/18 bg-[#ffb84d]/8 px-2.5 py-1 text-[11px] font-fun font-black text-[#ffcc7a]">
                  {risk}
                </span>
              )) : (
                <span className="rounded-lg border border-[#00ff88]/18 bg-[#00ff88]/8 px-2.5 py-1 text-[11px] font-fun font-black text-[#69d99a]">
                  No major risk flags
                </span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
            <p className="mb-2 text-[11px] font-fun font-black uppercase text-white/35">Source labels</p>
            <p className="text-xs font-fun leading-5 text-white/42">{Object.values(profile.sourceLabels).join(" / ")}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={`/passport/${mint}`} className="btn-primary min-h-[34px] px-3 text-xs">
              Trust Passport <ShieldCheck size={12} />
            </Link>
            {data?.links?.bagsToken && <a href={data.links.bagsToken} target="_blank" rel="noreferrer" className="btn-ghost min-h-[34px] px-3 text-xs">Bags <ExternalLink size={12} /></a>}
            {data?.links?.solscanMint && <a href={data.links.solscanMint} target="_blank" rel="noreferrer" className="btn-ghost min-h-[34px] px-3 text-xs">Solscan <ExternalLink size={12} /></a>}
            {data?.links?.dexScreener && <a href={data.links.dexScreener} target="_blank" rel="noreferrer" className="btn-ghost min-h-[34px] px-3 text-xs">Dex <ExternalLink size={12} /></a>}
          </div>
        </div>
      </div>
    </div>
  );
}
