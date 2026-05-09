"use client";
import { useState } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Lock, Loader2 } from "lucide-react";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";

interface Props {
  gatedMint: string;
  gatedAmount: number;
  symbol?: string;
  children: React.ReactNode;
}

export function GatedOverlay({ gatedMint, gatedAmount, symbol, children }: Props) {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [failed, setFailed] = useState(false);

  const check = async () => {
    if (!publicKey) { setVisible(true); return; }
    setChecking(true);
    setFailed(false);
    try {
      const mintPubkey = new PublicKey(gatedMint);
      const ata = await getAssociatedTokenAddress(mintPubkey, publicKey);
      const acc = await getAccount(connection, ata);
      const balance = Number(acc.amount);
      if (balance >= gatedAmount) {
        setUnlocked(true);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setChecking(false);
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none opacity-40">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/20 rounded-2xl backdrop-blur-[1px]">
        <div className="bg-black/60 rounded-2xl p-4 text-center backdrop-blur-sm border border-white/10">
          <Lock size={20} className="text-[#7c3aed] mx-auto mb-2" />
          <p className="text-white font-fun font-bold text-xs mb-0.5">Token-gated post</p>
          <p className="text-white/40 text-[10px] font-fun mb-2">
            Hold {(gatedAmount / 1e6).toLocaleString()}+ {symbol || "tokens"} to view
          </p>
          {failed && <p className="text-[#ff3366] text-[10px] font-fun mb-2">Not enough tokens</p>}
          <button onClick={check} disabled={checking}
            className="px-3 py-1.5 rounded-lg text-xs font-fun font-bold text-white transition-all"
            style={{ background: "linear-gradient(135deg, #7c3aed, #ff3366)" }}>
            {checking ? <Loader2 size={11} className="animate-spin inline" /> : "🔓 Unlock"}
          </button>
        </div>
      </div>
    </div>
  );
}
