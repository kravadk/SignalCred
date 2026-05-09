import { BadgeCheck, CircleDollarSign, MessageCircle } from "lucide-react";

const TRACKS = [
  {
    icon: BadgeCheck,
    label: "Bags API",
    body: "Imported launches, verified pool proof, and token metadata.",
    tone: "text-[#69d99a] border-[#00ff88]/20 bg-[#00ff88]/8",
  },
  {
    icon: MessageCircle,
    label: "Social Finance",
    body: "Token-linked posts, official updates, and community momentum.",
    tone: "text-[#b48dff] border-[#7c3aed]/25 bg-[#7c3aed]/10",
  },
  {
    icon: CircleDollarSign,
    label: "Fee Reputation",
    body: "Lifetime fees, creator identity, risk flags, and ranking.",
    tone: "text-[#ffcc7a] border-[#ffb84d]/25 bg-[#ffb84d]/10",
  },
];

export function TrackFocusBar({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`mb-3 grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"}`}>
      {TRACKS.map(({ icon: Icon, label, body, tone }) => (
        <div key={label} className={`rounded-lg border px-3 py-2 ${tone}`}>
          <div className="flex min-w-0 items-center gap-2">
            <Icon size={14} className="shrink-0" />
            <p className="shrink-0 text-xs font-fun font-black text-white/90">{label}</p>
            <p className="min-w-0 truncate text-[11px] leading-4 text-white/42 font-fun">{body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
