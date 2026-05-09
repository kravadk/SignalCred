import Link from "next/link";
import { ArrowLeft, ExternalLink, ShieldAlert } from "lucide-react";
import { PassportProofChecklist } from "@/components/passport/PassportProofChecklist";
import { PassportVerdict } from "@/components/passport/PassportVerdict";
import type { TokenPassportResponse } from "@/lib/trust-passport";
import { cn, shortWallet } from "@/lib/utils";

function severityTone(severity: "low" | "medium" | "high") {
  if (severity === "high") return "border-[#ff624e]/20 bg-[#ff624e]/10 text-[#ff9a87]";
  if (severity === "medium") return "border-[#ffb84d]/20 bg-[#ffb84d]/10 text-[#ffcc7a]";
  return "border-white/10 bg-white/5 text-white/45";
}

function scoreLabel(key: string) {
  return key
    .replace("bagsSource", "Bags source")
    .replace("poolProof", "Pool proof")
    .replace("creatorProof", "Creator proof")
    .replace("launchProof", "Launch proof")
    .replace("marketProof", "Market proof")
    .replace("feeLoop", "Fee loop")
    .replace("claimReceipts", "Claim receipts")
    .replace("socialProof", "Social proof")
    .replace("usdtProof", "USDT proof");
}

export function TrustPassportPage({ passport }: { passport: TokenPassportResponse }) {
  const numericBreakdown = Object.entries(passport.scoreBreakdown).filter(([, value]) => typeof value === "number");

  return (
    <div className="mx-auto w-full max-w-[1680px] px-3 py-3 md:px-4 2xl:px-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Link href={passport.links.tokenPage} className="inline-flex min-h-[34px] items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-xs font-mono font-bold text-white/62 transition-colors hover:text-white">
          <ArrowLeft size={15} />
          Token page
        </Link>
        <div className="flex flex-wrap gap-2">
          <a href={passport.links.bags} target="_blank" rel="noreferrer" className="btn-ghost min-h-[34px] px-3 text-xs">Bags.fm <ExternalLink size={12} /></a>
          <a href={passport.links.solscanMint} target="_blank" rel="noreferrer" className="btn-ghost min-h-[34px] px-3 text-xs">Solscan <ExternalLink size={12} /></a>
          <Link href={`/embed/trust/${passport.mint}`} target="_blank" className="btn-ghost min-h-[34px] px-3 text-xs">Embed <ExternalLink size={12} /></Link>
          {passport.links.dexScreener && <a href={passport.links.dexScreener} target="_blank" rel="noreferrer" className="btn-ghost min-h-[34px] px-3 text-xs">Dex <ExternalLink size={12} /></a>}
          {passport.links.meteora && <a href={passport.links.meteora} target="_blank" rel="noreferrer" className="btn-ghost min-h-[34px] px-3 text-xs">Meteora <ExternalLink size={12} /></a>}
        </div>
      </div>

      <div className="mb-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <PassportVerdict passport={passport} />
        <aside className="card p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#26aa68] via-[#7a55c6] to-[#ff6a84] font-mono text-lg font-black text-white">
              {passport.token.imageUrl ? <img src={passport.token.imageUrl} alt="" className="h-full w-full object-cover" /> : passport.token.symbol.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-mono text-base font-black leading-none text-white">{passport.token.name}</h2>
              <p className="mt-1 truncate font-mono text-xs text-white/38">${passport.token.symbol} - {shortWallet(passport.mint)}</p>
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            {Object.entries(passport.sourceLabels).slice(0, 7).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-3 rounded-lg border border-white/8 bg-white/[0.035] px-2 py-1.5 text-xs">
                <span className="font-body text-white/35">{key}</span>
                <span className="max-w-[190px] truncate text-right font-mono text-white/65">{value}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-4">
          <PassportProofChecklist rows={passport.evidence} />
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <section className="card p-4">
            <div className="mb-4 flex items-center gap-2">
              <ShieldAlert size={17} className="text-[#ffcc7a]" />
              <h2 className="font-mono text-base font-black text-white">Risk Labels</h2>
            </div>
            <div className="space-y-2">
              {passport.riskLabels.length ? passport.riskLabels.map((risk) => (
                <div key={risk.id} className={cn("rounded-2xl border p-3", severityTone(risk.severity))}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-fun text-sm font-black text-white">{risk.label}</p>
                    <span className="rounded-lg border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-fun font-black uppercase">{risk.severity}</span>
                  </div>
                  <p className="mt-1 text-[11px] font-fun text-white/35">Evidence: {risk.evidenceIds.join(", ")}</p>
                </div>
              )) : (
                <div className="rounded-2xl border border-[#00ff88]/18 bg-[#00ff88]/8 p-3 text-sm font-fun font-black text-[#69d99a]">
                  No major risk flags
                </div>
              )}
            </div>
          </section>

          <section className="card p-4">
            <h2 className="font-mono text-base font-black text-white">Score Breakdown</h2>
            <p className="mt-1 text-xs font-fun leading-5 text-white/38">{String(passport.scoreBreakdown.formula ?? "")}</p>
            <div className="mt-4 space-y-3">
              {numericBreakdown.map(([key, value]) => (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs font-fun">
                    <span className="text-white/45">{scoreLabel(key)}</span>
                    <span className="font-mono font-black text-white">{String(value)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#00ff88] via-[#b48dff] to-[#ffcc7a]" style={{ width: `${Math.min(100, Number(value) * 6)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-4">
            <h2 className="font-mono text-base font-black text-white">Public Embed</h2>
            <p className="mt-1 text-xs font-fun leading-5 text-white/38">
              Share this trust card inside Bags tools, launch pages, bots, or community docs.
            </p>
            <code className="mt-4 block overflow-x-auto rounded-2xl border border-white/8 bg-black/24 p-3 font-mono text-[11px] leading-5 text-[#69d99a]">
              {`<iframe src="/embed/trust/${passport.mint}" width="420" height="520"></iframe>`}
            </code>
            <Link href={`/embed/trust/${passport.mint}`} target="_blank" className="mt-3 inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-[#00ff88]/20 bg-[#00ff88]/10 px-3 text-xs font-fun font-black text-[#00ff88]">
              Open embed card <ExternalLink size={12} />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
