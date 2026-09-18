"use client";

import { useEffect, useRef, useState } from "react";
import { useStoredSetting } from "@/lib/settings";
import { ThemeColors } from "@/lib/theme";
import { useEscape } from "@/lib/use-escape";
import { SETTINGS_GROUP } from "@/lib/settings-sync";
import { DEFAULT_TEXT_SCALES, type TextScales } from "./RubyText";

// 평문(글자 크기) 자체의 범위. 여기 값이 곧 슬라이더의 끝이자, 저장된 값을 되읽을 때
// 가두는 범위다 - page.tsx 도 이 상수를 쓰므로 슬라이더만 넓히고 저장에서 잘리는 일이 없다.
export const FONT_SCALE_MIN = 0.4;
export const FONT_SCALE_MAX = 4;

// 갈래별 크기 배수 조절 범위 - 평문(글자 크기) 대비 얼마나 크게/작게 보일지
export const TEXT_SCALE_MIN = 0.3;
// 루비 딸림글처럼 아주 작게까지 줄여도 되는 갈래에 쓰는 하한
export const TEXT_SCALE_MIN_SMALL = 0.1;
export const TEXT_SCALE_MAX = 4;
// 제목·부분강조는 글 전체에서 한둘뿐이라 훨씬 커져도 다른 글과 안 부딪힌다 - 상한을 더 넉넉히 둔다.
export const TEXT_SCALE_MAX_WIDE = 8;
export const TEXT_SCALE_STEP = 0.02;

// 색은 읽기 화면에서 그 갈래가 실제로 쓰는 색과 같다 - 슬라이더만 보고도 무엇을
// 조절하는지 한눈에 알 수 있게 한다 (본문 수정 화면의 마크업 버튼과 같은 방식).
const TEXT_SCALE_ROWS: { key: keyof TextScales; label: string; color: (c: ThemeColors) => string; min?: number; max?: number }[] = [
  { key: "title", label: "제목", color: (c) => c.textBold, max: TEXT_SCALE_MAX_WIDE },
  { key: "emphasis", label: "부분강조", color: (c) => c.textAccent, max: TEXT_SCALE_MAX_WIDE },
  { key: "talk", label: "대화", color: (c) => c.talkText },
  { key: "say", label: "강조(말씀)", color: (c) => c.sayText },
  // 딸림글은 본체 위에 얹히는 작은 글씨라, 아주 작게까지 줄일 수 있어야 한다
  { key: "ruby", label: "루비 문자", color: (c) => c.rubyText, min: TEXT_SCALE_MIN_SMALL },
  { key: "rubyBase", label: "루비 본체", color: (c) => c.textEmphasis },
];

// 가로 크기 조절 범위 (px)
// PC 처럼 화면이 넓을 때 화면 전체가 양옆으로 퍼지는 것을 막는다.
// 휴대폰은 화면이 이보다 좁아서 어떤 값이든 영향이 없다.
export const CONTENT_WIDTH_MIN = 280;
export const CONTENT_WIDTH_MAX = 2400; // 이 값이면 '제한 없음'으로 본다
export const CONTENT_WIDTH_STEP = 20;
export const CONTENT_WIDTH_DEFAULT = 1180;

// 카테고리 칩의 글자 크기와, 거기 곁들이는 글 수의 크기(px).
// 본문이 아니라 화면 장식이라 평문 대비 배수가 아니라 크기를 그대로 정한다.
export const COUNT_SIZE_MIN = 2;
export const COUNT_SIZE_MAX = 24;
export const COUNT_SIZE_DEFAULT = 9;
export const CATEGORY_SIZE_MIN = 6;
export const CATEGORY_SIZE_MAX = 40;
export const CATEGORY_SIZE_DEFAULT = 14;

// 본문 위 버튼(검색 돋보기·새 글 +·수정 ✏)의 지름(px). 아이콘·검색 입력창도 이 값에 맞춰 커진다.
export const ACTION_SIZE_MIN = 12;
export const ACTION_SIZE_MAX = 44;
export const ACTION_SIZE_DEFAULT = 32;

export function formatContentWidth(width: number): string {
  return width >= CONTENT_WIDTH_MAX ? "제한 없음" : `${width}px`;
}

