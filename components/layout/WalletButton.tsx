"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { shortWallet } from "@/lib/utils";
import { getWalletReconnectIntent, setWalletReconnectIntent } from "@/lib/wallet-persistence";
import { useEffect, useState } from "react";

export function WalletButton() {
  const { publicKey, disconnect, connected, connecting, disconnecting } = useWallet();
  const { setVisible } = useWalletModal();
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      setWalletReconnectIntent(true);
      setReconnecting(false);
      fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: publicKey.toBase58() }),
      }).catch(console.error);
    }
  }, [connected, publicKey]);

  useEffect(() => {
    if (connected) {
      setReconnecting(false);
      return;
    }
    if (!getWalletReconnectIntent()) return;
    setReconnecting(true);
    const timer = window.setTimeout(() => setReconnecting(false), 3500);
    return () => window.clearTimeout(timer);
  }, [connected]);

  const handleDisconnect = async () => {
    setWalletReconnectIntent(false);
    setReconnecting(false);
    await disconnect();
  };

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden sm:block text-white/60 text-xs font-fun">
          {shortWallet(publicKey.toBase58())}
        </span>
        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="h-10 px-4 rounded-2xl border border-cyan-200/10 bg-white/10 text-white/80 text-sm font-fun font-bold hover:border-cyan-200/20 hover:bg-cyan-200/10 transition-all"
        >
          {disconnecting ? "Disconnecting..." : "Disconnect"}
        </button>
      </div>
    );
  }

  const handleConnect = () => {
    // Phantom mobile fallback: on mobile browsers without a wallet provider,
    // open the deeplink so Phantom app launches and routes the user back.
    if (typeof window !== "undefined") {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const hasProvider = "phantom" in window || "solana" in window;
      if (isMobile && !hasProvider) {
        const target = encodeURIComponent(window.location.href);
        const ref = encodeURIComponent(window.location.origin);
        window.location.href = `https://phantom.app/ul/browse/${target}?ref=${ref}`;
        return;
      }
    }
    setVisible(true);
  };

  return (
    <button
      onClick={handleConnect}
      disabled={connecting || reconnecting}
      className="h-10 px-5 rounded-2xl font-fun font-black text-sm text-white transition-all hover:opacity-90 active:scale-95"
      style={{
        background: "linear-gradient(135deg, #0879ff 0%, #ff9f22 100%)",
        boxShadow: "0 10px 24px rgba(8,121,255,0.18), inset 0 1px 0 rgba(255,255,255,0.20)",
      }}
    >
      {connecting || reconnecting ? "Reconnecting..." : "Connect Wallet"}
    </button>
  );
}
