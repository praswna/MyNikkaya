// 설정(크기 조절·색 조절·AI 프롬프트)을 시트의 "설정" 탭과 주고받는다.
//
// 글과 달리 설정은 기기마다 다른 것이 자연스럽다 - 폰에서 맞춘 글자·가로 크기를
// PC 값으로 저절로 덮어쓰면 오히려 불편하다. 그래서 크기·색은 각 창에서 사람이
// 누를 때만 오간다. 프롬프트만은 기기 취향이 아니므로 동기화할 때 함께 받아온다.

export const SETTINGS_GROUP = {
  size: "크기",
  color: "색",
  prompt: "프롬프트",
} as const;

// 프롬프트는 한 덩어리 글이라 키 하나에 통째로 담는다
export const PROMPT_SETTING_KEY = "template";
export const PROMPT_STORAGE_KEY = "app_ai_prompt";

export type SheetSettings = Record<string, Record<string, string>>;

const TIMEOUT_MS = 20000;

// 시트에서 설정을 읽는다. 설정 탭이 없거나 옛 Apps Script 면 빈 값이 온다.
export async function fetchSheetSettings(): Promise<SheetSettings> {
  const res = await fetch(`/api/settings?t=${Date.now()}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const settings = data?.settings;
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return {};

  // 시트에서 온 값이므로 생김새를 믿지 않는다 - 글자열만 남긴다
  const clean: SheetSettings = {};
  for (const [group, entries] of Object.entries(settings as Record<string, unknown>)) {
    if (!entries || typeof entries !== "object" || Array.isArray(entries)) continue;
    const groupEntries: Record<string, string> = {};
    for (const [key, value] of Object.entries(entries as Record<string, unknown>)) {
      if (typeof value === "string") groupEntries[key] = value;
    }
    clean[group] = groupEntries;
  }
  return clean;
}

// 시트에 저장할 때 보낼 것 - 암호 확인은 page.tsx 의 syncToSheet 이 맡는다
export function settingsSavePayload(group: string, entries: Record<string, string>) {
  return { action: "saveSettings" as const, group, entries: JSON.stringify(entries) };
}
