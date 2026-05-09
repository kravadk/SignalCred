import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export type ExplorerKind = "token" | "account" | "tx";

export function solscanUrl(value: string, kind: ExplorerKind = "account") {
  const path = kind === "tx" ? "tx" : kind === "token" ? "token" : "account";
  return `https://solscan.io/${path}/${value}`;
}

export function dexScreenerPairUrl(pairAddress: string) {
  return `https://dexscreener.com/solana/${pairAddress}`;
}

export function bagsTokenUrl(mint: string) {
  return `https://bags.fm/token/${mint}`;
}

export function shortAddress(value: string) {
  return value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
}

export function ExplorerLink({
  href,
  label,
  className,
  icon = true,
}: {
  href: string;
  label: string;
  className?: string;
  icon?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 text-white/45 transition-colors hover:text-[#69d99a]",
        className
      )}
    >
      <span className="truncate">{label}</span>
      {icon && <ExternalLink size={11} className="shrink-0" />}
    </a>
  );
}
