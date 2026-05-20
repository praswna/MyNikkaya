"use client";

import { useEffect, useState } from "react";
import { Theme, ThemeColors } from "@/lib/theme";

interface Link {
  name: string;
  url: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  onThemeToggle: () => void;
  fontScale: number;
  onFontScaleChange: (scale: number) => void;
  onMeditationStart: (duration: number) => void;
  onQROpen: () => void;
  colors: ThemeColors;
}

const BELL_FILES: { duration: number; label: string; src: string }[] = [
  { duration: 15 * 60, label: "15분", src: "/bell_15m.mp3" },
  { duration: 30 * 60, label: "30분", src: "/bell_30m.mp3" },
  { duration: 60 * 60, label: "1시간", src: "/bell_1h.mp3" },
];

export function SettingsModal({
  isOpen,
  onClose,
  theme,
  onThemeToggle,
  fontScale,
  onFontScaleChange,
  onMeditationStart,
  onQROpen,
  colors,
}: SettingsModalProps) {
  const [links, setLinks] = useState<Link[]>([]);
  useEffect(() => {
    if (!isOpen) return;
    fetch("/links.json")
      .then((r) => r.json())
      .then((data) => setLinks(data))
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const isLight = theme === "light";

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />
      <div
        className="fixed bottom-28 left-1/2 z-50 w-72 -translate-x-1/2 rounded-2xl p-5 shadow-2xl"
        style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
      >
        <h2 className="mb-5 text-center text-sm font-semibold tracking-wide" style={{ color: colors.textMuted }}>
          설정
        </h2>

        {/* 다크/라이트 모드 토글 */}
        <div className="mb-5 flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: colors.text }}>
            {isLight ? "☀️ 라이트 모드" : "🌙 다크 모드"}
          </span>
          <button
            onClick={onThemeToggle}
            aria-label="테마 토글"
            style={{
              position: "relative",
              width: "44px",
              height: "24px",
              borderRadius: "12px",
              backgroundColor: isLight ? colors.categorySelected : colors.categoryBorder,
              transition: "background-color 0.2s",
              padding: 0,
              border: "none",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: "2px",
                left: "2px",
                width: "20px",
                height: "20px",
                borderRadius: "10px",
                backgroundColor: colors.text,
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                transform: isLight ? "translateX(20px)" : "translateX(0)",
                transition: "transform 0.2s",
              }}
            />
          </button>
        </div>

        {/* 글자 크기 슬라이더 */}
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: colors.text }}>
              글자 크기
            </span>
            <span className="text-xs" style={{ color: colors.textMuted }}>
              {Math.round(fontScale * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: colors.textMuted }}>가</span>
            <input
              type="range"
              min="0.7"
              max="1.5"
              step="0.05"
              value={fontScale}
              onChange={(e) => onFontScaleChange(parseFloat(e.target.value))}
              className="flex-1 accent-[#9B8B7E]"
            />
            <span className="text-base font-bold" style={{ color: colors.textMuted }}>가</span>
          </div>
        </div>

        {/* 수행 시작 버튼 */}
        <div className="flex gap-2 mb-5">
          {BELL_FILES.map((file) => (
            <button
              key={file.duration}
              onClick={() => { onMeditationStart(file.duration); onClose(); }}
              className="flex-1 rounded-xl py-3 text-sm font-medium transition-colors"
              style={{ backgroundColor: colors.categorySelected, color: colors.categorySelectedText }}
            >
              🔔 {file.label}
            </button>
          ))}
        </div>

        {/* QR 코드 버튼 */}
        <button
          onClick={onQROpen}
          className="w-full rounded-xl py-2 text-sm font-medium transition-colors mb-3"
          style={{
            backgroundColor: colors.bg,
            color: colors.textMuted,
            border: `1px solid ${colors.border}`,
          }}
        >
          📱 QR 코드
        </button>

        {/* 링크 */}
        {links.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide" style={{ color: colors.textMuted }}>
              🔗 참고 사이트
            </p>
            <div className="flex flex-col gap-1">
              {links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg px-3 py-2 text-sm transition-colors"
                  style={{
                    backgroundColor: colors.bg,
                    color: colors.text,
                  }}
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
