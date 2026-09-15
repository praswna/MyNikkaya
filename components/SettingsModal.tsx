"use client";

import { useEffect, useState } from "react";
import { ThemeColors } from "@/lib/theme";
import { useEscape } from "@/lib/use-escape";
import { formatContentWidth } from "./SizeModal";

interface Link {
  name: string;
  url: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fontScale: number;
  contentWidth: number;
  onSizeOpen: () => void;
  onColorOpen: () => void;
  onColorPinsOpen: () => void;
  onQROpen: () => void;
  onEditOpen: () => void;
  onSyncHelpOpen: () => void;
  onSheetSetupOpen: () => void;
  onPromptOpen: () => void;
  onQuizAdminOpen: () => void;
  onCanonMapOpen: () => void;
  onTranslationOpen: () => void;
  onMeditationStart: (duration: number) => void;
  onThemeChange: (theme: "dark" | "light") => void;
  colors: ThemeColors;
}

// 라인아트 SVG 아이콘들
const Icons = {
  text: (color: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  ),
  edit: (color: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  qr: (color: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <line x1="14" y1="14" x2="14" y2="14" /><line x1="18" y1="14" x2="18" y2="14" />
      <line x1="14" y1="18" x2="14" y2="18" /><line x1="18" y1="18" x2="18" y2="18" />
      <line x1="21" y1="14" x2="21" y2="14" /><line x1="21" y1="21" x2="21" y2="21" />
      <line x1="14" y1="21" x2="14" y2="21" />
    </svg>
  ),
  sync: (color: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  ),
  palette: (color: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill={color} /><circle cx="17.5" cy="10.5" r=".5" fill={color} />
      <circle cx="8.5" cy="7.5" r=".5" fill={color} /><circle cx="6.5" cy="12.5" r=".5" fill={color} />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  ),
  link: (color: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  setup: (color: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  prompt: (color: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v12H8l-4 4V4z" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="13" y2="13" />
    </svg>
  ),
};

export function SettingsModal({
  isOpen, onClose, fontScale, contentWidth,
  onSizeOpen, onColorOpen, onColorPinsOpen, onQROpen, onEditOpen, onSyncHelpOpen, onSheetSetupOpen, onPromptOpen, onQuizAdminOpen, onCanonMapOpen, onTranslationOpen, onMeditationStart, onThemeChange, colors,
}: SettingsModalProps) {
  const [links, setLinks] = useState<Link[]>([]);
  useEscape(isOpen, onClose);
  useEffect(() => {
    if (!isOpen) return;
    fetch("/links.json").then((r) => r.json()).then(setLinks).catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="설정"
        className="fixed bottom-28 left-1/2 z-50 w-72 -translate-x-1/2 rounded-2xl p-5 shadow-2xl"
        style={{
          backgroundColor: colors.bgSecondary,
          border: `1px solid ${colors.border}`,
          // 작은 화면(아이폰 SE 등)에서 창이 화면 위로 잘려 나가던 것을 막는다
          maxHeight: "calc(100dvh - 8rem)",
          overflowY: "auto",
          overscrollBehavior: "contain",
        }}
      >
        <h2 className="mb-5 text-center text-sm font-semibold tracking-wide" style={{ color: colors.textMuted }}>설정</h2>

        <div className="mb-4 flex gap-2">
          {(["dark", "light"] as const).map((theme) => (
            <button key={theme} onClick={() => onThemeChange(theme)} className="flex-1 rounded-xl py-2 text-sm" style={{ backgroundColor: colors.bg, color: colors.text }}>
              {theme === "dark" ? "다크 배색" : "라이트 배색"}
            </button>
          ))}
        </div>
        <div className="mb-4">
          <p className="mb-2 text-xs" style={{ color: colors.textMuted }}>수행</p>
          <div className="flex gap-2">
            {[15, 30, 60].map((minutes) => (
              <button key={minutes} onClick={() => { onMeditationStart(minutes * 60); onClose(); }} className="flex-1 rounded-xl py-2.5 text-sm" style={{ backgroundColor: colors.categorySelected, color: colors.categorySelectedText }}>
                {minutes === 60 ? "1시간" : `${minutes}분`}
              </button>
            ))}
          </div>
        </div>
        {[{ label: "불교 경전 맵", open: onCanonMapOpen }, { label: "번역 프롬프트", open: onTranslationOpen }].map(({ label, open }) => (
          <button key={label} onClick={() => { open(); onClose(); }} className="mb-2 w-full rounded-xl px-3 py-2.5 text-left text-sm" style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
            {label}
          </button>
        ))}
        {/* 크기 조절 - 글자 크기 + 가로 크기 (넓은 PC 에서 화면이 양옆으로 퍼지는 것도 여기서 줄인다) */}
        <button
          onClick={() => { onSizeOpen(); onClose(); }}
          className="w-full rounded-xl py-2.5 text-sm font-medium transition-colors mb-4 flex items-center justify-between px-3"
          style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-2">
            {Icons.text(colors.text)}
            <span>크기 조절</span>
          </div>
          <span style={{ color: colors.textMuted }}>
            {Math.round(fontScale * 100)}% · {formatContentWidth(contentWidth)} ›
          </span>
        </button>

        {/* 색 조절 */}
        <button
          onClick={() => { onColorOpen(); onClose(); }}
          className="w-full rounded-xl py-2.5 text-sm font-medium transition-colors mb-4 flex items-center gap-2 px-3"
          style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
        >
          {Icons.palette(colors.text)}
          <span>색 조절</span>
        </button>

        {/* 색 조절 2 - 색 종류마다 작은 판을 본문의 그 글자 옆에 한꺼번에 띄운다 */}
        <button
          onClick={() => { onColorPinsOpen(); onClose(); }}
          className="w-full rounded-xl py-2.5 text-sm font-medium transition-colors mb-4 flex items-center gap-2 px-3"
          style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
        >
          {Icons.palette(colors.text)}
          <span>색 조절 2</span>
          <span className="ml-auto text-xs" style={{ color: colors.textMuted }}>글 옆에서 ›</span>
        </button>

        {/* 내용 수정 */}
        <button
          onClick={() => { onEditOpen(); onClose(); }}
          className="w-full rounded-xl py-2.5 text-sm font-medium transition-colors mb-2 flex items-center gap-2 px-3"
          style={{ backgroundColor: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` }}
        >
          {Icons.edit(colors.textMuted)}
          <span>내용 수정</span>
        </button>

        {/* AI 프롬프트 - 마크업 규칙을 AI 에게 그대로 붙여 넣을 수 있게 안내문을 보여준다 */}
        <button
          onClick={() => { onPromptOpen(); onClose(); }}
          className="w-full rounded-xl py-2.5 text-sm font-medium transition-colors mb-2 flex items-center gap-2 px-3"
          style={{ backgroundColor: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` }}
        >
          {Icons.prompt(colors.textMuted)}
          <span>AI 프롬프트</span>
        </button>

        <button
          onClick={() => { onQuizAdminOpen(); onClose(); }}
          className="mb-2 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
          style={{ backgroundColor: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` }}
        >
          {Icons.prompt(colors.textMuted)}
          <span>시험문제 출제</span>
        </button>

        {/* QR 코드 */}
        <button
          onClick={onQROpen}
          className="w-full rounded-xl py-2.5 text-sm font-medium transition-colors mb-2 flex items-center gap-2 px-3"
          style={{ backgroundColor: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` }}
        >
          {Icons.qr(colors.textMuted)}
          <span>QR 코드</span>
        </button>

        {/* 시트 동기화 사용법 */}
        <button
          onClick={() => { onSyncHelpOpen(); onClose(); }}
          className="w-full rounded-xl py-2.5 text-sm font-medium transition-colors mb-2 flex items-center gap-2 px-3"
          style={{ backgroundColor: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` }}
        >
          {Icons.sync(colors.textMuted)}
          <span>시트 동기화 사용법</span>
        </button>

        {/* 시트 연결 설정 안내 - 처음 연결할 때만 필요 (읽기 전용 앱이면 안 봐도 된다) */}
        <button
          onClick={() => { onSheetSetupOpen(); onClose(); }}
          className="w-full rounded-xl py-2.5 text-sm font-medium transition-colors mb-4 flex items-center gap-2 px-3"
          style={{ backgroundColor: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` }}
        >
          {Icons.setup(colors.textMuted)}
          <span>시트 연결 설정 안내</span>
        </button>

        {/* 링크 */}
        {links.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 px-1">
              {Icons.link(colors.textMuted)}
              <span className="text-xs font-medium" style={{ color: colors.textMuted }}>참고 사이트</span>
            </div>
            <div className="flex flex-col gap-1">
              {links.map((link) => (
                <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="rounded-lg px-3 py-2 text-sm transition-colors"
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
