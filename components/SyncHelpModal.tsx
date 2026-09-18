"use client";

import { ThemeColors } from "@/lib/theme";
import { useEscape } from "@/lib/use-escape";

interface SyncHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  colors: ThemeColors;
}

export function SyncHelpModal({ isOpen, onClose, colors }: SyncHelpModalProps) {
  useEscape(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="시트 동기화 사용법"
        className="fixed left-1/2 top-1/2 z-50 w-80 -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 shadow-2xl"
        style={{
          backgroundColor: colors.bgSecondary,
          border: `1px solid ${colors.border}`,
          maxHeight: "calc(100dvh - 8rem)",
          overflowY: "auto",
          overscrollBehavior: "contain",
        }}
      >
        <h2 className="mb-4 text-center text-sm font-semibold tracking-wide" style={{ color: colors.textMuted }}>
          시트 동기화 사용법
        </h2>

        <div className="flex flex-col gap-3 text-sm" style={{ color: colors.text }}>
          <p>이 앱의 카드는 구글 시트에 적어 둔 내용을 그대로 보여준다.</p>

          <div>
            <p className="font-medium">최신 내용 가져오기</p>
            <p style={{ color: colors.textMuted }}>
              가운데 아래 도는 화살표 버튼을 누르면 시트의 최신 내용을 가져온다.
              누르지 않아도 하루에 한 번은 자동으로 맞춰진다.
            </p>
          </div>

          <div>
            <p className="font-medium">그 자리에서 고치기</p>
            <p style={{ color: colors.textMuted }}>
              본문 오른쪽 위 연필을 누르면 화면 이동 없이 바로 고칠 수 있다.
              저장하면 시트에도 그대로 반영된다. 처음 저장할 때 편집 암호를 한
              번 물어보고, 그 뒤로는 이 기기에서 다시 묻지 않는다.
            </p>
          </div>

          <div>
            <p className="font-medium">잘 안 될 때</p>
            <p style={{ color: colors.textMuted }}>
              화면 아래에 뜨는 안내문이 까닭을 알려준다. 인터넷 연결을 확인하고
              다시 시도해도 안 되면, 시트를 관리하는 사람에게 알린다.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl py-2.5 text-sm font-medium transition-colors"
          style={{ backgroundColor: colors.buttonPrimary, color: colors.buttonIcon }}
        >
          닫기
        </button>
      </div>
    </>
  );
}
