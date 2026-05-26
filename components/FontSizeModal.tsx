"use client";

import { ThemeColors } from "@/lib/theme";

interface FontSizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  fontScale: number;
  onFontScaleChange: (scale: number) => void;
  colors: ThemeColors;
}

export function FontSizeModal({ isOpen, onClose, fontScale, onFontScaleChange, colors }: FontSizeModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div
        className="fixed bottom-28 left-1/2 z-50 w-72 -translate-x-1/2 rounded-2xl p-5 shadow-2xl"
        style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium" style={{ color: colors.text }}>글자 크기</span>
          <span className="text-xs" style={{ color: colors.textMuted }}>{Math.round(fontScale * 100)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: colors.textMuted }}>가</span>
          <input
            type="range"
            min="0.7"
            max="2.5"
            step="0.05"
            value={fontScale}
            onChange={(e) => onFontScaleChange(parseFloat(e.target.value))}
            className="flex-1 accent-[#9B8B7E]"
          />
          <span className="text-base font-bold" style={{ color: colors.textMuted }}>가</span>
        </div>
      </div>
    </>
  );
}
