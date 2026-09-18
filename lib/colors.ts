"use client";

import { useCallback, useSyncExternalStore } from "react";
import { type ThemeColors } from "./theme";
import { COLOR_STORAGE_KEY, DEFAULT_COLORS, resolveColorOverrides, type ColorOverrides } from "./color-storage";

// =============================================
// 색 바꾸기 (설정 > 색 조절)
//
// 기본 색은 lib/theme.ts 에 있고, 여기서는 사람이 고른 값만 그 위에 덮는다.
// 랜덤 배색과 직접 고른 색을 하나의 설정으로 기억한다.
// =============================================

const STORAGE_KEY = COLOR_STORAGE_KEY;

// 색 하나하나에 이름을 붙여 묶는다 (설정 화면에 이 순서대로 나온다)
export interface ColorField {
  key: keyof ThemeColors;
  label: string;
  hint?: string;
}

export const COLOR_GROUPS: { title: string; fields: ColorField[] }[] = [
  {
    title: "본문",
    fields: [
      { key: "text", label: "평문·대화 글자" },
      { key: "sayText", label: "강조 글자", hint: ">> <<" },
      { key: "talkText", label: "대화 글자", hint: "> <" },
      { key: "textBold", label: "제목 글자", hint: "[[ ]]" },
      { key: "textAccent", label: "부분강조 글자", hint: "[ ]" },
      { key: "textEmphasis", label: "루비 달린 낱말" },
    ],
  },
  {
    title: "판",
    fields: [
      { key: "talkBg", label: "대화 판 바탕" },
      { key: "sayBg", label: "말씀 판 바탕" },
    ],
  },
  {
    title: "바탕",
    fields: [
      { key: "bg", label: "화면 바탕" },
      { key: "bgSecondary", label: "팝업 바탕" },
      { key: "border", label: "구분선" },
    ],
  },
  {
    title: "카테고리",
    fields: [
      { key: "categoryText", label: "글자" },
      { key: "categoryParentText", label: "상위 글자", hint: "아래층 있음" },
      { key: "categoryBorder", label: "테두리" },
      { key: "categorySelected", label: "고른 것 바탕" },
      { key: "categorySelectedText", label: "고른 것 글자" },
    ],
  },
  {
    title: "그 밖에",
    fields: [
      { key: "buttonPrimary", label: "아래 버튼 바탕" },
      { key: "buttonIcon", label: "아래 버튼 그림" },
      { key: "textMuted", label: "안내 글씨" },
      { key: "rubyText", label: "주석 팝업의 루비" },
      { key: "scrollThumb", label: "스크롤 막대" },
    ],
  },
];

export const COLOR_FIELDS: ColorField[] = COLOR_GROUPS.flatMap((g) => g.fields);

// =============================================
// 저장소에서 읽고 쓰기
// =============================================

const listeners = new Set<() => void>();
const EMPTY: ColorOverrides = {};

// useSyncExternalStore 는 같은 값이면 같은 객체를 돌려받아야 한다.
// 글자열이 그대로면 앞서 만든 객체를 다시 준다 (안 그러면 화면이 끝없이 다시 그려진다).
let cached: { signature: string; value: ColorOverrides } | undefined;
let memoryValue: ColorOverrides | undefined;

function readOverrides(): ColorOverrides {
  if (memoryValue) return memoryValue;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const legacyRaw = raw === null ? localStorage.getItem("app_colors") : null;
    const legacyTheme = raw === null ? localStorage.getItem("app_theme") : null;
    const signature = JSON.stringify([raw, legacyRaw, legacyTheme]);
    if (signature === cached?.signature) return cached.value;
    const value = resolveColorOverrides(raw, legacyRaw, legacyTheme);
    cached = { signature, value };
    return value;
  } catch {
    return EMPTY;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function write(next: ColorOverrides): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    memoryValue = undefined;
  } catch {
    memoryValue = next;
  }
  listeners.forEach((listener) => listener());
}

export function useColorOverrides(): ColorOverrides {
  return useSyncExternalStore(subscribe, readOverrides, () => EMPTY);
}

export function useColorActions() {
  const setColor = useCallback((key: keyof ThemeColors, value: string) => {
    write({ ...readOverrides(), [key]: value });
  }, []);

  const setColors = useCallback((colors: ThemeColors) => {
    write({ ...colors });
  }, []);

  const resetColors = useCallback(() => {
    // 빈 설정도 저장해서 이전 모드의 색이 다시 나타나지 않게 한다.
    write({});
  }, []);

  return { setColor, setColors, resetColors };
}

export function mergeColors(overrides: ColorOverrides): ThemeColors {
  return { ...DEFAULT_COLORS, ...overrides };
}

export function formatColors(overrides: ColorOverrides): string {
  const colors = mergeColors(overrides);
  const changed = COLOR_FIELDS.filter((f) => colors[f.key] !== DEFAULT_COLORS[f.key]);
  const lines = [`[색 조절]${changed.length === 0 ? " 기본 그대로" : ""}`];
  for (const field of COLOR_FIELDS) {
    const mark = changed.includes(field) ? " ←바꿈" : "";
    lines.push(`${field.key}: ${colors[field.key]}  # ${field.label}${mark}`);
  }
  return lines.join("\n");
}
