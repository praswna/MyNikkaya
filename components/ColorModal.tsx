"use client";

import { useEffect, useRef, useState } from "react";
import { COLOR_PALETTES, findColorPalette, pickRandomPalette, type ColorPalette } from "@/lib/color-palettes";
import { COLOR_GROUPS, formatColors, mergeColors, useColorActions, useColorOverrides } from "@/lib/colors";
import { SETTINGS_GROUP } from "@/lib/settings-sync";
import { type ThemeColors } from "@/lib/theme";
import { DEFAULT_COLORS } from "@/lib/color-storage";
import { useEscape } from "@/lib/use-escape";
import { SavedPalettes } from "./SavedPalettes";
import {
  parseSavedPalettes, replaceSavedPalettes, useSavedPalettes, SAVED_PALETTES_KEY,
} from "@/lib/saved-palettes";

interface ColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  colors: ThemeColors;
  // 딸림글(루비)을 둘레색에서 본문색 쪽으로 당기는 정도 (0~1)
  rubyEmphasis: number;
  onRubyEmphasisChange: (value: number) => void;
  // 시트의 "설정" 탭과 "내 배색"(프리셋) 목록만 주고받는다
  // - 저절로 오가지 않고 아래 버튼을 누를 때만 오간다
  onSheetSave: (group: string, entries: Record<string, string>) => void;
  onSheetLoad: (group: string) => Promise<Record<string, string> | null>;
}

