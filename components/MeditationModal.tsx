"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ThemeColors } from "@/lib/theme";

interface MeditationModalProps {
  isOpen: boolean;
  onClose: () => void;
  colors: ThemeColors;
  duration?: number; // 수행 시간 (초)
}

// =============================================
// 수행 종 설정
// =============================================
const PREP_SECONDS = 5; // 수행 시작 전 카운트다운 시간 (초)
                        // 이 시간 동안 오디오 다운로드도 진행됨

// 수행 시간별 오디오 파일 매핑
// public/ 폴더에 있는 mp3 파일 이름과 일치해야 함
function getAudioSrc(duration: number): string {
  if (duration <= 15 * 60) return "/bell_15m.mp3"; // 15분 이하
  if (duration <= 30 * 60) return "/bell_30m.mp3"; // 30분 이하
  return "/bell_1h.mp3";                            // 1시간
}

// 시간 표시 형식 변환 (초 → HH:MM:SS)
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function MeditationModal({ isOpen, onClose, colors, duration = 3600 }: MeditationModalProps) {
  // phase: "loading" → 다운로드 중, "meditating" → 수행 중
  const [phase, setPhase] = useState<"loading" | "meditating">("loading");
  const [prepCountdown, setPrepCountdown] = useState(PREP_SECONDS);
  const [remaining, setRemaining] = useState(duration);
  const [progress, setProgress] = useState(0); // 다운로드 진행률 (0~100)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const prepIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioReadyRef = useRef(false);

  // 오디오 및 타이머 전체 정리
  const cleanupAudio = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (prepIntervalRef.current) { clearInterval(prepIntervalRef.current); prepIntervalRef.current = null; }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
      audioRef.current = null;
    }
    // 잠금화면 미디어 컨트롤 제거
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = "none";
      } catch {}
    }
    audioReadyRef.current = false;
  }, []);

  const handleStop = useCallback(() => {
    cleanupAudio();
    setPhase("loading");
    setRemaining(duration);
    setProgress(0);
    setPrepCountdown(PREP_SECONDS);
    onClose();
  }, [cleanupAudio, onClose, duration]);

  const startMeditation = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().then(() => {
      setPhase("meditating");
      startTimeRef.current = Date.now();

      // 잠금화면에 미디어 정보 표시
      if ("mediaSession" in navigator) {
        try {
          navigator.mediaSession.metadata = new MediaMetadata({ title: "수행", artist: "불교 경전" });
          navigator.mediaSession.playbackState = "playing";
        } catch {}
      }

      // 남은 시간 업데이트 (250ms 주기)
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const left = Math.max(0, duration - elapsed);
        setRemaining(left);
        if (left <= 0) handleStop(); // 수행 완료 시 즉시 닫힘
      }, 250);
    }).catch((e) => console.error("재생 실패:", e));
  }, [duration, handleStop]);

  useEffect(() => {
    if (!isOpen) { cleanupAudio(); return; }

    // 오디오 파일 다운로드 시작
    const src = getAudioSrc(duration);
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = 1.0; // 볼륨 (0.0 ~ 1.0)
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
      audioReadyRef.current = true;
    };

    audio.addEventListener("progress", handleProgress);
    audio.addEventListener("canplaythrough", handleCanPlayThrough);

    // 준비 카운트다운 시작 (오디오 다운로드와 동시 진행)
    let count = PREP_SECONDS;
    setPrepCountdown(count);
    prepIntervalRef.current = setInterval(() => {
      count -= 1;
      setPrepCountdown(count);
      if (count <= 0) {
        if (prepIntervalRef.current) { clearInterval(prepIntervalRef.current); prepIntervalRef.current = null; }
        if (audioReadyRef.current) {
          startMeditation();
        } else {
          // 다운로드 미완료 시 완료될 때까지 대기
          const waitForReady = setInterval(() => {
            if (audioReadyRef.current) { clearInterval(waitForReady); startMeditation(); }
          }, 200);
        }
      }
    }, 1000);

    return () => {
      audio.removeEventListener("progress", handleProgress);
      audio.removeEventListener("canplaythrough", handleCanPlayThrough);
      cleanupAudio();
    };
  }, [isOpen, duration, cleanupAudio, startMeditation]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: colors.bg }}
    >
      {phase === "loading" && (
        <>
          {/* 음량 안내 메시지 */}
          <p className="mb-3 text-2xl" style={{ color: colors.text }}>🔊 음량을 올려주세요</p>
          <p className="mb-6 text-sm" style={{ color: colors.textMuted }}>
            {progress < 100 ? `준비 중 ${progress}%` : "준비 완료"}
          </p>
          {/* 카운트다운 숫자 */}
          <p className="text-6xl font-light" style={{ color: colors.text }}>{prepCountdown}</p>
        </>
      )}

      {phase === "meditating" && (
        <>
          <p className="mb-6 text-base" style={{ color: colors.textMuted }}>수행 중</p>
          {/* 남은 시간 표시 */}
          <p className="text-6xl font-light tabular-nums tracking-wider" style={{ color: colors.text }}>
            {formatTime(remaining)}
          </p>
        </>
      )}

      {/* 중지 버튼 */}
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
    </div>
  );
}
