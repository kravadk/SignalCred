"use client";
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Megaphone, Plus, X, Loader2, CheckCircle2 } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import bs58 from "bs58";

interface Update { id: string; content: string; createdAt: string; mediaUrl: string | null; }

export function OfficialUpdates({ mint, symbol, creatorWallet }: { mint: string; symbol: string; creatorWallet?: string | null }) {
  const { publicKey, signMessage } = useWallet();
  const [updates, setUpdates] = useState<Update[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  const isCreator = publicKey?.toBase58() === creatorWallet;

  const load = () => {
    fetch(`/api/posts?tab=new&limit=50`)
      .then(r => r.json())
      .then(d => {
        const officialPosts = (d.posts ?? []).filter(
          (p: { postType: string; tokenMint: string }) => p.postType === "official" && p.tokenMint === mint
        );
        setUpdates(officialPosts);
      });
  };

  useEffect(() => { load(); }, [mint]);

  const post = async () => {
    if (!publicKey || !content.trim()) return;
    if (!signMessage) return;
    setPosting(true);
    try {
      const wallet = publicKey.toBase58();
      const message = [
        "SignalCred wallet verification",
        `wallet:${wallet}`,
        "action:official-update",
        `mint:${mint}`,
        `timestamp:${Date.now()}`,
      ].join("|");
      const signature = bs58.encode(await signMessage(new TextEncoder().encode(message)));
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet": wallet,
          "x-message": message,
          "x-signature": signature,
        },
        body: JSON.stringify({ content, postType: "official", tokenMint: mint }),
      });
      const d = await res.json();
      if (d.post) { setUpdates(prev => [d.post, ...prev]); setContent(""); setShowForm(false); }
    } finally { setPosting(false); }
  };

  if (!isCreator && updates.length === 0) return null;

  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#00ff88]/5 to-transparent pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Megaphone size={14} className="text-[#00ff88]" />
            <span className="text-white/60 text-xs font-fun font-bold uppercase tracking-wider">Official Updates</span>
            <span className="px-1.5 py-0.5 rounded-lg bg-[#00ff88]/15 text-[#00ff88] text-[9px] font-mono border border-[#00ff88]/20">
              CREATOR
            </span>
          </div>
          {isCreator && (
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#00ff88]/15 text-[#00ff88] text-xs font-fun hover:bg-[#00ff88]/25 transition-all">
              {showForm ? <X size={10} /> : <Plus size={10} />} {showForm ? "Cancel" : "Post Update"}
            </button>
          )}
        </div>

        {showForm && (
          <div className="mb-4 animate-pop">
            <textarea value={content} onChange={e => setContent(e.target.value.slice(0, 500))}
              placeholder={`Official update about $${symbol}…`} rows={3}
              className="w-full rounded-2xl px-4 py-3 text-sm font-fun text-white resize-none outline-none border border-[#00ff88]/20 mb-2"
              style={{ background: "rgba(0,255,136,0.05)" }} />
            <div className="flex items-center justify-between">
              <span className={`text-xs font-mono ${content.length > 480 ? "text-[#ff3366]" : "text-white/20"}`}>{content.length}/500</span>
              <button onClick={post} disabled={posting || !content.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-fun font-bold text-xs text-[#08080f] disabled:opacity-50 transition-all"
                style={{ background: "linear-gradient(135deg, #00ff88, #00cc66)" }}>
                {posting ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                Post Official Update
              </button>
            </div>
          </div>
        )}

        {updates.length === 0 ? (
          isCreator ? <p className="text-white/20 text-xs font-fun text-center py-3">Post official updates to keep your community informed</p> : null
        ) : (
          <div className="space-y-3">
            {updates.map(u => (
              <div key={u.id} className="p-3.5 rounded-2xl bg-[#00ff88]/6 border border-[#00ff88]/15">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[#00ff88] text-[9px] font-fun font-black uppercase">✓ Official Update</span>
                  <span className="text-white/20 text-[10px] font-fun ml-auto">{formatTimeAgo(u.createdAt)}</span>
                </div>
                <p className="text-white/85 text-sm font-fun leading-relaxed">{u.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
