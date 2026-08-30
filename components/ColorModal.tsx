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
//
// 고르는 대로 본문이 바뀌는 것을 봐야 하므로, 화면을 덮지 않는 것이 가장 중요하다.
// 오른쪽 아래 구석에 작게 두고, 묶음은 한 번에 하나만 펼친다.
// 그래야 위쪽에 제목과 첫 줄들이 남는다.
export function ColorModal({ isOpen, onClose, theme, colors }: ColorModalProps) {
  const overrides = useColorOverrides();
  const { setColor, resetTheme } = useColorActions();
  const [openGroup, setOpenGroup] = useState(COLOR_GROUPS[0].title);
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
    <div
      role="dialog"
      aria-modal="false"
      aria-label="색 조절"
      className="fixed z-50 flex flex-col rounded-2xl shadow-2xl"
      style={{
        // 오른쪽 아래 구석 - 위쪽은 본문이 보이게 비워 둔다
        right: "0.5rem",
        bottom: "calc(env(safe-area-inset-bottom) + 6.5rem)",
        width: "min(17rem, calc(100vw - 1rem))",
        maxHeight: "46dvh",
        backgroundColor: colors.bgSecondary,
        border: `1px solid ${colors.border}`,
      }}
    >
      {/* 머리 */}
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-2">
        <h2 className="flex-1 text-xs font-semibold" style={{ color: colors.text }}>
          색 조절
          <span className="ml-1.5 font-normal" style={{ color: colors.textMuted }}>
            {theme === "dark" ? "다크" : "라이트"}{changedCount > 0 && ` · ${changedCount}`}
          </span>
        </h2>
        <button
          onClick={onClose}
          aria-label="닫기"
          className="flex h-6 w-6 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.bg, color: colors.textMuted }}
        >✕</button>
      </div>

      {/* 묶음 - 한 번에 하나만 펼친다 */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2" style={{ overscrollBehavior: "contain" }}>
        {COLOR_GROUPS.map((group) => {
          const isOpen = openGroup === group.title;
          return (
            <div key={group.title} className="mb-1">
              <button
                onClick={() => setOpenGroup(isOpen ? "" : group.title)}
                className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[11px] font-medium"
                style={{ color: isOpen ? colors.text : colors.textMuted, backgroundColor: isOpen ? colors.bg : "transparent" }}
              >
                <span className="w-2 text-[9px]">{isOpen ? "▾" : "▸"}</span>
                <span className="flex-1">{group.title}</span>
                <span className="flex gap-0.5">
                  {group.fields.slice(0, 5).map((f) => (
                    <span key={f.key} className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: current[f.key], border: `1px solid ${colors.border}` }} />
                  ))}
                </span>
              </button>

              {isOpen && group.fields.map((field) => {
                const value = current[field.key];
                const isChanged = value !== THEMES[theme][field.key];
                return (
                  <label key={field.key} className="mt-0.5 flex items-center gap-2 rounded-lg px-2 py-1">
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => setColor(theme, field.key, e.target.value.toUpperCase())}
                      aria-label={field.label}
                      className="h-6 w-6 shrink-0 cursor-pointer rounded"
                      style={{ padding: 0, border: `1px solid ${colors.border}`, backgroundColor: "transparent" }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[11px]" style={{ color: colors.text }}>
                      {field.label}
                      {field.hint && <span className="ml-1 text-[9px]" style={{ color: colors.textMuted }}>{field.hint}</span>}
                    </span>
                    <span className="shrink-0 text-[9px] tabular-nums"
                      style={{ color: isChanged ? colors.textBold : colors.textMuted }}>
                      {value}
                    </span>
                  </label>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* 발 */}
      <div className="flex gap-1.5 px-2 pb-2 pt-1.5" style={{ borderTop: `1px solid ${colors.border}` }}>
        <button
          onClick={() => resetTheme(theme)}
          className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium"
          style={{ backgroundColor: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` }}
        >되돌리기</button>
        <button
          onClick={handleCopy}
          className="flex-1 rounded-lg py-1.5 text-[11px] font-medium"
          style={{ backgroundColor: colors.categorySelected, color: colors.categorySelectedText }}
        >{copied ? "복사됨 ✓ 두 테마 모두" : "값 복사"}</button>
      </div>
    </div>
  );
}
