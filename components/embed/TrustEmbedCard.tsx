import Link from "next/link";
import { ExternalLink, ShieldCheck, ShieldAlert } from "lucide-react";
import type { TokenPassportResponse } from "@/lib/trust-passport";

function verdictText(verdict: TokenPassportResponse["verdict"]) {
  if (verdict === "verified") return "Verified";
  if (verdict === "risk_review") return "Risk review";
  if (verdict === "unavailable") return "Unavailable";
  return "Warming";
}

function scoreColor(score: number) {
  if (score >= 75) return "text-[#00ff88]";
  if (score >= 45) return "text-[#ffcc7a]";
  return "text-[#ff8a78]";
}

export function TrustEmbedCard({ passport }: { passport: TokenPassportResponse }) {
  const badges = passport.evidence.filter((row) => row.status === "verified").slice(0, 4);
  const risks = passport.riskLabels.slice(0, 3);

  return (
    <main className="min-h-screen bg-[#080712] p-3 text-white">
      <section className="mx-auto max-w-[420px] overflow-hidden rounded-[24px] border border-white/10 bg-[#11101b] shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
        <div className="border-b border-white/8 bg-[radial-gradient(circle_at_20%_0%,rgba(38,161,123,0.28),transparent_40%),radial-gradient(circle_at_90%_20%,rgba(122,85,198,0.24),transparent_44%)] p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/38">SignalCred Trust Embed</p>
              <h1 className="mt-1 truncate text-2xl font-black tracking-[-0.03em] text-white">{passport.token.name}</h1>
              <p className="truncate font-mono text-xs text-white/42">${passport.token.symbol} / {passport.mint.slice(0, 4)}...{passport.mint.slice(-4)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/24 px-3 py-2 text-right">
              <p className="text-[10px] font-black uppercase text-white/35">Score</p>
              <p className={`font-mono text-3xl font-black ${scoreColor(passport.trustScore)}`}>{passport.trustScore}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-black ${
              passport.verdict === "verified"
                ? "border-[#00ff88]/20 bg-[#00ff88]/10 text-[#00ff88]"
                : passport.verdict === "risk_review"
                  ? "border-[#ff624e]/20 bg-[#ff624e]/10 text-[#ff8a78]"
                  : "border-[#ffb84d]/20 bg-[#ffb84d]/10 text-[#ffcc7a]"
            }`}>
              {passport.verdict === "risk_review" ? <ShieldAlert size={13} /> : <ShieldCheck size={13} />}
              {verdictText(passport.verdict)}
            </span>
            <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-black text-white/42">
              no fake data
            </span>
          </div>
        </div>

        <div className="p-4">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Verified proof</p>
          <div className="grid gap-2">
            {badges.length === 0 ? (
              <p className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white/38">
                Proof is still warming.
              </p>
            ) : badges.map((badge) => (
              <a
                key={badge.id}
                href={badge.evidenceUrl ?? `/passport/${passport.mint}`}
                target={badge.evidenceUrl?.startsWith("https://") ? "_blank" : undefined}
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 hover:border-white/16"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-white">{badge.label}</span>
                  <span className="block truncate font-mono text-[10px] text-white/32">{badge.source}</span>
                </span>
                <ExternalLink size={13} className="shrink-0 text-white/30" />
              </a>
            ))}
          </div>

          {risks.length > 0 && (
            <div className="mt-4 rounded-2xl border border-[#ffb84d]/18 bg-[#ffb84d]/8 px-3 py-2">
              <p className="text-[10px] font-black uppercase text-[#ffcc7a]">Risk labels</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-[#ffdfa3]">{risks.map((risk) => risk.label).join(" / ")}</p>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href={`/passport/${passport.mint}`} target="_blank" className="rounded-2xl bg-white px-3 py-2 text-center text-xs font-black text-[#080712]">
              Passport
            </Link>
            <a href={passport.links.bags} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-center text-xs font-black text-white/58">
              Bags.fm
            </a>
          </div>
          <p className="mt-3 text-center font-mono text-[10px] text-white/24">Generated {passport.generatedAt}</p>
        </div>
      </section>
    </main>
  );
}
