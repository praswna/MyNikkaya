"use client";

import { useState, useEffect } from "react";
import { ThemeColors } from "@/lib/theme";
import { Quote } from "@/lib/types";

interface TranslateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (quote: Quote) => void;
  colors: ThemeColors;
  nextId: string;
}

// =============================================
// Gemini API 설정
// =============================================
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const STORAGE_KEY_GEMINI = "gemini_api_key"; // localStorage 저장 키
const TRANSLATE_CATEGORY = "번역"; // 번역된 명언의 임시 카테고리

// =============================================
// 번역/형식 변환 프롬프트
// =============================================
const SYSTEM_PROMPT = `당신은 불교 경전 전문 편집자입니다. 아래 텍스트를 다음 규칙에 따라 처리하세요.

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
기존 텍스트에 한자 병기가 있으면 한자는 제거하고 해당 용어에 팔리어와 의미 설명을 붙여 단어{팔리어, 의미 설명} 형식으로 대체합니다.

처리할 텍스트:`;

export function TranslateModal({ isOpen, onClose, onSave, colors, nextId }: TranslateModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [phase, setPhase] = useState<"input" | "output">("input");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 저장된 API 키 불러오기
  useEffect(() => {
    if (!isOpen) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GEMINI);
      if (saved) setApiKey(saved);
    } catch {}
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTranslate = async () => {
    if (!apiKey.trim()) { setError("API 키를 입력해주세요."); return; }
    if (!inputText.trim()) { setError("텍스트를 입력해주세요."); return; }

    // API 키 저장
    try { localStorage.setItem(STORAGE_KEY_GEMINI, apiKey.trim()); } catch {}

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${GEMINI_API_URL}?key=${apiKey.trim()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${inputText}` }] }],
          generationConfig: { temperature: 0.3 },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? `API 오류 ${res.status}`);
      }

      const data = await res.json();
      const result = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      setOutputText(result);
      setPhase("output");
    } catch (e) {
      setError(e instanceof Error ? e.message : "번역 실패");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!outputText.trim()) return;

    const newQuote: Quote = {
      id: nextId,
      text: outputText.trim(),
      category: TRANSLATE_CATEGORY,
    };

    // localStorage에 새 명언 추가
    try {
      const cached = localStorage.getItem("quotes_cache");
      if (cached) {
        const quotes: Quote[] = JSON.parse(cached);
        quotes.push(newQuote);
        localStorage.setItem("quotes_cache", JSON.stringify(quotes));
      }
    } catch {}

    onSave(newQuote);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-30 flex flex-col p-4" style={{ backgroundColor: colors.bg }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold" style={{ color: colors.textMuted }}>경전 번역</h2>
        <button onClick={onClose} style={{ color: colors.textMuted, fontSize: "1.2rem" }}>✕</button>
      </div>

      {/* API 키 입력 */}
      <div className="flex gap-2 mb-3">
        <input
          type={showApiKey ? "text" : "password"}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Gemini API 키 입력"
          className="flex-1 rounded-xl px-3 py-2 text-xs outline-none"
          style={{ backgroundColor: colors.bgSecondary, color: colors.text, border: `1px solid ${colors.border}` }}
        />
        <button
          onClick={() => setShowApiKey(!showApiKey)}
          className="rounded-xl px-3 py-2 text-xs"
          style={{ backgroundColor: colors.bgSecondary, color: colors.textMuted, border: `1px solid ${colors.border}` }}
        >
          {showApiKey ? "숨기기" : "보기"}
        </button>
      </div>

      {/* 입력/결과 탭 */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setPhase("input")}
          className="flex-1 rounded-xl py-1.5 text-xs font-medium"
          style={{
            backgroundColor: phase === "input" ? colors.categorySelected : colors.bgSecondary,
            color: phase === "input" ? colors.categorySelectedText : colors.textMuted,
          }}
        >입력</button>
        <button
          onClick={() => { if (outputText) setPhase("output"); }}
          className="flex-1 rounded-xl py-1.5 text-xs font-medium"
          style={{
            backgroundColor: phase === "output" ? colors.categorySelected : colors.bgSecondary,
            color: phase === "output" ? colors.categorySelectedText : colors.textMuted,
            opacity: outputText ? 1 : 0.4,
          }}
        >결과</button>
      </div>

      {/* 텍스트 에디터 */}
      {phase === "input" ? (
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="영문 또는 한국어 경전 텍스트를 붙여넣으세요..."
          className="flex-1 rounded-xl p-4 resize-none outline-none text-sm"
          style={{
            backgroundColor: colors.bgSecondary,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            lineHeight: "1.7",
          }}
        />
      ) : (
        <textarea
          value={outputText}
          onChange={(e) => setOutputText(e.target.value)}
          className="flex-1 rounded-xl p-4 resize-none outline-none text-sm"
          style={{
            backgroundColor: colors.bgSecondary,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            lineHeight: "1.7",
          }}
        />
      )}

      {/* 오류 메시지 */}
      {error && (
        <p className="mt-2 text-xs text-center" style={{ color: "#E57373" }}>{error}</p>
      )}

      {/* 버튼 */}
      <div className="flex gap-2 mt-3">
        {phase === "input" ? (
          <>
            <button
              onClick={onClose}
              className="flex-1 rounded-xl py-3 text-sm font-medium"
              style={{ backgroundColor: colors.bgSecondary, color: colors.textMuted, border: `1px solid ${colors.border}` }}
            >취소</button>
            <button
              onClick={handleTranslate}
              disabled={isLoading}
              className="flex-1 rounded-xl py-3 text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: colors.categorySelected, color: colors.categorySelectedText }}
            >
              {isLoading ? "번역 중..." : "번역"}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setPhase("input")}
              className="flex-1 rounded-xl py-3 text-sm font-medium"
              style={{ backgroundColor: colors.bgSecondary, color: colors.textMuted, border: `1px solid ${colors.border}` }}
            >다시 번역</button>
            <button
              onClick={handleSave}
              className="flex-1 rounded-xl py-3 text-sm font-medium"
              style={{ backgroundColor: colors.categorySelected, color: colors.categorySelectedText }}
            >저장</button>
          </>
        )}
      </div>
    </div>
  );
}
