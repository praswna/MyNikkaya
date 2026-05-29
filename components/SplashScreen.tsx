"use client";

import { useEffect, useState } from "react";
import { ThemeColors } from "@/lib/theme";

interface SplashScreenProps {
  colors: ThemeColors;
  onDone: () => void;
}

// =============================================
// 스플래시 화면 설정
// =============================================
const SPLASH_SHOW_MS = 1500;  // 스플래시 표시 시간 (ms) - 길수록 오래 보임
const SPLASH_FADE_MS = 700;   // 페이드아웃 시간 (ms)

export function SplashScreen({ colors, onDone }: SplashScreenProps) {
  const [splashFading, setSplashFading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setSplashFading(true), SPLASH_SHOW_MS);
    const doneTimer = setTimeout(() => {
      setShowSplash(false);
      onDone();
    }, SPLASH_SHOW_MS + SPLASH_FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  if (!showSplash) return null;

  const center = 50;
  const outerRadius = 38;
  const innerRadius = 10;
  // 법륜 살 각도 (8개, 45도 간격)
  const spokeAngles = Array.from({ length: 8 }, (_, i) => (i * 45 * Math.PI) / 180);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{
        backgroundColor: colors.bg,
        opacity: splashFading ? 0 : 1,
        transition: `opacity ${SPLASH_FADE_MS}ms ease-out`,
      }}
    >
      <style>{`
        @keyframes spin-in-place {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* 법륜 회전 속도: 숫자가 클수록 느리게 회전 (단위: 초) */}
      <div style={{ animation: "spin-in-place 15s linear infinite" }}>
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
