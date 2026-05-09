"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function AnimatedCounter({
  value,
  duration = 1200,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);
  const [key, setKey] = useState(0);
  const prevValue = useRef(0);
  const rafRef = useRef<number>();
  const startRef = useRef<number>();
  const startVal = useRef(0);

  useEffect(() => {
    startVal.current = prevValue.current;
    prevValue.current = value;
    setKey((k) => k + 1);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = undefined;

    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(t);
      const current = startVal.current + (value - startVal.current) * eased;
      setDisplay(current);
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
      else setDisplay(value);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  const formatted =
    decimals > 0
      ? display.toFixed(decimals)
      : Math.round(display).toLocaleString();

  return (
    <span
      key={key}
      className={className}
      style={{ animation: "count-up 0.3s ease both", display: "inline-block" }}
    >
      {prefix}{formatted}{suffix}
    </span>
  );
}
