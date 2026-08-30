"use client";

import { useBell, bellSrc, formatTime } from "@/lib/use-bell";
import { THEMES } from "@/lib/theme";

const BELL_FILES = [
  { duration: 15 * 60, label: "15분" },
  { duration: 30 * 60, label: "30분" },
  { duration: 60 * 60, label: "1시간" },
];

// 이 페이지는 테마 전환이 없으므로 다크 색만 쓴다 (색은 lib/theme.ts 한 곳에서 가져온다)
const colors = THEMES.dark;

export default function BellPage() {
  const { phase, prepCountdown, remaining, progress, error, start, stop, retry } = useBell();

  const spokeAngles = Array.from({ length: 8 }, (_, i) => (i * 45 * Math.PI) / 180);
  const stopButtonStyle = {
    marginTop: "2rem", backgroundColor: colors.buttonPrimary, color: colors.buttonIcon,
    border: `1px solid ${colors.border}`, borderRadius: "2rem", padding: "0.5rem 1.5rem",
    fontSize: "0.85rem", cursor: "pointer",
  };

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
              <button key={file.duration} onClick={() => start(file.duration, bellSrc(file.duration))} style={{
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

      {phase === "prep" && (
        <>
          <p style={{ color: colors.text, fontSize: "1.5rem", marginBottom: "1rem" }}>🔊 음량을 올려주세요</p>
          <p style={{ color: colors.textMuted, fontSize: "0.85rem", marginBottom: "1.5rem" }}>
            {progress < 100 ? `준비 중 ${progress}%` : "준비 완료"}
          </p>
          <p style={{ color: colors.text, fontSize: "4rem", fontWeight: 300 }}>{Math.max(prepCountdown, 0)}</p>
          <button onClick={stop} style={stopButtonStyle}>중지</button>
        </>
      )}

      {phase === "meditating" && (
        <>
          <p style={{ color: colors.textMuted, fontSize: "0.85rem", marginBottom: "1.5rem" }}>수행 중</p>
          <p style={{ color: colors.text, fontSize: "3.5rem", fontWeight: 300, letterSpacing: "0.05em" }}>
            {formatTime(remaining)}
          </p>
          <button onClick={stop} style={stopButtonStyle}>중지</button>
        </>
      )}

      {phase === "failed" && (
        <>
          <p style={{ color: colors.text, fontSize: "1rem", textAlign: "center", padding: "0 1.5rem" }}>{error}</p>
          <button onClick={retry} style={{
            marginTop: "1.5rem", backgroundColor: colors.categorySelected, color: colors.categorySelectedText,
            border: "none", borderRadius: "2rem", padding: "0.5rem 1.5rem", fontSize: "0.85rem", cursor: "pointer",
          }}>다시 시작</button>
        </>
      )}
    </div>
  );
}