// 색 조절.
//
// 고르는 대로 본문이 바뀌는 것을 봐야 하므로, 화면을 덮지 않는 것이 가장 중요하다.
// 오른쪽 아래 구석에 작게 두고, 묶음은 한 번에 하나만 펼친다.
// 그래야 위쪽에 제목과 첫 줄들이 남는다.
export function ColorModal({
  isOpen, onClose, colors, rubyEmphasis, onRubyEmphasisChange, onSheetSave, onSheetLoad,
}: ColorModalProps) {
  const overrides = useColorOverrides();
  // 시트와 주고받는 것은 이 목록(내 배색)뿐이다 - 지금 쓰는 색은 기기마다 다른 것이
  // 자연스러워 담지 않는다 (크기 쪽의 프리셋과 같은 자리다).
  const savedPalettes = useSavedPalettes();
  const { setColor, setColors, resetColors } = useColorActions();
  const [openGroup, setOpenGroup] = useState(COLOR_GROUPS[0].title);
  const [copied, setCopied] = useState(false);
  const recentPaletteIds = useRef<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  // 랜덤으로 거쳐 간 배색을 기록해 뒤로·앞으로 다시 볼 수 있게 한다.
  // 창을 닫아도 유지되고(컴포넌트가 계속 떠 있음), 페이지를 새로 열면 초기화된다.
  const [history, setHistory] = useState<ColorPalette[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEscape(isOpen, onClose);

  // 창 바깥을 누르면 닫는다 (포커스를 잃으면 사라진다). 창 안의 색 조각·슬라이더·버튼은 걸리지 않는다.
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const current = mergeColors(overrides);
  const activePalette = findColorPalette(current);
  const changedCount = Object.keys(overrides).filter(
    (key) => current[key as keyof ThemeColors] !== DEFAULT_COLORS[key as keyof ThemeColors],
  ).length;
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex >= 0 && historyIndex < history.length - 1;

  const handleRandomColors = () => {
    const next = pickRandomPalette(current, recentPaletteIds.current);
    recentPaletteIds.current = [...recentPaletteIds.current, next.id].slice(-8);
    setColors(next.colors);
    // 앞으로 갈 수 있던 기록이 있었다면 여기서 새 갈래로 갈아끼운다 (되돌리기 이후 새로 고르는 것과 같다).
    setHistory([...history.slice(0, historyIndex + 1), next]);
    setHistoryIndex(historyIndex + 1);
  };

  const goToHistory = (index: number) => {
    const palette = history[index];
    if (!palette) return;
    setColors(palette.colors);
    setHistoryIndex(index);
  };

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

  // 시트와는 "내 배색"(프리셋)만 주고받는다.
  //
  // 지금 쓰는 색은 기기마다 다른 것이 자연스럽다 - 폰에서 맞춘 배색을 PC 값으로
  // 덮어쓰면 오히려 불편하다. 반면 모아 둔 배색은 사람이 만든 것이라 기기를 바꿔도
  // 따라와야 한다 (크기 쪽의 프리셋과 같은 자리다).
  const handleSheetSave = () => {
    onSheetSave(SETTINGS_GROUP.color, { [SAVED_PALETTES_KEY]: JSON.stringify(savedPalettes) });
  };

  // 시트 값이 망가져 있어도 목록이 깨지지 않게, parseSavedPalettes 가 항목을 걸러낸다.
  // 불러와도 지금 보고 있는 배색은 그대로 둔다 - 목록에서 눌러 골라야 바뀐다.
  const handleSheetLoad = async () => {
    const entries = await onSheetLoad(SETTINGS_GROUP.color);
    if (!entries) return;
    const raw = entries[SAVED_PALETTES_KEY];
    if (raw) replaceSavedPalettes(parseSavedPalettes(raw));
  };

  return (
    <div
      ref={rootRef}
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
            {changedCount > 0 && `${changedCount}개 변경`}
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
        <section aria-label="랜덤 배색" className="mb-2 px-1">
          <div className="flex items-stretch gap-1">
            <button
              type="button"
              onClick={() => goToHistory(historyIndex - 1)}
              disabled={!canGoBack}
              aria-label="이전 배색"
              className="flex min-h-11 w-9 shrink-0 items-center justify-center rounded-lg disabled:opacity-30"
              style={{ backgroundColor: colors.bg, color: colors.text }}
            >
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleRandomColors}
              aria-describedby="random-colors-help"
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ backgroundColor: colors.categorySelected, color: colors.categorySelectedText, outlineColor: colors.textBold }}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="m18 3 3 3-3 3M18 15l3 3-3 3M3 6h3c5 0 7 12 12 12h3M3 18h3c2 0 3.5-2 5-4.5M13 10.5C14.5 8 16 6 18 6h3" />
              </svg>
              랜덤 배색
            </button>
            <button
              type="button"
              onClick={() => goToHistory(historyIndex + 1)}
              disabled={!canGoForward}
              aria-label="다음 배색"
              className="flex min-h-11 w-9 shrink-0 items-center justify-center rounded-lg disabled:opacity-30"
              style={{ backgroundColor: colors.bg, color: colors.text }}
            >
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
            <span role="status" aria-live="polite" style={{ color: colors.text }}>
              {activePalette?.name ?? (changedCount === 0 ? "기본 배색" : "사용자 지정")}
            </span>
            <span aria-hidden="true" className="flex shrink-0 gap-1">
              {[current.bg, current.text, current.textBold].map((swatch, index) => (
                <span key={index} className="h-3 w-3 rounded-full" style={{ backgroundColor: swatch, border: `1px solid ${colors.border}` }} />
              ))}
            </span>
          </div>
          <p id="random-colors-help" className="mt-1 text-[10px] leading-relaxed" style={{ color: colors.textMuted }}>
            미리 고른 {COLOR_PALETTES.length}가지 차분한 배색 중 하나를 적용합니다. 양옆 화살표로 방금 거쳐 간
            배색을 오갈 수 있고, 아래에서 더 조절할 수 있어요.
          </p>
        </section>
        <SavedPalettes colors={current} onApply={setColors} />
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
                const isChanged = value !== DEFAULT_COLORS[field.key];
                return (
                  <label key={field.key} className="mt-0.5 flex items-center gap-2 rounded-lg px-2 py-1">
                    <input
                      type="color"
                      value={value}
                      onInput={(e) => setColor(field.key, e.currentTarget.value.toUpperCase())}
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

              {/* 딸림글(루비) 강조 - 색이 아니라 '얼마나'라서 색 고르개 대신 슬라이더로 둔다.
                  루비는 제목·부분강조 안에서 그 강조색을 그대로 따라가는데, 그러면 딸림글이
                  낱말에 묻힌다. 이 값만큼 본문 글자색 쪽으로 당겨 계열은 지키면서 또렷하게 한다. */}
              {isOpen && group.title === "본문" && (
                <div className="mt-0.5 rounded-lg px-2 py-1">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[11px]" style={{ color: colors.text }}>
                      루비 강조
                      <span className="ml-1 text-[9px]" style={{ color: colors.textMuted }}>낱말&#123;루비&#125;</span>
                    </span>
                    <span className="shrink-0 text-[9px] tabular-nums" style={{ color: colors.textMuted }}>
                      {Math.round(rubyEmphasis * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={rubyEmphasis}
                    onChange={(e) => onRubyEmphasisChange(parseFloat(e.target.value))}
                    aria-label="루비 강조"
                    className="mt-1 w-full accent-[#9B8B7E]"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 발 - 시트와는 누를 때만, "내 배색"(프리셋)만 오간다 (동기화 버튼이 저절로 배색을 갈아엎지 않게) */}
      <div className="flex flex-col gap-1 px-2 pb-2 pt-1.5" style={{ borderTop: `1px solid ${colors.border}` }}>
        <div className="flex gap-1">
          <button
            onClick={handleSheetLoad}
            className="flex-1 rounded-lg py-1.5 text-[11px] font-medium"
            style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
          >내 배색 불러오기</button>
          <button
            onClick={handleSheetSave}
            className="flex-1 rounded-lg py-1.5 text-[11px] font-medium"
            style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
          >내 배색 저장</button>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => resetColors()}
            className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium"
            style={{ backgroundColor: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` }}
          >기본으로</button>
          <button
            onClick={handleCopy}
            className="flex-1 rounded-lg py-1.5 text-[11px] font-medium"
            style={{ backgroundColor: colors.categorySelected, color: colors.categorySelectedText }}
          >{copied ? "복사됨 ✓" : "값 복사"}</button>
        </div>
      </div>
    </div>
  );
}
