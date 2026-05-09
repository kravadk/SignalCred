"use client";

import { useState } from "react";
import Link from "next/link";
import { BadgeCheck, ChevronDown, ShieldAlert } from "lucide-react";

type ProofRankedPostCardProps = {
  linkedMint: string;
  postType: string;
  proof?: {
    socialScore: number | null;
    milestonesCompleted: number | null;
    milestonesTotal: number | null;
    campaignCount: number;
    campaignBudgetUsdt: number;
  };
};

export function ProofRankedPostCard({ linkedMint, postType, proof }: ProofRankedPostCardProps) {
  const [open, setOpen] = useState(false);
  const official = postType === "official";
  const score = proof?.socialScore ?? null;
  const proofReady = score != null;

  return (
    <div className="mt-3 w-full max-w-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${
          official ? "bg-emerald-100 text-emerald-800" : "bg-indigo-100 text-indigo-800"
        }`}>
          {official ? <BadgeCheck size={12} /> : <ShieldAlert size={12} />}
          {official ? "creator/admin proof" : "token-linked proof"}
        </span>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-600">
          score {proofReady ? score : "loading"}
        </span>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="ml-auto inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-500 hover:text-slate-950"
          aria-expanded={open}
        >
          {open ? "Hide proof details" : "Show proof details"}
          <ChevronDown size={13} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
        </button>
      </div>
      {open && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-2">
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-600">
            milestones {proof?.milestonesCompleted ?? "-"}/{proof?.milestonesTotal ?? "-"}
          </span>
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#15865f]">
            campaigns {proof?.campaignCount ?? 0}{proof?.campaignBudgetUsdt ? ` / $${proof.campaignBudgetUsdt.toLocaleString()}` : ""}
          </span>
          <Link href={`/api/tokens/${linkedMint}/social-events`} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-500 hover:text-slate-950">
            Explain score
          </Link>
          <p className="basis-full text-[11px] font-semibold leading-5 text-slate-500">
            Formula: official proof + unique wallets + fee alignment + milestones + capped reactions - spam/risk penalties.
          </p>
        </div>
      )}
    </div>
  );
}
