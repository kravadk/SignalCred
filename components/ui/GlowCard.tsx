"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const GLOW_COLORS = {
  green:  { shadow: "rgba(38,170,104,0.5)",  border: "#26aa68", text: "#69d99a" },
  purple: { shadow: "rgba(122,85,198,0.5)",  border: "#7a55c6", text: "#b48dff" },
  pink:   { shadow: "rgba(255,106,132,0.5)", border: "#ff6a84", text: "#ff9aad" },
  orange: { shadow: "rgba(255,98,78,0.5)",   border: "#ff624e", text: "#ff8b6e" },
  none:   { shadow: "rgba(122,85,198,0.3)",  border: "rgba(255,255,255,0.15)", text: "white" },
};

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glow?: "green" | "purple" | "pink" | "orange" | "none";
  float?: boolean;
  shine?: boolean;
  onClick?: () => void;
}

export function GlowCard({
  children,
  className,
  glow = "none",
  float = false,
  shine = true,
  onClick,
}: GlowCardProps) {
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const colors = GLOW_COLORS[glow];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  };

  return (
    <div
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn("relative rounded-[38px] overflow-hidden", float && "animate-float", onClick && "cursor-pointer", className)}
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.09), rgba(255,255,255,0.04))",
        backdropFilter: "blur(16px)",
        border: `1px solid ${hovered ? colors.border + "60" : "rgba(255,255,255,0.1)"}`,
        boxShadow: hovered
          ? `inset 0 1px 0 rgba(255,255,255,0.2), 0 28px 60px rgba(10,4,30,0.5), 0 0 40px ${colors.shadow}`
          : "inset 0 1px 0 rgba(255,255,255,0.13), 0 20px 40px rgba(10,4,30,0.3)",
        transform: hovered ? "translateY(-3px) scale(1.005)" : "translateY(0) scale(1)",
        transition: "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
      }}
    >
      {/* Mouse-tracking spotlight */}
      {hovered && shine && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(255,255,255,0.06) 0%, transparent 60%)`,
            borderRadius: "inherit",
          }}
        />
      )}

      {/* Animated top edge glow */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{
          background: hovered
            ? `linear-gradient(90deg, transparent, ${colors.border}, transparent)`
            : "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
          opacity: hovered ? 1 : 0.5,
          transition: "opacity 0.25s",
        }}
      />

      {children}
    </div>
  );
}
