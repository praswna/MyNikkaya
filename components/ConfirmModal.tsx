"use client";

import { useEffect, useRef } from "react";
import type { ThemeColors } from "@/lib/theme";
import { useEscape } from "@/lib/use-escape";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  colors: ThemeColors;
}

// 되돌릴 수 없는 일을 하기 전에 한 번 묻는 창.
//
// 브라우저가 띄우는 confirm 창은 주소가 큼직하게 박히고 색도 글꼴도 앱과 따로 놀아,
// 갑자기 다른 프로그램이 끼어든 것처럼 보인다. 여기서는 다른 창들과 같은 모양으로 묻는다.
//
// 처음 초점은 '취소'에 둔다 - 급히 Enter 를 눌렀다가 지워지는 일이 없게, 지우는 쪽은
// 반드시 제 손으로 고르게 한다.
export function ConfirmModal({ title, message, confirmLabel, onConfirm, onClose, colors }: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useEscape(true, onClose);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => previous?.focus();
  }, []);

  // 초점이 창 뒤의 화면으로 빠져나가지 않게 한다 (뒤에서는 x·e 같은 단축키가 듣고 있다).
  useEffect(() => {
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled)");
      if (!items?.length) { event.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, []);

  const buttonBase = "flex-1 rounded-xl py-2.5 text-sm font-medium";

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed left-1/2 top-1/2 z-50 w-[88vw] max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 shadow-2xl"
        style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
      >
        <p className="text-center text-sm font-semibold" style={{ color: colors.text }}>{title}</p>
        <p className="mt-1.5 whitespace-pre-line text-center text-xs" style={{ color: colors.textMuted }}>{message}</p>

        <div className="mt-4 flex gap-2">
          <button
            ref={cancelRef}
            onClick={onClose}
            className={buttonBase}
            style={{ backgroundColor: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` }}
          >취소</button>
          {/* 지우는 버튼만 색을 고른 배색에서 떼어 둔다 - 무슨 색을 골라 두었든
              되돌릴 수 없는 자리는 한눈에 달라 보여야 한다. */}
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`${buttonBase} font-semibold`}
            style={{ backgroundColor: "#dc2626", color: "#ffffff", border: "1px solid #dc2626" }}
          >{confirmLabel}</button>
        </div>
      </div>
    </>
  );
}
