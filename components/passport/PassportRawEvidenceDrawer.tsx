"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { TrustEvidenceRow } from "@/lib/trust-passport";
import { cn } from "@/lib/utils";

export function PassportRawEvidenceDrawer({ row }: { row: TrustEvidenceRow }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full text-right">
      <button
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-[30px] items-center gap-1 rounded-lg border border-white/10 bg-black/18 px-2 text-[10px] font-fun font-black text-white/42 transition-colors hover:text-white"
      >
        Raw
        <ChevronDown size={11} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <pre className="mt-2 max-w-[min(78vw,520px)] overflow-x-auto rounded-xl border border-white/10 bg-black/35 p-3 text-left text-[10px] leading-5 text-white/55">
{JSON.stringify({
  id: row.id,
  source: row.source,
  status: row.status,
  value: row.value,
  timestamp: row.timestamp,
  evidenceUrl: row.evidenceUrl,
  rawReference: row.rawReference ?? null,
}, null, 2)}
        </pre>
      )}
    </div>
  );
}
