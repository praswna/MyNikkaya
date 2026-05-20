"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ThemeColors } from "@/lib/theme";

interface MeditationModalProps {
  isOpen: boolean;
  onClose: () => void;
  colors: ThemeColors;
  duration?: number;
}

const START_DELAY_SECONDS = 5;

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function MeditationModal({ isOpen, onClose, colors, duration = 3600 }: MeditationModalProps) {
  const [phase, setPhase] = useState<"waiting" | "meditating" | "done">("waiting");
  const [remaining, setRemaining] = useState(duration);
  const [countdown, setCountdown] = useState(START_DELAY_SECONDS);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bellBufferRef = useRef<AudioBuffer | null>(null);
  const silenceSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const endTimeRef = useRef<number>(0);

  // AudioContext 및 종소리 버퍼 로드
  const initAudio = useCallback(async () => {
    try {
      if (!audioCtxRef.current) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AC();
      }
      if (audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }
      if (!bellBufferRef.current) {
        const response = await fetch("/bell.m4a");
        const arrayBuffer = await response.arrayBuffer();
        bellBufferRef.current = await audioCtxRef.current.decodeAudioData(arrayBuffer);
      }
    } catch (e) {
      console.error("Audio init 실패:", e);
    }
  }, []);

  // 무음 트랙 시작 (백그라운드 유지)
  const startSilence = useCallback(() => {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      // 1초짜리 무음 버퍼 생성하고 무한 루프
      const sampleRate = ctx.sampleRate;
      const buffer = ctx.createBuffer(1, sampleRate, sampleRate);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0.001;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      silenceSourceRef.current = source;
    } catch (e) {
      console.error("무음 트랙 시작 실패:", e);
    }
  }, []);

  const stopSilence = useCallback(() => {
    try {
      if (silenceSourceRef.current) {
        silenceSourceRef.current.stop();
        silenceSourceRef.current.disconnect();
        silenceSourceRef.current = null;
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // 종소리 재생
  const playBell = useCallback(() => {
    try {
      const ctx = audioCtxRef.current;
      const buffer = bellBufferRef.current;
      if (!ctx || !buffer) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    } catch (e) {
      console.error("종소리 재생 실패:", e);
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
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(console.error);
      audioCtxRef.current = null;
      bellBufferRef.current = null;
    }
    setPhase("waiting");
    setRemaining(duration);
    setCountdown(START_DELAY_SECONDS);
    onClose();
  }, [cleanup, stopSilence, onClose, duration]);

  // 모달 열림: 오디오 초기화 + 무음 트랙 시작
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      await initAudio();
      startSilence();
    })();
  }, [isOpen, initAudio, startSilence]);

  // 타이머 단계별 처리
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
          endTimeRef.current = Date.now() + duration * 1000;
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
  }, [isOpen, phase, cleanup, playBell, handleStop, duration]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: colors.bg }}
    >
      {phase === "waiting" && (
        <>
          <p className="mb-4 text-lg" style={{ color: colors.textMuted }}>곧 수행이 시작됩니다</p>
          <p className="text-7xl font-light" style={{ color: colors.text }}>{countdown}</p>
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
  );
}
