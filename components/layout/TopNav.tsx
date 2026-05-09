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
        background: scrolled ? "rgba(9, 9, 15, 0.94)" : "rgba(9, 9, 15, 0.82)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        boxShadow: scrolled ? "0 8px 26px rgba(0,0,0,0.28)" : "none",
      }}
    >
      <div className="w-full min-h-[52px] flex items-center gap-3 px-3 sm:px-4 xl:px-5">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="relative">
            <div style={{
              width: 24, height: 30,
              borderRadius: "50% 50% 46% 46%",
              background: "radial-gradient(ellipse at 56% 31%, #ffeeb9 0 24%, transparent 25%), linear-gradient(135deg, #ff364f 0%, #ff6b43 78%)",
              boxShadow: "0 0 12px rgba(255,91,81,0.34)",
            }} />
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
                  background: active ? "rgba(255,255,255,0.08)" : "transparent",
                  border: active ? "1px solid rgba(255,255,255,0.10)" : "1px solid transparent",
                  boxShadow: "none",
                }}
              >
                <Icon size={14} strokeWidth={2.2} className={active ? "text-[#b48dff]" : "text-white/40 group-hover:text-white/80"} />
                <span className="leading-none">{label}</span>
                {active && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ background: "#b48dff", boxShadow: "0 0 6px #7c3aed" }} />
                )}
                {label === "Docs" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] shrink-0" />
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
