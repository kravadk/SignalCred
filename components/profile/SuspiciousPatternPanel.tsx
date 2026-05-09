import { AlertTriangle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Pattern = {
  id: string;
  label: string;
  severity: "low" | "medium" | "high";
  evidence: string[];
};

function tone(severity: Pattern["severity"]) {
  if (severity === "high") return "border-[#ff624e]/22 bg-[#ff624e]/10 text-[#ff9a87]";
  if (severity === "medium") return "border-[#ffb84d]/22 bg-[#ffb84d]/10 text-[#ffcc7a]";
  return "border-white/10 bg-white/5 text-white/45";
}

export function SuspiciousPatternPanel({ patterns }: { patterns: Pattern[] }) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle size={16} className="text-[#ffcc7a]" />
        <h2 className="font-display text-2xl text-white">Suspicious Patterns</h2>
      </div>
      <div className="space-y-2">
        {patterns.length ? patterns.map((pattern) => (
          <div key={pattern.id} className={cn("rounded-2xl border p-3", tone(pattern.severity))}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-fun text-sm font-black text-white">{pattern.label}</p>
              <span className="rounded-lg border border-white/10 bg-black/18 px-2 py-0.5 text-[10px] font-fun font-black uppercase">
                {pattern.severity}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-[11px] font-mono text-white/35">
              {pattern.evidence.length ? pattern.evidence.join(", ") : "rule-based evidence unavailable"}
            </p>
          </div>
        )) : (
          <div className="rounded-2xl border border-[#00ff88]/18 bg-[#00ff88]/8 p-3">
            <div className="flex items-center gap-2 text-sm font-fun font-black text-[#69d99a]">
              <ShieldCheck size={15} />
              No suspicious creator-level patterns detected
            </div>
            <p className="mt-1 text-xs font-fun text-white/38">
              This means no current rule fired. It is not a financial endorsement.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
