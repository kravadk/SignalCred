"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FeesDashboard } from "@/components/fees/FeesDashboard";
import { CreatorReputationHub } from "@/components/fees/CreatorReputationHub";
import { CircleDollarSign, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "reputation" | "claimable";

function FeesPageInner() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>((searchParams.get("tab") as Tab) ?? "reputation");

  return (
    <div>
      {/* Tab switcher — sits above the FeesDashboard header */}
      <div className="focus-shell pb-0">
        <div className="flex w-fit gap-1 rounded-xl border border-white/[0.055] bg-[#100b22]/82 p-1">
          <button onClick={() => setTab("reputation")}
            className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-fun font-bold transition-all",
              tab === "reputation" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70")}>
            <ShieldCheck size={13} /> Reputation
          </button>
          <button onClick={() => setTab("claimable")}
            className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-fun font-bold transition-all",
              tab === "claimable" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70")}>
            <CircleDollarSign size={13} /> My Claimable Fees
          </button>
        </div>
      </div>

      {tab === "reputation" && <CreatorReputationHub />}
      {tab === "claimable" && <FeesDashboard />}
    </div>
  );
}

export default function FeesPage() {
  return (
    <Suspense>
      <FeesPageInner />
    </Suspense>
  );
}
