"use client";

import { useEffect, useRef } from "react";
import { ThemeColors } from "@/lib/theme";
import { useBell, bellSrc, formatTime } from "@/lib/use-bell";

interface MeditationModalProps {
  onClose: () => void;
  colors: ThemeColors;
  duration: number;
}

// 수행 종 화면.
//
// 부모(page.tsx)가 열 때만 이 컴포넌트를 만든다 (isOpen 을 안에서 보지 않는다).
// 그래야 열 때마다 상태가 새로 시작하고, 부모가 다시 그려져도 수행이 끊기지 않는다.
export function MeditationModal({ onClose, colors, duration }: MeditationModalProps) {
  const { phase, prepCountdown, remaining, progress, error, start, stop, retry } = useBell(onClose);
  const startedRef = useRef(false);

  // 화면이 열리면 곧바로 준비를 시작한다 (한 번만)
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    start(duration, bellSrc(duration));
  }, [duration, start]);

  const handleStop = () => {
    stop();
    onClose();
  };

  const buttonStyle = {
    backgroundColor: colors.buttonPrimary,
    color: colors.buttonIcon,
    border: `1px solid ${colors.border}`,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: colors.bg }}
      role="dialog"
      aria-modal="true"
      aria-label="수행"
    >
      {phase === "prep" && (
        <>
          <p className="mb-3 text-2xl" style={{ color: colors.text }}>🔊 음량을 올려주세요</p>
          <p className="mb-6 text-sm" style={{ color: colors.textMuted }}>
            {progress < 100 ? `준비 중 ${progress}%` : "준비 완료"}
          </p>
          <p className="text-6xl font-light" style={{ color: colors.text }}>{Math.max(prepCountdown, 0)}</p>
        </>
      )}

      {phase === "meditating" && (
        <>
          <p className="mb-6 text-base" style={{ color: colors.textMuted }}>수행 중</p>
          <p className="text-6xl font-light tabular-nums tracking-wider" style={{ color: colors.text }}>
            {formatTime(remaining)}
          </p>
        </>
      )}

      {/* 예전에는 소리가 안 나오면 카운트다운이 0 에 멈춘 채 아무 말이 없었다 */}
      {phase === "failed" && (
        <>
          <p className="mb-6 text-center text-base" style={{ color: colors.text }}>{error}</p>
          <button
            onClick={retry}
            className="rounded-full px-6 py-2 text-sm font-medium"
            style={{ backgroundColor: colors.categorySelected, color: colors.categorySelectedText }}
          >
            다시 시작
          </button>
        </>
      )}

      <button
        onClick={handleStop}
        className="mt-12 rounded-full px-6 py-2 text-sm font-medium transition-colors"
        style={buttonStyle}
      >
        {phase === "failed" ? "닫기" : "중지"}
      </button>
    </div>
  );
}
