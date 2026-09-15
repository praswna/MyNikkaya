"use client";

import { useCallback, useState, type ReactNode } from "react";
import { ThemeColors } from "@/lib/theme";
import { useEscape } from "@/lib/use-escape";

interface SheetSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  colors: ThemeColors;
}

interface Step {
  title: string;
  content: ReactNode;
}

export function SheetSetupModal({ isOpen, onClose, colors }: SheetSetupModalProps) {
  const [step, setStep] = useState(0);

  // 닫을 때 처음 단계로 되돌려 둔다 - 다음에 열면 지난번 본 곳이 아니라 처음부터 보인다
  const handleClose = useCallback(() => {
    onClose();
    setStep(0);
  }, [onClose]);
  useEscape(isOpen, handleClose);

  if (!isOpen) return null;

  const muted = { color: colors.textMuted };

  const steps: Step[] = [
    {
      title: "구글에서: 시트 만들고 문 열어주기",
      content: (
        <ol className="list-decimal flex flex-col gap-2 pl-4" style={muted}>
          <li>새 구글 시트를 만들고, 1행에 <code>category</code>, <code>text</code> 를 넣는다.</li>
          <li>확장 프로그램 → Apps Script.</li>
          <li>저장소의 <code>APPS_SCRIPT.gs</code> 내용을 붙여넣는다.</li>
          <li>프로젝트 설정 → 스크립트 속성 → <code>SECRET_KEY</code>(아무도 모를 긴 문자열)를 추가한다.</li>
          <li>배포 → 새 배포 → 유형: 웹 앱, 실행 계정: 나, 액세스: 전체 → 배포.</li>
          <li>나온 <code>…/exec</code> 주소를 받아 둔다.</li>
        </ol>
      ),
    },
    {
      title: "Vercel과 GitHub에: 읽기 주소 넣기",
      content: (
        <p style={muted}>
          1단계에서 받은 주소 뒤에 <code>?format=csv</code> 를 붙인 것이 읽기 주소다.
          Vercel 환경변수와 GitHub 저장소 시크릿의 <code>GOOGLE_SHEETS_URL</code>에 넣는다.
        </p>
      ),
    },
    {
      title: "Vercel에: 쓰기 열쇠 3개 등록",
      content: (
        <div className="flex flex-col gap-2">
          <p style={muted}>Environment Variables 에 추가한다 (셋 중 하나라도 비면 저장 기능이 꺼진다):</p>
          <ul className="list-disc flex flex-col gap-1.5 pl-4" style={muted}>
            <li><code>APPS_SCRIPT_URL</code> — 1단계 주소에서 <code>?format=csv</code> 뺀 것</li>
            <li><code>APPS_SCRIPT_KEY</code> — 1단계에서 만든 <code>SECRET_KEY</code>와 같은 값</li>
            <li><code>EDIT_PASSWORD</code> — 앱에서 본문 고칠 때 물어볼 암호</li>
          </ul>
          <p style={muted}>넣은 뒤 재배포해야 적용된다.</p>
        </div>
      ),
    },
    {
      title: "확인",
      content: (
        <p style={muted}>
          동기화 버튼으로 시트 내용이 들어오는지, 연필로 고쳐 저장하면 시트에도
          반영되는지 확인한다. 자세한 절차는 저장소의 <code>SETUP.md</code> 참고.
        </p>
      ),
    },
  ];

  const isFirst = step === 0;
  const isLast = step === steps.length - 1;
  const arrowButton = "flex h-8 w-8 items-center justify-center rounded-full transition-opacity disabled:opacity-25";

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={handleClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="시트 연결 설정 안내"
        className="fixed left-1/2 top-1/2 z-50 flex -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl p-5 shadow-2xl"
        style={{
          // 화면이 넓으면 넓게, 좁은 폰에서는 화면 폭에 맞춘다 (예전보다 한 줄에 더 많이 읽힌다)
          width: "min(92vw, 30rem)",
          backgroundColor: colors.bgSecondary,
          border: `1px solid ${colors.border}`,
        }}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-wide" style={{ color: colors.textMuted }}>
            시트 연결 설정 안내
          </h2>
          <button onClick={handleClose} aria-label="닫기" className="shrink-0" style={{ color: colors.textMuted }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <h3 className="mb-3 text-sm font-semibold" style={{ color: colors.text }}>
          {steps[step].title}
        </h3>

        {/* 높이를 고정해 둔다 - 단계마다 내용 길이가 달라도 창 크기가 흔들리지 않게 */}
        <div
          className="overflow-y-auto text-sm"
          style={{ height: "min(300px, 45vh)", overscrollBehavior: "contain" }}
        >
          {steps[step].content}
        </div>

        <div className="mt-4 flex items-center justify-center gap-6">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={isFirst}
            aria-label="이전 단계"
            className={arrowButton}
            style={{ color: colors.text }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="text-sm font-medium tabular-nums" style={muted}>
            {step + 1} / {steps.length}
          </span>
          <button
            onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
            disabled={isLast}
            aria-label="다음 단계"
            className={arrowButton}
            style={{ color: colors.text }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