// 지금 맞춘 크기값을 모두 한 덩어리 글로 만든다 - 다른 기기에 옮기거나 기록해 둘 때 쓴다
// (색 조절 창의 "값 복사"와 같은 방식).
function formatSizes(fontScale: number, contentWidth: number, textScales: TextScales, categorySize: number, countSize: number, actionSize: number): string {
  const lines = [
    "[크기 조절]",
    `평문: ${Math.round(fontScale * 100)}%`,
    `가로 크기: ${formatContentWidth(contentWidth)}`,
    `카테고리: ${categorySize}px`,
    `카테고리 글 수: ${countSize}px`,
    `버튼(검색·+·수정): ${actionSize}px`,
  ];
  for (const row of TEXT_SCALE_ROWS) {
    lines.push(`${row.label}: ${Math.round(textScales[row.key] * 100)}%`);
  }
  return lines.join("\n");
}

// 자주 쓰는 크기 조합을 번호로 저장해 두고 한 번에 불러온다.
// 코드에 박아 두지 않고 지금 맞춘 크기를 그대로 담을 수 있어야 2·3·4를 늘려 갈 수 있다.
interface SizePreset {
  label: string;
  fontScale: number;
  contentWidth: number;
  textScales: TextScales;
  categorySize: number;
  countSize: number;
  actionSize: number;
}

export const SIZE_PRESETS_KEY = "app_size_presets";

// 아무것도 저장하지 않았을 때 처음 보이는 프리셋
const DEFAULT_PRESETS: SizePreset[] = [
  {
    label: "1",
    fontScale: 1.3,
    contentWidth: 1000,
    textScales: { title: 2.46, emphasis: 1.3, talk: 1.02, say: 1.2, ruby: 0.8, rubyBase: 1 },
    categorySize: CATEGORY_SIZE_DEFAULT,
    countSize: COUNT_SIZE_DEFAULT,
    actionSize: ACTION_SIZE_DEFAULT,
  },
];

// 저장소·시트에서 온 값이라 생김새를 믿지 않는다. 빠지거나 망가진 값은 기본값으로 채운다.
function parsePresets(raw: string): SizePreset[] {
  if (!raw.trim()) return DEFAULT_PRESETS;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return DEFAULT_PRESETS;
  }
  if (!Array.isArray(value)) return DEFAULT_PRESETS;

  const num = (input: unknown, fallback: number) =>
    typeof input === "number" && Number.isFinite(input) ? input : fallback;
  return value.map((item, i) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const scales = (row.textScales ?? {}) as Record<string, unknown>;
    return {
      label: String(i + 1), // 번호는 자리 순서대로 다시 매긴다 (지운 자리를 메운다)
      fontScale: num(row.fontScale, 1),
      contentWidth: num(row.contentWidth, CONTENT_WIDTH_DEFAULT),
      textScales: Object.fromEntries(TEXT_SCALE_ROWS.map((r) =>
        [r.key, num(scales[r.key], DEFAULT_TEXT_SCALES[r.key])])) as unknown as TextScales,
      categorySize: num(row.categorySize, CATEGORY_SIZE_DEFAULT),
      countSize: num(row.countSize, COUNT_SIZE_DEFAULT),
      actionSize: num(row.actionSize, ACTION_SIZE_DEFAULT),
    };
  });
}

interface SizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  fontScale: number;
  onFontScaleChange: (scale: number) => void;
  contentWidth: number;
  onContentWidthChange: (width: number) => void;
  textScales: TextScales;
  onTextScaleChange: (key: keyof TextScales, value: number) => void;
  categorySize: number;
  onCategorySizeChange: (size: number) => void;
  countSize: number;
  onCountSizeChange: (size: number) => void;
  actionSize: number;
  onActionSizeChange: (size: number) => void;
  colors: ThemeColors;
  // 시트의 "설정" 탭과 주고받는다 - 저절로 오가지 않고 아래 버튼을 누를 때만 오간다
  onSheetSave: (group: string, entries: Record<string, string>) => void;
  onSheetLoad: (group: string) => Promise<Record<string, string> | null>;
}

