"use client";

import { ThemeColors } from "@/lib/theme";

// 본문 가로 크기 조절 범위 (px)
// PC 처럼 화면이 넓을 때 글줄이 지나치게 길어지는 것을 막는다.
// 휴대폰은 화면이 이보다 좁아서 어떤 값이든 영향이 없다.
export const CONTENT_WIDTH_MIN = 360;
export const CONTENT_WIDTH_MAX = 1600; // 이 값이면 '제한 없음'으로 본다
export const CONTENT_WIDTH_STEP = 20;
export const CONTENT_WIDTH_DEFAULT = 720;

export function formatContentWidth(width: number): string {
  return width >= CONTENT_WIDTH_MAX ? "제한 없음" : `${width}px`;
}

interface ContentWidthModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentWidth: number;
  onContentWidthChange: (width: number) => void;
  colors: ThemeColors;
}

export function ContentWidthModal({ isOpen, onClose, contentWidth, onContentWidthChange, colors }: ContentWidthModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* 뒤를 가리지 않아야 조절하면서 본문이 좁아지는 걸 바로 볼 수 있다 */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div
        className="fixed bottom-28 left-1/2 z-50 w-72 -translate-x-1/2 rounded-2xl p-5 shadow-2xl"
        style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium" style={{ color: colors.text }}>가로 크기</span>
          <span className="text-xs" style={{ color: colors.textMuted }}>{formatContentWidth(contentWidth)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: colors.textMuted }}>좁게</span>
          <input
            type="range"
            min={CONTENT_WIDTH_MIN}
            max={CONTENT_WIDTH_MAX}
            step={CONTENT_WIDTH_STEP}
            value={contentWidth}
            onChange={(e) => onContentWidthChange(parseInt(e.target.value, 10))}
            className="flex-1 accent-[#9B8B7E]"
          />
          <span className="text-xs" style={{ color: colors.textMuted }}>넓게</span>
        </div>
      </div>
    </>
  );
}
