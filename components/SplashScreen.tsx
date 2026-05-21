"use client";

import { useEffect, useState } from "react";
import { ThemeColors } from "@/lib/theme";

interface SplashScreenProps {
  colors: ThemeColors;
  onDone: () => void;
}

export function SplashScreen({ colors, onDone }: SplashScreenProps) {
  const [phase, setPhase] = useState<"show" | "fadeout">("show");

  useEffect(() => {
    const fadeTimer = setTimeout(() => setPhase("fadeout"), 5000);
    const doneTimer = setTimeout(() => onDone(), 6500);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  const center = 50;
  const outerRadius = 38;
  const innerRadius = 10;
  const spokeAngles = Array.from({ length: 8 }, (_, i) => (i * 45 * Math.PI) / 180);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{
        backgroundColor: "#000000",
        opacity: phase === "fadeout" ? 0 : 1,
        transition: "opacity 1.5s ease-out",
      }}
    >
      <style>{`
        @keyframes spin-in-place {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes light-grow {
          0% {
            transform: scale(0);
            background: radial-gradient(circle, #5C4A2200 0%, transparent 70%);
          }
          30% {
            background: radial-gradient(circle, #8B7355AA 0%, #8B735544 50%, transparent 80%);
          }
          60% {
            background: radial-gradient(circle, #C4A882DD 0%, #C4A88277 50%, #C4A88222 80%, transparent 95%);
          }
          100% {
            transform: scale(14);
            background: radial-gradient(circle, #FFFBF7FF 0%, #F0D8A8DD 30%, #D4B89677 60%, #C4A88233 85%, transparent 100%);
          }
        }
      `}</style>

      <div
        style={{
          position: "absolute",
          width: "200px",
          height: "200px",
          borderRadius: "50%",
          animation: "light-grow 5s cubic-bezier(0.4, 0, 0.2, 1) forwards",
          pointerEvents: "none",
        }}
      />

      <div style={{ animation: "spin-in-place 8s linear infinite", position: "relative", zIndex: 1 }}>
        <svg width="160" height="160" viewBox="0 0 100 100">
          <circle
            cx={center} cy={center} r={outerRadius}
            stroke={colors.buttonIcon} strokeWidth="4" fill="none"
          />
          {spokeAngles.map((angle, i) => {
            const x1 = center + innerRadius * Math.cos(angle);
            const y1 = center + innerRadius * Math.sin(angle);
            const x2 = center + outerRadius * Math.cos(angle);
            const y2 = center + outerRadius * Math.sin(angle);
            return (
              <line key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={colors.buttonIcon} strokeWidth="4" strokeLinecap="round"
              />
            );
          })}
          <circle cx={center} cy={center} r={innerRadius} fill={colors.buttonIcon} />
        </svg>
      </div>
    </div>
  );
}
