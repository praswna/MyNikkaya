"use client";

import { useEffect, useRef, useState } from "react";
import type { ThemeColors } from "@/lib/theme";
import type { Quote } from "@/lib/types";
import { useEscape } from "@/lib/use-escape";

interface NewQuoteModalProps {
  categories: string[];
  initialCategory: string;
  colors: ThemeColors;
  onCreated: (quote: Quote) => void;
  onClose: () => void;
}

export function NewQuoteModal({ categories, initialCategory, colors, onCreated, onClose }: NewQuoteModalProps) {
  const initialIsKnown = categories.includes(initialCategory);
  // 카테고리는 기존 것 중 하나를 고르거나, "+ 새 카테고리" 를 눌러 새로 만든다.
  // 기존 카테고리가 하나도 없으면(첫 등록) 바로 새로 만드는 자리를 보여준다.
  const [category, setCategory] = useState(initialIsKnown ? initialCategory : (categories[0] ?? ""));
  const [isAddingCategory, setIsAddingCategory] = useState(categories.length === 0);
  const [newCategoryDraft, setNewCategoryDraft] = useState(initialIsKnown ? "" : initialCategory);
  const [text, setText] = useState("");
  const dialogRef = useRef<HTMLFormElement>(null);

  const finalCategory = isAddingCategory ? newCategoryDraft.trim() : category;

  // 바깥을 누르거나 Esc·취소로 나가면 되묻지 않고 그냥 닫는다 - 창을 닫으려는 뜻이
  // 분명한데 매번 "버릴까요?" 를 띄우면 오히려 걸리적거린다.
  useEscape(true, onClose);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    return () => previous?.focus();
  }, []);

  // 키보드 초점이 팝업 뒤의 카드 조작으로 빠져나가지 않게 한다.
  useEffect(() => {
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = dialogRef.current?.querySelectorAll<HTMLElement>("input:not(:disabled), textarea:not(:disabled), button:not(:disabled)");
      if (!items?.length) { event.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => document.removeEventListener("keydown", trap);
  }, []);

  // 시트 응답을 기다리지 않고 바로 등록한다 - 본문 수정과 같은 방식이다.
  // 화면에는 즉시 반영하고, 시트 저장(암호 확인 포함)은 백그라운드에서 이어간다.
  // 실패해도 입력을 잃지 않는다 - 다음 시트 동기화 때 조용히 원래 상태로 돌아갈 뿐이다.
  const submit = () => {
    const trimmedCategory = finalCategory.trim();
    const trimmedText = text.trim();
    if (!trimmedCategory || !trimmedText) return;
    const requestId = crypto.randomUUID();
    onCreated({ id: `gs-${requestId}`, sheetId: requestId, category: trimmedCategory, text: trimmedText });
  };

  const fieldStyle = { backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <form
        ref={dialogRef}
        role="dialog" aria-modal="true" aria-labelledby="new-quote-title"
        onSubmit={(event) => { event.preventDefault(); submit(); }}
        className="fixed left-1/2 top-1/2 z-50 flex max-h-[90dvh] w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-2xl p-5 shadow-2xl"
        style={{ backgroundColor: colors.bgSecondary, color: colors.text, border: `1px solid ${colors.border}` }}
      >
        <h2 id="new-quote-title" className="text-lg font-semibold">새 글 등록</h2>
        <div className="flex flex-col gap-1.5 text-sm">
          카테고리
          {/* 기존 카테고리 중 하나를 고르거나, "+ 새 카테고리" 를 눌러 그 자리에서 만든다 -
              새 카테고리를 만들려고 다른 화면으로 옮길 필요가 없다. */}
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
              <input autoFocus required maxLength={50000} value={newCategoryDraft}
                onChange={(event) => setNewCategoryDraft(event.target.value)} placeholder="새 카테고리 이름"
                className="w-full rounded-xl p-3" style={fieldStyle} />
              {/* 상위 카테고리는 따로 저장하지 않고 이름 한 줄에 담는다 - 알려주지 않으면 알 길이 없다 */}
              <span className="text-xs" style={{ color: colors.textMuted }}>
                공무직/헌법 처럼 /로 나누면 상위 카테고리로 묶입니다.
              </span>
            </>
          )}
        </div>
        <label className="flex min-h-0 flex-col gap-1.5 text-sm">
          본문
          <textarea autoFocus={!isAddingCategory} required maxLength={50000} rows={10} value={text}
            onChange={(event) => setText(event.target.value)} placeholder="학습할 내용을 입력하세요."
            // Enter 로 바로 등록한다 (여러 줄이 필요하면 Shift+Enter 로 줄바꿈).
            // 한글 입력 중 조합을 확정하는 Enter 까지 등록으로 넘어가지 않게 막는다.
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }}
            className="min-h-32 w-full resize-y rounded-xl p-3" style={fieldStyle} />
        </label>
        <p className="text-xs" style={{ color: colors.textMuted }}>제목은 [[제목]], 부분강조는 [강조], 루비는 단어&#123;뜻&#125;처럼 입력할 수 있습니다. Enter로 등록, Shift+Enter로 줄바꿈합니다.</p>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl py-3 text-sm" style={fieldStyle}>취소</button>
          <button type="submit" disabled={!finalCategory.trim() || !text.trim()}
            className="flex-1 rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: colors.categorySelected, color: colors.categorySelectedText }}>
            시트에 등록
          </button>
        </div>
      </form>
    </>
  );
}
