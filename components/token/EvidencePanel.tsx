"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, ExternalLink, Loader2, ShieldCheck, XCircle } from "lucide-react";

interface EvidenceRow {
  id?: string;
  label: string;
  ok: boolean;
  status?: "ok" | "pending" | "unavailable" | "warning";
  value: string;
  source: string;
  href?: string | null;
  timestamp?: string | null;
  description?: string;
}

interface EvidenceResponse {
  rows: EvidenceRow[];
  message?: string;
}

function rowTone(status: EvidenceRow["status"], ok: boolean) {
  if (status === "unavailable") return "bg-[#ff624e]/7";
  if (status === "warning") return "bg-[#ffb84d]/7";
  if (status === "pending" || !ok) return "bg-[#ffb84d]/6";
  return "bg-[#00ff88]/6";
}

function statusLabel(row: EvidenceRow) {
  if (row.status) return row.status;
  return row.ok ? "ok" : "pending";
}

function StatusIcon({ status }: { status: string }) {
  if (status === "ok") return <CheckCircle2 size={16} className="text-[#00ff88]" />;
  if (status === "unavailable") return <XCircle size={16} className="text-[#ff624e]" />;
  if (status === "warning") return <AlertTriangle size={16} className="text-[#ffb84d]" />;
  return <Clock3 size={16} className="text-[#ffcc7a]" />;
}

export function EvidencePanel({ mint }: { mint: string }) {
  const [data, setData] = useState<EvidenceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadEvidence() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/tokens/${mint}/evidence`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Evidence API returned ${res.status}`);
        setData(await res.json());
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Evidence unavailable");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadEvidence();
    return () => controller.abort();
  }, [mint]);

  const rows = data?.rows ?? [];

  return (
    <div className="card relative overflow-hidden p-5">
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#00ff88]/24 to-transparent" />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl leading-none text-white">Why this token is trusted</p>
          <p className="mt-1 text-xs font-body font-semibold text-white/48">Every proof row links to Bags, Solscan, DexScreener, or Meteora where possible.</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[#00ff88]/16 bg-[#00ff88]/8 px-2.5 py-1 text-[10px] font-body font-black text-[#00ff88]">
          <ShieldCheck size={12} /> Evidence
        </span>
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="h-[64px] rounded-xl border border-[#b48dff]/10 bg-white/[0.035] p-3">
              <Loader2 size={14} className="animate-spin text-white/35" />
              <div className="mt-2 h-2 w-20 rounded bg-white/8" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-2 rounded-xl border border-[#ffb84d]/18 bg-[#ffb84d]/8 px-3 py-3 text-xs font-body font-semibold text-[#ffcc7a]">
          <AlertTriangle size={14} />
          Evidence is loading slowly. Market panel remains usable.
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="space-y-2">
            {rows.map((row) => {
              const status = statusLabel(row);
              const className = `group flex min-w-0 items-start gap-3 rounded-xl border border-transparent p-3 shadow-[inset_0_0_0_1px_rgba(180,141,255,0.09)] transition-colors ${rowTone(row.status, row.ok)} ${row.href ? "hover:bg-white/[0.055] hover:shadow-[inset_0_0_0_1px_rgba(180,141,255,0.16)]" : ""}`;
              const content = (
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    <StatusIcon status={status} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-body font-black text-white">{row.label}</p>
                      <span className="rounded-lg border border-[#b48dff]/10 bg-white/[0.045] px-2 py-0.5 text-[10px] font-body font-black uppercase text-white/48">
                        {row.source}
                      </span>
                      <span className="rounded-lg border border-[#b48dff]/10 bg-black/20 px-2 py-0.5 text-[10px] font-body font-black uppercase text-white/42">
                        {status}
                      </span>
                    </div>
                    <p className="mt-1 break-words font-mono text-[12px] text-white/72">{row.value}</p>
                    {row.description && <p className="mt-1 text-[11px] font-body font-semibold leading-5 text-white/44">{row.description}</p>}
                  </div>
                  {row.href && (
                    <div className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#b48dff]/12 bg-white/[0.045] px-2 py-1 text-[10px] font-body font-black text-white/55 group-hover:text-[#69d99a]">
                      Open <ExternalLink size={11} />
                    </div>
                  )}
                </div>
              );
              return row.href ? (
                <a
                  key={row.id ?? `${row.label}-${row.source}`}
                  href={row.href}
                  target="_blank"
                  rel="noreferrer"
                  className={className}
                >
                  {content}
                </a>
              ) : (
                <div key={row.id ?? `${row.label}-${row.source}`} className={className}>
                  {content}
                </div>
              );
            })}
          </div>
          {data?.message && (
            <p className="mt-3 text-[11px] font-body font-semibold leading-5 text-white/38">{data.message}</p>
          )}
        </>
      )}
    </div>
  );
}
