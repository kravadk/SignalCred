import { type ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: "green" | "purple" | "pink" | "orange";
  gradient?: string;
  children?: ReactNode;
}

const BADGE_STYLES = {
  green:  "bg-green/20 text-[#69d99a] border-green/30",
  purple: "bg-[#7a55c6]/20 text-[#b48dff] border-[#7a55c6]/30",
  pink:   "bg-[#ff6a84]/20 text-[#ff9aad] border-[#ff6a84]/30",
  orange: "bg-[#ff624e]/20 text-[#ff8b6e] border-[#ff624e]/30",
};

const GRADIENTS = {
  launch:      "from-[#7a55c6]/30 via-[#ff6a84]/10 to-transparent",
  square:      "from-[#ff624e]/25 via-[#ff6a84]/10 to-transparent",
  token:       "from-[#26aa68]/25 via-[#7a55c6]/10 to-transparent",
  leaderboard: "from-[#ffb84d]/25 via-[#ff624e]/10 to-transparent",
  fees:        "from-[#26aa68]/25 via-[#69d99a]/10 to-transparent",
  profile:     "from-[#7a55c6]/25 via-[#ff6a84]/10 to-transparent",
  futures:     "from-[#ff6a84]/20 via-[#7a55c6]/10 to-transparent",
  docs:        "from-[#ff624e]/25 via-[#ff6a84]/10 to-transparent",
};

export function PageHeader({
  title,
  subtitle,
  badge,
  badgeColor = "purple",
  gradient = "from-[#7a55c6]/25 via-transparent to-transparent",
  children,
}: PageHeaderProps) {
  return (
    <div className="relative mb-5 pt-1">
      <div className={`absolute -top-3 -left-3 h-20 w-80 bg-gradient-to-r ${gradient} blur-3xl opacity-45 pointer-events-none`} />
      <div className="relative flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          {badge && (
            <span className={`mb-2 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-fun font-black uppercase tracking-wider ${BADGE_STYLES[badgeColor]}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
              {badge}
            </span>
          )}
          <h1
            className="max-w-4xl font-display text-3xl leading-[1.02] text-white md:text-5xl"
            style={{ textShadow: "0 2px 16px rgba(0,0,0,0.28)" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-3xl text-sm font-fun leading-6 text-white/58 md:text-base">
              {subtitle}
            </p>
          )}
        </div>
        {children && <div className="w-full sm:w-auto shrink-0">{children}</div>}
      </div>
    </div>
  );
}
