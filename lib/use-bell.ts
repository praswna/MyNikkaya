"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// =============================================
// 수행(명상) 종 재생
//
// 설정 팝업의 수행 버튼과 /bell 페이지가 같은 일을 하므로 여기 한 곳에 둔다.
//
// 통짜 mp3(종+무음+종)를 처음부터 끝까지 틀어 둔다.
// 아이폰은 화면이 꺼지면 타이머가 멈추므로, 남은 시간은 흐른 시각으로 계산한다.
// =============================================

export type BellPhase = "idle" | "prep" | "meditating" | "failed";

export const PREP_SECONDS = 5;

// 소리를 이만큼 기다려도 준비가 안 되면 포기하고 알려준다
const WAIT_LIMIT_MS = 30000;

export interface BellState {
  phase: BellPhase;
  prepCountdown: number;
  remaining: number;
  progress: number;
  error: string | null;
  start: (duration: number, src: string) => void;
  stop: () => void;
  retry: () => void;
}

export function useBell(onFinish?: () => void): BellState {
  const [phase, setPhase] = useState<BellPhase>("idle");
  const [prepCountdown, setPrepCountdown] = useState(PREP_SECONDS);
  const [remaining, setRemaining] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // 돌고 있는 타이머를 한 곳에 모아 둔다. 하나라도 빠뜨리면 멈춘 뒤에도 계속 돈다.
  const timersRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const startTimeRef = useRef(0);
  const lastRef = useRef<{ duration: number; src: string } | null>(null);

  // 끝났을 때 부를 함수는 ref 로 들고 있는다.
  // 이걸 의존성에 넣으면 부모가 다시 그려질 때마다 수행이 처음부터 다시 시작된다.
  const onFinishRef = useRef(onFinish);
  useEffect(() => { onFinishRef.current = onFinish; });

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearInterval);
    timersRef.current = [];
  }, []);

  const cleanup = useCallback(() => {
    clearTimers();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
      audioRef.current = null;
    }
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = "none";
      } catch {}
    }
  }, [clearTimers]);

  // 화면을 벗어날 때도 반드시 정리한다
  useEffect(() => cleanup, [cleanup]);

  const stop = useCallback(() => {
    cleanup();
    setPhase("idle");
    setPrepCountdown(PREP_SECONDS);
    setProgress(0);
    setError(null);
  }, [cleanup]);

  const fail = useCallback((message: string) => {
    cleanup();
    setError(message);
    setPhase("failed");
  }, [cleanup]);

  const play = useCallback((duration: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().then(() => {
      setPhase("meditating");
      startTimeRef.current = Date.now();

      if ("mediaSession" in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({ title: "수행", artist: "불교 경전" });
          navigator.mediaSession.playbackState = "playing";
        } catch {}
      }

      const tick = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const left = Math.max(0, duration - elapsed);
        setRemaining(left);
        if (left <= 0) {
          cleanup();
          setPhase("idle");
          setPrepCountdown(PREP_SECONDS);
          onFinishRef.current?.();
        }
      }, 250);
      timersRef.current.push(tick);
    }).catch(() => {
      // 소리를 막아 둔 브라우저에서 여기로 온다. 예전에는 카운트다운이 0 에서 멈춘 채 아무 말이 없었다.
      fail("소리를 재생하지 못했습니다. 화면을 한 번 누른 뒤 다시 시작해 주세요.");
    });
  }, [cleanup, fail]);

  const start = useCallback((duration: number, src: string) => {
    cleanup();
    lastRef.current = { duration, src };
    setError(null);
    setRemaining(duration);
    setProgress(0);
    setPrepCountdown(PREP_SECONDS);
    setPhase("prep");

    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = 1.0;
    audioRef.current = audio;

    // 정리하면서 src 를 비우면 error 이벤트가 뒤늦게 온다.
    // 그 소리는 이미 버린 것이므로, 지금 쓰는 소리일 때만 반응한다.
    const isCurrent = () => audioRef.current === audio;

    let ready = false;
    audio.addEventListener("progress", () => {
      if (!isCurrent() || audio.buffered.length === 0) return;
      const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
      setProgress(Math.min(100, Math.round((bufferedEnd / (audio.duration || duration)) * 100)));
    });
    audio.addEventListener("canplaythrough", () => {
      if (!isCurrent()) return;
      ready = true;
      setProgress(100);
    });
    audio.addEventListener("error", () => {
      if (!isCurrent()) return;
      fail("소리 파일을 받지 못했습니다. 연결을 확인해 주세요.");
    });

    let count = PREP_SECONDS;
    const countdown = setInterval(() => {
      count -= 1;
      setPrepCountdown(count);
      if (count > 0) return;

      clearInterval(countdown);
      if (ready) {
        play(duration);
        return;
      }

      // 아직 다 못 받았으면 기다렸다 시작한다.
      // 기다리는 타이머도 timersRef 에 넣어야 중지했을 때 같이 멈춘다.
      const waitStarted = Date.now();
      const waiting = setInterval(() => {
        if (ready) {
          clearInterval(waiting);
          play(duration);
        } else if (Date.now() - waitStarted > WAIT_LIMIT_MS) {
          fail("소리를 준비하지 못했습니다. 연결을 확인하고 다시 시작해 주세요.");
        }
      }, 200);
      timersRef.current.push(waiting);
    }, 1000);
    timersRef.current.push(countdown);
  }, [cleanup, fail, play]);

  const retry = useCallback(() => {
    const last = lastRef.current;
    if (last) start(last.duration, last.src);
  }, [start]);

  return { phase, prepCountdown, remaining, progress, error, start, stop, retry };
}

// 수행 시간별 오디오 파일 (public/ 폴더의 mp3)
export function bellSrc(duration: number): string {
  if (duration <= 15 * 60) return "/bell_15m.mp3";
  if (duration <= 30 * 60) return "/bell_30m.mp3";
  return "/bell_1h.mp3";
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
