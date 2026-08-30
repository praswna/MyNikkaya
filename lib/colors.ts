"use client";

import { useCallback, useSyncExternalStore } from "react";
import { THEMES, type Theme, type ThemeColors } from "./theme";

// =============================================
// 색 바꾸기 (설정 > 색 조절)
//
// 기본 색은 lib/theme.ts 에 있고, 여기서는 사람이 고른 값만 그 위에 덮는다.
// 다크·라이트를 따로 기억한다. 고르지 않은 값은 기본 색 그대로 쓴다.
// =============================================

const STORAGE_KEY = "app_colors";

export type ColorOverrides = { [T in Theme]?: Partial<ThemeColors> };

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
      { key: "sayText", label: "부처님 말씀 글자", hint: ">> <<" },
      { key: "talkText", label: "대화 글자", hint: "> <" },
      { key: "textBold", label: "제목 글자", hint: "[[ ]]" },
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
let cached: { raw: string | null; value: ColorOverrides } = { raw: null, value: EMPTY };

function readOverrides(): ColorOverrides {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cached.raw) return cached.value;
  let value: ColorOverrides = EMPTY;
  try {
    if (raw) value = JSON.parse(raw) as ColorOverrides;
  } catch {}
  cached = { raw, value };
  return value;
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
  } catch {}
  listeners.forEach((listener) => listener());
}

export function useColorOverrides(): ColorOverrides {
  return useSyncExternalStore(subscribe, readOverrides, () => EMPTY);
}

export function useColorActions(): {
  setColor: (theme: Theme, key: keyof ThemeColors, value: string) => void;
  resetTheme: (theme: Theme) => void;
} {
  const setColor = useCallback((theme: Theme, key: keyof ThemeColors, value: string) => {
    const all = readOverrides();
    write({ ...all, [theme]: { ...all[theme], [key]: value } });
  }, []);

  const resetTheme = useCallback((theme: Theme) => {
    const all = { ...readOverrides() };
    delete all[theme];
    write(all);
  }, []);

  return { setColor, resetTheme };
}

// 기본 색 위에 고른 색을 덮은 최종 색
export function mergeColors(theme: Theme, overrides: ColorOverrides): ThemeColors {
  return { ...THEMES[theme], ...overrides[theme] };
}

// 사람이 읽고 그대로 옮겨 적을 수 있는 형태로 (복사 버튼)
export function formatColors(overrides: ColorOverrides): string {
  const lines: string[] = [];
  for (const theme of ["dark", "light"] as Theme[]) {
    const colors = mergeColors(theme, overrides);
    const changed = COLOR_FIELDS.filter((f) => colors[f.key] !== THEMES[theme][f.key]);
    lines.push(`[${theme === "dark" ? "다크" : "라이트"}]${changed.length === 0 ? " 기본 그대로" : ""}`);
    for (const field of COLOR_FIELDS) {
      const mark = changed.includes(field) ? " ←바꿈" : "";
      lines.push(`${field.key}: ${colors[field.key]}  # ${field.label}${mark}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}
