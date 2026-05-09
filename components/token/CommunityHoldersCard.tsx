"use client";
import { useState, useEffect } from "react";
import { Users, MessageSquare } from "lucide-react";
import Link from "next/link";
import { formatTimeAgo, shortWallet } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Post {
  id: string;
  authorWallet: string | null;
  postType: string;
  content: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string | Date;
}

interface Holder { rank: number; address: string; amount: number; pct: number; label: string; }
interface Distribution { whales: number; mid: number; retail: number; }

const POST_TYPE_COLORS: Record<string, string> = {
  launch: "pill-launch", update: "pill-update", analysis: "pill-analysis",
  meme: "pill-meme", trade: "pill-trade",
};
const AVATAR_GRADS = ["from-[#7a55c6] to-[#ff6a84]", "from-[#26aa68] to-[#7a55c6]", "from-[#ff624e] to-[#ff6a84]"];
function shortAddr(a: string) { return a.slice(0, 4) + "…" + a.slice(-4); }

export function CommunityHoldersCard({
  mint, symbol, socialPosts,
}: {
  mint: string;
  symbol: string;
  socialPosts: Post[];
}) {
  const [tab, setTab] = useState<"community" | "holders">("community");
  const [holders, setHolders] = useState<Holder[]>([]);
  const [dist, setDist] = useState<Distribution | null>(null);
  const [totalHolders, setTotalHolders] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [holdersLoaded, setHoldersLoaded] = useState(false);

  useEffect(() => {
    if (tab === "holders" && !holdersLoaded) {
      fetch(`/api/tokens/${mint}/holders`)
        .then(r => r.json())
        .then(d => {
          setHolders(d.holders ?? []);
          setDist(d.distribution ?? null);
          setTotalHolders(d.totalHolders ?? 0);
          setHoldersLoaded(true);
        });
    }
  }, [tab, mint, holdersLoaded]);

  const visible = expanded ? holders : holders.slice(0, 5);

  return (
    <div className="card relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#7a55c6]/5 to-transparent pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7a55c6]/30 to-transparent" />

      <div className="relative">
        {/* Tab header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-0">
          <div className="flex gap-1 p-1 rounded-xl bg-white/6 border border-white/8">
            <button
              onClick={() => setTab("community")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-fun font-bold transition-all",
                tab === "community" ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"
              )}
            >
              <MessageSquare size={11} /> Community
              {socialPosts.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#7a55c6]/40 text-[9px] flex items-center justify-center text-white/70">
                  {socialPosts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("holders")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-fun font-bold transition-all",
                tab === "holders" ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"
              )}
            >
              <Users size={11} /> Holders
              {totalHolders > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#ffb84d]/30 text-[9px] flex items-center justify-center text-[#ffb84d]">
                  {totalHolders}
                </span>
              )}
            </button>
          </div>

          {tab === "community" && (
            <Link href="/square" className="text-white/30 text-xs font-fun hover:text-[#9977e0] transition-colors">
              All in Square →
            </Link>
          )}
        </div>

        {/* Content */}
        <div className="p-4 pt-3">
          {tab === "community" ? (
            socialPosts.length > 0 ? (
              <div className="space-y-2">
                {socialPosts.map((p, i) => (
                  <div key={p.id}
                    className="p-3 rounded-2xl bg-white/4 hover:bg-white/7 transition-all border border-white/5 hover:border-white/10 animate-fade-in-up"
                    style={{ animationDelay: `${i * 0.04}s` }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`w-5 h-5 rounded-lg bg-gradient-to-br ${AVATAR_GRADS[i % AVATAR_GRADS.length]} flex items-center justify-center text-[10px] font-display font-bold text-white shrink-0`}>
                        {p.authorWallet?.slice(0, 1).toUpperCase() ?? "?"}
                      </div>
                      <span className={`pill text-[10px] ${POST_TYPE_COLORS[p.postType] ?? "bg-white/10 text-white/60"}`}>
                        {p.postType}
                      </span>
                      <span className="text-white/20 text-[10px] font-fun ml-auto">
                        {p.authorWallet ? shortWallet(p.authorWallet) : "anon"} · {formatTimeAgo(p.createdAt)}
                      </span>
                    </div>
                    <p className="text-white/70 text-xs font-body leading-relaxed line-clamp-2">{p.content}</p>
                    <div className="flex gap-3 mt-1.5 text-white/20 text-[10px] font-fun">
                      <span>❤️ {p.likesCount}</span>
                      <span>💬 {p.commentsCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-white/25 font-fun text-xs mb-3">No community posts yet</p>
                <Link href="/square"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-fun font-bold text-[#b48dff] hover:text-white transition-colors"
                  style={{ background: "rgba(122,85,198,0.12)", border: "1px solid rgba(122,85,198,0.2)" }}
                >
                  Post about ${symbol} →
                </Link>
              </div>
            )
          ) : (
            <div>
              {dist && (
                <div className="mb-3">
                  <div className="h-2.5 rounded-full overflow-hidden flex mb-1.5">
                    <div className="h-full bg-[#ff3366]" style={{ width: `${dist.whales}%` }} />
                    <div className="h-full bg-[#ffb84d]" style={{ width: `${dist.mid}%` }} />
                    <div className="h-full bg-[#00ff88]" style={{ width: `${dist.retail}%` }} />
                  </div>
                  <div className="flex gap-3 text-[10px] font-mono text-white/35">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#ff3366] inline-block" />Whales {dist.whales.toFixed(1)}%</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#ffb84d] inline-block" />Mid {dist.mid.toFixed(1)}%</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#00ff88] inline-block" />Retail {dist.retail.toFixed(1)}%</span>
                  </div>
                </div>
              )}

              {!holdersLoaded ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="skeleton-wave h-5 rounded-lg" />)}
                </div>
              ) : holders.length === 0 ? (
                <p className="text-white/25 text-xs font-fun text-center py-4">No holder data available</p>
              ) : (
                <div className="space-y-1.5">
                  {visible.map(h => (
                    <div key={h.address} className="flex items-center gap-2 text-xs">
                      <span className="text-white/20 font-mono w-4 shrink-0">#{h.rank}</span>
                      <div className="flex-1 min-w-0">
                        <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#ff3366]"
                            style={{ width: `${Math.min(h.pct, 100)}%` }} />
                        </div>
                      </div>
                      <span className="text-white/50 font-mono w-10 text-right tabular-nums">{h.pct.toFixed(1)}%</span>
                      <a href={`https://solscan.io/account/${h.address}`} target="_blank" rel="noreferrer"
                        className="text-white/20 hover:text-white/55 font-mono transition-colors">
                        {shortAddr(h.address)}
                      </a>
                    </div>
                  ))}
                  {holders.length > 5 && (
                    <button onClick={() => setExpanded(!expanded)}
                      className="mt-1 w-full text-center text-[11px] font-fun text-[#7c3aed] hover:text-[#9977e0] transition-colors">
                      {expanded ? "Show less" : `+${holders.length - 5} more`}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
