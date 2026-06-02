"use client";

import { useState, useRef, useCallback } from "react";

const PREP_SECONDS = 5;
const BELL_FILES = [
  { duration: 15 * 60, label: "15분", src: "/bell_15m.mp3" },
  { duration: 30 * 60, label: "30분", src: "/bell_30m.mp3" },
  { duration: 60 * 60, label: "1시간", src: "/bell_1h.mp3" },
];

const colors = {
  bg: "#2E2B28",
  bgSecondary: "#3A3630",
  border: "#3A3630",
  text: "#F5F0E8",
  textMuted: "#B8A898",
  buttonPrimary: "#3A3630",
  buttonIcon: "#B8A898",
  categorySelected: "#7A6E62",
  categorySelectedText: "#F0D080",
};

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function BellPage() {
  const [phase, setPhase] = useState<"idle" | "loading" | "meditating">("idle");
  const [prepCountdown, setPrepCountdown] = useState(PREP_SECONDS);
  const [remaining, setRemaining] = useState(0);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const prepIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioReadyRef = useRef(false);

  const cleanup = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (prepIntervalRef.current) { clearInterval(prepIntervalRef.current); prepIntervalRef.current = null; }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
      audioRef.current = null;
    }
    if ("mediaSession" in navigator) {
      try { navigator.mediaSession.metadata = null; navigator.mediaSession.playbackState = "none"; } catch {}
    }
    audioReadyRef.current = false;
  }, []);

  const handleStop = useCallback(() => {
    cleanup();
    setPhase("idle");
    setProgress(0);
    setPrepCountdown(PREP_SECONDS);
  }, [cleanup]);

  const startMeditation = useCallback((duration: number) => {
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
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const left = Math.max(0, duration - elapsed);
        setRemaining(left);
        if (left <= 0) handleStop();
      }, 250);
    }).catch(console.error);
  }, [handleStop]);

  const handleStart = useCallback((duration: number, src: string) => {
    cleanup();
    setRemaining(duration);
    setPhase("loading");
    setProgress(0);
    setPrepCountdown(PREP_SECONDS);
    audioReadyRef.current = false;

    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = 1.0;
    audioRef.current = audio;

    audio.addEventListener("progress", () => {
      if (audio.buffered.length > 0) {
        const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
        setProgress(Math.round((bufferedEnd / (audio.duration || duration)) * 100));
      }
    });
    audio.addEventListener("canplaythrough", () => {
      setProgress(100);
      audioReadyRef.current = true;
    });

    let count = PREP_SECONDS;
    prepIntervalRef.current = setInterval(() => {
      count -= 1;
      setPrepCountdown(count);
      if (count <= 0) {
        if (prepIntervalRef.current) { clearInterval(prepIntervalRef.current); prepIntervalRef.current = null; }
        if (audioReadyRef.current) {
          startMeditation(duration);
        } else {
          const wait = setInterval(() => {
            if (audioReadyRef.current) { clearInterval(wait); startMeditation(duration); }
          }, 200);
        }
      }
    }, 1000);
  }, [cleanup, startMeditation]);

  const spokeAngles = Array.from({ length: 8 }, (_, i) => (i * 45 * Math.PI) / 180);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      height: "100vh", backgroundColor: colors.bg,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {phase === "idle" && (
        <>
          <svg width="80" height="80" viewBox="0 0 100 100" style={{ marginBottom: "2rem", opacity: 0.6 }}>
            <circle cx="50" cy="50" r="38" stroke={colors.buttonIcon} strokeWidth="4" fill="none" />
            {spokeAngles.map((angle, i) => (
              <line key={i}
                x1={50 + 10 * Math.cos(angle)} y1={50 + 10 * Math.sin(angle)}
                x2={50 + 38 * Math.cos(angle)} y2={50 + 38 * Math.sin(angle)}
                stroke={colors.buttonIcon} strokeWidth="4" strokeLinecap="round"
              />
            ))}
            <circle cx="50" cy="50" r="10" fill={colors.buttonIcon} />
          </svg>
          <p style={{ color: colors.textMuted, fontSize: "0.85rem", marginBottom: "2rem" }}>수행 시간을 선택하세요</p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            {BELL_FILES.map((file) => (
              <button key={file.duration} onClick={() => handleStart(file.duration, file.src)} style={{
                backgroundColor: colors.categorySelected, color: colors.categorySelectedText,
                border: "none", borderRadius: "0.75rem", padding: "0.75rem 1.25rem",
                fontSize: "0.9rem", fontWeight: 600, cursor: "pointer",
              }}>
                {file.label}
              </button>
            ))}
          </div>
        </>
      )}

      {phase === "loading" && (
        <>
          <p style={{ color: colors.text, fontSize: "1.5rem", marginBottom: "1rem" }}>🔊 음량을 올려주세요</p>
          <p style={{ color: colors.textMuted, fontSize: "0.85rem", marginBottom: "1.5rem" }}>
            {progress < 100 ? `준비 중 ${progress}%` : "준비 완료"}
          </p>
          <p style={{ color: colors.text, fontSize: "4rem", fontWeight: 300 }}>{prepCountdown}</p>
          <button onClick={handleStop} style={{
            marginTop: "2rem", backgroundColor: colors.buttonPrimary, color: colors.buttonIcon,
            border: `1px solid ${colors.border}`, borderRadius: "2rem", padding: "0.5rem 1.5rem",
            fontSize: "0.85rem", cursor: "pointer",
          }}>중지</button>
        </>
      )}

      {phase === "meditating" && (
        <>
          <p style={{ color: colors.textMuted, fontSize: "0.85rem", marginBottom: "1.5rem" }}>수행 중</p>
          <p style={{ color: colors.text, fontSize: "3.5rem", fontWeight: 300, letterSpacing: "0.05em" }}>
            {formatTime(remaining)}
          </p>
          <button onClick={handleStop} style={{
            marginTop: "2rem", backgroundColor: colors.buttonPrimary, color: colors.buttonIcon,
            border: `1px solid ${colors.border}`, borderRadius: "2rem", padding: "0.5rem 1.5rem",
            fontSize: "0.85rem", cursor: "pointer",
          }}>중지</button>
        </>
      )}
    </div>
  );
}
