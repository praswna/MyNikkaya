import { THEMES, type ThemeColors } from "./theme";

export const COLOR_STORAGE_KEY = "app_colors_v2";
export const DEFAULT_COLORS: ThemeColors = THEMES.dark;
export type ColorOverrides = Partial<ThemeColors>;

function parseColors(raw: string | null): Record<string, unknown> {
  try {
    const value = JSON.parse(raw ?? "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function validColors(value: Record<string, unknown>): ColorOverrides {
  const result: ColorOverrides = {};
  for (const key of Object.keys(DEFAULT_COLORS) as (keyof ThemeColors)[]) {
    const color = value[key];
    if (typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color)) {
      result[key] = color.toUpperCase();
    }
  }
  return result;
}

// 첫 변경 전까지 기존에 선택했던 모드의 색을 읽는다. 이후에는 단일 설정만 쓴다.
export function resolveColorOverrides(
  raw: string | null, legacyRaw: string | null, legacyTheme: string | null,
): ColorOverrides {
  if (raw !== null) return validColors(parseColors(raw));
  const theme = legacyTheme === "light" ? "light" : "dark";
  const legacy = parseColors(legacyRaw)[theme];
  const overrides = legacy && typeof legacy === "object" && !Array.isArray(legacy)
    ? validColors(legacy as Record<string, unknown>) : {};
  return { ...THEMES[theme], ...overrides };
}
