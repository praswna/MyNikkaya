"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ThemeColors } from "@/lib/theme";

interface MeditationModalProps {
  isOpen: boolean;
  onClose: () => void;
  colors: ThemeColors;
  duration?: number;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getAudioSrc(duration: number): string {
  if (duration <= 15 * 60) return "/bell_15m.mp3";
  if (duration <= 30 * 60) return "/bell_30m.mp3";
  return "/bell_1h.mp3";
}

export function MeditationModal({ isOpen, onClose, colors, duration = 3600 }: MeditationModalProps) {
  const [phase, setPhase] = useState<"loading" | "meditating" | "done">("loading");
  const [remaining, setRemaining] = useState(duration);
  const [progress, setProgress] = useState(0); // 다운로드 진행률
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const handleStop = useCallback(() => {
    cleanup();
    setPhase("loading");
    setRemaining(duration);
    setProgress(0);
    onClose();
  }, [cleanup, onClose, duration]);

  // 모달 열림 시 오디오 로드 및 재생
  useEffect(() => {
    if (!isOpen) {
      cleanup();
      return;
    }

    const src = getAudioSrc(duration);
    const audio = new Audio(src);
    audio.preload = "auto";
    audioRef.current = audio;

    const handleProgress = () => {
      if (audio.buffered.length > 0) {
        const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
        const total = audio.duration || duration;
        setProgress(Math.round((bufferedEnd / total) * 100));
      }
    };

    const handleCanPlayThrough = () => {
      setProgress(100);
      // 재생 시작
      audio.play().then(() => {
        setPhase("meditating");
        startTimeRef.current = Date.now();

        // 남은 시간 업데이트
        intervalRef.current = setInterval(() => {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          const left = Math.max(0, duration - elapsed);
          setRemaining(left);
          if (left <= 0) {
            cleanup();
            setPhase("done");
            setTimeout(() => handleStop(), 15000);
          }
        }, 250);
      }).catch((e) => console.error("재생 실패:", e));
    };

    audio.addEventListener("progress", handleProgress);
    audio.addEventListener("canplaythrough", handleCanPlayThrough);

    return () => {
      audio.removeEventListener("progress", handleProgress);
      audio.removeEventListener("canplaythrough", handleCanPlayThrough);
      cleanup();
    };
  }, [isOpen, duration, cleanup, handleStop]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: colors.bg }}
    >
      {phase === "loading" && (
        <>
          <p className="mb-4 text-lg" style={{ color: colors.textMuted }}>준비 중...</p>
          <p className="text-5xl font-light" style={{ color: colors.text }}>{progress}%</p>
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

      {phase === "done" && (
        <>
          <p className="mb-4 text-2xl font-light" style={{ color: colors.text }}>수행이 끝났습니다</p>
          <p className="text-sm" style={{ color: colors.textMuted }}>잠시 후 닫힙니다</p>
        </>
      )}

      {(phase === "loading" || phase === "meditating") && (
        <button
          onClick={handleStop}
          className="mt-12 rounded-full px-6 py-2 text-sm font-medium transition-colors"
          style={{
            backgroundColor: colors.buttonPrimary,
            color: colors.buttonIcon,
            border: `1px solid ${colors.border}`,
          }}
        >
          중지
        </button>
      )}
    </div>
  );
}
