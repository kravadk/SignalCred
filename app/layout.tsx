import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { TopNav } from "@/components/layout/TopNav";
import { AgentationWrapper } from "@/components/dev/AgentationWrapper";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "SignalCred - Bags-native launch and trust layer",
  description: "Launch Bags-native tokens with verified creator updates, fee loop evidence, social proof, and USDT campaign context.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
  openGraph: {
    title: "SignalCred",
    description:
      "Create Bags-native tokens, prove creator reputation with real fees, and build token-linked social proof.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#08080f] via-[#0d0a1a] to-[#08080f]">
            <TopNav />
            <main className="flex-1">{children}</main>
          </div>
          <AgentationWrapper />
        </Providers>
      </body>
    </html>
  );
}
