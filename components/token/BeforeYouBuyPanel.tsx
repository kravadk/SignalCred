"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PrivateQvacReview } from "@/components/qvac/PrivateQvacReview";
import type { TokenPassportResponse } from "@/lib/trust-passport";

export function BeforeYouBuyPanel({ mint }: { mint: string }) {
  const [passport, setPassport] = useState<TokenPassportResponse | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/tokens/${mint}/passport`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (alive) setPassport(body?.passport ?? body ?? null);
      })
      .catch(() => {
        if (alive) setPassport(null);
      });
    return () => {
      alive = false;
    };
  }, [mint]);

  const evidence = passport?.evidence ?? [];
  const rowStatus = (id: string) => evidence.find((row) => row.id === id)?.status ?? "pending";
  const rows = [
    { label: "Bags origin", status: rowStatus("bags-source") },
    { label: "Pool verified", status: rowStatus("pool-proof") },
    { label: "Creator proof", status: rowStatus("creator-proof") },
    { label: "Fee signal", status: rowStatus("fee-loop") },
    { label: "Claim trail", status: rowStatus("claim-receipts") },
    { label: "Social signal", status: rowStatus("social-proof") },
  ];
  const riskCount = passport?.riskLabels.length ?? 0;
  const statusText = (status: string) => {
    if (status === "verified" || status === "ok") return "Verified";
    if (status === "warming" || status === "pending") return "Collecting";
    return "Review";
  };
  const statusClass = (status: string) => {
    if (status === "verified" || status === "ok") return "bg-[#00ff88]/10 text-[#00ff88]";
    if (status === "warming" || status === "pending") return "bg-[#ffb84d]/10 text-[#ffcc7a]";
    return "bg-white/[0.055] text-white/42";
  };

  return (
    <section className="card p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-xl leading-none text-white">Before You Buy</p>
          <p className="mt-1 text-xs font-body font-semibold text-white/52">A compact trust read before opening a position.</p>
        </div>
        <Link
          href={`/passport/${mint}`}
          className="inline-flex min-h-[30px] items-center gap-1 rounded-md border border-[#00ff88]/18 bg-[#00ff88]/8 px-2 text-[11px] font-body font-black text-[#69d99a]"
        >
          Passport <ExternalLink size={11} />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {rows.map((row) => {
          return (
            <div key={row.label} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.035] px-2 py-2">
              <span className="truncate text-[11px] font-body font-bold text-white/68">{row.label}</span>
              <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-body font-black ${statusClass(row.status)}`}>
                {statusText(row.status)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-lg border border-white/8 bg-[#070911]/65 px-2 py-2 text-xs">
        <span className="font-body text-white/58">SignalCred score</span>
        <span className="font-mono font-black text-white">{passport?.trustScore ?? "loading"}{passport ? " / 100" : ""}</span>
      </div>
      <div className="mt-1 flex items-center justify-between rounded-lg border border-white/8 bg-[#070911]/65 px-2 py-2 text-xs">
        <span className="font-body text-white/58">Risk review</span>
        <span className={riskCount ? "font-mono font-black text-[#ffcc7a]" : "font-mono font-black text-[#00ff88]"}>
          {passport ? (riskCount ? `${riskCount} review` : "clear") : "loading"}
        </span>
      </div>
      {passport && (
        <div className="mt-2">
          <PrivateQvacReview passport={passport} mode="before-buy" compact />
        </div>
      )}
    </section>
  );
}
