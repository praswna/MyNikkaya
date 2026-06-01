"use client";

import { useEffect, useState } from "react";
import { Theme, ThemeColors } from "@/lib/theme";

interface Link {
  name: string;
  url: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  onThemeToggle: () => void;
  fontScale: number;
  onFontSizeOpen: () => void;
  onMeditationStart: (duration: number) => void;
  onQROpen: () => void;
  onEditOpen: () => void;
  onTranslateOpen: () => void;
  onPromptOpen: () => void;
  colors: ThemeColors;
}

const BELL_FILES: { duration: number; label: string }[] = [
  { duration: 15 * 60, label: "15분" },
  { duration: 30 * 60, label: "30분" },
  { duration: 60 * 60, label: "1시간" },
];

// 라인아트 SVG 아이콘들
const Icons = {
  sun: (color: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  moon: (color: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  text: (color: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  ),
  bell: (color: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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
  link: (color: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
};

export function SettingsModal({
  isOpen, onClose, theme, onThemeToggle, fontScale,
  onFontSizeOpen, onMeditationStart, onQROpen, onEditOpen, onTranslateOpen, onPromptOpen, colors,
}: SettingsModalProps) {
  const [links, setLinks] = useState<Link[]>([]);
  useEffect(() => {
    if (!isOpen) return;
    fetch("/links.json").then((r) => r.json()).then(setLinks).catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;
  const isLight = theme === "light";

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div
        className="fixed bottom-28 left-1/2 z-50 w-72 -translate-x-1/2 rounded-2xl p-5 shadow-2xl"
        style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
      >
        <h2 className="mb-5 text-center text-sm font-semibold tracking-wide" style={{ color: colors.textMuted }}>설정</h2>

        {/* 테마 토글 */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLight ? Icons.sun(colors.text) : Icons.moon(colors.text)}
            <span className="text-sm font-medium" style={{ color: colors.text }}>
              {isLight ? "라이트 모드" : "다크 모드"}
            </span>
          </div>
          <button
            onClick={onThemeToggle}
            style={{
              position: "relative", width: "44px", height: "24px", borderRadius: "12px",
              backgroundColor: isLight ? colors.categorySelected : colors.categoryBorder,
              transition: "background-color 0.2s", padding: 0, border: "none", cursor: "pointer",
            }}
          >
            <span style={{
              position: "absolute", top: "2px", left: "2px", width: "20px", height: "20px",
              borderRadius: "10px", backgroundColor: colors.text, boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              transform: isLight ? "translateX(20px)" : "translateX(0)", transition: "transform 0.2s",
            }} />
          </button>
        </div>

        {/* 글자 크기 */}
        <button
          onClick={() => { onFontSizeOpen(); onClose(); }}
          className="w-full rounded-xl py-2.5 text-sm font-medium transition-colors mb-4 flex items-center justify-between px-3"
          style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
        >
          <div className="flex items-center gap-2">
            {Icons.text(colors.text)}
            <span>글자 크기</span>
          </div>
          <span style={{ color: colors.textMuted }}>{Math.round(fontScale * 100)}% ›</span>
        </button>

        {/* 수행 종 */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 px-1">
            {Icons.bell(colors.textMuted)}
            <span className="text-xs font-medium" style={{ color: colors.textMuted }}>수행</span>
          </div>
          <div className="flex gap-2">
            {BELL_FILES.map((file) => (
              <button
                key={file.duration}
                onClick={() => { onMeditationStart(file.duration); onClose(); }}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors"
                style={{ backgroundColor: colors.categorySelected, color: colors.categorySelectedText }}
              >
                {file.label}
              </button>
            ))}
          </div>
        </div>

        {/* 내용 수정 */}
        <button
          onClick={() => { onEditOpen(); onClose(); }}
          className="w-full rounded-xl py-2.5 text-sm font-medium transition-colors mb-2 flex items-center gap-2 px-3"
          style={{ backgroundColor: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` }}
        >
          {Icons.edit(colors.textMuted)}
          <span>내용 수정</span>
        </button>

        {/* 경전 번역 버튼 */}
        <button
          onClick={() => { onTranslateOpen(); onClose(); }}
          className="w-full rounded-xl py-2.5 text-sm font-medium transition-colors mb-2 flex items-center gap-2 px-3"
          style={{ backgroundColor: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/>
            <path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/>
          </svg>
          <span>경전 번역</span>
        </button>

        {/* QR 코드 */}
        <button
          onClick={onQROpen}
          className="w-full rounded-xl py-2.5 text-sm font-medium transition-colors mb-4 flex items-center gap-2 px-3"
          style={{ backgroundColor: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` }}
        >
          {Icons.qr(colors.textMuted)}
          <span>QR 코드</span>
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
