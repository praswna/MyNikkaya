"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { DharmaWheel } from "@/components/DharmaWheel";
import { RubyText } from "@/components/RubyText";
import { SettingsModal } from "@/components/SettingsModal";
import { MeditationModal } from "@/components/MeditationModal";
import { QRModal } from "@/components/QRModal";
import { SizeModal, CONTENT_WIDTH_DEFAULT, CONTENT_WIDTH_MAX } from "@/components/SizeModal";
import { PromptModal } from "@/components/PromptModal";
import { CanonMapModal } from "@/components/CanonMapModal";
import { SourceEditor } from "@/components/SourceEditor";
import { EditPasswordModal } from "@/components/EditPasswordModal";
import { loadQuotes, loadBundledQuotes, saveQuotesCache, syncFromGoogleSheets } from "@/lib/loader";
import { loadEditPassword, saveEditPassword } from "@/lib/edit-key";
import { getTextMetrics } from "@/lib/text-size";
import { findEditAnchor, measureTextTop } from "@/lib/edit-position";
import { THEMES, type Theme } from "@/lib/theme";
import type { Quote } from "@/lib/types";

// =============================================
// 앱 설정 상수
// =============================================
const STORAGE_KEY_THEME = "app_theme";           // 테마 localStorage 키
const STORAGE_KEY_FONT_SCALE = "app_font_scale"; // 글자 크기 localStorage 키
const STORAGE_KEY_CONTENT_WIDTH = "app_content_width"; // 본문 가로 크기 localStorage 키
const EDIT_BUTTON_ZONE = 44;                     // 본문 오른쪽 위 수정 버튼이 차지하는 높이(px)


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
  const [isEditSyncing, setIsEditSyncing] = useState(false);
  const [pendingSave, setPendingSave] = useState<{ oldText: string; newText: string } | null>(null);
  const [passwordWasRejected, setPasswordWasRejected] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMeditationOpen, setIsMeditationOpen] = useState(false);
  const [meditationDuration, setMeditationDuration] = useState(3600);
  const [isQROpen, setIsQROpen] = useState(false);
  const [isSizeOpen, setIsSizeOpen] = useState(false);
  const [isCanonMapOpen, setIsCanonMapOpen] = useState(false);
  const [allQuotes, setAllQuotes] = useState<Quote[]>([]);
  const [theme, setTheme] = useState<Theme>("dark");
  const [fontScale, setFontScale] = useState(1.0);
  const [contentWidth, setContentWidth] = useState(CONTENT_WIDTH_DEFAULT);
  const [wheelRotate, setWheelRotate] = useState(0);
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editAnchor, setEditAnchor] = useState(0);
  // 고치는 중인 글은 ref 에만 둔다. 상태로 두면 글자 하나마다 화면 전체가 다시 그려진다.
  const editTextRef = useRef("");
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
    document.documentElement.style.backgroundColor = colors.bg;
    document.body.style.backgroundColor = colors.bg;
  }, [colors.bg]);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) as Theme | null;
      if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
      const savedScale = localStorage.getItem(STORAGE_KEY_FONT_SCALE);
      if (savedScale) setFontScale(parseFloat(savedScale));
      const savedWidth = localStorage.getItem(STORAGE_KEY_CONTENT_WIDTH);
      if (savedWidth) setContentWidth(parseInt(savedWidth, 10));
    } catch {}
  }, []);

  // 명언 목록을 한 곳에서 갈아끼운다 (메모리·화면·카테고리를 함께 맞춘다)
  const setQuoteList = useCallback((quotes: Quote[]) => {
    quotesRef.current = quotes;
    setAllQuotes(quotes);
    setCategories(Array.from(new Set(quotes.map((q) => q.category))));
  }, []);

  const applyQuotes = useCallback((quotes: Quote[], category: string | null) => {
    setQuoteList(quotes);
    setCurrentQuote(pickRandom(quotes, category));
  }, [setQuoteList]);

  useEffect(() => {
    const init = async () => {
      try {
        const result = await loadQuotes();
        applyQuotes(result.quotes, null);

        // 캐시로 띄웠으면 저장소에 실린 CSV(매일 시트에서 갱신된다)와 견줘 본다.
        // 개수가 달라졌다 = 명언이 늘거나 줄었다는 뜻이라 새 목록으로 갈아끼운다.
        // 본문만 고친 경우는 개수가 그대로라 여기로 오지 않는다 (내가 고친 글이 되돌아가지 않는다).
        // 이게 없으면 동기화 버튼을 한 번 누른 기기는 새 명언을 영영 못 본다.
        if (result.source === "local-storage") {
          try {
            const bundled = await loadBundledQuotes();
            if (bundled.length > 0 && bundled.length !== result.quotes.length) {
              saveQuotesCache(bundled);
              setQuoteList(bundled); // 읽고 있던 명언은 그대로 둔다
            }
          } catch {}
        }
      } catch (e) {
        console.error("초기 로드 실패:", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [applyQuotes, setQuoteList]);

  // 시트에 저장. 서버가 암호를 요구하면(401) 하려던 저장을 담아 두고 암호를 묻는다.
  const syncToSheet = useCallback(async (oldText: string, newText: string) => {
    setIsEditSyncing(true);
    setSyncStatus("동기화 중...");
    try {
      const res = await fetch("/api/sync-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 암호는 본문에 담는다 - 헤더(라틴-1)에는 한글 암호를 실을 수 없다
        body: JSON.stringify({ oldText, newText, password: loadEditPassword() }),
      });
      if (res.status === 401) {
        setPasswordWasRejected(loadEditPassword() !== "");
        setPendingSave({ oldText, newText });
        setSyncStatus("편집 암호가 필요합니다");
        return; // 암호를 받으면 이어서 다시 시도한다
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Unknown error");
      setSyncStatus("완료 ✓");
    } catch {
      setSyncStatus("동기화 실패");
    } finally {
      setIsEditSyncing(false);
    }
    setTimeout(() => setSyncStatus(null), 2000);
  }, []);

  // 명언 원문 저장 (로컬 캐시 + 시트 동기화)
  // 본문에서 바로 고친 것과 주석 팝업 저장이 같은 경로를 쓴다
  const saveQuoteText = useCallback((newText: string) => {
    if (!currentQuote) return;
    const trimmed = newText.trim();
    if (!trimmed || trimmed === currentQuote.text) return;

    const oldText = currentQuote.text;
    const updated: Quote = { ...currentQuote, text: trimmed };
    setCurrentQuote(updated);

    // 1. 로컬 저장 - 메모리·경전 맵·캐시를 한꺼번에 맞춘다.
    //    예전에는 캐시가 이미 있을 때만 반영해서, 동기화 버튼을 한 번도 안 누른
    //    기기에서는 고친 내용이 다른 명언에 갔다 오면 되돌아가 있었다.
    //    찾는 기준은 시트에 쓸 때와 같은 '본문 전체 일치' 다.
    setSyncStatus("저장 중...");
    const nextQuotes = quotesRef.current.map((q) => (q.text === oldText ? updated : q));
    setQuoteList(nextQuotes);
    saveQuotesCache(nextQuotes);

    // 2. 시트 동기화 (백그라운드)
    syncToSheet(oldText, trimmed);
  }, [currentQuote, syncToSheet, setQuoteList]);

  // 암호를 받았으면 저장을 이어서 다시 시도한다
  const handlePasswordSubmit = useCallback((password: string) => {
    saveEditPassword(password);
    const job = pendingSave;
    setPendingSave(null);
    setPasswordWasRejected(false);
    if (job) syncToSheet(job.oldText, job.newText);
  }, [pendingSave, syncToSheet]);

  // 암호를 넣지 않으면 고친 내용은 이 기기에만 남는다 - 그 사실을 알려준다
  const handlePasswordCancel = useCallback(() => {
    setPendingSave(null);
    setPasswordWasRejected(false);
    setSyncStatus("시트에 저장하지 않았습니다");
    setTimeout(() => setSyncStatus(null), 3000);
  }, []);

  // 수정 중에 다른 버튼(새 명언·카테고리·경전맵)을 눌러도 고친 내용을 잃지 않게 먼저 저장한다.
  // 되돌리고 싶으면 본문 오른쪽 위의 취소(✕) 버튼을 쓴다.
  const commitEdit = useCallback(() => {
    if (!isEditing) return;
    setIsEditing(false);
    saveQuoteText(editTextRef.current);
  }, [isEditing, saveQuoteText]);

  const handleCanonSelect = useCallback((quote: Quote) => {
    setIsCanonMapOpen(false);
    commitEdit();
    setCurrentQuote(quote);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [commitEdit]);

  const handleNewQuote = useCallback(() => {
    commitEdit();
    setCurrentQuote((prev) => pickRandom(quotesRef.current, selectedCategory, prev?.id ?? undefined));
    scrollRef.current?.scrollTo({ top: 0 });
    setWheelRotate((prev) => prev + 45);
    setIsEditSyncing((syncing) => { if (!syncing) setSyncStatus(null); return syncing; });
  }, [selectedCategory, commitEdit]);

  const handleSync = useCallback(async () => {
    commitEdit();
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
  }, [selectedCategory, applyQuotes, commitEdit]);

  const handleCategorySelect = useCallback((cat: string | null) => {
    setSyncStatus(null);
    commitEdit();
    const next = cat === selectedCategory ? null : cat;
    setSelectedCategory(next);
    setCurrentQuote(pickRandom(quotesRef.current, next));
    scrollRef.current?.scrollTo({ top: 0 });
  }, [selectedCategory, commitEdit]);

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

  const handleContentWidthChange = useCallback((width: number) => {
    setContentWidth(width);
    try { localStorage.setItem(STORAGE_KEY_CONTENT_WIDTH, String(width)); } catch {}
  }, []);

  const handleEditChange = useCallback((next: string) => { editTextRef.current = next; }, []);

  // 본문 자리에서 바로 수정 시작
  const handleEditOpen = useCallback(() => {
    if (!currentQuote || isEditing) return;
    editTextRef.current = currentQuote.text;
    // 읽고 있던 맨 윗줄의 원문 위치를 기억해 둔다
    setEditAnchor(findEditAnchor(scrollRef.current, currentQuote.text));
    setIsEditing(true);
  }, [currentQuote, isEditing]);

  // 수정으로 바뀌는 순간, 읽던 줄이 있던 자리로 본문을 맞춘다
  useEffect(() => {
    if (!isEditing || !textareaRef.current) return;
    const ta = textareaRef.current;
    ta.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      ta.setSelectionRange(editAnchor, editAnchor);
      const container = scrollRef.current;
      if (!container) return;
      // 읽던 줄이 오른쪽 위 버튼에 가리지 않도록 그 아래에 오게 한다
      const textTop = ta.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
      container.scrollTop = Math.max(textTop + measureTextTop(ta, editAnchor) - EDIT_BUTTON_ZONE, 0);
    });
  }, [isEditing, editAnchor]);

  // 수정 마치기 (저장)
  const handleEditSave = useCallback(() => {
    if (!editTextRef.current.trim()) return;
    setIsEditing(false);
    saveQuoteText(editTextRef.current);
  }, [saveQuoteText]);

  // 수정 취소 - 고친 내용은 버린다
  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

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
  const roundButton = "flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition-transform active:scale-95";

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{
        backgroundColor: colors.bg,
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
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

      {/* 화면이 넓은 PC 에서 양옆으로 퍼지지 않게, 카테고리·본문·버튼을 한 기둥에 담는다 */}
      <div
        className="mx-auto flex w-full min-h-0 flex-1 flex-col"
        style={{ maxWidth: contentWidth >= CONTENT_WIDTH_MAX ? undefined : contentWidth }}
      >
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

        {/* 명언 영역 - 읽기와 수정이 같은 자리를 쓴다 */}
        {/* 버튼은 스크롤 영역 밖에 두어야 본문을 내려도 오른쪽 위에 그대로 남는다 */}
        <div className="relative flex min-h-0 flex-1">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 overscroll-contain">
            <div className="flex min-h-full items-center justify-center">
              {isEditing ? (
                // 위아래로 같은 여백을 둬서, 글이 길 때 첫 줄이 오른쪽 위 버튼에 가리지 않게 한다
                // (짧은 명언은 가운데 정렬이라 여백이 있어도 자리가 그대로다)
                <SourceEditor
                  initialValue={currentQuote.text}
                  onChange={handleEditChange}
                  fontSize={scaledFontSize}
                  lineHeight={metrics.lineHeight}
                  colors={colors}
                  textareaRef={textareaRef}
                  marginY={EDIT_BUTTON_ZONE}
                />
              ) : (
                <RubyText
                  text={currentQuote.text}
                  fontSize={scaledFontSize}
                  lineHeight={metrics.lineHeight}
                  colors={colors}
                  onTextChange={saveQuoteText}
                />
              )}
            </div>
          </div>

          {/* 수정 버튼 - 화면을 옮기지 않고 본문에서 바로 고친다 */}
          <div className="absolute right-1 top-1 flex gap-1.5">
            {isEditing ? (
              <>
                <button
                  onClick={handleEditCancel}
                  aria-label="수정 취소"
                  className={roundButton}
                  style={{ backgroundColor: colors.buttonPrimary }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.buttonIcon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
                <button
                  onClick={handleEditSave}
                  aria-label="수정 완료"
                  className={roundButton}
                  style={{ backgroundColor: colors.categorySelected }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.categorySelectedText} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
              </>
            ) : (
              <button
                onClick={handleEditOpen}
                aria-label="내용 수정"
                className={roundButton}
                style={{ backgroundColor: colors.buttonPrimary }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.buttonIcon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* 하단 버튼 */}
        <div
          className="px-4 pt-3"
          style={{
            borderTop: `1px solid ${colors.border}`,
            backgroundColor: colors.bg,
            paddingBottom: "max(calc(env(safe-area-inset-bottom) - 2rem), 0px)",
          }}
        >
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
      </div>

      {syncStatus && (
        <p
          className="fixed text-center text-xs"
          style={{
            color: colors.textMuted,
            bottom: "12px",
            left: 0,
            right: 0,
            pointerEvents: "none",
          }}
        >{syncStatus}</p>
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        fontScale={fontScale}
        contentWidth={contentWidth}
        onSizeOpen={() => { setIsSizeOpen(true); setIsSettingsOpen(false); }}
        onMeditationStart={(duration) => { setMeditationDuration(duration); setIsMeditationOpen(true); }}
        onQROpen={() => { setIsQROpen(true); setIsSettingsOpen(false); }}
        onEditOpen={handleEditOpen}
        onPromptOpen={() => setIsPromptOpen(true)}
        onCanonMapOpen={() => setIsCanonMapOpen(true)}
        colors={colors}
      />
      <CanonMapModal
        isOpen={isCanonMapOpen}
        onClose={() => setIsCanonMapOpen(false)}
        quotes={allQuotes}
        onSelectQuote={handleCanonSelect}
        colors={colors}
      />
      <PromptModal
        isOpen={isPromptOpen}
        onClose={() => setIsPromptOpen(false)}
        colors={colors}
      />
      <SizeModal
        isOpen={isSizeOpen}
        onClose={() => setIsSizeOpen(false)}
        fontScale={fontScale}
        onFontScaleChange={handleFontScaleChange}
        contentWidth={contentWidth}
        onContentWidthChange={handleContentWidthChange}
        colors={colors}
      />
      <QRModal
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
        colors={colors}
      />
      {/* 열 때마다 새로 만든다 - 그래야 수행 상태가 깨끗하게 시작하고,
          이 화면이 다시 그려져도 수행이 처음부터 되돌아가지 않는다 */}
      {isMeditationOpen && (
        <MeditationModal
          onClose={() => setIsMeditationOpen(false)}
          colors={colors}
          duration={meditationDuration}
        />
      )}
      <EditPasswordModal
        isOpen={pendingSave !== null}
        wasRejected={passwordWasRejected}
        onSubmit={handlePasswordSubmit}
        onCancel={handlePasswordCancel}
        colors={colors}
      />
    </div>
  );
}
