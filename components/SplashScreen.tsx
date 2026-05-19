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
    const fadeTimer = setTimeout(() => setPhase("fadeout"), 2000);
    const doneTimer = setTimeout(() => onDone(), 2600);
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
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{
        backgroundColor: colors.bg,
        opacity: phase === "fadeout" ? 0 : 1,
        transition: "opacity 0.6s ease-out",
      }}
    >
      <svg
        width="120"
        height="120"
        viewBox="0 0 100 100"
        style={{
          animation: "spin 3s linear infinite",
        }}
      >
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); transform-origin: 50px 50px; }
            to { transform: rotate(360deg); transform-origin: 50px 50px; }
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
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

      <p
        className="mt-6 text-lg font-light tracking-widest"
        style={{
          color: colors.textMuted,
          animation: "fadeInUp 0.8s ease-out 0.3s both",
        }}
      >
        불교 경전
      </p>
    </div>
  );
}
