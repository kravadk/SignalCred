"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BadgeCheck, Gift, ReceiptText, ShieldCheck } from "lucide-react";

type SocialEvent = {
  id: string;
  type: string;
  status: string;
  label: string;
  description: string;
  source: string;
  href: string | null;
  weight: number;
};

type SocialEventsResponse = {
  socialScore: number;
  scoreBreakdown: Record<string, unknown>;
  events: SocialEvent[];
  penalties: Array<{ id: string; label: string; severity: string; value: number; source: string }>;
  rankingPolicy: string;
  noFakeData: true;
};

function iconFor(type: string, status: string) {
  if (status === "pending") return <AlertTriangle size={14} />;
  if (type === "campaign") return <Gift size={14} />;
  if (type === "claim_receipt" || type === "fee_event") return <ReceiptText size={14} />;
  return <ShieldCheck size={14} />;
}

export function SocialValidationPanel({ mint }: { mint: string }) {
  const [data, setData] = useState<SocialEventsResponse | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/tokens/${mint}/social-events`, { cache: "no-store", signal: controller.signal })
      .then((res) => res.ok ? res.json() : null)
      .then((json) => setData(json))
      .catch(() => {});
    return () => controller.abort();
  }, [mint]);

  if (!data) {
    return (
      <section className="border-b border-slate-200 bg-white px-5 py-4">
        <p className="text-sm font-black text-slate-950">Social validation engine</p>
        <p className="mt-1 text-sm font-semibold text-slate-400">Loading proof-ranked social events...</p>
      </section>
    );
  }

  return (
    <section className="border-b border-slate-200 bg-white px-5 py-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase text-emerald-700">
            <BadgeCheck size={13} /> Proof-ranked
          </div>
          <h2 className="text-lg font-black text-slate-950">Social validation engine</h2>
          <p className="mt-1 max-w-xl text-sm font-semibold leading-6 text-slate-500">
            {data.rankingPolicy}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Social score</p>
          <p className="font-mono text-2xl font-black text-slate-950">{data.socialScore}</p>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {data.events.slice(0, 6).map((event) => {
          const content = (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 transition hover:bg-white">
              <div className="mb-1 flex items-center gap-2">
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-xl ${
                  event.status === "verified" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {iconFor(event.type, event.status)}
                </span>
                <p className="truncate text-sm font-black text-slate-950">{event.label}</p>
                <span className="ml-auto text-[10px] font-black uppercase text-slate-400">{event.status}</span>
              </div>
              <p className="line-clamp-2 text-xs font-semibold leading-5 text-slate-500">{event.description}</p>
              <p className="mt-1 truncate font-mono text-[10px] text-slate-400">{event.source}</p>
            </div>
          );
          return event.href ? (
            <Link key={event.id} href={event.href} target={event.href.startsWith("https://") ? "_blank" : undefined}>
              {content}
            </Link>
          ) : (
            <div key={event.id}>{content}</div>
          );
        })}
      </div>

      {data.penalties.length > 0 && (
        <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2">
          <p className="text-xs font-black uppercase text-amber-700">Risk penalties</p>
          <p className="mt-1 text-xs font-semibold text-amber-700">
            {data.penalties.map((penalty) => `${penalty.label}: ${penalty.value}`).join(" / ")}
          </p>
        </div>
      )}
    </section>
  );
}
