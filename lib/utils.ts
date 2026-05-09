import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortWallet(wallet: string): string {
  return `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
}

export function formatPrice(price: number): string {
  if (price < 0.000001) return price.toExponential(2);
  if (price < 0.01) return price.toFixed(6);
  if (price < 1) return price.toFixed(4);
  return price.toFixed(2);
}

export function formatMarketCap(mc: number): string {
  if (mc >= 1_000_000_000) return `$${(mc / 1_000_000_000).toFixed(1)}B`;
  if (mc >= 1_000_000) return `$${(mc / 1_000_000).toFixed(1)}M`;
  if (mc >= 1_000) return `$${(mc / 1_000).toFixed(1)}K`;
  return `$${mc.toFixed(0)}`;
}

export function formatUsd(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(Number(value))) return null;
  const n = Number(value);
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 100_000) return `$${Math.round(n / 1_000)}K`;
  if (n >= 10_000) return `$${(n / 1_000).toFixed(1)}K`;
  if (n >= 1_000) return `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n)}`;
  if (n > 0) return `$${n.toFixed(n < 10 ? 2 : 0)}`;
  return "$0";
}

export function formatLamports(lamports: number): string {
  return `${(lamports / 1e9).toFixed(4)} SOL`;
}

export function formatTimeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function parseCashtags(content: string): string[] {
  return (content.match(/\$[A-Z]{2,12}/g) ?? []).map((t) => t.slice(1));
}

export function lamportsToSol(lamports: number | string): number {
  return Number(lamports) / 1e9;
}

export function solToLamports(sol: number): number {
  return Math.floor(sol * 1e9);
}
