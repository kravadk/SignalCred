import { AlertTriangle, CheckCircle2, Clock3, ExternalLink, ShieldCheck, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrustEvidenceRow, TrustEvidenceStatus } from "@/lib/trust-passport";
import { PassportRawEvidenceDrawer } from "@/components/passport/PassportRawEvidenceDrawer";

function statusTone(status: TrustEvidenceStatus) {
  if (status === "verified") return "border-[#00ff88]/18 bg-[#00ff88]/7 text-[#69d99a]";
  if (status === "warming") return "border-[#ffb84d]/18 bg-[#ffb84d]/8 text-[#ffcc7a]";
  if (status === "warning") return "border-[#ffb84d]/22 bg-[#ffb84d]/10 text-[#ffcc7a]";
  if (status === "unavailable") return "border-[#ff624e]/18 bg-[#ff624e]/8 text-[#ff9a87]";
  return "border-white/10 bg-white/5 text-white/42";
}

function StatusIcon({ status }: { status: TrustEvidenceStatus }) {
  if (status === "verified") return <CheckCircle2 size={16} className="text-[#00ff88]" />;
  if (status === "warming") return <Clock3 size={16} className="text-[#ffcc7a]" />;
  if (status === "warning") return <AlertTriangle size={16} className="text-[#ffb84d]" />;
  if (status === "unavailable") return <XCircle size={16} className="text-[#ff624e]" />;
  return <ShieldCheck size={16} className="text-white/35" />;
}

export function PassportProofChecklist({ rows }: { rows: TrustEvidenceRow[] }) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl leading-none text-white">Proof Checklist</h2>
          <p className="mt-2 text-sm font-fun leading-6 text-white/42">
            Each row shows source, status, timestamp, and where the evidence can be checked.
          </p>
        </div>
        <span className="rounded-xl border border-[#00ff88]/16 bg-[#00ff88]/8 px-3 py-1 text-[10px] font-fun font-black uppercase text-[#00ff88]">
          evidence-first
        </span>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className={cn("rounded-2xl border p-3 shadow-[inset_0_0_0_1px_rgba(180,141,255,0.07)]", statusTone(row.status))}>
            <div className="flex min-w-0 gap-3">
              <div className="mt-0.5 shrink-0">
                <StatusIcon status={row.status} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-fun text-sm font-black text-white">{row.label}</p>
                  <span className="rounded-lg border border-white/10 bg-black/18 px-2 py-0.5 text-[10px] font-fun font-black uppercase text-white/45">
                    {row.source}
                  </span>
                  <span className="rounded-lg border border-white/10 bg-black/18 px-2 py-0.5 text-[10px] font-fun font-black uppercase">
                    {row.status}
                  </span>
                </div>
                <p className="mt-1 break-words font-mono text-xs text-white/72">{row.value}</p>
                <p className="mt-1 text-[11px] font-fun leading-5 text-white/40">{row.explanation}</p>
                {row.timestamp && (
                  <p className="mt-1 text-[10px] font-mono text-white/28">{row.timestamp}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {row.evidenceUrl && (
                  <a
                    href={row.evidenceUrl}
                    target={row.evidenceUrl.startsWith("/") ? undefined : "_blank"}
                    rel={row.evidenceUrl.startsWith("/") ? undefined : "noreferrer"}
                    className="inline-flex min-h-[30px] items-center gap-1 rounded-lg border border-white/10 bg-white/[0.045] px-2 text-[10px] font-fun font-black text-white/55 hover:text-[#69d99a]"
                  >
                    Open <ExternalLink size={11} />
                  </a>
                )}
                <PassportRawEvidenceDrawer row={row} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
