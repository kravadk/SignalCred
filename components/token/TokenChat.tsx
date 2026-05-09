"use client";
import { useState, useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Send, MessageSquare, Loader2 } from "lucide-react";

interface ChatMsg { id: string; wallet: string; content: string; createdAt: string; }

function shortW(w: string) { return w.slice(0, 4) + "…" + w.slice(-4); }

export function TokenChat({ mint, symbol }: { mint: string; symbol: string }) {
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const room = `token-${mint}`;

  const load = () => {
    fetch(`/api/chat/${room}`)
      .then(r => r.json())
      .then(d => { setMsgs(d.messages ?? []); setTimeout(() => bottomRef.current?.scrollIntoView(), 50); });
  };

  useEffect(() => {
    if (open) { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }
  }, [open]);

  const send = async () => {
    if (!publicKey) { setVisible(true); return; }
    if (!input.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/chat/${room}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-wallet": publicKey.toBase58() },
        body: JSON.stringify({ content: input }),
      });
      const d = await res.json();
      if (d.message) { setMsgs(prev => [...prev, d.message]); setInput(""); }
    } finally { setSending(false); }
  };

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/3 transition-colors">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-[#7c3aed]" />
          <span className="text-white/60 text-xs font-fun font-bold uppercase tracking-wider">${symbol} Chat</span>
          {msgs.length > 0 && <span className="text-white/25 text-xs font-mono">{msgs.length} messages</span>}
        </div>
        <span className="text-white/25 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-white/8">
          <div className="h-52 overflow-y-auto p-3 space-y-2 bg-black/20">
            {msgs.length === 0 ? (
              <p className="text-white/20 text-xs font-fun text-center py-6">No messages yet — be first to chat!</p>
            ) : <>
              {msgs.length > 100 && (
                <p className="text-white/30 text-[10px] font-fun text-center pb-2">Showing last 100 of {msgs.length} messages…</p>
              )}
              {msgs.slice(-100).map(m => {
              const isMe = m.wallet === publicKey?.toBase58();
              return (
                <div key={m.id} className="flex gap-2 items-start">
                  <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#ff3366] flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                    {m.wallet.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-[10px] font-mono ${isMe ? "text-[#b48dff]" : "text-white/30"} mr-1.5`}>
                      {shortW(m.wallet)}
                    </span>
                    <span className="text-white/80 text-xs font-fun">{m.content}</span>
                  </div>
                </div>
              );
            })}
            </>}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-2 p-2.5 border-t border-white/8">
            <input value={input} onChange={e => setInput(e.target.value.slice(0, 500))}
              onKeyDown={e => { if (e.key === "Enter") send(); }}
              placeholder={publicKey ? `Chat in $${symbol} room…` : "Connect to chat"}
              className="flex-1 h-8 rounded-xl px-3 text-xs font-fun outline-none border border-white/10 text-white placeholder:text-white/20 focus:border-[#7c3aed]/40"
              style={{ background: "rgba(30,15,75,0.7)" }} />
            <button onClick={send} disabled={sending || !input.trim()}
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40 transition-all"
              style={{ background: "linear-gradient(135deg, #7c3aed, #ff3366)" }}>
              {sending ? <Loader2 size={11} className="animate-spin text-white" /> : <Send size={11} className="text-white" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
