"use client";
import { useState, useEffect, useRef } from "react";
import { Bell, Heart, MessageCircle, Users, Zap, Rocket } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { formatTimeAgo, shortWallet } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Notif {
  id: string;
  type: string;
  senderWallet: string | null;
  message: string | null;
  tokenMint: string | null;
  postId: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, { icon: React.ElementType; color: string }> = {
  like:    { icon: Heart,          color: "#ff3366" },
  comment: { icon: MessageCircle,  color: "#7c3aed" },
  follow:  { icon: Users,          color: "#00ff88" },
  tip:     { icon: Zap,            color: "#ffb84d" },
  launch:  { icon: Rocket,         color: "#ff6a84" },
};

export function NotificationBell() {
  const { publicKey } = useWallet();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifs.filter(n => !n.isRead).length;

  const fetchNotifs = () => {
    if (!publicKey) return;
    fetch("/api/notifications", { headers: { "x-wallet": publicKey.toBase58() } })
      .then(async (r) => r.ok ? r.json().catch(() => ({ notifications: [] })) : { notifications: [] })
      .then(d => setNotifs(d.notifications ?? []));
  };

  useEffect(() => {
    fetchNotifs();
    const t = setInterval(fetchNotifs, 30000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markRead = async () => {
    if (!publicKey || unread === 0) return;
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "x-wallet": publicKey.toBase58() },
    });
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  if (!publicKey) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open && unread > 0) markRead(); }}
        className="relative p-2 rounded-xl hover:bg-white/10 transition-all"
      >
        <Bell size={18} className="text-white/60" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#ff3366] text-white text-[9px] font-black flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#0d0a1a] border border-white/15 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <span className="text-white font-fun font-bold text-sm">Notifications</span>
            {unread > 0 && (
              <span className="text-[#ff3366] text-xs font-mono">{unread} new</span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-white/25">
                <Bell size={24} className="mb-2 opacity-30" />
                <p className="text-xs font-fun">No notifications yet</p>
              </div>
            ) : (
              notifs.map(n => {
                const cfg = TYPE_ICON[n.type] ?? TYPE_ICON.like;
                const Icon = cfg.icon;
                return (
                  <div key={n.id}
                    className={cn("flex items-start gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/4 transition-colors",
                      !n.isRead && "bg-white/3"
                    )}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${cfg.color}20` }}>
                      <Icon size={14} style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-xs font-fun">
                        <span className="font-bold text-white">{n.senderWallet ? shortWallet(n.senderWallet) : "Someone"}</span>
                        {" "}{n.message ?? n.type}
                      </p>
                      <p className="text-white/25 text-[10px] font-mono mt-0.5">{formatTimeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && (
                      <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: cfg.color }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
