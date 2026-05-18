"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ThemeColors } from "@/lib/theme";

interface MeditationModalProps {
  isOpen: boolean;
  onClose: () => void;
  colors: ThemeColors;
}

const TOTAL_SECONDS = 60 * 60; // 1시간
const START_DELAY_SECONDS = 5;

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function MeditationModal({ isOpen, onClose, colors }: MeditationModalProps) {
  const [phase, setPhase] = useState<"waiting" | "meditating" | "done">("waiting");
  const [remaining, setRemaining] = useState(TOTAL_SECONDS);
  const [countdown, setCountdown] = useState(START_DELAY_SECONDS);
  const bellRef = useRef<HTMLAudioElement | null>(null);
  const silenceRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const endTimeRef = useRef<number>(0);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const playBell = useCallback(() => {
    try {
      if (bellRef.current) {
        bellRef.current.currentTime = 0;
        bellRef.current.play().catch((e) => console.warn("종소리 재생 실패:", e));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const startSilence = useCallback(() => {
    try {
      if (silenceRef.current) {
        silenceRef.current.loop = true;
        silenceRef.current.volume = 0.01;
        silenceRef.current.play().catch((e) => console.warn("무음 재생 실패:", e));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const stopSilence = useCallback(() => {
    try {
      if (silenceRef.current) {
        silenceRef.current.pause();
        silenceRef.current.currentTime = 0;
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }
    } catch (e) {
      console.warn("Wake Lock 실패:", e);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handleStop = useCallback(() => {
    cleanup();
    stopSilence();
    releaseWakeLock();
    setPhase("waiting");
    setRemaining(TOTAL_SECONDS);
    setCountdown(START_DELAY_SECONDS);
    onClose();
  }, [cleanup, stopSilence, releaseWakeLock, onClose]);

  // 모달 열림/닫힘 처리
  useEffect(() => {
    if (!isOpen) {
      cleanup();
      stopSilence();
      releaseWakeLock();
      setPhase("waiting");
      setRemaining(TOTAL_SECONDS);
      setCountdown(START_DELAY_SECONDS);
      return;
    }

    // 모달 열리면 무음 트랙 시작 + Wake Lock 요청
    startSilence();
    requestWakeLock();
  }, [isOpen, cleanup, stopSilence, releaseWakeLock, startSilence, requestWakeLock]);

  // 단계별 타이머
  useEffect(() => {
    if (!isOpen) return;

    if (phase === "waiting") {
      let count = START_DELAY_SECONDS;
      setCountdown(count);
      intervalRef.current = setInterval(() => {
        count -= 1;
        setCountdown(count);
        if (count <= 0) {
          cleanup();
          playBell();
          setPhase("meditating");
          endTimeRef.current = Date.now() + TOTAL_SECONDS * 1000;
        }
      }, 1000);
    } else if (phase === "meditating") {
      intervalRef.current = setInterval(() => {
        const remainingMs = Math.max(0, endTimeRef.current - Date.now());
        const remainingSec = Math.ceil(remainingMs / 1000);
        setRemaining(remainingSec);
        if (remainingSec <= 0) {
          cleanup();
          playBell();
          setPhase("done");
          setTimeout(() => handleStop(), 15000);
        }
      }, 250);
    }

    return cleanup;
  }, [isOpen, phase, cleanup, playBell, handleStop]);

  // 백그라운드 → 포그라운드 전환 시 Wake Lock 재요청
  useEffect(() => {
    if (!isOpen) return;
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isOpen, requestWakeLock]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{ backgroundColor: colors.bg }}
      >
        <audio ref={bellRef} src="/bell.m4a" preload="auto" />
        <audio ref={silenceRef} src="/silence.mp3" preload="auto" loop />

        {phase === "waiting" && (
          <>
            <p className="mb-4 text-lg" style={{ color: colors.textMuted }}>곧 수행이 시작됩니다</p>
            <p className="text-7xl font-light" style={{ color: colors.text }}>
              {countdown}
            </p>
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

        {(phase === "waiting" || phase === "meditating") && (
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
    </>
  );
}
