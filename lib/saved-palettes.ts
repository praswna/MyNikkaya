"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_COLORS } from "./color-storage";
import { type ThemeColors } from "./theme";

export interface SavedPalette { id: string; name: string; colors: ThemeColors }
// 시트의 "설정" 탭에 담을 때도 이 이름을 그대로 쓴다 - 어느 값인지 헷갈리지 않게 한다
export const SAVED_PALETTES_KEY = "app_saved_palettes_v1";
const KEY = SAVED_PALETTES_KEY;
const EMPTY: SavedPalette[] = [];
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: SavedPalette[] } = { raw: null, value: EMPTY };

// 색이 하나 빠졌다고 배색을 통째로 버리지 않는다.
// 예전에는 모든 색이 다 있어야 인정했는데, 그러면 색을 새로 하나 늘리는 순간
// 그 전에 저장해 둔 배색이 전부 사라진다(실제로 "상위 카테고리 글자" 색을 더했을 때
// 그랬다). 빠지거나 망가진 색만 기본값으로 채우고 나머지는 살린다.
// 쓸 만한 색이 하나도 없는 것만 버린다 - 그건 배색이라 볼 수 없다.
export function parseSavedPalettes(raw: string | null): SavedPalette[] {
  try {
    const data: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(data)) return [];
    const ids = new Set<string>();
    const items: SavedPalette[] = [];
    for (const item of data) {
      if (!item || typeof item.id !== "string" || !item.id || ids.has(item.id) ||
        typeof item.name !== "string" || !item.name.trim() ||
        !item.colors || typeof item.colors !== "object") continue;

      const colors = { ...DEFAULT_COLORS };
      let kept = 0;
      for (const key of Object.keys(DEFAULT_COLORS) as (keyof ThemeColors)[]) {
        const value = item.colors[key];
        if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)) {
          colors[key] = value.toUpperCase();
          kept++;
        }
      }
      if (kept === 0) continue;
      ids.add(item.id);
      items.push({ id: item.id, name: item.name.trim().slice(0, 32), colors });
    }
    return items;
  } catch { return []; }
}

function read(): SavedPalette[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== cache.raw) cache = { raw, value: parseSavedPalettes(raw) };
    return cache.value;
  } catch { return EMPTY; }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
}

function write(items: SavedPalette[]): void {
  // 저장 실패는 호출자에게 전달한다. 화면에만 저장된 것처럼 표시하지 않는다.
  localStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach((listener) => listener());
}

export function sameColors(a: ThemeColors, b: ThemeColors): boolean {
  return (Object.keys(DEFAULT_COLORS) as (keyof ThemeColors)[]).every(
    (key) => a[key].toUpperCase() === b[key].toUpperCase(),
  );
}

export function savePalette(colors: ThemeColors): { palette: SavedPalette; exists: boolean } {
  const items = read();
  const existing = items.find((item) => sameColors(item.colors, colors));
  if (existing) return { palette: existing, exists: true };
  const number = Math.max(0, ...items.map((item) => Number(/^(\d+)$/.exec(item.name)?.[1] ?? 0))) + 1;
  const palette = { id: crypto.randomUUID(), name: String(number).padStart(2, "0"), colors: { ...colors } };
  write([...items, palette]);
  return { palette, exists: false };
}

export function renamePalette(id: string, name: string): void {
  const trimmed = name.trim().slice(0, 32);
  if (!trimmed) throw new Error("이름을 입력해 주세요.");
  write(read().map((item) => item.id === id ? { ...item, name: trimmed } : item));
}

export function deletePalette(id: string): void {
  write(read().filter((item) => item.id !== id));
}

// 시트에서 받아 온 목록으로 통째로 갈아 끼운다 (하나씩 더하는 길과 따로 둔다)
export function replaceSavedPalettes(items: SavedPalette[]): void {
  write(items);
}

export function useSavedPalettes(): SavedPalette[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
