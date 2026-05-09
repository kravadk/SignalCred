"use client";
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Copy, ExternalLink, Lock, Plus, X } from "lucide-react";
import { lamportsToSol, shortWallet } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Token } from "@/db/schema";
import Link from "next/link";

interface Schedule {
  id: string; beneficiaryWallet: string; totalAmount: number;
  cliffMonths: number; vestingMonths: number; startDate: string; description: string | null;
}

function calcVested(s: Schedule): number {
  const now = Date.now(), start = new Date(s.startDate).getTime();
  const cliffEnd = start + s.cliffMonths * 30 * 86400000;
  if (now < cliffEnd) return 0;
  const vestEnd = start + (s.cliffMonths + s.vestingMonths) * 30 * 86400000;
  if (now >= vestEnd) return s.totalAmount;
  return Math.floor(s.totalAmount * ((now - cliffEnd) / (s.vestingMonths * 30 * 86400000)));
}

export function EconomicsPanel({ mint, token, creatorWallet }: {
  mint: string; token: Token | null; creatorWallet?: string | null;
}) {
  const { publicKey } = useWallet();
  const [tab, setTab] = useState<"fees" | "token" | "vesting">("fees");

  // Fees
  const [split, setSplit] = useState<{ totalFeeLamports: number; creatorFeeLamports: number; platformFeeLamports: number } | null>(null);

  // Vesting
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ beneficiaryWallet: "", totalAmount: "", cliffMonths: "3", vestingMonths: "12", startDate: "", description: "" });
  const [saving, setSaving] = useState(false);
  const isCreator = publicKey?.toBase58() === creatorWallet;

  useEffect(() => {
    fetch(`/api/tokens/${mint}/fees`).then(r => r.json()).then(d => setSplit(d.split ?? null));
    fetch(`/api/tokens/${mint}/vesting`).then(r => r.json()).then(d => setSchedules(d.schedules ?? []));
  }, [mint]);

  const saveVesting = async () => {
    if (!publicKey || !form.beneficiaryWallet || !form.totalAmount || !form.startDate) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tokens/${mint}/vesting`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-wallet": publicKey.toBase58() },
        body: JSON.stringify({ ...form, totalAmount: Number(form.totalAmount) * 1e6 }),
      });
      const d = await res.json();
      if (d.schedule) { setSchedules(p => [...p, d.schedule]); setShowAdd(false); }
    } finally { setSaving(false); }
  };

  const total = split?.totalFeeLamports ?? 0;
  const r = 44, circ = 2 * Math.PI * r, gap = 3;

  const TABS = [
    { id: "fees" as const, label: "Fees" },
    { id: "token" as const, label: "Token" },
    { id: "vesting" as const, label: `Vesting${schedules.length > 0 ? ` ·${schedules.length}` : ""}` },
  ];

  return (
    <div className="card overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#26aa68]/30 to-transparent" />

      {/* Tabs */}
      <div className="flex border-b border-white/8 px-3 pt-3">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("px-3 py-1.5 text-xs font-fun font-bold rounded-t-lg transition-all -mb-px",
              tab === t.id ? "text-white border-b-2 border-[#26aa68]" : "text-white/35 hover:text-white/65"
            )}>{t.label}</button>
        ))}
      </div>

      <div className="p-4">
        {tab === "fees" && (
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 shrink-0">
              <svg viewBox="0 0 100 100" className="w-20 h-20 -rotate-90">
                <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="13" />
                <circle cx="50" cy="50" r={r} fill="none" stroke="#26aa68" strokeWidth="13"
                  strokeDasharray={`${0.75 * circ - gap} ${circ - 0.75 * circ + gap}`} strokeLinecap="round"
                  style={{ filter: "drop-shadow(0 0 5px rgba(38,170,104,0.6))" }} />
                <circle cx="50" cy="50" r={r} fill="none" stroke="#7a55c6" strokeWidth="13"
                  strokeDasharray={`${0.25 * circ - gap} ${circ - 0.25 * circ + gap}`}
                  strokeDashoffset={-(0.75 * circ + gap / 2)} strokeLinecap="round"
                  style={{ filter: "drop-shadow(0 0 5px rgba(122,85,198,0.6))" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {total > 0 ? (
                  <><span className="font-mono text-xs font-bold tabular-nums text-white">{lamportsToSol(total).toFixed(3)}</span>
                  <span className="text-white/30 text-[9px] font-fun">SOL</span></>
                ) : (
                  <span className="text-white/20 text-[9px] font-fun text-center leading-tight">no fees<br/>yet</span>
                )}
              </div>
            </div>
            <div className="flex-1 space-y-2.5">
              {[
                { label: "Creator", pct: 75, sol: lamportsToSol(split?.creatorFeeLamports ?? 0), color: "bg-[#26aa68]", textColor: "text-[#69d99a]", bps: "7,500 bps" },
                { label: "Platform", pct: 25, sol: lamportsToSol(split?.platformFeeLamports ?? 0), color: "bg-[#7a55c6]", textColor: "text-[#b48dff]", bps: "2,500 bps" },
              ].map(({ label, pct, sol, color, textColor, bps }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white/50 text-xs font-fun">{label} <span className="text-white/25 text-[10px]">({bps})</span></span>
                    <span className={`text-xs font-fun font-black ${textColor}`}>{pct}%{sol > 0 ? ` · ${sol.toFixed(4)}◎` : ""}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
              <p className="text-white/20 text-[9px] font-fun">1% per swap · accrues automatically</p>
            </div>
          </div>
        )}

        {tab === "token" && token && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: "Protocol",  value: "Bags DBC",      color: "text-[#ffb84d]" },
                { label: "Network",   value: "Solana Mainnet", color: "text-[#00ff88]" },
                { label: "Decimals",  value: "6",             color: "text-white/60" },
                { label: "Standard",  value: "SPL Token",     color: "text-white/60" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white/5 rounded-xl p-2 border border-white/8">
                  <p className="text-white/30 text-[9px] font-mono uppercase">{label}</p>
                  <p className={`text-xs font-mono font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/8">
              <span className="text-white/25 text-xs font-mono shrink-0">Mint</span>
              <span className="text-white/60 text-xs font-mono flex-1 truncate">{token.mint}</span>
              <button onClick={() => navigator.clipboard.writeText(token.mint)} className="text-white/25 hover:text-[#00ff88] transition-colors shrink-0"><Copy size={10} /></button>
              <a href={`https://solscan.io/token/${token.mint}`} target="_blank" rel="noreferrer" className="text-white/25 hover:text-[#00ff88] transition-colors shrink-0"><ExternalLink size={10} /></a>
            </div>
            {token.teamWallets && token.teamWallets.length > 0 && (
              <div>
                <p className="text-white/30 text-[10px] font-fun font-bold uppercase mb-1.5">Team</p>
                {token.teamWallets.map((w, i) => (
                  <Link key={i} href={`/profile/${w}`} className="flex items-center gap-2 py-1 hover:bg-white/5 rounded-lg px-1.5 transition-all">
                    <div className="w-4 h-4 rounded bg-gradient-to-br from-[#7c3aed] to-[#ff3366] flex items-center justify-center text-[8px] font-bold text-white">{i+1}</div>
                    <span className="text-white/50 text-xs font-mono">{shortWallet(w)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "vesting" && (
          <div>
            {isCreator && (
              <button onClick={() => setShowAdd(!showAdd)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#7c3aed]/15 text-[#b48dff] text-xs font-fun mb-3 hover:bg-[#7c3aed]/25 transition-all">
                {showAdd ? <X size={10} /> : <Plus size={10} />} {showAdd ? "Cancel" : "Add Schedule"}
              </button>
            )}
            {showAdd && (
              <div className="mb-3 p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2 animate-pop">
                <input value={form.beneficiaryWallet} onChange={e => setForm(f => ({...f, beneficiaryWallet: e.target.value}))}
                  placeholder="Beneficiary wallet" className="w-full bg-white/8 rounded-xl px-3 py-1.5 text-xs text-white outline-none border border-white/10 placeholder:text-white/25" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={form.totalAmount} onChange={e => setForm(f => ({...f, totalAmount: e.target.value}))}
                    type="number" placeholder="Amount (tokens)" className="bg-white/8 rounded-xl px-3 py-1.5 text-xs text-white outline-none border border-white/10 placeholder:text-white/25" />
                  <input value={form.startDate} onChange={e => setForm(f => ({...f, startDate: e.target.value}))}
                    type="date" className="bg-white/8 rounded-xl px-3 py-1.5 text-xs text-white outline-none border border-white/10" />
                </div>
                <button onClick={saveVesting} disabled={saving}
                  className="w-full py-1.5 rounded-xl text-xs font-fun font-bold text-white disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #b48dff)" }}>
                  {saving ? "Saving…" : "Create Schedule"}
                </button>
              </div>
            )}
            {schedules.length === 0 ? (
              <p className="text-white/20 text-xs font-fun text-center py-3">No vesting schedules</p>
            ) : (
              <div className="space-y-2">
                {schedules.map(s => {
                  const vested = calcVested(s);
                  const pct = Math.min((vested / s.totalAmount) * 100, 100);
                  return (
                    <div key={s.id} className="p-3 rounded-2xl bg-white/5 border border-white/8">
                      <div className="flex items-center gap-2 mb-2">
                        <Lock size={10} className="text-[#b48dff]" />
                        <span className="text-white/60 text-xs font-mono">{shortWallet(s.beneficiaryWallet)}</span>
                        <span className="ml-auto text-white/30 text-[10px] font-fun">{pct.toFixed(0)}% vested</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-1">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#b48dff]" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-white/25 text-[10px] font-fun">{s.cliffMonths}m cliff · {s.vestingMonths}m vest</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
