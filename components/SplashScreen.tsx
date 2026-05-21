"use client";

import { useEffect, useState } from "react";
import { ThemeColors } from "@/lib/theme";

interface SplashScreenProps {
  colors: ThemeColors;
  onDone: () => void;
}

export function SplashScreen({ colors, onDone }: SplashScreenProps) {
  const [phase, setPhase] = useState<"show" | "fadeout">("show");
  const [wheelColor, setWheelColor] = useState(colors.buttonIcon);

  useEffect(() => {
    // 법륜 색상을 노란색으로 천천히 변경
    const colorTimer = setTimeout(() => setWheelColor("#FFD700"), 100);
    const fadeTimer = setTimeout(() => setPhase("fadeout"), 2000);
    const doneTimer = setTimeout(() => onDone(), 2700);
    return () => {
      clearTimeout(colorTimer);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone, colors.buttonIcon]);

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
          background: "radial-gradient(circle, #F8E8C8 0%, #F8E8C899 40%, #F8E8C833 70%, transparent 100%)",
          animation: "light-grow 2s cubic-bezier(0.4, 0, 0.2, 1) forwards",
          pointerEvents: "none",
        }}
      />

      <div style={{ animation: "spin-in-place 8s linear infinite", position: "relative", zIndex: 1 }}>
        <svg width="160" height="160" viewBox="0 0 100 100" style={{ transition: "all 1.8s ease-in" }}>
          <circle
            cx={center} cy={center} r={outerRadius}
            stroke={wheelColor}
            strokeWidth="4"
            fill="none"
            style={{ transition: "stroke 1.8s ease-in" }}
          />
          {spokeAngles.map((angle, i) => {
            const x1 = center + innerRadius * Math.cos(angle);
            const y1 = center + innerRadius * Math.sin(angle);
            const x2 = center + outerRadius * Math.cos(angle);
            const y2 = center + outerRadius * Math.sin(angle);
            return (
              <line key={i}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={wheelColor}
                strokeWidth="4"
                strokeLinecap="round"
                style={{ transition: "stroke 1.8s ease-in" }}
              />
            );
          })}
          <circle
            cx={center} cy={center} r={innerRadius}
            fill={wheelColor}
            style={{ transition: "fill 1.8s ease-in" }}
          />
        </svg>
      </div>
    </div>
  );
}
