"use client";

import { useState, useEffect } from "react";
import { ThemeColors } from "@/lib/theme";
import { Quote } from "@/lib/types";

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote | null;
  onSave: (updatedQuote: Quote) => void;
  colors: ThemeColors;
}

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ?? "";
const SECRET_KEY = process.env.NEXT_PUBLIC_APPS_SCRIPT_KEY ?? "my-nikkaya-2024";

export function EditModal({ isOpen, onClose, quote, onSave, colors }: EditModalProps) {
  const [text, setText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (quote) setText(quote.text);
    setStatus(null);
  }, [quote]);

  if (!isOpen || !quote) return null;

  const handleSave = async () => {
    if (!text.trim()) return;
    setIsSaving(true);
    setStatus("저장 중...");

    const updated: Quote = { ...quote, text: text.trim() };

    // localStorage 업데이트
    try {
      const cached = localStorage.getItem("quotes_cache");
      if (cached) {
        const quotes: Quote[] = JSON.parse(cached);
        const idx = quotes.findIndex((q) => q.id === quote.id);
        if (idx !== -1) {
          quotes[idx] = updated;
          localStorage.setItem("quotes_cache", JSON.stringify(quotes));
        }
      }
    } catch {}

    // Google Apps Script 업데이트
    if (APPS_SCRIPT_URL) {
      try {
        await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          body: JSON.stringify({ id: quote.id, text: text.trim(), key: SECRET_KEY }),
        });
        setStatus("저장 완료 ✓");
      } catch {
        setStatus("로컬 저장 완료 (시트 동기화 실패)");
      }
    } else {
      setStatus("로컬 저장 완료 ✓");
    }

    onSave(updated);
    setIsSaving(false);
    setTimeout(() => onClose(), 1000);
  };

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 shadow-2xl"
        style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
      >
        <h2 className="mb-4 text-sm font-semibold tracking-wide" style={{ color: colors.textMuted }}>
          명언 수정
        </h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className="w-full rounded-xl p-3 text-sm resize-none outline-none"
          style={{
            backgroundColor: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            fontFamily: "inherit",
            lineHeight: "1.6",
          }}
        />
        {status && (
          <p className="mt-2 text-xs" style={{ color: colors.textMuted }}>{status}</p>
        )}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl py-2 text-sm font-medium"
            style={{ backgroundColor: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` }}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 rounded-xl py-2 text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: colors.categorySelected, color: colors.categorySelectedText }}
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </>
  );
}
