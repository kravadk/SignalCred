"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, ExternalLink, Loader2 } from "lucide-react";

type Milestone = {
  id: string;
  label: string;
  status: "completed" | "pending";
  value: string;
  source: string;
  href?: string | null;
};

type MilestonesResponse = {
  milestones: Milestone[];
  completed: number;
  total: number;
};

export function MilestonesCard({ mint }: { mint: string }) {
  const [data, setData] = useState<MilestonesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/tokens/${mint}/milestones`, { signal: controller.signal, cache: "no-store" })
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(() => setData(null))
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [mint]);

  if (loading) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2 text-xs font-fun text-white/42">
          <Loader2 size={14} className="animate-spin" />
          Loading real milestones...
        </div>
      </div>
    );
  }

  const milestones = data?.milestones ?? [];

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-fun font-black text-white">Community Milestones</p>
          <p className="text-xs font-fun text-white/38">Derived only from Bags, fees, posts, holders, and campaigns.</p>
        </div>
        <span className="rounded-xl border border-[#00ff88]/14 bg-[#00ff88]/8 px-2.5 py-1 text-xs font-fun font-black text-[#69d99a]">
          {data?.completed ?? 0}/{data?.total ?? milestones.length}
        </span>
      </div>

      <div className="space-y-2">
        {milestones.map((item) => {
          const complete = item.status === "completed";
          const content = (
            <div className="flex items-start gap-3 rounded-xl border border-transparent bg-white/[0.03] p-3 shadow-[inset_0_0_0_1px_rgba(180,141,255,0.09)] transition-colors hover:bg-white/[0.05] hover:shadow-[inset_0_0_0_1px_rgba(180,141,255,0.16)]">
              <div className="mt-0.5 shrink-0">
                {complete ? <CheckCircle2 size={15} className="text-[#00ff88]" /> : <Clock3 size={15} className="text-[#ffcc7a]" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-fun font-black text-white">{item.label}</p>
                  <span className="rounded-md border border-[#b48dff]/10 bg-black/20 px-1.5 py-0.5 text-[10px] font-fun font-black uppercase text-white/35">
                    {item.source}
                  </span>
                </div>
                <p className="mt-0.5 truncate font-mono text-[11px] text-white/48">{item.value}</p>
              </div>
              {item.href && <ExternalLink size={12} className="mt-1 shrink-0 text-white/28" />}
            </div>
          );
          return item.href ? (
            <a key={item.id} href={item.href} target="_blank" rel="noreferrer">{content}</a>
          ) : (
            <div key={item.id}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
