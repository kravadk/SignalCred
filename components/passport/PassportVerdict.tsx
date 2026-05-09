import { AlertTriangle, CheckCircle2, Clock3, ShieldCheck, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TokenPassportResponse } from "@/lib/trust-passport";

const VERDICT_COPY: Record<TokenPassportResponse["verdict"], { label: string; body: string; tone: string; icon: typeof ShieldCheck }> = {
  verified: {
    label: "Verified",
    body: "Core Bags, pool, creator, market, and fee evidence is strong enough for a public trust profile.",
    tone: "border-[#00ff88]/24 bg-[#00ff88]/10 text-[#69d99a]",
    icon: CheckCircle2,
  },
  warming: {
    label: "Warming",
    body: "Some evidence is real but still collecting baseline, market, social, or campaign proof.",
    tone: "border-[#ffb84d]/24 bg-[#ffb84d]/10 text-[#ffcc7a]",
    icon: Clock3,
  },
  risk_review: {
    label: "Risk Review",
    body: "Important proof is missing or a high-severity risk flag is active. Inspect sources before trusting it.",
    tone: "border-[#ff624e]/24 bg-[#ff624e]/10 text-[#ff9a87]",
    icon: AlertTriangle,
  },
  unavailable: {
    label: "Unavailable",
    body: "Live proof sources are unavailable. No fallback trust score is fabricated.",
    tone: "border-white/12 bg-white/6 text-white/45",
    icon: XCircle,
  },
};

function scoreTone(score: number) {
  if (score >= 75) return "text-[#00ff88]";
  if (score >= 45) return "text-[#ffcc7a]";
  return "text-[#ff8a78]";
}

export function PassportVerdict({ passport }: { passport: TokenPassportResponse }) {
  const verdict = VERDICT_COPY[passport.verdict];
  const Icon = verdict.icon;

  return (
    <section className="card relative overflow-hidden p-3 md:p-4">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00ff88]/45 to-[#ffb84d]/35" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_0%,rgba(0,255,136,0.10),transparent_32%),radial-gradient(circle_at_100%_10%,rgba(255,184,77,0.08),transparent_28%)]" />
      <div className="relative grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px] lg:items-center">
        <div className="min-w-0">
          <div className={cn("mb-2 inline-flex items-center gap-2 rounded-md border px-2 py-1 text-[11px] font-mono font-bold uppercase tracking-[0.08em]", verdict.tone)}>
            <Icon size={14} />
            {verdict.label}
          </div>
          <h1 className="font-mono text-xl font-black leading-none text-white md:text-2xl">Trust Passport</h1>
          <p className="mt-2 max-w-3xl text-xs font-body leading-5 text-white/50">
            {verdict.body}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-md border border-[#00ff88]/16 bg-[#00ff88]/8 px-2 py-1 text-[11px] font-mono font-bold text-[#69d99a]">
              no fake data
            </span>
            <span className="rounded-md border border-[#b48dff]/16 bg-[#b48dff]/8 px-2 py-1 text-[11px] font-mono font-bold text-[#cdb6ff]">
              shareable proof link
            </span>
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-mono font-bold text-white/45">
              {passport.evidence.length} evidence rows
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/24 p-3 text-center shadow-[inset_0_0_0_1px_rgba(180,141,255,0.08)]">
          <p className={cn("font-mono text-4xl font-black leading-none", scoreTone(passport.trustScore))}>{passport.trustScore}</p>
          <p className="mt-1 text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-white/35">trust score</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#ff624e] via-[#ffb84d] to-[#00ff88]"
              style={{ width: `${Math.min(100, Math.max(0, passport.trustScore))}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
