"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { DharmaWheel } from "@/components/DharmaWheel";
import { RubyText } from "@/components/RubyText";
import { SettingsModal } from "@/components/SettingsModal";
import { MeditationModal } from "@/components/MeditationModal";
import { QRModal } from "@/components/QRModal";
import { FontSizeModal } from "@/components/FontSizeModal";
import { loadQuotes, syncFromGoogleSheets } from "@/lib/loader";
import { getTextMetrics } from "@/lib/text-size";
import { THEMES, type Theme } from "@/lib/theme";
import type { Quote } from "@/lib/types";

const STORAGE_KEY_THEME = "app_theme";
const STORAGE_KEY_FONT_SCALE = "app_font_scale";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby8dYkRH1kUKiTfYvZ1jl2vZPR81GD2uhnU0oOPcP9gJKnGD3l0NrBtEuUdeVOfsg-b/exec";
const SECRET_KEY = "my-nikkaya-2024";

function pickRandom(quotes: Quote[], category: string | null, excludeId?: string): Quote | null {
  let pool = category ? quotes.filter((q) => q.category === category) : quotes;
  if (pool.length > 1 && excludeId) pool = pool.filter((q) => q.id !== excludeId);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function Home() {
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMeditationOpen, setIsMeditationOpen] = useState(false);
  const [meditationDuration, setMeditationDuration] = useState(3600);
  const [isQROpen, setIsQROpen] = useState(false);
  const [isFontSizeOpen, setIsFontSizeOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [fontScale, setFontScale] = useState(1.0);
  const [wheelRotate, setWheelRotate] = useState(0);
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const quotesRef = useRef<Quote[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const colors = THEMES[theme];

  // 스플래시 타이머
  useEffect(() => {
    const fadeTimer = setTimeout(() => setSplashFading(true), 1500);
    const doneTimer = setTimeout(() => setShowSplash(false), 2200);
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
  }, []);

  // 상태바 색상 동적 변경
  useEffect(() => {
    const meta = document.querySelector("meta[name='theme-color']") as HTMLMetaElement | null;
    if (meta) {
      meta.content = colors.bg;
    } else {
      const newMeta = document.createElement("meta");
      newMeta.name = "theme-color";
      newMeta.content = colors.bg;
      document.head.appendChild(newMeta);
    }
  }, [colors.bg]);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) as Theme | null;
      if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
      const savedScale = localStorage.getItem(STORAGE_KEY_FONT_SCALE);
      if (savedScale) setFontScale(parseFloat(savedScale));
    } catch {}
  }, []);

  const applyQuotes = useCallback((quotes: Quote[], category: string | null) => {
    const uniqueCategories = Array.from(new Set(quotes.map((q) => q.category)));
    quotesRef.current = quotes;
    setCategories(uniqueCategories);
    setCurrentQuote(pickRandom(quotes, category));
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const result = await loadQuotes();
        applyQuotes(result.quotes, null);
      } catch (e) {
        console.error("초기 로드 실패:", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [applyQuotes]);

  const handleNewQuote = useCallback(() => {
    setCurrentQuote((prev) => pickRandom(quotesRef.current, selectedCategory, prev?.id ?? undefined));
    setSyncStatus(null);
    setIsEditing(false);
    setEditStatus(null);
    scrollRef.current?.scrollTo({ top: 0 });
    setWheelRotate((prev) => prev + 45);
  }, [selectedCategory]);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    setSyncStatus("Google Sheets에서 최신 명언을 가져오는 중...");
    try {
      const result = await syncFromGoogleSheets();
      const categoryStillExists = selectedCategory
        ? result.quotes.some((q) => q.category === selectedCategory)
        : true;
      const nextCategory = categoryStillExists ? selectedCategory : null;
      if (!categoryStillExists) setSelectedCategory(null);
      applyQuotes(result.quotes, nextCategory);
      setSyncStatus(`${result.quotes.length}개를 최신으로 업데이트했습니다.`);
    } catch (e) {
      console.error(e);
      setSyncStatus("동기화에 실패했습니다.");
    } finally {
      setIsSyncing(false);
    }
  }, [selectedCategory, applyQuotes]);

  const handleCategorySelect = useCallback((cat: string | null) => {
    setSyncStatus(null);
    const next = cat === selectedCategory ? null : cat;
    setSelectedCategory(next);
    setCurrentQuote(pickRandom(quotesRef.current, next));
    setIsEditing(false);
    setEditStatus(null);
  }, [selectedCategory]);

  const handleThemeToggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try { localStorage.setItem(STORAGE_KEY_THEME, next); } catch {}
      return next;
    });
  }, []);

  const handleFontScaleChange = useCallback((scale: number) => {
    setFontScale(scale);
    try { localStorage.setItem(STORAGE_KEY_FONT_SCALE, String(scale)); } catch {}
  }, []);

  // 시트 동기화 (현재 명언)
  const handleSheetSync = useCallback(async () => {
    if (!currentQuote) return;
    setSyncStatus("시트에 저장 중...");
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({ id: currentQuote.id, text: currentQuote.text, key: SECRET_KEY }),
      });
      setSyncStatus("시트 저장 완료 ✓");
    } catch {
      setSyncStatus("시트 저장 실패");
    }
  }, [currentQuote]);

  // 수정 모드 시작
  const handleEditOpen = useCallback(() => {
    if (!currentQuote) return;
    setEditText(currentQuote.text);
    setEditStatus(null);
    setIsEditing(true);
    // 스크롤 위치 기억 후 textarea에 적용
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.scrollTop = scrollTop;
        textareaRef.current.focus();
      }
    }, 50);
  }, [currentQuote]);

  // 수정 저장
  const handleEditSave = useCallback(async () => {
    if (!currentQuote || !editText.trim()) return;
    setEditStatus("저장 중...");

    const updated: Quote = { ...currentQuote, text: editText.trim() };

    // localStorage 업데이트
    try {
      const cached = localStorage.getItem("quotes_cache");
      if (cached) {
        const quotes: Quote[] = JSON.parse(cached);
        const idx = quotes.findIndex((q) => q.id === currentQuote.id);
        if (idx !== -1) {
          quotes[idx] = updated;
          localStorage.setItem("quotes_cache", JSON.stringify(quotes));
          quotesRef.current = quotes;
        }
      }
    } catch {}

    // Apps Script 업데이트 (no-cors)
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({ id: currentQuote.id, text: editText.trim(), key: SECRET_KEY }),
      });
    } catch {}

    setCurrentQuote(updated);
    setEditStatus("저장 완료 ✓");
    setTimeout(() => {
      setIsEditing(false);
      setEditStatus(null);
    }, 1000);
  }, [currentQuote, editText]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center" style={{ backgroundColor: colors.bg }} />;
  }

  if (!currentQuote) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <p style={{ color: colors.textMuted }}>명언을 불러올 수 없습니다.</p>
      </div>
    );
  }

  const metrics = getTextMetrics(currentQuote.text);
  const scaledFontSize = Math.round(metrics.fontSize * fontScale);

  return (
    <div className="flex h-screen flex-col overflow-x-hidden" style={{ backgroundColor: colors.bg }}>
      {showSplash && <div
        className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
        style={{
          backgroundColor: colors.bg,
          opacity: splashFading ? 0 : 1,
          transition: "opacity 0.7s ease-out",
          pointerEvents: splashFading ? "none" : "auto",
        }}
      >
        <style>{`@keyframes spin-in-place { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <div style={{ animation: "spin-in-place 15s linear infinite" }}>
          <svg width="160" height="160" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="38" stroke={colors.buttonIcon} strokeWidth="4" fill="none" />
            {Array.from({ length: 8 }, (_, i) => (i * 45 * Math.PI) / 180).map((angle, i) => (
              <line key={i}
                x1={50 + 10 * Math.cos(angle)} y1={50 + 10 * Math.sin(angle)}
                x2={50 + 38 * Math.cos(angle)} y2={50 + 38 * Math.sin(angle)}
                stroke={colors.buttonIcon} strokeWidth="4" strokeLinecap="round"
              />
            ))}
            <circle cx="50" cy="50" r="10" fill={colors.buttonIcon} />
          </svg>
        </div>
      </div>}

      {/* 카테고리 */}
      {categories.length > 0 && (
        <div className="flex flex-wrap justify-center gap-0.5 px-1 pt-1 pb-0.5 max-h-20 overflow-y-auto overscroll-contain">
          <button
            onClick={() => handleCategorySelect(null)}
            className="rounded-full border px-1.5 py-0.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor: selectedCategory === null ? colors.categorySelected : "transparent",
              borderColor: selectedCategory === null ? colors.categorySelected : colors.categoryBorder,
              color: selectedCategory === null ? colors.categorySelectedText : colors.categoryText,
            }}
          >전체</button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategorySelect(cat)}
              className="rounded-full border px-1.5 py-0.5 text-xs font-medium transition-colors"
              style={{
                backgroundColor: selectedCategory === cat ? colors.categorySelected : "transparent",
                borderColor: selectedCategory === cat ? colors.categorySelected : colors.categoryBorder,
                color: selectedCategory === cat ? colors.categorySelectedText : colors.categoryText,
              }}
            >{cat}</button>
          ))}
        </div>
      )}

      {/* 수정 모드 전체화면 */}
      {isEditing && (
        <div className="fixed inset-0 z-30 flex flex-col p-4" style={{ backgroundColor: colors.bg }}>
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="flex-1 rounded-xl p-4 resize-none outline-none"
            style={{
              backgroundColor: colors.bgSecondary,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              fontFamily: "inherit",
              lineHeight: "1.6",
              fontSize: scaledFontSize,
            }}
          />
          {editStatus && (
            <p className="mt-2 text-xs text-center" style={{ color: colors.textMuted }}>{editStatus}</p>
          )}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => { setIsEditing(false); setEditStatus(null); }}
              className="flex-1 rounded-xl py-3 text-sm font-medium"
              style={{ backgroundColor: colors.bgSecondary, color: colors.textMuted, border: `1px solid ${colors.border}` }}
            >취소</button>
            <button
              onClick={handleEditSave}
              className="flex-1 rounded-xl py-3 text-sm font-medium"
              style={{ backgroundColor: colors.categorySelected, color: colors.categorySelectedText }}
            >저장</button>
          </div>
        </div>
      )}

      {/* 명언 영역 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 overscroll-contain">
        <div className="flex min-h-full items-center justify-center">
          <RubyText
            text={currentQuote.text}
            fontSize={scaledFontSize}
            lineHeight={metrics.lineHeight}
            colors={colors}
          />
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="px-4 pb-6 pt-4" style={{ borderTop: `1px solid ${colors.border}`, backgroundColor: colors.bg }}>
        {syncStatus && (
          <p className="mb-3 text-center text-xs" style={{ color: colors.textMuted }}>{syncStatus}</p>
        )}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => setIsSettingsOpen(true)}
            aria-label="설정"
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full shadow-md transition-transform active:scale-95"
            style={{ backgroundColor: colors.buttonPrimary }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.buttonIcon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          <button
            onClick={handleNewQuote}
            aria-label="새 명언 보기"
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full shadow-lg transition-transform active:scale-95"
            style={{ backgroundColor: colors.buttonPrimary }}
          >
            <DharmaWheel size={34} color={colors.buttonIcon} rotate={wheelRotate} />
          </button>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            aria-label="Google Sheets 동기화"
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full shadow-md transition-transform active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: colors.buttonPrimary }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.buttonIcon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: isSyncing ? "spin-sync 0.8s linear infinite" : "none", transformOrigin: "center" }}
            >
              <style>{`@keyframes spin-sync { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
          </button>
        </div>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        fontScale={fontScale}
        onFontSizeOpen={() => { setIsFontSizeOpen(true); setIsSettingsOpen(false); }}
        onMeditationStart={(duration) => { setMeditationDuration(duration); setIsMeditationOpen(true); }}
        onQROpen={() => { setIsQROpen(true); setIsSettingsOpen(false); }}
        onEditOpen={handleEditOpen}
        onSheetSync={handleSheetSync}
        colors={colors}
      />
      <FontSizeModal
        isOpen={isFontSizeOpen}
        onClose={() => setIsFontSizeOpen(false)}
        fontScale={fontScale}
        onFontScaleChange={handleFontScaleChange}
        colors={colors}
      />
      <QRModal
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
        colors={colors}
      />
      <MeditationModal
        isOpen={isMeditationOpen}
        onClose={() => setIsMeditationOpen(false)}
        colors={colors}
        duration={meditationDuration}
      />
    </div>
  );
}
