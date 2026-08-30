"use client";

import { useState } from "react";
import { ThemeColors } from "@/lib/theme";
import { useEscape } from "@/lib/use-escape";

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  colors: ThemeColors;
}

// =============================================
// 기본 번역 프롬프트 (수정 가능)
// =============================================
const DEFAULT_PROMPT = `당신은 불교 경전 전문 편집자입니다. 아래 텍스트를 다음 규칙에 따라 처리하세요.

언어 처리 원칙
입력이 영문이면 한국어로 번역합니다. 입력이 이미 한국어면 번역하지 않고 형식만 변환합니다.

핵심 용어 특수 포맷
핵심적인 용어가 등장할 때는 반드시 단어{팔리어, 의미 설명} 형식으로 표현합니다. 한자 표기는 일절 사용하지 않습니다. 팔리어가 단독으로 노출되는 일 없이 항상 한글 단어와 결합하도록 합니다. 두 단어 이상으로 이루어진 용어는 이치에-맞는-생각{yoniso manasikāra, 여리작의} 처럼 하이픈으로 연결합니다.

의미 설명 간결화
중괄호 안의 마지막 자리 의미 설명은 군더더기를 걷어내고 뜻이 명확하게 전달되도록 작성하되, 중괄호 내부에서는 자연스러운 띄어쓰기를 허용합니다.

괄호 통일
소괄호, 대괄호 등 모든 괄호는 일절 사용하지 않습니다. 부연 설명이 필요한 모든 상황에서는 오직 중괄호 {}만 사용합니다. 단, 제목부를 지정하는 이중 대괄호 [[ ]]는 예외입니다.

번호 구분 배제
숫자 번호 매김, 로마자 구분, 기호 일절 사용 금지. 본문은 흐르는 줄글로 유지합니다.

제목 구조
원문의 제목 틀은 유지하되, [[ 제목 ]] 형식으로 감쌉니다. 수평선 기호 ---는 사용하지 않습니다.
올바른 예시: [[ Ⅳ 무아{anattā, 자아없음}의 세계 ]]

한자 처리
기존 텍스트에 한자 병기가 있으면 한자는 제거하고 해당 용어에 팔리어와 의미 설명을 붙여 단어{팔리어, 의미 설명} 형식으로 대체합니다.`;

const STORAGE_KEY_PROMPT = "translate_prompt";

export function PromptModal({ isOpen, onClose, colors }: PromptModalProps) {
  const [prompt, setPrompt] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_PROMPT) ?? DEFAULT_PROMPT;
    } catch {
      return DEFAULT_PROMPT;
    }
  });
  const [copied, setCopied] = useState(false);
  useEscape(isOpen, onClose);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = () => {
    try { localStorage.setItem(STORAGE_KEY_PROMPT, prompt); } catch {}
    onClose();
  };

  const handleReset = () => {
    setPrompt(DEFAULT_PROMPT);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="번역 프롬프트"
      className="fixed inset-0 z-30 flex flex-col p-4"
      style={{ backgroundColor: colors.bg }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold" style={{ color: colors.textMuted }}>번역 프롬프트</h2>
<button onClick={onClose} style={{ color: colors.textMuted, fontSize: "1.2rem" }}>✕</button>
      </div>

      {/* 프롬프트 textarea */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="flex-1 rounded-xl p-4 resize-none outline-none text-sm"
        style={{
          backgroundColor: colors.bgSecondary,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          lineHeight: "1.7",
        }}
      />

      {/* 버튼 */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleReset}
          className="rounded-xl px-4 py-3 text-sm font-medium"
          style={{ backgroundColor: colors.bgSecondary, color: colors.textMuted, border: `1px solid ${colors.border}` }}
        >초기화</button>
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-1 rounded-xl px-4 py-3 text-sm font-medium"
          style={{
            backgroundColor: copied ? colors.categorySelected : colors.bgSecondary,
            color: copied ? colors.categorySelectedText : colors.textMuted,
            border: `1px solid ${colors.border}`,
          }}
        >
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
          {copied ? "복사됨" : "복사"}
        </button>
        <button
          onClick={handleSave}
          className="flex-1 rounded-xl py-3 text-sm font-medium"
          style={{ backgroundColor: colors.categorySelected, color: colors.categorySelectedText }}
        >저장 후 닫기</button>
      </div>
    </div>
  );
}
