"use client";

import { useState } from "react";
import { ThemeColors } from "@/lib/theme";
import { useEscape } from "@/lib/use-escape";

interface RenameCategoryModalProps {
  categoryName: string;
  onSubmit: (newName: string) => void;
  onClose: () => void;
  colors: ThemeColors;
}

// 카테고리 이름을 고치는 작은 창. 그 이름을 쓰는 모든 글의 카테고리가 함께 바뀐다.
// 부모가 열 때만 그린다 - 그래야 열 때마다 지금 고른 이름으로 입력칸이 새로 채워진다.
export function RenameCategoryModal({ categoryName, onSubmit, onClose, colors }: RenameCategoryModalProps) {
  const [name, setName] = useState(categoryName);
  useEscape(true, onClose);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    onClose();
  };

  const buttonBase = "flex-1 rounded-xl py-2.5 text-sm font-medium";

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="카테고리 이름 수정"
        className="fixed left-1/2 top-1/2 z-50 w-[88vw] max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 shadow-2xl"
        style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
      >
        <p className="text-center text-sm font-semibold" style={{ color: colors.text }}>카테고리 이름 수정</p>
        <p className="mt-1.5 text-center text-xs" style={{ color: colors.textMuted }}>
          &ldquo;{categoryName}&rdquo; 카테고리의 모든 글이 새 이름으로 옮겨갑니다.
        </p>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          autoFocus
          maxLength={50000}
          aria-label="새 카테고리 이름"
          className="mt-4 w-full rounded-xl p-3 text-sm outline-none"
          style={{
            backgroundColor: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            fontFamily: "inherit",
          }}
        />

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className={buttonBase}
            style={{ backgroundColor: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` }}
          >취소</button>
          <button
            onClick={submit}
            disabled={!name.trim() || name.trim() === categoryName}
            className={`${buttonBase} disabled:opacity-50`}
            style={{ backgroundColor: colors.categorySelected, color: colors.categorySelectedText }}
          >확인</button>
        </div>
      </div>
    </>
  );
}
