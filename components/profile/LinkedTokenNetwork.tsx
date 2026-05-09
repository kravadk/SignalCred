import Link from "next/link";
import { ExternalLink, Network } from "lucide-react";
import { formatLamports, shortWallet } from "@/lib/utils";
import { feeVelocityValue } from "@/lib/fee-velocity-display";

type GraphToken = {
  mint: string;
  name: string;
  symbol: string;
  imageUrl?: string | null;
  passportHref: string;
  lifetimeFeesLamports: number;
  feeVelocity24hLamports?: number | null;
  feeVelocityStatus: "active" | "pending" | "unavailable";
  poolVerified: boolean;
  creatorProof: boolean;
  hasMarketPair: boolean;
  riskLabels: string[];
};

type LinkedWallet = {
  wallet: string;
  role: "creator" | "admin" | "claimer" | "campaign_funder";
  tokenCount: number;
};

function roleTone(role: LinkedWallet["role"]) {
  if (role === "creator") return "border-[#00ff88]/18 bg-[#00ff88]/8 text-[#69d99a]";
  if (role === "admin") return "border-[#b48dff]/18 bg-[#b48dff]/8 text-[#cdb6ff]";
  if (role === "campaign_funder") return "border-[#26a17b]/18 bg-[#26a17b]/8 text-[#50d8a4]";
  return "border-[#ffb84d]/18 bg-[#ffb84d]/8 text-[#ffcc7a]";
}

export function LinkedTokenNetwork({ tokens, wallets }: { tokens: GraphToken[]; wallets: LinkedWallet[] }) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Network size={16} className="text-[#cdb6ff]" />
            <h2 className="font-display text-2xl text-white">Linked Token Network</h2>
          </div>
          <p className="text-xs font-fun leading-5 text-white/38">
            Creator-linked tokens with direct Trust Passport links. Wallet roles come from creator/admin, claim, and campaign proof.
          </p>
        </div>
        <span className="rounded-xl border border-[#b48dff]/16 bg-[#b48dff]/8 px-3 py-1 text-xs font-fun font-black text-[#cdb6ff]">
          {tokens.length} tokens
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {wallets.length ? wallets.slice(0, 10).map((wallet) => (
          <a
            key={`${wallet.wallet}-${wallet.role}`}
            href={`https://solscan.io/account/${wallet.wallet}`}
            target="_blank"
            rel="noreferrer"
            className={`rounded-xl border px-3 py-1.5 text-xs font-fun font-black ${roleTone(wallet.role)}`}
          >
            {wallet.role} {shortWallet(wallet.wallet)} ({wallet.tokenCount})
          </a>
        )) : (
          <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-fun text-white/38">
            No linked wallet proof yet
          </span>
        )}
      </div>

      <div className="space-y-2">
        {tokens.length ? tokens.map((token) => (
          <div key={token.mint} className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#26aa68] via-[#7a55c6] to-[#ff6a84] font-display text-white">
                {token.imageUrl ? <img src={token.imageUrl} alt="" className="h-full w-full object-cover" /> : token.symbol.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-fun font-black text-white">{token.name}</p>
                  <span className="font-mono text-xs text-white/35">${token.symbol}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {token.creatorProof && <span className="rounded-lg border border-[#00ff88]/16 bg-[#00ff88]/8 px-2 py-0.5 text-[10px] font-fun font-black text-[#69d99a]">creator</span>}
                  {token.poolVerified && <span className="rounded-lg border border-[#b48dff]/16 bg-[#b48dff]/8 px-2 py-0.5 text-[10px] font-fun font-black text-[#cdb6ff]">pool</span>}
                  {token.hasMarketPair && <span className="rounded-lg border border-[#35a8ff]/16 bg-[#35a8ff]/8 px-2 py-0.5 text-[10px] font-fun font-black text-[#7dc7ff]">market</span>}
                  {token.riskLabels.slice(0, 2).map((risk) => (
                    <span key={risk} className="rounded-lg border border-[#ffb84d]/16 bg-[#ffb84d]/8 px-2 py-0.5 text-[10px] font-fun font-black text-[#ffcc7a]">{risk}</span>
                  ))}
                </div>
              </div>
              <div className="hidden min-w-[150px] text-right md:block">
                <p className="font-mono text-xs text-[#00ff88]">{formatLamports(token.lifetimeFeesLamports)}</p>
                <p className="mt-1 text-[11px] font-fun text-[#ffcc7a]">{feeVelocityValue(token.feeVelocityStatus, token.feeVelocity24hLamports)}</p>
              </div>
              <Link href={token.passportHref} className="inline-flex min-h-[34px] shrink-0 items-center gap-1.5 rounded-xl border border-[#00ff88]/18 bg-[#00ff88]/8 px-3 text-xs font-fun font-black text-[#69d99a] hover:bg-[#00ff88]/12">
                Passport <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        )) : (
          <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 text-sm font-fun text-white/35">
            No indexed creator tokens yet.
          </div>
        )}
      </div>
    </section>
  );
}
