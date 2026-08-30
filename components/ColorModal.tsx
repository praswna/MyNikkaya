"use client";

import { useState } from "react";
import { COLOR_GROUPS, formatColors, mergeColors, useColorActions, useColorOverrides } from "@/lib/colors";
import { THEMES, type Theme, type ThemeColors } from "@/lib/theme";
import { useEscape } from "@/lib/use-escape";

interface ColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  colors: ThemeColors;
}

// 색 조절.
// 뒤를 가리지 않게 아래쪽에 두어, 고르는 대로 본문이 바뀌는 것이 바로 보인다.
// 다크와 라이트는 따로 기억하므로, 지금 보고 있는 테마의 색만 고친다.
export function ColorModal({ isOpen, onClose, theme, colors }: ColorModalProps) {
  const overrides = useColorOverrides();
  const { setColor, resetTheme } = useColorActions();
  const [copied, setCopied] = useState(false);

  useEscape(isOpen, onClose);
  if (!isOpen) return null;

  const current = mergeColors(theme, overrides);
  const changedCount = Object.keys(overrides[theme] ?? {}).filter(
    (key) => current[key as keyof ThemeColors] !== THEMES[theme][key as keyof ThemeColors],
  ).length;

  const handleCopy = async () => {
    const text = formatColors(overrides);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="색 조절"
        className="fixed bottom-28 left-1/2 z-50 w-80 -translate-x-1/2 rounded-2xl p-4 shadow-2xl"
        style={{
          backgroundColor: colors.bgSecondary,
          border: `1px solid ${colors.border}`,
          maxHeight: "calc(100dvh - 8rem)",
          overflowY: "auto",
          overscrollBehavior: "contain",
        }}
      >
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold" style={{ color: colors.text }}>색 조절</h2>
          <span className="text-[11px]" style={{ color: colors.textMuted }}>
            {theme === "dark" ? "다크" : "라이트"}
            {changedCount > 0 && ` · ${changedCount}개 바꿈`}
          </span>
        </div>
        <p className="mb-3 text-[11px]" style={{ color: colors.textMuted }}>
          지금 보고 있는 테마의 색을 고칩니다. 고르는 대로 바로 바뀝니다.
        </p>

        {COLOR_GROUPS.map((group) => (
          <div key={group.title} className="mb-3">
            <p className="mb-1 px-0.5 text-[11px] font-medium" style={{ color: colors.textMuted }}>
              {group.title}
            </p>
            {group.fields.map((field) => {
              const value = current[field.key];
              const isChanged = value !== THEMES[theme][field.key];
              return (
                <label
                  key={field.key}
                  className="mb-1 flex items-center gap-2 rounded-lg px-2 py-1.5"
                  style={{ backgroundColor: colors.bg }}
                >
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => setColor(theme, field.key, e.target.value.toUpperCase())}
                    aria-label={field.label}
                    className="h-7 w-7 shrink-0 cursor-pointer rounded"
                    style={{ padding: 0, border: `1px solid ${colors.border}`, backgroundColor: "transparent" }}
                  />
                  <span className="min-w-0 flex-1 text-xs" style={{ color: colors.text }}>
                    {field.label}
                    {field.hint && (
                      <span className="ml-1 text-[10px]" style={{ color: colors.textMuted }}>{field.hint}</span>
                    )}
                  </span>
                  <span
                    className="shrink-0 text-[10px] tabular-nums"
                    style={{ color: isChanged ? colors.textBold : colors.textMuted }}
                  >
                    {value}
                  </span>
                </label>
              );
            })}
          </div>
        ))}

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => resetTheme(theme)}
            className="rounded-xl px-3 py-2.5 text-sm font-medium"
            style={{ backgroundColor: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` }}
          >되돌리기</button>
          <button
            onClick={handleCopy}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium"
            style={{ backgroundColor: colors.categorySelected, color: colors.categorySelectedText }}
          >{copied ? "복사됨 ✓" : "값 복사"}</button>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed" style={{ color: colors.textMuted }}>
          복사하면 다크·라이트 두 벌이 모두 담깁니다. 바꾼 것에는 표시가 붙습니다.
        </p>
      </div>
    </>
  );
}
