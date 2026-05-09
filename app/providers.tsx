"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PageLoader } from "@/components/ui/PageLoader";
import { ToastProvider } from "@/components/ui/Toast";
import { ClientErrorReporter } from "@/components/ui/ClientErrorReporter";
import { WalletPersistenceBridge } from "@/components/wallet/WalletPersistenceBridge";
import "@solana/wallet-adapter-react-ui/styles.css";

const PUBLIC_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC;
const ALLOW_PUBLIC_CREDENTIAL_RPC = process.env.NEXT_PUBLIC_ALLOW_CREDENTIAL_RPC === "true";
const FALLBACK_RPC = "https://api.mainnet-beta.solana.com";

function hasCredentialLikeQuery(url?: string) {
  return Boolean(url && /[?&](api-?key|token|auth)=/i.test(url));
}

const RPC = hasCredentialLikeQuery(PUBLIC_RPC) && !ALLOW_PUBLIC_CREDENTIAL_RPC
  ? FALLBACK_RPC
  : PUBLIC_RPC || FALLBACK_RPC;

// Phantom is a Standard Wallet, so no explicit adapter is needed.
// Passing an empty array lets wallet-adapter auto-detect installed wallets.
const CP = ConnectionProvider as React.ComponentType<{ endpoint: string; children: ReactNode }>;
const WP = WalletProvider as React.ComponentType<{ wallets: never[]; autoConnect: boolean; children: ReactNode }>;
const WMP = WalletModalProvider as React.ComponentType<{ children: ReactNode }>;

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const [landingLoaded, setLandingLoaded] = useState(false);
  const hideLanding = isLanding && !landingLoaded;

  return (
    <CP endpoint={RPC}>
      <WP wallets={[]} autoConnect>
        <WMP>
          <WalletPersistenceBridge />
          <ToastProvider>
            <ClientErrorReporter />
            {hideLanding && <PageLoader onDone={() => setLandingLoaded(true)} />}
            <div style={isLanding ? { opacity: hideLanding ? 0 : 1, transition: "opacity 0.4s ease 0.1s" } : undefined}>
              {children}
            </div>
          </ToastProvider>
        </WMP>
      </WP>
    </CP>
  );
}
