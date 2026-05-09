"use client";

import type { CSSProperties } from "react";
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

const PROOF_CHIPS = [
  "Bags source",
  "Pool proof",
  "Creator proof",
  "Fee loop",
  "Claim receipt",
  "Social proof",
  "USDT proof",
] as const;

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
        background: "radial-gradient(circle at 50% 40%, rgba(0,132,255,0.34) 0%, rgba(7,44,107,0.28) 26%, rgba(5,8,18,0.98) 66%, #02030a 100%)",
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

      <div className="signal-loader-stage relative mb-8 grid place-items-center">
        <div className="signal-loader-halo signal-loader-halo-a" />
        <div className="signal-loader-halo signal-loader-halo-b" />
        <div className="signal-loader-scan" />
        <div className="signal-loader-orbit">
          {PROOF_CHIPS.map((chip, index) => (
            <span
              key={chip}
              className="signal-loader-chip"
              style={{ "--chip-index": index } as CSSProperties}
            >
              {chip}
            </span>
          ))}
        </div>
        <div className="signal-loader-logo-wrap">
          <img
            src="/signalcred-logo-512.png"
            alt="SignalCred logo"
            className="signal-loader-logo"
          />
        </div>
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
        className="mb-10 text-center text-sm font-fun uppercase tracking-widest text-white/52"
        style={{
          animation: lettersReady ? "fade-in-up 0.6s 0.8s ease both" : "none",
          opacity: lettersReady ? undefined : 0,
        }}
      >
        Launching verified trust orbit
      </p>

      <div className="h-1.5 w-72 overflow-hidden rounded-full border border-white/10" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #006dff, #20d2ff, #ffd23f, #2fffb2)",
            boxShadow: "0 0 18px rgba(32,210,255,0.8)",
            backgroundSize: "200% 100%",
            animation: "gradient-shift 2s ease infinite",
            transition: "width 0.05s linear",
          }}
        />
      </div>
      <p className="mt-3 text-xs font-fun tabular-nums text-white/20">{progress}%</p>

      <div
        className="absolute bottom-8 text-xs font-fun text-white/28"
        style={{ animation: "fade-in-up 0.6s 1s ease both", opacity: 0 }}
      >
        Bags source {"->"} proof passport {"->"} social trust
      </div>
    </div>
  );
}
