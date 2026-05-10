"use client";

import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, Languages, Loader2, Search, ShieldCheck, WifiOff } from "lucide-react";
import type { TokenPassportResponse } from "@/lib/trust-passport";
import { getQvacHealth, requestQvacReview, type QvacHealth, type QvacTrustReview } from "@/lib/qvac-client";
import { cn } from "@/lib/utils";

type Mode = "passport" | "before-buy" | "creator" | "composer";

export function PrivateQvacReview({
  passport,
  creatorGraph,
  mode = "passport",
  compact = false,
  onDraft,
}: {
  passport?: TokenPassportResponse | null;
  creatorGraph?: unknown;
  mode?: Mode;
  compact?: boolean;
  onDraft?: (text: string) => void;
}) {
  const [health, setHealth] = useState<QvacHealth | null>(null);
  const [review, setReview] = useState<QvacTrustReview | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    getQvacHealth(controller.signal).then(setHealth);
    return () => controller.abort();
  }, []);

  const status = useMemo(() => {
    if (!health) return { label: "QVAC unavailable", tone: "amber" as const };
    if (health.mode === "qvac_private") return { label: "QVAC ready", tone: "green" as const };
    if (health.mode === "qvac_demo") return { label: "QVAC test mode", tone: "blue" as const };
    return { label: "QVAC unavailable", tone: "amber" as const };
  }, [health]);

  const normalizedPassport = passport ?? creatorGraphToPassport(creatorGraph);
  const disabled = !normalizedPassport?.evidence?.length || loading || !health?.ready;

  const run = async (action: "summary" | "risk" | "before" | "search" | "translate" | "draft" | "changed") => {
    if (!normalizedPassport?.evidence?.length) {
      setError("No evidence rows available for QVAC review.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = action === "before"
        ? await requestQvacReview({ endpoint: "explain/before-buy", passport: normalizedPassport, question })
        : action === "search"
          ? await requestQvacReview({ endpoint: "search/proof", passport: normalizedPassport, question: question || "What proof should I inspect?" })
          : action === "changed"
            ? await requestQvacReview({ endpoint: "search/proof", passport: normalizedPassport, question: "What changed in this proof, what is verified, and what is still pending?" })
          : action === "translate"
            ? await requestQvacReview({ endpoint: "translate", text: review?.summary || fallbackSummary(normalizedPassport), to: "uk", from: "en" })
            : await requestQvacReview({ endpoint: "analyze/passport", passport: normalizedPassport, question: action === "risk" ? "Explain risk labels and missing proof." : question });
      setReview(response);
      try {
        window.localStorage.setItem("signalcred.qvac.lastAnalysis", JSON.stringify({
          at: new Date().toISOString(),
          mode,
          privacyMode: response.privacyMode,
          sourceEvidenceIds: response.sourceEvidenceIds.slice(0, 8),
          summary: response.summary.slice(0, 220),
        }));
      } catch {
        // Analysis metadata is best-effort only; QVAC output still renders without storage.
      }
      if (action === "draft" && onDraft) {
        const text = `QVAC proof note: ${response.summary} Sources: ${response.sourceEvidenceIds.slice(0, 4).join(", ")}.`;
        onDraft(text.slice(0, 300));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "QVAC review failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={cn("rounded-xl border border-[#45c7ff]/14 bg-[#071426]/70 p-3", !compact && "card")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BrainCircuit size={16} className="text-[#62d9ff]" />
            <h2 className="font-body text-sm font-black text-white">QVAC Trust Review</h2>
          </div>
          <p className="mt-1 text-xs font-body font-semibold leading-5 text-white/48">
            Private AI explains passport proof, risk labels, fees, creator context, and social signals without touching wallet secrets.
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md border px-2 py-1 text-[10px] font-mono font-bold uppercase",
            status.tone === "green" && "border-[#00ff88]/18 bg-[#00ff88]/10 text-[#69d99a]",
            status.tone === "blue" && "border-[#62d9ff]/18 bg-[#62d9ff]/10 text-[#8fd8ff]",
            status.tone === "amber" && "border-[#ffb84d]/18 bg-[#ffb84d]/10 text-[#ffcc7a]"
          )}
        >
          {health?.ready ? <ShieldCheck size={11} className="mr-1 inline" /> : <WifiOff size={11} className="mr-1 inline" />}
          {status.label}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button className="qvac-btn" disabled={disabled} onClick={() => run("summary")}>Summarize passport</button>
        <button className="qvac-btn" disabled={disabled} onClick={() => run("risk")}>Explain risks</button>
        <button className="qvac-btn" disabled={disabled} onClick={() => run("changed")}>What changed?</button>
        {mode !== "passport" && <button className="qvac-btn" disabled={disabled} onClick={() => run("before")}>Before You Buy</button>}
        {onDraft && <button className="qvac-btn" disabled={disabled} onClick={() => run("draft")}>Draft proof note</button>}
        <button className="qvac-btn" disabled={disabled || !review?.summary} onClick={() => run("translate")}>
          <Languages size={12} /> Translate
        </button>
      </div>

      <div className="mt-2 flex gap-2">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask about evidence, fees, creator, or social proof..."
          className="h-9 min-w-0 flex-1 rounded-lg border border-white/[0.06] bg-white/[0.035] px-3 text-xs font-body text-white outline-none placeholder:text-white/28 focus:border-[#62d9ff]/28"
        />
        <button className="qvac-btn min-w-[86px]" disabled={disabled} onClick={() => run("search")}>
          <Search size={12} /> Search
        </button>
      </div>

      {loading && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.035] px-3 py-2 text-xs font-body font-semibold text-white/46">
          <Loader2 size={14} className="animate-spin" />
          QVAC is reviewing evidence...
        </div>
      )}

      {error && <p className="mt-2 rounded-lg border border-[#ff624e]/18 bg-[#ff624e]/8 px-3 py-2 text-xs font-body font-bold text-[#ff9a87]">{error}</p>}

      {!health?.ready && (
        <p className="mt-2 rounded-lg border border-[#ffb84d]/16 bg-[#ffb84d]/8 px-3 py-2 text-xs font-body leading-5 text-[#ffcc7a]">
          QVAC review is unavailable in this environment. SignalCred still shows verified source, fee, social, and explorer evidence without generating an AI answer.
        </p>
      )}

      {review && (
        <div className="mt-3 space-y-2 rounded-lg border border-white/[0.06] bg-black/20 p-3">
          <p className="text-sm font-body font-black leading-6 text-white">{review.summary}</p>
          <p className="text-xs font-body leading-5 text-white/52">{review.riskExplanation}</p>
          <div className="grid gap-2 md:grid-cols-2">
            <ReviewList title="Positive signals" rows={review.positiveSignals} tone="green" />
            <ReviewList title="Missing proof" rows={review.missingProof} tone="amber" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {review.sourceEvidenceIds.slice(0, 8).map((id) => (
              <span key={id} className="rounded-md border border-[#62d9ff]/12 bg-[#62d9ff]/8 px-2 py-1 font-mono text-[10px] text-[#8fd8ff]">{id}</span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ReviewList({ title, rows, tone }: { title: string; rows: string[]; tone: "green" | "amber" }) {
  return (
    <div>
      <p className={cn("text-[10px] font-mono font-black uppercase tracking-[0.12em]", tone === "green" ? "text-[#69d99a]" : "text-[#ffcc7a]")}>{title}</p>
      <div className="mt-1 space-y-1">
        {(rows.length ? rows : ["No rows returned"]).slice(0, 4).map((row, index) => (
          <p key={`${row}:${index}`} className="text-[11px] font-body leading-4 text-white/46">{row}</p>
        ))}
      </div>
    </div>
  );
}

function fallbackSummary(passport: TokenPassportResponse) {
  return `${passport.token.symbol} trust score ${passport.trustScore}. Verdict ${passport.verdict}.`;
}

function creatorGraphToPassport(graph: unknown): TokenPassportResponse | null {
  if (!graph || typeof graph !== "object") return null;
  const data = graph as {
    wallet?: string;
    reliabilityScore?: number;
    suspiciousPatterns?: Array<{ id?: string; label?: string; severity?: "low" | "medium" | "high"; evidence?: string[] }>;
    totals?: Record<string, number>;
  };
  if (!data.wallet) return null;
  const totals = data.totals ?? {};
  return {
    mint: data.wallet,
    token: { name: "Creator Trust Graph", symbol: "CREATOR", imageUrl: null, creatorWallet: data.wallet },
    verdict: (data.reliabilityScore ?? 0) >= 70 ? "verified" : "warming",
    trustScore: Math.max(0, Math.min(100, Math.round(data.reliabilityScore ?? 0))),
    scoreBreakdown: { formula: "Creator graph proxy for QVAC review" },
    evidence: Object.entries(totals).map(([key, value]) => ({
      id: key,
      label: key,
      status: Number(value) > 0 ? "verified" : "pending",
      source: "creator_trust_graph",
      value: String(value),
      timestamp: null,
      evidenceUrl: null,
      explanation: "Creator graph total used for QVAC review.",
    })),
    riskLabels: (data.suspiciousPatterns ?? []).map((row) => ({
      id: row.id ?? row.label ?? "risk",
      label: row.label ?? "Creator risk",
      severity: row.severity ?? "low",
      evidenceIds: row.evidence ?? [],
    })),
    links: { tokenPage: `/profile/${data.wallet}`, bags: "", solscanMint: `https://solscan.io/account/${data.wallet}`, dexScreener: null, meteora: null, creatorProfile: `/profile/${data.wallet}` },
    sourceLabels: { source: "creator_trust_graph" },
    noFakeData: true,
    generatedAt: new Date().toISOString(),
  };
}
