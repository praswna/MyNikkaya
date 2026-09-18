"use client";

import { useState } from "react";
import { ThemeColors } from "@/lib/theme";
import { useEscape } from "@/lib/use-escape";
import { useStoredSetting } from "@/lib/settings";
import { PROMPT_SETTING_KEY, PROMPT_STORAGE_KEY, SETTINGS_GROUP } from "@/lib/settings-sync";

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  colors: ThemeColors;
  // 시트의 "설정" 탭에 담는다 - 프롬프트는 기기 취향이 아니라 모두 같아야 하는 값이라,
  // 여기서 저장해 두면 다른 기기에서는 동기화할 때 저절로 따라온다.
  onSheetSave: (group: string, entries: Record<string, string>) => void;
}

// AI(챗GPT·클로드 등)에게 그대로 붙여 넣는 안내문.
// 이 앱의 마크업 규칙 중 제목·부분강조·루비 세 가지만 설명하고,
// 맨 끝에 주제를 적을 자리를 남겨 둔다 - AI가 답을 이 서식에 맞춰 바로 써 주게 하기 위함이다.
export const AI_PROMPT_TEMPLATE = `아래 규칙에 맞춰서만 정리해줘. 규칙 밖의 다른 설명은 붙이지 말고, 규칙대로 쓴 내용만 출력해줘.

[[ ]] : 제목. 줄 전체를 감싼다. 글 맨 앞에 한 번만 쓴다. 굵고 강조색으로 보인다.
[ ] : 부분강조. [[ ]]보다 한 단계 약한 강조. 핵심 문장이나 문단에 쓴다.
낱말{설명} : 루비. 낱말 바로 뒤에 공백 없이 { } 를 붙이면 그 낱말 위에 작은 글씨로
  뜻·한자·원어를 보여준다.
  - 낱말에 공백이 있으면 "-"로 이어 쓴다 (예: 헌법-개정{...}). 화면에는 다시
    빈칸으로 보이니 신경 쓰지 않아도 된다.
  - 콤마로 여러 뜻을 나란히 달 수 있다: 낱말{한자,영어}

예시:
[[헌법 개정 절차{憲法改正節次}]]

헌법 개정은 국회의 발의와 국민투표를 거쳐야 확정됩니다.

[개정 절차는 국회 의결과 국민투표, 두 단계로 이루어집니다]

국회 의결{헌법 제130조}: 국회 재적의원 3분의 2 이상의 찬성으로 의결합니다.

---
이제 위 규칙대로 아래 주제를 정리해줘:
(여기에 주제를 적어주세요)`;

export function PromptModal({ isOpen, onClose, colors, onSheetSave }: PromptModalProps) {
  useEscape(isOpen, onClose);
  const [copied, setCopied] = useState(false);
  // 시트에 프롬프트를 담아 뒀으면 그것을 보여준다 (동기화할 때 받아 둔다).
  // 프롬프트는 크기·색과 달리 기기 취향이 아니라 모두 같아야 하므로, 여기만 저절로 따라간다.
  // 시트에 없으면 코드에 담긴 기본 안내문을 쓴다.
  const [stored, setStored] = useStoredSetting(PROMPT_STORAGE_KEY, "", (raw) => raw);
  // 고치는 동안에는 원본을 건드리지 않고 초안만 들고 있다가, 저장할 때 한 번에 바꾼다
  const [draft, setDraft] = useState<string | null>(null);
  const template = stored.trim() ? stored : AI_PROMPT_TEMPLATE;
  if (!isOpen) return null;

  const isEditing = draft !== null;

  const saveDraft = () => {
    const next = (draft ?? "").trim();
    if (!next) return;
    // 기본 안내문과 같아졌으면 아예 비워 둔다 - 나중에 기본 문구가 바뀌면 그것을 따라간다
    setStored(next === AI_PROMPT_TEMPLATE.trim() ? "" : next);
    setDraft(null);
  };

  const handleSheetSave = () => {
    onSheetSave(SETTINGS_GROUP.prompt, { [PROMPT_SETTING_KEY]: template });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(template);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = template;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI 프롬프트"
        className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 shadow-2xl"
        style={{
          backgroundColor: colors.bgSecondary,
          border: `1px solid ${colors.border}`,
          // 높이를 내용에 맡기면 고칠 때 창이 확 줄어든다 - 보여 주는 <pre> 는 글만큼
          // 길어지지만 입력칸(textarea)은 제 높이가 두어 줄뿐이라서다.
          // 프롬프트는 어차피 긴 글이므로 높이를 정해 두고, 좁은 화면에서만 줄인다.
          height: "34rem",
          maxHeight: "calc(100dvh - 8rem)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h2 className="mb-1 text-center text-sm font-semibold tracking-wide" style={{ color: colors.textMuted }}>
          AI 프롬프트
        </h2>
        <p className="mb-4 text-center text-xs" style={{ color: colors.textMuted }}>
          {isEditing
            ? "고친 뒤 저장하면 이 기기에 남는다. 시트에 저장해 두면 다른 기기에서도 동기화할 때 따라온다."
            : <>복사해서 챗GPT·클로드 같은 AI에게 붙여 넣고, 맨 끝에 물어볼 주제를 적으면
              답을 이 앱 서식([[ ]], {"{ }"} 등)에 맞춰 써 준다.</>}
        </p>

        {isEditing ? (
          <textarea
            autoFocus
            value={draft ?? ""}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="AI 프롬프트 원문"
            className="min-h-0 flex-1 resize-none rounded-xl p-3 text-xs leading-relaxed outline-none"
            style={{
              backgroundColor: colors.bg,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              fontFamily: "inherit",
              overscrollBehavior: "contain",
            }}
          />
        ) : (
          <pre
            className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap rounded-xl p-3 text-xs leading-relaxed"
            style={{
              backgroundColor: colors.bg,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              fontFamily: "inherit",
              overscrollBehavior: "contain",
            }}
          >
            {template}
          </pre>
        )}

        {isEditing ? (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setDraft(AI_PROMPT_TEMPLATE)}
              className="rounded-xl px-3 py-2.5 text-sm font-medium"
              style={{ backgroundColor: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` }}
            >기본 문구</button>
            <button
              onClick={() => setDraft(null)}
              className="flex-1 rounded-xl py-2.5 text-sm font-medium"
              style={{ backgroundColor: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` }}
            >취소</button>
            <button
              onClick={saveDraft}
              disabled={!(draft ?? "").trim()}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
              style={{ backgroundColor: colors.categorySelected, color: colors.categorySelectedText }}
            >저장</button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => setDraft(template)}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium"
                style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
              >수정</button>
              <button
                onClick={handleSheetSave}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium"
                style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
              >시트에 저장</button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium"
                style={{ backgroundColor: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` }}
              >닫기</button>
              <button
                onClick={handleCopy}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium"
                style={{ backgroundColor: colors.categorySelected, color: colors.categorySelectedText }}
              >{copied ? "복사됨 ✓" : "프롬프트 복사"}</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
