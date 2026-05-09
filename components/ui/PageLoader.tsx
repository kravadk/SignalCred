"use client";

import { useEffect, useRef, useState } from "react";

const LETTERS = "SIGNALCRED".split("");

const STARS = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  x: (i * 137.508) % 100,
  y: (i * 97.3 + i * i * 0.13) % 100,
  size: i % 4 === 0 ? 2 : 1,
  delay: (i * 0.17) % 3.5,
  duration: 1.5 + (i % 5) * 0.4,
}));

export function PageLoader({ onDone }: { onDone?: () => void }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);
  const [lettersReady, setLettersReady] = useState(false);
  const rafRef = useRef<number>();
  const startRef = useRef<number>();

  useEffect(() => {
    const delay = setTimeout(() => setLettersReady(true), 300);
    const duration = 2200;

    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(elapsed / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setProgress(Math.round(eased * 100));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          setVisible(false);
          onDone?.();
        }, 200);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      clearTimeout(delay);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onDone]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 40% 30%, #3f1d72 0%, #291153 50%, #0e0520 100%)",
        transition: "opacity 0.4s ease",
        opacity: progress >= 100 ? 0 : 1,
      }}
    >
      {STARS.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            animation: `twinkle ${star.duration}s ${star.delay}s ease-in-out infinite`,
          }}
        />
      ))}

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)",
        }}
      />

      <div
        className="absolute h-3 w-16 rounded-full"
        style={{
          top: "20%",
          background: "linear-gradient(90deg, transparent, #ff8a4d, #fff2b8)",
          boxShadow: "0 0 24px rgba(255,138,77,0.75)",
          animation: "rocket-fly 2.4s 0.3s ease-in-out both",
          zIndex: 2,
        }}
      />

      <div className="relative mb-8">
        <div
          className="absolute inset-[-24px] rounded-full border border-purple-soft/20"
          style={{ animation: "spin-slow 8s linear infinite" }}
        >
          <div
            className="absolute top-0 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green"
            style={{ boxShadow: "0 0 8px #26aa68" }}
          />
        </div>

        <div
          style={{
            width: 72,
            height: 92,
            borderRadius: "50% 50% 46% 46%",
            background:
              "radial-gradient(ellipse at 56% 31%, #ffeeb9 0 24%, transparent 25%), linear-gradient(135deg, #ff364f 0%, #ff6b43 78%)",
            boxShadow: "0 0 0 0 rgba(255,91,81,0)",
            animation: "pulse-glow-pink 1.5s ease-in-out infinite",
          }}
        />
      </div>

      <div className="mb-8 flex items-center gap-0.5" style={{ perspective: "400px" }}>
        {LETTERS.map((letter, i) => (
          <span
            key={letter + i}
            className="font-display text-4xl text-white md:text-6xl"
            style={{
              display: "inline-block",
              animation: lettersReady ? `letter-drop 0.5s ${i * 0.06}s ease both` : "none",
              opacity: lettersReady ? undefined : 0,
              textShadow: "0 0 20px rgba(122,85,198,0.6), 0 4px 0 rgba(20,8,50,0.4)",
            }}
          >
            {letter}
          </span>
        ))}
      </div>

      <p
        className="mb-10 text-sm font-fun uppercase tracking-widest text-white/40"
        style={{
          animation: lettersReady ? "fade-in-up 0.6s 0.8s ease both" : "none",
          opacity: lettersReady ? undefined : 0,
        }}
      >
        Preparing SignalCred trust layer
      </p>

      <div className="h-1 w-64 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #7a55c6, #ff6a84, #26aa68)",
            boxShadow: "0 0 12px rgba(122,85,198,0.8)",
            backgroundSize: "200% 100%",
            animation: "gradient-shift 2s ease infinite",
            transition: "width 0.05s linear",
          }}
        />
      </div>
      <p className="mt-3 text-xs font-fun tabular-nums text-white/20">{progress}%</p>

      <div
        className="absolute bottom-8 text-xs font-fun text-white/20"
        style={{ animation: "fade-in-up 0.6s 1s ease both", opacity: 0 }}
      >
        Powered by Bags SDK - Solana Mainnet
      </div>
    </div>
  );
}
