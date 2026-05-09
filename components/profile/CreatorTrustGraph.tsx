"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { CreatorReliabilityScore } from "@/components/profile/CreatorReliabilityScore";
import { LinkedTokenNetwork } from "@/components/profile/LinkedTokenNetwork";
import { SuspiciousPatternPanel } from "@/components/profile/SuspiciousPatternPanel";

type GraphResponse = {
  wallet: string;
  reliabilityScore: number;
  scoreBreakdown: {
    creatorProof: number;
    poolSurvival: number;
    feeGeneration: number;
    claims: number;
    socialQuality: number;
    campaignReliability: number;
    riskPenalty: number;
  };
  tokens: Array<{
    mint: string;
    name: string;
    symbol: string;
    imageUrl?: string | null;
    passportHref: string;
    lifetimeFeesLamports: number;
    feeVelocity24hLamports?: number | null;
    feeVelocityStatus: "active" | "pending" | "unavailable";
    poolVerified: boolean;
    creatorProof: boolean;
    hasMarketPair: boolean;
    riskLabels: string[];
  }>;
  linkedWallets: Array<{ wallet: string; role: "creator" | "admin" | "claimer" | "campaign_funder"; tokenCount: number }>;
  suspiciousPatterns: Array<{ id: string; label: string; severity: "low" | "medium" | "high"; evidence: string[] }>;
  totals: {
    tokenCount: number;
    creatorProofCount: number;
    poolVerifiedCount: number;
    marketPairCount: number;
    feeGeneratingCount: number;
    claimEventCount: number;
    officialUpdates: number;
    campaignsPlanned: number;
    campaignsFunded: number;
  };
  noFakeData: true;
};

export function CreatorTrustGraph({ wallet }: { wallet: string }) {
  const [data, setData] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/creators/${wallet}/trust-graph`, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Creator trust graph unavailable");
        setData(body);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message || "Creator trust graph unavailable");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [wallet]);

  if (loading) {
    return (
      <section className="card p-5">
        <div className="flex items-center gap-2 text-sm font-fun text-white/42">
          <Loader2 size={16} className="animate-spin" />
          Building Creator Trust Graph...
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="card p-5">
        <p className="font-fun font-black text-white">Creator Trust Graph</p>
        <p className="mt-2 text-xs font-fun text-[#ff9a87]">{error || "Unavailable. No fallback graph is fabricated."}</p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
        <CreatorReliabilityScore score={data.reliabilityScore} breakdown={data.scoreBreakdown} />
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl text-white">Creator History</h2>
            <span className="rounded-xl border border-[#00ff88]/18 bg-[#00ff88]/8 px-3 py-1 text-xs font-fun font-black text-[#69d99a]">
              no fake data
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {[
              ["Tokens", data.totals.tokenCount],
              ["Creator proofs", data.totals.creatorProofCount],
              ["Pool proofs", data.totals.poolVerifiedCount],
              ["Market pairs", data.totals.marketPairCount],
              ["Fee tokens", data.totals.feeGeneratingCount],
              ["Claim events", data.totals.claimEventCount],
              ["Official posts", data.totals.officialUpdates],
              ["Funded campaigns", `${data.totals.campaignsFunded}/${data.totals.campaignsPlanned}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
                <p className="text-[10px] font-fun font-black uppercase tracking-wider text-white/30">{label}</p>
                <p className="mt-1 truncate font-mono text-2xl font-black tabular-nums text-white">{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <LinkedTokenNetwork tokens={data.tokens} wallets={data.linkedWallets} />
        <SuspiciousPatternPanel patterns={data.suspiciousPatterns} />
      </div>
    </section>
  );
}
