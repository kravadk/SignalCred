"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./WalletButton";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { cn } from "@/lib/utils";
import { Rocket, LayoutGrid, TrendingUp, BookOpen, Trophy, Search } from "lucide-react";
import { useState, useEffect } from "react";

const NAV = [
  { href: "/token",     label: "Index",     icon: Search },
  { href: "/square",    label: "Social",    icon: LayoutGrid },
  { href: "/fees",      label: "Reputation", icon: TrendingUp },
  { href: "/launch",    label: "Launch",    icon: Rocket },
  { href: "/hackathon", label: "Status",    icon: Trophy },
  { href: "/docs",      label: "Docs",      icon: BookOpen },
];

export function TopNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 transition-all duration-200"
      style={{
        background: scrolled ? "rgba(4, 13, 30, 0.95)" : "rgba(4, 13, 30, 0.86)",
        backdropFilter: "blur(14px)",
        borderTop: "none",
        borderBottom: "1px solid rgba(77,205,255,0.12)",
        outline: "none",
        boxShadow: scrolled ? "0 8px 26px rgba(0,0,0,0.28), 0 1px 0 rgba(55,216,255,0.04)" : "none",
      }}
    >
      <div className="w-full min-h-[52px] flex items-center gap-3 px-3 sm:px-4 xl:px-5">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl shadow-[0_0_18px_rgba(0,132,255,0.24)] ring-1 ring-white/10 transition group-hover:shadow-[0_0_26px_rgba(0,132,255,0.42)]">
            <img
              src="/signalcred-logo-256.png"
              alt="SignalCred"
              className="h-full w-full object-cover"
            />
          </div>
          <span className="hidden font-display text-base font-black tracking-tight text-white sm:block"
            style={{ textShadow: "0 2px 12px rgba(0,0,0,0.32)" }}>
            SIGNALCRED
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex-1 flex items-center justify-start lg:justify-center gap-1 min-w-0 overflow-x-auto py-1.5" aria-label="Primary navigation">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-body font-black md:text-[13px] whitespace-nowrap transition-all duration-200 group",
                  active ? "text-white" : "text-white/45 hover:text-white"
                )}
                style={{
                  background: active ? "linear-gradient(135deg, rgba(8,121,255,0.18), rgba(255,159,34,0.08))" : "transparent",
                  border: active ? "1px solid rgba(77,205,255,0.18)" : "1px solid transparent",
                  boxShadow: active ? "0 8px 22px rgba(8,121,255,0.08)" : "none",
                }}
              >
                <Icon size={14} strokeWidth={2.2} className={active ? "text-[#5ee3ff]" : "text-white/40 group-hover:text-white/80"} />
                <span className="leading-none">{label}</span>
                {active && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ background: "#37d8ff", boxShadow: "0 0 7px rgba(55,216,255,0.9)" }} />
                )}
                {label === "Docs" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#37d8ff] shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-2 shrink-0">
          <NotificationBell />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
