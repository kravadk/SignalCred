"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";

export default function TokenError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="focus-shell">
      <Link
        href="/token"
        className="mb-4 inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-fun font-black text-white/62 transition-colors hover:text-white"
      >
        <ArrowLeft size={15} />
        All tokens
      </Link>
      <div className="card p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#ffb84d]/20 bg-[#ffb84d]/10 text-[#ffb84d]">
          <AlertTriangle size={26} />
        </div>
        <h1 className="font-display text-4xl text-white">Token page unavailable</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm font-fun leading-6 text-white/45">
          We could not load the full token context right now. Try again, or return to the index and open another Bags token.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={reset} className="btn-primary inline-flex min-h-[44px] items-center gap-2 px-5 text-sm">
            <RefreshCw size={15} />
            Retry
          </button>
          <Link href="/token" className="btn-ghost inline-flex min-h-[44px] items-center px-5 text-sm">
            Token index
          </Link>
        </div>
      </div>
    </div>
  );
}
