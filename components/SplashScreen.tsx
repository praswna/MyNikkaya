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
        @keyframes light-expand {
          0% { transform: scale(0); opacity: 0; }
          30% { opacity: 1; }
          100% { transform: scale(14); opacity: 1; }
        }
        @keyframes light-brighten {
          0% { background: radial-gradient(circle, #D4B89600 0%, transparent 60%); }
          40% { background: radial-gradient(circle, #D4B89666 0%, #D4B89633 40%, transparent 70%); }
          80% { background: radial-gradient(circle, #D4B896DD 0%, #D4B89677 40%, #D4B89633 70%, transparent 90%); }
          100% { background: radial-gradient(circle, #FFFBF7FF 0%, #D4B896DD 40%, #D4B89677 70%, #D4B89633 90%, transparent 100%); }
        }
      `}</style>

      <div
        style={{
          position: "absolute",
          width: "200px",
          height: "200px",
          borderRadius: "50%",
          animation: "light-expand 5s cubic-bezier(0.4, 0, 0.2, 1) forwards, light-brighten 5s ease-in-out forwards",
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
