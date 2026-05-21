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
    const doneTimer = setTimeout(() => onDone(), 3000);
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
        @keyframes mask-expand {
          0% {
            -webkit-mask-image: radial-gradient(circle, transparent 0%, black 0%);
            mask-image: radial-gradient(circle, transparent 0%, black 0%);
          }
          50% {
            -webkit-mask-image: radial-gradient(circle, transparent 30%, black 60%);
            mask-image: radial-gradient(circle, transparent 30%, black 60%);
          }
          100% {
            -webkit-mask-image: radial-gradient(circle, transparent 100%, black 150%);
            mask-image: radial-gradient(circle, transparent 100%, black 150%);
          }
        }
      `}</style>

      <div
        style={{
          position: "absolute",
          inset: 0,
          animation: phase === "fadeout" ? "mask-expand 1s ease-in forwards" : "none",
        }}
      >
        <div className="absolute inset-0" style={{ backgroundColor: "#000000" }} />

        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background: "radial-gradient(circle, #7A7068 0%, #7A706899 40%, #7A706833 70%, transparent 100%)",
            animation: "light-grow 2s cubic-bezier(0.4, 0, 0.2, 1) forwards",
            pointerEvents: "none",
          }}
        />

        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          animation: "spin-in-place 8s linear infinite",
          zIndex: 1,
        }}>
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
