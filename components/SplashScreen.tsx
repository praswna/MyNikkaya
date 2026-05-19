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
    const fadeTimer = setTimeout(() => setPhase("fadeout"), 2500);
    const doneTimer = setTimeout(() => onDone(), 3100);
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
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        backgroundColor: colors.bg,
        opacity: phase === "fadeout" ? 0 : 1,
        transition: "opacity 0.6s ease-out",
      }}
    >
      <style>{`
        @keyframes spin-in-place {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes halo-expand {
          0% { opacity: 0; transform: scale(0.6); }
          50% { opacity: 1; transform: scale(1); }
          100% { opacity: 0.7; transform: scale(1.1); }
        }
      `}</style>

      <div className="relative flex items-center justify-center">
        {/* 방사형 그라디언트 후광 - 넓게 */}
        <div
          style={{
            position: "absolute",
            width: "340px",
            height: "340px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${colors.buttonIcon}66 0%, ${colors.buttonIcon}33 30%, ${colors.buttonIcon}11 60%, transparent 75%)`,
            animation: "halo-expand 2s ease-out forwards",
          }}
        />
        {/* 법륜 */}
        <div style={{ animation: "spin-in-place 5s linear infinite", position: "relative", zIndex: 1 }}>
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
    </div>
  );
}
