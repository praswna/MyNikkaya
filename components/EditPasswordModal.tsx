"use client";

import { useState } from "react";
import { ThemeColors } from "@/lib/theme";

interface EditPasswordModalProps {
  isOpen: boolean;
  // 넣어둔 암호로 저장하려다 거절당한 경우 (처음 묻는 것과 구분해서 알려준다)
  wasRejected: boolean;
  onSubmit: (password: string) => void;
  onCancel: () => void;
  colors: ThemeColors;
}

// 시트 저장이 암호를 요구할 때 뜨는 창.
// 암호를 넣으면 하려던 저장을 이어서 다시 시도한다.
export function EditPasswordModal({ isOpen, wasRejected, onSubmit, onCancel, colors }: EditPasswordModalProps) {
  const [password, setPassword] = useState("");

  if (!isOpen) return null;

  const submit = () => {
    const trimmed = password.trim();
    if (!trimmed) return;
    setPassword("");
    onSubmit(trimmed);
  };

  const cancel = () => {
    setPassword("");
    onCancel();
  };

  const buttonBase = "flex-1 rounded-xl py-2.5 text-sm font-medium";

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={cancel} />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-[88vw] max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 shadow-2xl"
        style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
      >
        <p className="text-center text-sm font-semibold" style={{ color: colors.text }}>편집 암호</p>
        <p className="mt-1.5 text-center text-xs" style={{ color: wasRejected ? colors.textBold : colors.textMuted }}>
          {wasRejected ? "암호가 맞지 않습니다. 다시 넣어주세요." : "고친 내용을 시트에 저장하려면 암호가 필요합니다."}
        </p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          autoFocus
          aria-label="편집 암호"
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
            onClick={cancel}
            className={buttonBase}
            style={{ backgroundColor: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` }}
          >취소</button>
          <button
            onClick={submit}
            className={buttonBase}
            style={{ backgroundColor: colors.categorySelected, color: colors.categorySelectedText }}
          >확인</button>
        </div>
      </div>
    </>
  );
}
