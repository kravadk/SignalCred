"use client";

import { useEffect, useState } from "react";
import { Clock3, ExternalLink, Loader2, ReceiptText } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";

type ClaimEvent = {
  id: string;
  walletShort: string;
  isCreator: boolean;
  amountFormatted: string;
  signature?: string | null;
  timestamp?: string | null;
  href?: string | null;
  source: string;
};

type ClaimsResponse = {
  events: ClaimEvent[];
  count: number;
  hasMore: boolean;
  claimAction?: {
    status: string;
    endpoint: string;
    auth: string;
    explorerReceipt: string;
    message: string;
  };
  source: string;
};

export function ClaimHistoryCard({ mint }: { mint: string }) {
  const [data, setData] = useState<ClaimsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/tokens/${mint}/claims?limit=12`, { signal: controller.signal, cache: "no-store" })
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
      <div className="card p-4">
        <div className="flex items-center gap-2 text-xs font-fun text-white/42">
          <Loader2 size={14} className="animate-spin" />
          Loading Bags claim events...
        </div>
      </div>
    );
  }

  const events = data?.events ?? [];

  return (
    <div className="card p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-fun font-black text-white">Claim History</p>
          <p className="text-xs font-fun text-white/38">Real Bags fee-share claim events with explorer links.</p>
        </div>
        <span className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-fun font-black text-white/45">
          {data?.source ?? "bags_api"}
        </span>
      </div>

      {data?.claimAction && (
        <div className="mb-3 rounded-2xl border border-[#69d99a]/18 bg-[#69d99a]/8 p-3">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-fun font-black uppercase text-[#69d99a]">
            <ReceiptText size={13} />
            Claim UX state: {data.claimAction.status.replace(/_/g, " ")}
          </div>
          <p className="text-xs font-fun leading-5 text-white/42">{data.claimAction.message}</p>
          <p className="mt-1 break-all font-mono text-[10px] text-white/28">
            {data.claimAction.auth} / {data.claimAction.explorerReceipt}
          </p>
        </div>
      )}

      {events.length === 0 ? (
        <div className="rounded-2xl border border-[#ffb84d]/18 bg-[#ffb84d]/8 p-4 text-center">
          <ReceiptText size={20} className="mx-auto mb-2 text-[#ffcc7a]" />
          <p className="text-sm font-fun font-black text-white">No claim events indexed yet</p>
          <p className="mt-1 text-xs font-fun text-white/35">This is a real pending state, not a zero-filled timeline.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => {
            const content = (
              <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.035] p-3 transition-colors hover:bg-white/[0.06]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#00ff88]/10 text-[#00ff88]">
                  <ReceiptText size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="font-mono text-sm font-black text-white">{event.amountFormatted}</p>
                    {event.isCreator && (
                      <span className="rounded-md border border-[#b48dff]/20 bg-[#b48dff]/10 px-1.5 py-0.5 text-[10px] font-fun font-black text-[#cdb6ff]">
                        creator
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] font-fun text-white/38">
                    {event.walletShort} {event.timestamp ? `/${formatTimeAgo(event.timestamp)}` : "/ timestamp pending"}
                  </p>
                </div>
                {event.href ? <ExternalLink size={13} className="shrink-0 text-white/30" /> : <Clock3 size={13} className="shrink-0 text-white/24" />}
              </div>
            );
            return event.href ? (
              <a key={event.id} href={event.href} target="_blank" rel="noreferrer">{content}</a>
            ) : (
              <div key={event.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
