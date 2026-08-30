"use client";

import { useCallback, useSyncExternalStore } from "react";

// =============================================
// localStorage 에 담아 두는 설정값 (테마·글자 크기·가로 크기)
//
// useSyncExternalStore 로 읽는다. effect 안에서 setState 로 뒤늦게 채우면
// 첫 화면이 한 번 잘못 그려졌다가 바뀌는데, 이 방식은 그 단계가 없다.
// 다른 탭에서 바꾼 값도 따라온다.
// =============================================

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // 사파리 비공개 모드 등
  }
}

// parse 는 반드시 문자열이나 숫자를 돌려줘야 한다 (객체를 만들면 화면이 계속 다시 그려진다)
export function useStoredSetting<T extends string | number>(
  key: string,
  fallback: T,
  parse: (raw: string) => T,
): [T, (value: T) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => {
      const raw = readRaw(key);
      return raw === null ? fallback : parse(raw);
    },
    () => fallback, // 서버에서 그릴 때
  );

  const set = useCallback((next: T) => {
    try {
      localStorage.setItem(key, String(next));
    } catch {}
    listeners.forEach((listener) => listener());
  }, [key]);

  return [value, set];
}
