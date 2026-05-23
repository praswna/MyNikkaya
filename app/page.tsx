"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { DharmaWheel } from "@/components/DharmaWheel";
import { RubyText } from "@/components/RubyText";
import { SettingsModal } from "@/components/SettingsModal";
import { MeditationModal } from "@/components/MeditationModal";
import { QRModal } from "@/components/QRModal";
import { SplashScreen } from "@/components/SplashScreen";
import { loadQuotes, syncFromGoogleSheets } from "@/lib/loader";
import { getTextMetrics } from "@/lib/text-size";
import { THEMES, type Theme } from "@/lib/theme";
import type { Quote } from "@/lib/types";

const STORAGE_KEY_THEME = "app_theme";
const STORAGE_KEY_FONT_SCALE = "app_font_scale";

function pickRandom(quotes: Quote[], category: string | null, excludeId?: string): Quote | null {
  let pool = category ? quotes.filter((q) => q.category === category) : quotes;
  if (pool.length > 1 && excludeId) {
    pool = pool.filter((q) => q.id !== excludeId);
  }
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
  const [wheelRotate, setWheelRotate] = useState(0);
  const [showSplash, setShowSplash] = useState(true);
  const [theme, setTheme] = useState<Theme>("dark");
  const [fontScale, setFontScale] = useState(1.0);
  const quotesRef = useRef<Quote[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const colors = THEMES[theme];

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

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ backgroundColor: colors.bg }} />
    );
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
    <>
      {showSplash && (
        <SplashScreen colors={colors} onDone={() => setShowSplash(false)} />
      )}
      <div className="flex h-screen flex-col" style={{ backgroundColor: colors.bg }}>
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
          >
            전체
          </button>
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
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* 명언 텍스트 — 세로 스크롤 */}
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

      {/* 하단 버튼 — 고정 */}
      <div className="px-4 pb-6 pt-4" style={{ borderTop: `1px solid ${colors.border}`, backgroundColor: colors.bg }}>
        {syncStatus && (
          <p className="mb-3 text-center text-xs" style={{ color: colors.textMuted }}>{syncStatus}</p>
        )}
        <div className="flex items-center justify-center gap-6">
          {/* 세팅 버튼 */}
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

          {/* 법륜 버튼 - 새 명언 (세 버튼 동일 색상) */}
          <button
            onClick={handleNewQuote}
            aria-label="새 명언 보기"
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full shadow-lg transition-transform active:scale-95"
            style={{ backgroundColor: colors.buttonPrimary }}
          >
            <DharmaWheel size={34} color={colors.buttonIcon} rotate={wheelRotate} />
          </button>

          {/* 동기화 버튼 */}
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

      {/* 세팅 모달 */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        fontScale={fontScale}
        onFontScaleChange={handleFontScaleChange}
        onMeditationStart={(duration) => { setMeditationDuration(duration); setIsMeditationOpen(true); }}
        onQROpen={() => { setIsQROpen(true); setIsSettingsOpen(false); }}
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
    </>
  );
}
