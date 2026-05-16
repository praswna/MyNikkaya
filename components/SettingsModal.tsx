"use client";

import { Theme, ThemeColors } from "@/lib/theme";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  onThemeToggle: () => void;
  fontScale: number;
  onFontScaleChange: (scale: number) => void;
  colors: ThemeColors;
}

export function SettingsModal({
  isOpen,
  onClose,
  theme,
  onThemeToggle,
  fontScale,
  onFontScaleChange,
  colors,
}: SettingsModalProps) {
  if (!isOpen) return null;

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
            {theme === "dark" ? "🌙 다크 모드" : "☀️ 라이트 모드"}
          </span>
          <button
            onClick={onThemeToggle}
            className="relative h-7 w-12 rounded-full transition-colors duration-200"
            style={{ backgroundColor: theme === "dark" ? colors.categorySelected : colors.categoryBorder }}
          >
            <span
              className="absolute top-0.5 h-6 w-6 rounded-full shadow transition-transform duration-200"
              style={{
                backgroundColor: colors.bg,
                transform: theme === "dark" ? "translateX(22px)" : "translateX(2px)",
              }}
            />
          </button>
        </div>

        {/* 글자 크기 슬라이더 */}
        <div>
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
      </div>
    </>
  );
}