// 시트에 담을 때 쓰는 키 - localStorage 키와 같게 둬서 어느 값인지 헷갈리지 않게 한다
const SIZE_KEYS = {
  fontScale: "app_font_scale",
  contentWidth: "app_content_width",
  title: "app_title_scale",
  emphasis: "app_emphasis_scale",
  talk: "app_talk_scale",
  say: "app_say_scale",
  ruby: "app_ruby_scale",
  rubyBase: "app_ruby_base_scale",
  categorySize: "app_category_size",
  countSize: "app_category_count_size",
  actionSize: "app_action_button_size",
  presets: SIZE_PRESETS_KEY,
} as const;

// 글자 크기(평문)·가로 크기·갈래별 크기(제목/부분강조/대화/강조/루비)를 한 창에서 조절한다.
// 색 조절 창과 같이 화면 가운데를 가리지 않고 오른쪽 아래 구석에 둔다 -
// 그래야 슬라이더를 움직이는 대로 본문이 바뀌는 것을 가려지지 않고 바로 볼 수 있다.
export function SizeModal({
  isOpen, onClose, fontScale, onFontScaleChange, contentWidth, onContentWidthChange,
  textScales, onTextScaleChange, categorySize, onCategorySizeChange, countSize, onCountSizeChange,
  actionSize, onActionSizeChange, colors, onSheetSave, onSheetLoad,
}: SizeModalProps) {
  useEscape(isOpen, onClose);
  const [copied, setCopied] = useState(false);
  // 프리셋은 사람이 만든 값이라 저장소에 담는다 (창을 닫아도, 앱을 다시 열어도 남는다)
  const [presetsRaw, setPresetsRaw] = useStoredSetting(SIZE_PRESETS_KEY, "", (raw) => raw);
  const rootRef = useRef<HTMLDivElement>(null);

  // 창 바깥을 누르면 닫는다 (포커스를 잃으면 사라진다). 창 안의 슬라이더·버튼은 걸리지 않는다.
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const presets = parsePresets(presetsRaw);
  const savePresets = (next: SizePreset[]) =>
    setPresetsRaw(JSON.stringify(next.map((preset, i) => ({ ...preset, label: String(i + 1) }))));

  const handleSheetSave = () => {
    const entries: Record<string, string> = {
      [SIZE_KEYS.fontScale]: String(fontScale),
      [SIZE_KEYS.contentWidth]: String(contentWidth),
      [SIZE_KEYS.categorySize]: String(categorySize),
      [SIZE_KEYS.countSize]: String(countSize),
      [SIZE_KEYS.actionSize]: String(actionSize),
      [SIZE_KEYS.presets]: JSON.stringify(presets),
    };
    // 갈래별 크기는 목록을 그대로 돌아 담는다 - 갈래를 늘려도 여기서 빠뜨릴 일이 없다
    for (const row of TEXT_SCALE_ROWS) entries[SIZE_KEYS[row.key]] = String(textScales[row.key]);
    onSheetSave(SETTINGS_GROUP.size, entries);
  };

  // 시트 값이 망가져 있어도 화면이 깨지지 않게, 읽은 값은 슬라이더 범위 안으로 가둔다
  const handleSheetLoad = async () => {
    const entries = await onSheetLoad(SETTINGS_GROUP.size);
    if (!entries) return;
    const apply = (key: string, min: number, max: number, set: (value: number) => void) => {
      const value = parseFloat(entries[key]);
      if (Number.isFinite(value)) set(Math.min(Math.max(value, min), max));
    };
    apply(SIZE_KEYS.fontScale, FONT_SCALE_MIN, FONT_SCALE_MAX, onFontScaleChange);
    apply(SIZE_KEYS.contentWidth, CONTENT_WIDTH_MIN, CONTENT_WIDTH_MAX,
      (value) => onContentWidthChange(Math.round(value)));
    apply(SIZE_KEYS.categorySize, CATEGORY_SIZE_MIN, CATEGORY_SIZE_MAX,
      (value) => onCategorySizeChange(Math.round(value)));
    apply(SIZE_KEYS.countSize, COUNT_SIZE_MIN, COUNT_SIZE_MAX,
      (value) => onCountSizeChange(Math.round(value)));
    apply(SIZE_KEYS.actionSize, ACTION_SIZE_MIN, ACTION_SIZE_MAX,
      (value) => onActionSizeChange(Math.round(value)));
    for (const row of TEXT_SCALE_ROWS) {
      apply(SIZE_KEYS[row.key], row.min ?? TEXT_SCALE_MIN, row.max ?? TEXT_SCALE_MAX,
        (value) => onTextScaleChange(row.key, value));
    }
    // 프리셋도 함께 받아 온다 - 기기를 바꿔도 만들어 둔 번호가 그대로 따라온다
    if (entries[SIZE_KEYS.presets]) savePresets(parsePresets(entries[SIZE_KEYS.presets]));
  };

  const handleCopy = async () => {
    const text = formatSizes(fontScale, contentWidth, textScales, categorySize, countSize, actionSize);
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

  const applyPreset = (preset: SizePreset) => {
    onFontScaleChange(preset.fontScale);
    onContentWidthChange(preset.contentWidth);
    onCategorySizeChange(preset.categorySize);
    onCountSizeChange(preset.countSize);
    onActionSizeChange(preset.actionSize);
    for (const row of TEXT_SCALE_ROWS) {
      onTextScaleChange(row.key, preset.textScales[row.key]);
    }
  };

  // 지금 맞춘 크기를 그대로 새 번호로 담는다
  const addPreset = () => {
    savePresets([...presets, {
      label: "", fontScale, contentWidth, textScales, categorySize, countSize, actionSize,
    }]);
  };

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="false"
      aria-label="크기 조절"
      className="fixed z-50 flex flex-col rounded-2xl shadow-2xl"
      style={{
        // 오른쪽 아래 구석 - 위쪽은 본문이 보이게 비워 둔다 (색 조절 창과 같은 자리)
        right: "0.5rem",
        bottom: "calc(env(safe-area-inset-bottom) + 6.5rem)",
        width: "min(17rem, calc(100vw - 1rem))",
        maxHeight: "62dvh",
        backgroundColor: colors.bgSecondary,
        border: `1px solid ${colors.border}`,
      }}
    >
      {/* 머리 */}
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-2">
        <h2 className="flex-1 text-xs font-semibold" style={{ color: colors.text }}>크기 조절</h2>
        <button
          onClick={onClose}
          aria-label="닫기"
          className="flex h-6 w-6 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.bg, color: colors.textMuted }}
        >✕</button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5" style={{ overscrollBehavior: "contain" }}>
        {/* 프리셋 - 자주 쓰는 크기 조합을 번호 하나로 바로 불러온다.
            번호를 누르면 그 크기로 맞추고, ✕ 로 지운다(지우면 뒤 번호가 앞으로 당겨진다).
            "+ 지금 크기" 는 지금 맞춰 둔 값을 그대로 다음 번호로 담는다. */}
        <div className="mb-4 flex flex-wrap items-center gap-1">
          {presets.map((preset, i) => (
            <span
              key={i}
              className="flex items-center rounded-full text-[11px] font-semibold"
              style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
              title={formatSizes(preset.fontScale, preset.contentWidth, preset.textScales,
                preset.categorySize, preset.countSize, preset.actionSize)}
            >
              <button
                onClick={() => applyPreset(preset)}
                className="py-1 pl-2.5 pr-1"
                aria-label={`${preset.label}번 크기로 맞추기`}
              >{preset.label}</button>
              <button
                onClick={() => savePresets(presets.filter((_, j) => j !== i))}
                className="py-1 pl-0.5 pr-2 text-[10px]"
                style={{ color: colors.textMuted }}
                aria-label={`${preset.label}번 지우기`}
              >✕</button>
            </span>
          ))}
          <button
            onClick={addPreset}
            className="rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{ backgroundColor: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` }}
          >+ 지금 크기</button>
        </div>

        {/* 글자 크기 (평문) - 다른 갈래는 모두 이 크기 대비 배수로 커진다 */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium" style={{ color: colors.text }}>평문</span>
          <span className="text-xs" style={{ color: colors.textMuted }}>{Math.round(fontScale * 100)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: colors.textMuted }}>가</span>
          <input
            type="range"
            min={FONT_SCALE_MIN}
            max={FONT_SCALE_MAX}
            step="0.05"
            value={fontScale}
            onChange={(e) => onFontScaleChange(parseFloat(e.target.value))}
            className="flex-1 accent-[#9B8B7E]"
          />
          <span className="text-base font-bold" style={{ color: colors.textMuted }}>가</span>
        </div>

        <div className="my-4 h-px" style={{ backgroundColor: colors.border }} />

        {/* 가로 크기 */}
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

        <div className="my-4 h-px" style={{ backgroundColor: colors.border }} />

        {/* 카테고리 칩 글자 - 본문이 아니라 화면 장식이라 평문 배수와 따로 논다.
            가로 크기와 마찬가지로 크기를 그대로(px) 정한다. */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium" style={{ color: colors.categoryText }}>카테고리</span>
          <span className="text-xs" style={{ color: colors.textMuted }}>{categorySize}px</span>
        </div>
        <input
          type="range"
          min={CATEGORY_SIZE_MIN}
          max={CATEGORY_SIZE_MAX}
          step={1}
          value={categorySize}
          onChange={(e) => onCategorySizeChange(parseInt(e.target.value, 10))}
          aria-label="카테고리 글자 크기"
          className="w-full accent-[#9B8B7E]"
        />

        <div className="my-4 h-px" style={{ backgroundColor: colors.border }} />

        {/* 카테고리 칩에 곁들이는 글 수 */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium" style={{ color: colors.text }}>카테고리 글 수</span>
          <span className="text-xs" style={{ color: colors.textMuted }}>{countSize}px</span>
        </div>
        <input
          type="range"
          min={COUNT_SIZE_MIN}
          max={COUNT_SIZE_MAX}
          step={1}
          value={countSize}
          onChange={(e) => onCountSizeChange(parseInt(e.target.value, 10))}
          aria-label="카테고리 글 수 크기"
          className="w-full accent-[#9B8B7E]"
        />

        <div className="my-4 h-px" style={{ backgroundColor: colors.border }} />

        {/* 본문 위 버튼(검색 돋보기·새 글 +·수정 ✏) 크기 - 아이콘과 검색 입력창 글자도 함께 커진다 */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium" style={{ color: colors.text }}>버튼 (검색·+·수정)</span>
          <span className="text-xs" style={{ color: colors.textMuted }}>{actionSize}px</span>
        </div>
        <input
          type="range"
          min={ACTION_SIZE_MIN}
          max={ACTION_SIZE_MAX}
          step={1}
          value={actionSize}
          onChange={(e) => onActionSizeChange(parseInt(e.target.value, 10))}
          aria-label="본문 위 버튼 크기"
          className="w-full accent-[#9B8B7E]"
        />

        <div className="my-4 h-px" style={{ backgroundColor: colors.border }} />

        {/* 제목·부분강조·대화·강조·루비 - 평문 대비 배수를 하나씩 조절한다 */}
        {TEXT_SCALE_ROWS.map((row, i) => (
          <div key={row.key} className={i > 0 ? "mt-4" : undefined}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium" style={{ color: row.color(colors) }}>{row.label}</span>
              <span className="text-xs" style={{ color: colors.textMuted }}>{Math.round(textScales[row.key] * 100)}%</span>
            </div>
            <input
              type="range"
              min={row.min ?? TEXT_SCALE_MIN}
              max={row.max ?? TEXT_SCALE_MAX}
              step={TEXT_SCALE_STEP}
              value={textScales[row.key]}
              onChange={(e) => onTextScaleChange(row.key, parseFloat(e.target.value))}
              className="w-full accent-[#9B8B7E]"
            />
          </div>
        ))}
      </div>

      {/* 발 - 시트와는 누를 때만 오간다. 크기는 기기마다 다른 것이 자연스러워서
          (폰과 PC 의 화면이 다르다) 동기화 버튼이 저절로 끌어오지 않는다. */}
      <div className="flex flex-col gap-1 px-2 pb-2 pt-1.5" style={{ borderTop: `1px solid ${colors.border}` }}>
        <div className="flex gap-1">
          <button
            onClick={handleSheetLoad}
            className="flex-1 rounded-lg py-1.5 text-[11px] font-medium"
            style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
          >시트에서 불러오기</button>
          <button
            onClick={handleSheetSave}
            className="flex-1 rounded-lg py-1.5 text-[11px] font-medium"
            style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
          >시트에 저장</button>
        </div>
        <button
          onClick={handleCopy}
          className="rounded-lg py-1.5 text-[11px] font-medium"
          style={{ backgroundColor: colors.categorySelected, color: colors.categorySelectedText }}
        >{copied ? "복사됨 ✓" : "값 복사"}</button>
      </div>
    </div>
  );
}
