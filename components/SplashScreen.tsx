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
    const doneTimer = setTimeout(() => onDone(), 2700);
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
        transition: "opacity 0.7s ease-out",
        // 페이드아웃 시 중앙부터 사라지는 마스크
        WebkitMaskImage: phase === "fadeout"
          ? "radial-gradient(circle, transparent 0%, transparent 30%, black 70%)"
          : "none",
        maskImage: phase === "fadeout"
          ? "radial-gradient(circle, transparent 0%, transparent 30%, black 70%)"
          : "none",
        transitionProperty: "opacity, mask-image, -webkit-mask-image",
        transitionDuration: "0.7s",
      }}
    >
      <style>{`
        @keyframes spin-in-place {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes light-grow {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(14); opacity: 1; }
        }
      `}</style>

      <div
        style={{
          position: "absolute",
          width: "200px",
          height: "200px",
          borderRadius: "50%",
          background: "radial-gradient(circle, #7A7068 0%, #7A706899 40%, #7A706833 70%, transparent 100%)",
          animation: "light-grow 2s cubic-bezier(0.4, 0, 0.2, 1) forwards",
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
