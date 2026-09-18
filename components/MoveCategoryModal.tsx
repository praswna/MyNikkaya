"use client";

import { useState } from "react";
import type { ThemeColors } from "@/lib/theme";
import { useEscape } from "@/lib/use-escape";

interface MoveCategoryModalProps {
  categories: string[];
  currentCategory: string;
  onSubmit: (category: string) => void;
  onClose: () => void;
  colors: ThemeColors;
}

// 이 글 하나만 다른 카테고리로 옮기는 창 (카테고리 이름 수정과는 다르다 -
// 이름 수정은 그 이름을 쓰는 모든 글이 함께 움직인다).
// 고르는 자리는 새 글 등록 창과 같은 모양으로 둔다 - 같은 일을 두 가지 모양으로
// 익히게 할 까닭이 없다.
export function MoveCategoryModal({ categories, currentCategory, onSubmit, onClose, colors }: MoveCategoryModalProps) {
  const [category, setCategory] = useState(currentCategory);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryDraft, setNewCategoryDraft] = useState("");
  useEscape(true, onClose);

  const finalCategory = (isAddingCategory ? newCategoryDraft : category).trim();
  const canSubmit = finalCategory !== "" && finalCategory !== currentCategory;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(finalCategory);
    onClose();
  };

  const fieldStyle = { backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` };
  const buttonBase = "flex-1 rounded-xl py-2.5 text-sm font-medium";

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="카테고리 옮기기"
        className="fixed left-1/2 top-1/2 z-50 flex max-h-[90dvh] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-y-auto rounded-2xl p-5 shadow-2xl"
        style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
      >
        <p className="text-center text-sm font-semibold" style={{ color: colors.text }}>카테고리 옮기기</p>
        <p className="text-center text-xs" style={{ color: colors.textMuted }}>
          지금 보는 글 하나만 옮깁니다 (지금은 &ldquo;{currentCategory}&rdquo;).
        </p>

        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => {
            const selected = !isAddingCategory && category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => { setIsAddingCategory(false); setCategory(cat); }}
                className="rounded-full border px-3 py-1.5 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: selected ? colors.categorySelected : "transparent",
                  borderColor: selected ? colors.categorySelected : colors.categoryBorder,
                  color: selected ? colors.categorySelectedText : colors.categoryText,
                }}
              >{cat}</button>
            );
          })}
          <button
            type="button"
            onClick={() => setIsAddingCategory(true)}
            className="rounded-full border px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              backgroundColor: isAddingCategory ? colors.categorySelected : "transparent",
              borderColor: isAddingCategory ? colors.categorySelected : colors.categoryBorder,
              color: isAddingCategory ? colors.categorySelectedText : colors.categoryText,
            }}
          >+ 새 카테고리</button>
        </div>

        {isAddingCategory && (
          <>
            <input
              autoFocus
              maxLength={50000}
              value={newCategoryDraft}
              onChange={(e) => setNewCategoryDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) submit(); }}
              placeholder="새 카테고리 이름"
              aria-label="새 카테고리 이름"
              className="w-full rounded-xl p-3 text-sm outline-none"
              style={{ ...fieldStyle, fontFamily: "inherit" }}
            />
            <span className="text-xs" style={{ color: colors.textMuted }}>
              공무직/헌법 처럼 /로 나누면 상위 카테고리로 묶입니다.
            </span>
          </>
        )}

        <div className="mt-1 flex gap-2">
          <button
            onClick={onClose}
            className={buttonBase}
            style={{ backgroundColor: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` }}
          >취소</button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className={`${buttonBase} disabled:opacity-50`}
            style={{ backgroundColor: colors.categorySelected, color: colors.categorySelectedText }}
          >옮기기</button>
        </div>
      </div>
    </>
  );
}
