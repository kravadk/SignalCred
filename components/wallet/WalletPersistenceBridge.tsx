"use client";

import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { setWalletReconnectIntent } from "@/lib/wallet-persistence";

export function WalletPersistenceBridge() {
  const { connected, publicKey } = useWallet();

  useEffect(() => {
    if (!connected || !publicKey) return;
    setWalletReconnectIntent(true);
    window.dispatchEvent(
      new CustomEvent("signalcred:wallet-persistence", {
        detail: { connected: true, wallet: publicKey.toBase58() },
      }),
    );
  }, [connected, publicKey]);

  return null;
}
