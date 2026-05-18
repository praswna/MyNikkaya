"use client";

import { Theme, ThemeColors } from "@/lib/theme";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  onThemeToggle: () => void;
  fontScale: number;
  onFontScaleChange: (scale: number) => void;
  onMeditationStart: () => void;
  colors: ThemeColors;
}

export function SettingsModal({
  isOpen,
  onClose,
  theme,
  onThemeToggle,
  fontScale,
  onFontScaleChange,
  onMeditationStart,
  colors,
}: SettingsModalProps) {
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
        <button
          onClick={() => {
            onMeditationStart();
            onClose();
          }}
          className="w-full rounded-xl py-3 text-sm font-medium transition-colors"
          style={{
            backgroundColor: colors.categorySelected,
            color: colors.categorySelectedText,
          }}
        >
          🔔 수행 시작 (1시간)
        </button>
      </div>
    </>
  );
}
