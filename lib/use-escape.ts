"use client";

import { useEffect, useRef } from "react";

// 팝업을 Esc 로 닫는다. 키보드만 쓰는 사람은 닫을 방법이 없었다.
export function useEscape(isOpen: boolean, onEscape: () => void): void {
  const handler = useRef(onEscape);
  useEffect(() => { handler.current = onEscape; });

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handler.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);
}
