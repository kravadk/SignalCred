"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="focus-shell flex min-h-[70vh] items-center justify-center">
      <div className="card max-w-xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#ffb84d]/20 bg-[#ffb84d]/10 text-[#ffb84d]">
          <AlertTriangle size={26} />
        </div>
        <h1 className="font-display text-4xl text-white">Something failed to load</h1>
        <p className="mt-2 text-sm font-fun leading-6 text-white/45">
          The app could not finish this request. This is usually a live API, wallet, or cache issue, not a broken token.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-white/25">Error digest: {error.digest}</p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={reset}
            className="btn-primary inline-flex min-h-[44px] items-center gap-2 px-5 text-sm"
          >
            <RefreshCw size={15} />
            Retry
          </button>
          <Link href="/token" className="btn-ghost inline-flex min-h-[44px] items-center px-5 text-sm">
            Token index
          </Link>
          <Link href="/fees" className="btn-ghost inline-flex min-h-[44px] items-center px-5 text-sm">
            Fees
          </Link>
        </div>
      </div>
    </div>
  );
}
