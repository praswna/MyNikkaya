"use client";

import { Fragment, useEffect, useLayoutEffect, useMemo, useState, useCallback, useRef } from "react";
import { DharmaWheel } from "@/components/DharmaWheel";
import { CanonMapModal } from "@/components/CanonMapModal";
import { MeditationModal } from "@/components/MeditationModal";
import { TranslationPromptModal } from "@/components/TranslationPromptModal";
import { THEMES } from "@/lib/theme";
import { useColorActions } from "@/lib/colors";
import { ColorPins } from "@/components/ColorPins";
import { RubyText, DEFAULT_TEXT_SCALES, DEFAULT_RUBY_EMPHASIS, type TextScales } from "@/components/RubyText";
import { SettingsModal } from "@/components/SettingsModal";
import { QRModal } from "@/components/QRModal";
import { SyncHelpModal } from "@/components/SyncHelpModal";
import { SheetSetupModal } from "@/components/SheetSetupModal";
import { PromptModal } from "@/components/PromptModal";
import {
  SizeModal, CONTENT_WIDTH_DEFAULT, CONTENT_WIDTH_MAX, CONTENT_WIDTH_MIN, TEXT_SCALE_MAX_WIDE,
  COUNT_SIZE_DEFAULT, COUNT_SIZE_MAX, COUNT_SIZE_MIN, SIZE_PRESETS_KEY,
  CATEGORY_SIZE_DEFAULT, CATEGORY_SIZE_MAX, CATEGORY_SIZE_MIN,
  ACTION_SIZE_DEFAULT, ACTION_SIZE_MAX, ACTION_SIZE_MIN,
  FONT_SCALE_MAX, FONT_SCALE_MIN, TEXT_SCALE_MAX, TEXT_SCALE_MIN, TEXT_SCALE_MIN_SMALL,
} from "@/components/SizeModal";
import { SourceEditor } from "@/components/SourceEditor";
import { EditPasswordModal } from "@/components/EditPasswordModal";
import { NewQuoteModal } from "@/components/NewQuoteModal";
import { RenameCategoryModal } from "@/components/RenameCategoryModal";
import { MoveCategoryModal } from "@/components/MoveCategoryModal";
import { LoadingBar } from "@/components/LoadingBar";
import { ConfirmModal } from "@/components/ConfirmModal";
import { SearchBar, type SearchBarHandle } from "@/components/SearchBar";
import { QuizMode } from "@/components/QuizMode";
import { QuizAdminModal } from "@/components/QuizAdminModal";
import {
  CATEGORY_SEPARATOR, categoryLabel, categoryTrail, childCategories,
  isInCategory, parentCategory, renameCategoryPath,
} from "@/lib/category";
import { ColorModal } from "@/components/ColorModal";
import { loadQuotes, loadBundledQuotes, saveQuotesCache, syncFromGoogleSheets } from "@/lib/loader";
import { loadEditPassword, saveEditPassword } from "@/lib/edit-key";
import {
  fetchSheetSettings, settingsSavePayload,
  PROMPT_SETTING_KEY, PROMPT_STORAGE_KEY, SETTINGS_GROUP,
} from "@/lib/settings-sync";
import { parseSavedPalettes, replaceSavedPalettes, SAVED_PALETTES_KEY } from "@/lib/saved-palettes";
import { getTextMetrics } from "@/lib/text-size";
import { findEditAnchor, measureTextTop } from "@/lib/edit-position";
import { mergeColors, useColorOverrides } from "@/lib/colors";
import { useStoredSetting } from "@/lib/settings";
import { loadReadPosition, saveReadPosition } from "@/lib/read-position";
import type { Quote } from "@/lib/types";

// =============================================
// 앱 설정 상수
// =============================================
const STORAGE_KEY_FONT_SCALE = "app_font_scale"; // 글자 크기 localStorage 키
const STORAGE_KEY_CONTENT_WIDTH = "app_content_width"; // 본문 가로 크기 localStorage 키
// 제목·부분강조·대화·강조·루비 - 각 갈래 글자 크기(평문 대비 배수) localStorage 키
const STORAGE_KEY_TEXT_SCALE: Record<keyof TextScales, string> = {
  title: "app_title_scale",
  emphasis: "app_emphasis_scale",
  talk: "app_talk_scale",
  say: "app_say_scale",
  ruby: "app_ruby_scale",
  rubyBase: "app_ruby_base_scale",
};
const STORAGE_KEY_RUBY_EMPHASIS = "app_ruby_emphasis"; // 딸림글(루비) 강조 정도 localStorage 키
const STORAGE_KEY_CATEGORY_SIZE = "app_category_size"; // 카테고리 칩 글자 크기(px) 키
const STORAGE_KEY_COUNT_SIZE = "app_category_count_size"; // 카테고리 칩에 곁들이는 글 수 크기(px) 키
const STORAGE_KEY_ACTION_SIZE = "app_action_button_size"; // 본문 위 버튼(검색·+·수정) 지름(px) 키
const EDIT_BUTTON_GAP = 8;                       // 본문 위 버튼과 글 사이에 두는 여백(px)


// 화면을 그리기 직전에 자리를 맞춰야 튀지 않는다. 서버에서 그릴 때는 useEffect 로 둔다.
const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// 시트에 보낼 것. 수정은 이름표(id)를 알면 그것만, 모르면 옛 본문 전체로 행을 찾는다.
// 삭제는 본문 없이 행만 지운다. 등록은 카테고리·본문·요청 ID로 새 행을 만든다.
// 카테고리 이름 수정은 그 이름을 쓰는 모든 행의 카테고리 칸을 한 번에 바꾼다.
type SavePayload =
  | { action?: undefined; id?: string; oldText?: string; newText: string }
  | { action: "delete"; id?: string; oldText?: string }
  | { action: "create"; category: string; newText: string; requestId: string }
  | { action: "renameCategory"; oldCategory: string; newCategory: string }
  | { action: "moveQuote"; id?: string; oldText?: string; category: string }
  | { action: "saveSettings"; group: string; entries: string };

// 시트가 돌려준 까닭을 그대로 알려준다.
// "동기화 실패" 한 줄만 뜨면 열쇠가 틀린 건지 행을 못 찾은 건지 알 수 없다.
function sheetErrorMessage(error: unknown): string {
  switch (error) {
    case "Unauthorized": return "시트 열쇠가 맞지 않습니다 (APPS_SCRIPT_KEY)";
    case "Server not configured": return "시트에 열쇠가 없습니다 (스크립트 속성 SECRET_KEY)";
    case "Row not found": return "시트에서 이 항목을 찾지 못했습니다";
    case "Missing params": return "보낼 내용이 비어 있습니다";
    default: return typeof error === "string" && error ? error : "동기화 실패";
  }
}

// 지금 시각을 시트가 적는 것과 같은 꼴로 만든다 ("2026-09-07 14:30").
// 시트 응답을 기다리지 않고 화면을 먼저 바꾸므로, 고친 때도 여기서 함께 적어 둔다 -
// 다음 동기화 때 시트가 적은 값으로 갈리며 자연히 맞춰진다.
function nowStamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    + ` ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

// 저장된 값이 비었거나 망가졌을 때를 대비한다
function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

function pickRandom(quotes: Quote[], category: string | null, excludeId?: string): Quote | null {
  let pool = category ? quotes.filter((q) => isInCategory(q.category, category)) : quotes;
  if (pool.length > 1 && excludeId) pool = pool.filter((q) => q.id !== excludeId);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function Home() {
  const [categories, setCategories] = useState<string[]>([]);
  // quotesRef 와 같은 내용을 담지만, 그리는 동안 읽어도 되는 상태 값이다
  // (카테고리별 글 수·순번 표시에 쓴다 - ref 는 렌더 중에 읽으면 안 된다).
  const [quoteListState, setQuoteListState] = useState<Quote[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // 첫 화면에서 글 묶음(CSV)을 받는 동안의 진행 - null 은 얼마나 남았는지 모른다는 뜻
  const [loadProgress, setLoadProgress] = useState<number | null>(0);
  // 막대가 끝까지 찼는가. 글이 준비되어도 막대가 도착할 때까지는 첫 화면을 둔다 -
  // 다 찬 적 없는 막대가 사라지면 뭔가 잘못된 것처럼 보인다.
  const [loadBarFinished, setLoadBarFinished] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const isEditSyncingRef = useRef(false); // 시트에 저장 중인가 (안내문을 지울지 판단용)
  const [isEditSyncing, setIsEditSyncing] = useState(false);
  const [pendingSave, setPendingSave] = useState<SavePayload | null>(null);
  const [passwordWasRejected, setPasswordWasRejected] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isQROpen, setIsQROpen] = useState(false);
  const [isSyncHelpOpen, setIsSyncHelpOpen] = useState(false);
  const [isSheetSetupOpen, setIsSheetSetupOpen] = useState(false);
  const [isCanonMapOpen, setIsCanonMapOpen] = useState(false);
  const [isMeditationOpen, setIsMeditationOpen] = useState(false);
  const [meditationDuration, setMeditationDuration] = useState(3600);
  const [isTranslationOpen, setIsTranslationOpen] = useState(false);
  const { setColors } = useColorActions();
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [isSizeOpen, setIsSizeOpen] = useState(false);
  const [isColorOpen, setIsColorOpen] = useState(false);
  // 색 조절 2 - 색 종류마다 작은 판을 본문의 그 글자 옆에 띄운다 (색 조절 창과 따로 연다)
  const [isColorPinsOpen, setIsColorPinsOpen] = useState(false);
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  // 지금 보는 글 하나만 다른 카테고리로 옮기는 창이 열려 있는지
  const [isMovingQuote, setIsMovingQuote] = useState(false);
  // 삭제를 되묻는 창이 떠 있는지 (브라우저 confirm 대신 앱 모양으로 묻는다)
  const [isDeleteAsking, setIsDeleteAsking] = useState(false);
  const [quizCategory, setQuizCategory] = useState<string | null>(null);
  const [isQuizAdminOpen, setIsQuizAdminOpen] = useState(false);
  const [fontScale, setFontScale] = useStoredSetting(
    STORAGE_KEY_FONT_SCALE, 1.75, (raw) => clamp(parseFloat(raw), FONT_SCALE_MIN, FONT_SCALE_MAX, 1.75));
  const [contentWidth, setContentWidth] = useStoredSetting(
    STORAGE_KEY_CONTENT_WIDTH, CONTENT_WIDTH_DEFAULT,
    (raw) => clamp(parseInt(raw, 10), CONTENT_WIDTH_MIN, CONTENT_WIDTH_MAX, CONTENT_WIDTH_DEFAULT));
  // 제목·부분강조·대화·강조·루비 각각의 크기 - 평문(fontScale) 대비 배수로 따로 조절한다.
  // 훅은 반복문 안에서 부를 수 없으니 다섯 갈래를 하나씩 부른다.
  const [titleScale, setTitleScale] = useStoredSetting(
    STORAGE_KEY_TEXT_SCALE.title, DEFAULT_TEXT_SCALES.title,
    (raw) => clamp(parseFloat(raw), TEXT_SCALE_MIN, TEXT_SCALE_MAX_WIDE, DEFAULT_TEXT_SCALES.title));
  const [emphasisScale, setEmphasisScale] = useStoredSetting(
    STORAGE_KEY_TEXT_SCALE.emphasis, DEFAULT_TEXT_SCALES.emphasis,
    (raw) => clamp(parseFloat(raw), TEXT_SCALE_MIN, TEXT_SCALE_MAX_WIDE, DEFAULT_TEXT_SCALES.emphasis));
  const [talkScale, setTalkScale] = useStoredSetting(
    STORAGE_KEY_TEXT_SCALE.talk, DEFAULT_TEXT_SCALES.talk, (raw) => clamp(parseFloat(raw), TEXT_SCALE_MIN, TEXT_SCALE_MAX, DEFAULT_TEXT_SCALES.talk));
  const [sayScale, setSayScale] = useStoredSetting(
    STORAGE_KEY_TEXT_SCALE.say, DEFAULT_TEXT_SCALES.say, (raw) => clamp(parseFloat(raw), TEXT_SCALE_MIN, TEXT_SCALE_MAX, DEFAULT_TEXT_SCALES.say));
  const [rubyScale, setRubyScale] = useStoredSetting(
    STORAGE_KEY_TEXT_SCALE.ruby, DEFAULT_TEXT_SCALES.ruby,
    (raw) => clamp(parseFloat(raw), TEXT_SCALE_MIN_SMALL, TEXT_SCALE_MAX, DEFAULT_TEXT_SCALES.ruby));
  const [rubyBaseScale, setRubyBaseScale] = useStoredSetting(
    STORAGE_KEY_TEXT_SCALE.rubyBase, DEFAULT_TEXT_SCALES.rubyBase,
    (raw) => clamp(parseFloat(raw), TEXT_SCALE_MIN, TEXT_SCALE_MAX, DEFAULT_TEXT_SCALES.rubyBase));
  const textScales: TextScales = {
    title: titleScale, emphasis: emphasisScale, talk: talkScale, say: sayScale,
    ruby: rubyScale, rubyBase: rubyBaseScale,
  };
  // 딸림글(루비)을 제목·강조색 그대로 두지 않고 본문색 쪽으로 얼마나 당길지 - 색 조절에서 바꾼다
  const [rubyEmphasis, setRubyEmphasis] = useStoredSetting(
    STORAGE_KEY_RUBY_EMPHASIS, DEFAULT_RUBY_EMPHASIS, (raw) => clamp(parseFloat(raw), 0, 1, DEFAULT_RUBY_EMPHASIS));
  // 카테고리 칩 글자와 거기 곁들이는 글 수 크기 - 본문 배수와 따로 노는 값이라 px 로 담는다
  const [categorySize, setCategorySize] = useStoredSetting(
    STORAGE_KEY_CATEGORY_SIZE, CATEGORY_SIZE_DEFAULT,
    (raw) => clamp(parseInt(raw, 10), CATEGORY_SIZE_MIN, CATEGORY_SIZE_MAX, CATEGORY_SIZE_DEFAULT));
  const [countSize, setCountSize] = useStoredSetting(
    STORAGE_KEY_COUNT_SIZE, COUNT_SIZE_DEFAULT,
    (raw) => clamp(parseInt(raw, 10), COUNT_SIZE_MIN, COUNT_SIZE_MAX, COUNT_SIZE_DEFAULT));
  const [actionSize, setActionSize] = useStoredSetting(
    STORAGE_KEY_ACTION_SIZE, ACTION_SIZE_DEFAULT,
    (raw) => clamp(parseInt(raw, 10), ACTION_SIZE_MIN, ACTION_SIZE_MAX, ACTION_SIZE_DEFAULT));
  // 버튼이 커지면 글을 가리므로, 비워 두는 높이도 버튼 지름을 따라간다
  const editButtonZone = actionSize + EDIT_BUTTON_GAP;
  // AI 프롬프트는 동기화할 때 시트에서 받아 여기에 담아 둔다 (프롬프트 창이 이 값을 보여준다)
  const [, setPromptTemplate] = useStoredSetting(PROMPT_STORAGE_KEY, "", (raw) => raw);
  // 크기 프리셋 목록도 마찬가지다 (크기 조절 창이 이 값을 읽는다)
  const [, setSizePresets] = useStoredSetting(SIZE_PRESETS_KEY, "", (raw) => raw);
  const setTextScale = useCallback((key: keyof TextScales, value: number) => {
    ({ title: setTitleScale, emphasis: setEmphasisScale, talk: setTalkScale, say: setSayScale, ruby: setRubyScale, rubyBase: setRubyBaseScale })[key](value);
  }, [setTitleScale, setEmphasisScale, setTalkScale, setSayScale, setRubyScale, setRubyBaseScale]);
  const [wheelRotate, setWheelRotate] = useState(0); // 새 경전을 고를 때마다 법륜을 회전시킨다
  // a/d 로 넘길 때 그쪽 화살표를 잠깐 눌린 것처럼 만든다 (손가락으로 누른 것과 같아 보이게)
  const [navPress, setNavPress] = useState<"back" | "forward" | null>(null);
  const [showCounter, setShowCounter] = useState(false); // 순번(<1/22>)은 넘길 때만 잠깐 보인다
  // 마지막으로 보여 준 안내문. 안내문이 없어질 때 글자를 지워 버리면 그 순간 툭 사라지므로,
  // 글자는 그대로 두고 투명도만 낮춰 순번과 같이 스르르 사라지게 한다.
  const [lastSyncStatus, setLastSyncStatus] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isNewQuoteOpen, setIsNewQuoteOpen] = useState(false);
  const [editAnchor, setEditAnchor] = useState(0);
  // 고치는 중인 글은 ref 에만 둔다. 상태로 두면 글자 하나마다 화면 전체가 다시 그려진다.
  const editTextRef = useRef("");
  const quotesRef = useRef<Quote[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const readPositionRef = useRef<{ text: string; top: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchRef = useRef<SearchBarHandle>(null); // f 단축키로 검색창에 초점(드래그한 글은 그대로 넣는다)

  // 설정 > 색 조절에서 고른 색을 기본 색 위에 덮는다
  const colorOverrides = useColorOverrides();
  const colors = useMemo(() => mergeColors(colorOverrides), [colorOverrides]);

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

  // 명언 목록을 한 곳에서 갈아끼운다 (메모리·화면·카테고리를 함께 맞춘다)
  //   quotesRef: 콜백 안에서 즉시 읽는 용도 (렌더 중에는 쓰지 않는다 - ref 는 렌더와 무관하다)
  //   quoteListState: 그리는 동안 쓰는 용도 (카테고리별 글 수/순번 표시)
  const setQuoteList = useCallback((quotes: Quote[]) => {
    quotesRef.current = quotes;
    setQuoteListState(quotes);
    setCategories(Array.from(new Set(quotes.map((q) => q.category))));
  }, []);

  const applyQuotes = useCallback((quotes: Quote[], category: string | null) => {
    setQuoteList(quotes);
    setCurrentQuote(pickRandom(quotes, category));
  }, [setQuoteList]);

  useEffect(() => {
    const init = async () => {
      try {
        const result = await loadQuotes(setLoadProgress);
        applyQuotes(result.quotes, null);

        // 캐시로 띄웠으면 저장소에 실린 CSV(매일 시트에서 갱신된다)와 견줘 본다.
        // 개수가 달라도 묶음 CSV가 더 오래됐을 수 있으므로 시트의 최신 목록을 확인한다.
        // 본문만 고친 경우는 개수가 그대로라 여기로 오지 않는다 (내가 고친 글이 되돌아가지 않는다).
        // 이게 없으면 동기화 버튼을 한 번 누른 기기는 새 명언을 영영 못 본다.
        if (result.source === "local-storage") {
          try {
            const bundled = await loadBundledQuotes();
            if (bundled.length > 0 && bundled.length !== result.quotes.length) {
              const latest = await syncFromGoogleSheets();
              setQuoteList(latest.quotes); // 읽고 있던 글은 그대로 둔다. 실패하면 캐시를 유지한다.
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
  // 등록·수정·삭제 모두 화면에는 이미 반영된 뒤라, 여기서는 백그라운드로 시트만 뒤따라 맞춘다.
  const syncToSheet = useCallback(async (payload: SavePayload) => {
    let failed = false;
    isEditSyncingRef.current = true;
    setIsEditSyncing(true);
    setSyncStatus(payload.action === "create" ? "새 글을 시트에 저장하는 중..."
      : payload.action === "delete" ? "삭제하는 중..."
      : payload.action === "saveSettings" ? "설정을 시트에 저장하는 중..." : "동기화 중...");
    try {
      const res = await fetch("/api/sync-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 암호는 본문에 담는다 - 헤더(라틴-1)에는 한글 암호를 실을 수 없다
        body: JSON.stringify({ ...payload, password: loadEditPassword() }),
      });
      if (res.status === 401) {
        setPasswordWasRejected(loadEditPassword() !== "");
        setPendingSave(payload);
        setSyncStatus("편집 암호가 필요합니다");
        return; // 암호를 받으면 이어서 다시 시도한다
      }
      const data = await res.json();
      if (!data.success) {
        setSyncStatus(sheetErrorMessage(data.error));
        failed = true;
        return;
      }
      setSyncStatus(payload.action === "delete" ? "삭제했습니다 ✓"
        : payload.action === "create" ? "시트 저장 완료 ✓"
        : payload.action === "saveSettings" ? "설정을 시트에 저장했습니다 ✓" : "완료 ✓");
    } catch {
      setSyncStatus("연결하지 못했습니다");
      failed = true;
    } finally {
      isEditSyncingRef.current = false;
      setIsEditSyncing(false);
    }
    // 잘못됐다는 말은 조금 더 오래 띄운다 (2초면 놓친다)
    setTimeout(() => setSyncStatus(null), failed ? 8000 : 2000);
  }, []);

  // 명언 원문 저장 (로컬 캐시 + 시트 동기화)
  // 본문에서 바로 고친 것과 주석 팝업 저장이 같은 경로를 쓴다
  const saveQuoteText = useCallback((newText: string) => {
    if (!currentQuote) return;
    const trimmed = newText.trim();
    if (!trimmed || trimmed === currentQuote.text) return;

    const oldText = currentQuote.text;
    const updated: Quote = { ...currentQuote, text: trimmed, updatedAt: nowStamp() };
    setCurrentQuote(updated);

    // 1. 로컬 저장 - 메모리·경전 맵·캐시를 한꺼번에 맞춘다.
    //    예전에는 캐시가 이미 있을 때만 반영해서, 동기화 버튼을 한 번도 안 누른
    //    기기에서는 고친 내용이 다른 명언에 갔다 오면 되돌아가 있었다.
    //    찾는 기준은 시트에서 행을 찾는 기준과 같게 둔다 (이름표 → 없으면 본문).
    setSyncStatus("저장 중...");
    const nextQuotes = quotesRef.current.map((q) =>
      (updated.sheetId ? q.sheetId === updated.sheetId : q.text === oldText) ? updated : q);
    setQuoteList(nextQuotes);
    saveQuotesCache(nextQuotes);

    // 2. 시트 동기화 (백그라운드).
    //    이름표를 알면 본문을 한 벌만 보낸다 (긴 경은 이것만으로 절반이 준다).
    syncToSheet(updated.sheetId
      ? { id: updated.sheetId, newText: trimmed }
      : { oldText, newText: trimmed });
  }, [currentQuote, syncToSheet, setQuoteList]);

  // 새 글 등록도 수정과 같은 방식이다 - 시트 응답을 기다리지 않고 먼저 화면에 반영하고,
  // 시트 저장(암호 확인 포함)은 백그라운드에서 이어간다.
  const handleQuoteCreated = useCallback((quote: Quote) => {
    if (!quote.sheetId) return; // NewQuoteModal 이 항상 채우지만, 타입상 대비
    const stamped: Quote = { ...quote, updatedAt: nowStamp() };
    const next = [...quotesRef.current.filter((item) => item.sheetId !== stamped.sheetId), stamped];
    setQuoteList(next);
    saveQuotesCache(next);
    setSelectedCategory(stamped.category);
    setCurrentQuote(stamped);
    setIsNewQuoteOpen(false);
    setSyncStatus("새 글을 등록했습니다.");
    syncToSheet({ action: "create", category: quote.category, newText: quote.text, requestId: quote.sheetId });
  }, [setQuoteList, syncToSheet]);

  // 암호를 받았으면 저장을 이어서 다시 시도한다
  const handlePasswordSubmit = useCallback((password: string) => {
    saveEditPassword(password);
    const job = pendingSave;
    setPendingSave(null);
    setPasswordWasRejected(false);
    if (job) syncToSheet(job);
  }, [pendingSave, syncToSheet]);

  // 암호를 넣지 않으면 고친 내용은 이 기기에만 남는다 - 그 사실을 알려준다
  const handlePasswordCancel = useCallback(() => {
    setPendingSave(null);
    setPasswordWasRejected(false);
    setSyncStatus("시트에 저장하지 않았습니다");
    setTimeout(() => setSyncStatus(null), 3000);
  }, []);

  // 수정 중에 다른 버튼(새 카드·카테고리)을 눌러도 고친 내용을 잃지 않게 먼저 저장한다.
  // 되돌리고 싶으면 본문 오른쪽 위의 취소(✕) 버튼을 쓴다.
  const commitEdit = useCallback(() => {
    if (!isEditing) return;
    setIsEditing(false);
    saveQuoteText(editTextRef.current);
  }, [isEditing, saveQuoteText]);

  // 전자책처럼 앞뒤로 넘기는 이동 - 목록에 실린 순서 그대로, 이 카테고리(또는 전체)
  // 안에서 바로 앞/뒤 글로 옮긴다 (무작위로 고르지 않는다).
  const goToAdjacentQuote = useCallback((offset: 1 | -1) => {
    if (!currentQuote) return;
    const list = selectedCategory
      ? quoteListState.filter((q) => isInCategory(q.category, selectedCategory))
      : quoteListState;
    const index = list.findIndex((q) =>
      currentQuote.sheetId ? q.sheetId === currentQuote.sheetId : q.text === currentQuote.text);
    if (index === -1) return;
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= list.length) return; // 양 끝에서는 더 움직이지 않는다
    commitEdit();
    setCurrentQuote(list[nextIndex]);
  }, [currentQuote, selectedCategory, quoteListState, commitEdit]);

  const goBack = useCallback(() => goToAdjacentQuote(-1), [goToAdjacentQuote]);
  const goForward = useCallback(() => goToAdjacentQuote(1), [goToAdjacentQuote]);

  // 맨 앞·맨 뒤로 한 번에 (Shift+A / Shift+D) - 한 장씩 넘겨 끝까지 가려면 한참 걸린다.
  // 지금 고른 카테고리(또는 전체) 안에서의 끝이다.
  const goToEdgeQuote = useCallback((edge: "first" | "last") => {
    const list = selectedCategory
      ? quoteListState.filter((q) => isInCategory(q.category, selectedCategory))
      : quoteListState;
    if (!list.length) return;
    const target = edge === "first" ? list[0] : list[list.length - 1];
    if (currentQuote && (currentQuote.sheetId
      ? target.sheetId === currentQuote.sheetId
      : target.text === currentQuote.text)) return; // 이미 끝에 있다
    commitEdit();
    setCurrentQuote(target);
  }, [currentQuote, selectedCategory, quoteListState, commitEdit]);

  // 키보드로 넘길 때는 :active 가 걸리지 않아 화살표가 아무 반응도 하지 않는다.
  // 눌린 크기를 잠깐 줬다 놓아, 눌렀을 때와 같은 탄성 이징으로 되돌아오게 한다.
  const pulseNav = useCallback((direction: "back" | "forward") => {
    setNavPress(direction);
    // 연속으로 넘길 때 다음 눌림이 곧바로 다시 걸리도록 짧게 뗀다 (이징도 120ms 로 빨라졌다)
    setTimeout(() => setNavPress((current) => (current === direction ? null : current)), 100);
  }, []);

  // 위쪽 반짝이 버튼 - 이 카테고리(또는 전체)에서 무작위로 새 글을 고른다 (순서 이동과는 다른 기능)
  const handleNewQuote = useCallback(() => {
    commitEdit();
    setCurrentQuote(pickRandom(quotesRef.current, selectedCategory, currentQuote?.id ?? undefined));
    setWheelRotate((prev) => prev + 1);
    if (!isEditSyncingRef.current) setSyncStatus(null);
  }, [selectedCategory, currentQuote, commitEdit]);

  // 검색 결과에서 고른 글로 바로 넘어간다. 그 글이 속한 카테고리로 자리를 맞춰,
  // 순번(<3/22>)과 앞뒤 넘기기가 고른 글 기준으로 이어지게 한다.
  const handleSearchSelect = useCallback((quote: Quote) => {
    commitEdit();
    setSelectedCategory(quote.category);
    setCurrentQuote(quote);
    if (!isEditSyncingRef.current) setSyncStatus(null);
  }, [commitEdit]);

  const handleSync = useCallback(async () => {
    commitEdit();
    setIsSyncing(true);
    setSyncStatus("Google Sheets에서 최신 자료를 가져오는 중...");
    try {
      const result = await syncFromGoogleSheets();
      const categoryStillExists = selectedCategory
        ? result.quotes.some((q) => isInCategory(q.category, selectedCategory))
        : true;
      const nextCategory = categoryStillExists ? selectedCategory : null;
      if (!categoryStillExists) setSelectedCategory(null);
      applyQuotes(result.quotes, nextCategory);
      setSyncStatus(`${result.quotes.length}개를 최신으로 업데이트했습니다.`);

      // AI 프롬프트와 "모아 둔 것"(크기 프리셋·내 배색)은 여기서 함께 받아 둔다.
      // 지금 쓰는 크기·색은 건드리지 않는다 - 그건 기기마다 다른 게 자연스러워서
      // 각 창에서 누를 때만 바뀐다. 반면 목록은 받아 와도 화면이 바뀌지 않고 고를
      // 거리만 늘어나므로, 기기를 옮겨 다녀도 모아 둔 것이 따라오게 한다.
      // 실패해도 글 동기화까지 실패로 만들지 않는다 - 옛 Apps Script 면 설정 갈래가 아예 없다.
      try {
        const settings = await fetchSheetSettings();
        const template = settings[SETTINGS_GROUP.prompt]?.[PROMPT_SETTING_KEY];
        if (template && template.trim()) setPromptTemplate(template);

        // 하나가 망가져 있어도 나머지는 받아 오게 따로 감싼다
        const presets = settings[SETTINGS_GROUP.size]?.[SIZE_PRESETS_KEY];
        if (presets) {
          try {
            if (Array.isArray(JSON.parse(presets))) setSizePresets(presets);
          } catch {}
        }
        const palettes = settings[SETTINGS_GROUP.color]?.[SAVED_PALETTES_KEY];
        if (palettes) replaceSavedPalettes(parseSavedPalettes(palettes));
      } catch {}
    } catch (e) {
      console.error(e);
      setSyncStatus("동기화에 실패했습니다.");
    } finally {
      setIsSyncing(false);
    }
  }, [selectedCategory, applyQuotes, commitEdit, setPromptTemplate, setSizePresets]);

  // 설정을 시트에 저장 - 암호 확인은 syncToSheet 이 그대로 맡는다
  const handleSettingsSave = useCallback((group: string, entries: Record<string, string>) => {
    syncToSheet(settingsSavePayload(group, entries));
  }, [syncToSheet]);

  // 시트에 저장해 둔 설정을 가져온다. 어디에 적용할지는 부르는 창이 정한다
  // (크기 창은 크기만, 색 창은 색만 - 서로의 값을 건드리지 않는다).
  const handleSettingsLoad = useCallback(async (group: string): Promise<Record<string, string> | null> => {
    setSyncStatus("시트에서 설정을 가져오는 중...");
    try {
      const settings = await fetchSheetSettings();
      const entries = settings[group];
      if (!entries || Object.keys(entries).length === 0) {
        setSyncStatus("시트에 저장해 둔 설정이 없습니다.");
        setTimeout(() => setSyncStatus(null), 4000);
        return null;
      }
      setSyncStatus("설정을 불러왔습니다 ✓");
      setTimeout(() => setSyncStatus(null), 2000);
      return entries;
    } catch (e) {
      console.error(e);
      setSyncStatus("설정을 가져오지 못했습니다.");
      setTimeout(() => setSyncStatus(null), 6000);
      return null;
    }
  }, []);

  // 고른 것을 다시 누르면 한 층 위로 올라간다 (최상위에서는 전체로) -
  // 경로 표시로도 올라갈 수 있지만, 누르던 자리에서 바로 되돌리는 길도 남겨 둔다.
  const handleCategorySelect = useCallback((cat: string | null) => {
    setSyncStatus(null);
    commitEdit();
    const next = cat === selectedCategory ? parentCategory(cat) : cat;
    setSelectedCategory(next);
    setCurrentQuote(pickRandom(quotesRef.current, next));
  }, [selectedCategory, commitEdit]);

  // 카테고리의 보통 클릭은 예전처럼 노트를 고르고, 오른쪽 클릭만 시험으로 들어간다.
  // 브라우저 메뉴는 카테고리 위에서만 막으므로 본문에서는 평소처럼 쓸 수 있다.
  const handleCategoryQuiz = useCallback((event: React.MouseEvent, category: string) => {
    event.preventDefault();
    commitEdit();
    setQuizCategory(category);
  }, [commitEdit]);

  const handleEditChange = useCallback((next: string) => { editTextRef.current = next; }, []);

  // 본문 자리에서 바로 수정 시작
  const handleEditOpen = useCallback(() => {
    if (!currentQuote || isEditing) return;
    editTextRef.current = currentQuote.text;
    // 읽고 있던 맨 윗줄의 원문 위치를 기억해 둔다
    setEditAnchor(findEditAnchor(scrollRef.current, currentQuote.text));
    setIsEditing(true);
  }, [currentQuote, isEditing]);

  // 수정 마치기 (저장)
  const handleEditSave = useCallback(() => {
    if (!editTextRef.current.trim()) return;
    setIsEditing(false);
    saveQuoteText(editTextRef.current);
  }, [saveQuoteText]);

  // 지금 보고 있는 글을 지운다. 되돌릴 수 없으므로 한 번 확인한다.
  // 되묻는 창을 연다 (지우는 일 자체는 confirmDelete 가 한다)
  const handleDelete = useCallback(() => {
    if (!currentQuote) return;
    setIsDeleteAsking(true);
  }, [currentQuote]);

  const confirmDelete = useCallback(() => {
    if (!currentQuote) return;
    const target = currentQuote;
    setIsEditing(false);

    // 1. 로컬에서 먼저 지운다 (메모리·카테고리·캐시를 함께 맞춘다).
    //    찾는 기준은 시트에서 행을 찾는 기준과 같게 둔다 (이름표 → 없으면 본문).
    const remaining = quotesRef.current.filter((q) =>
      target.sheetId ? q.sheetId !== target.sheetId : q.text !== target.text);
    setQuoteList(remaining);
    saveQuotesCache(remaining);

    // 그 카테고리의 마지막 글이었다면 '전체'로 돌아간다 (없는 칸에 머물지 않게).
    const nextCategory = selectedCategory && remaining.some((q) => isInCategory(q.category, selectedCategory))
      ? selectedCategory : null;
    if (nextCategory !== selectedCategory) setSelectedCategory(nextCategory);
    setCurrentQuote(pickRandom(remaining, nextCategory));

    // 2. 시트에서도 지운다 (백그라운드). 암호가 필요하면 syncToSheet 가 물어본다.
    syncToSheet(target.sheetId
      ? { action: "delete", id: target.sheetId }
      : { action: "delete", oldText: target.text });
  }, [currentQuote, selectedCategory, setQuoteList, syncToSheet]);

  // 수정 중에는 e 마치기, c 카테고리 옮기기, x 삭제가 더 있다 (아래 isEditing 갈래).
  // 화면 곳곳의 버튼을 손 안 대고 키보드로도 쓸 수 있게 한다 - a/d 는 </> 이전·다음 글
  // 버튼, space 는 가운데 반짝이(무작위 새 글) 버튼, q 는 새 글 등록, e 는 내용 수정
  // 진입·마치기, f 는 검색 (드래그해 둔 글이 있으면 그대로 검색어로 들어간다).
  // 입력칸(글자 입력·되묻기 창 등)에 초점이 있을 때는 끄지 않으면 그 글자를 치다가
  // (또는 빈칸을 치다가) 엉뚱한 동작이 일어난다.
  // Ctrl/⌘·Alt 를 곁들인 것은 브라우저 몫으로 넘긴다 (⌘F 브라우저 찾기 등을 가로채지 않게).
  // 키 이름(e.key)이 아니라 자판 위치(e.code)로 구분한다 - 한글 자판이 켜져 있으면
  // a/d/q/e/f 자리에서 e.key 가 ㅁ/ㅇ/ㅂ/ㄷ/ㄹ 처럼 다르게 나와, 이름만 보면 눌러도 안 먹힌다.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const active = document.activeElement;
      const isTyping = active instanceof HTMLElement
        && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);
      if (isTyping) return;
      // 팝업이 떠 있으면 뒤쪽 카드가 움직이지 않게 둔다 (팝업 안의 키는 팝업이 맡는다)
      if (document.querySelector('[role="dialog"]')) return;
      // 수정 중에는 '수정 마치기'만 듣는다 - 글을 넘기거나 새 글을 여는 것은 수정 화면과 어긋난다.
      // 글자칸(textarea)에 초점이 있을 때는 위에서 이미 돌아갔고, 그 자리의 e 는 SourceEditor 가
      // 맡는다 - 여기는 초점이 글자칸 밖(저장 버튼을 눌렀거나, 화면 아무 데나 눌렀을 때)일 때다.
      if (isEditing) {
        // 수정 중에만 쓰는 자리 - e 마치기, c 카테고리 옮기기, x 삭제.
        // (글자칸 안에서 누른 것은 SourceEditor 가 같은 자리로 맡는다)
        if (e.code === "KeyE") { e.preventDefault(); handleEditSave(); }
        else if (e.code === "KeyC") { e.preventDefault(); setIsMovingQuote(true); }
        else if (e.code === "KeyX") { e.preventDefault(); handleDelete(); }
        return;
      }
      // Shift 를 곁들이면 한 장씩이 아니라 그 방향의 끝까지 간다
      if (e.code === "KeyA") { e.preventDefault(); pulseNav("back"); if (e.shiftKey) goToEdgeQuote("first"); else goBack(); }
      else if (e.code === "KeyD") { e.preventDefault(); pulseNav("forward"); if (e.shiftKey) goToEdgeQuote("last"); else goForward(); }
      else if (e.code === "Space") { e.preventDefault(); handleNewQuote(); }
      else if (e.code === "KeyQ") { e.preventDefault(); setIsNewQuoteOpen(true); }
      else if (e.code === "KeyE") { e.preventDefault(); handleEditOpen(); }
      // f 로 검색 - 마침 드래그해 둔 글이 있으면 그대로 검색어로 넣는다
      else if (e.code === "KeyF") { e.preventDefault(); searchRef.current?.focusWith(window.getSelection?.()?.toString()); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isEditing, goBack, goForward, goToEdgeQuote, handleNewQuote, handleEditOpen, handleEditSave, handleDelete, pulseNav]);

  // 순번(<1/22>)은 글을 넘긴 직후에만 잠깐 보여준다 - 가만히 읽는 동안에는
  // 쓸 일이 없는 숫자라 사라지게 두고, 넘길 때만 어디쯤인지 알려준다.
  // 보는 글이 바뀌었는지는 렌더 중에 견줘서 켠다 (effect 안에서 켜면 한 번 더 그리게 된다).
  const quoteKey = currentQuote?.sheetId ?? currentQuote?.text ?? "";
  const [counterOwner, setCounterOwner] = useState(quoteKey);
  if (counterOwner !== quoteKey) {
    setCounterOwner(quoteKey);
    setShowCounter(true);
  }
  if (syncStatus && syncStatus !== lastSyncStatus) setLastSyncStatus(syncStatus);
  useEffect(() => {
    if (!showCounter) return;
    const timer = setTimeout(() => setShowCounter(false), 1600);
    return () => clearTimeout(timer);
  }, [showCounter, quoteKey]);

  // 긴 경은 한 번에 다 못 읽는다. 명언이 바뀌면 지난번에 읽던 자리로 되돌리고,
  // 떠날 때 지금 자리를 적어 둔다. (그릴 때 바로 맞춰야 화면이 튀지 않는다)
  useBrowserLayoutEffect(() => {
    const el = scrollRef.current;
    const text = currentQuote?.text;
    if (!el || !text || isEditing) return;
    el.scrollTop = loadReadPosition(text);
    readPositionRef.current = { text, top: el.scrollTop };
    return () => {
      const last = readPositionRef.current;
      if (last) saveReadPosition(last.text, last.top);
    };
  }, [currentQuote?.text, isEditing]);

  // 스크롤할 때마다 자리를 적어 둔다 (localStorage 쓰기는 떠날 때 한 번)
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !currentQuote || isEditing) return;
    readPositionRef.current = { text: currentQuote.text, top: el.scrollTop };
  }, [currentQuote, isEditing]);

  // 앱을 덮거나 새로고침할 때도 적어 둔다
  useEffect(() => {
    const flush = () => {
      const last = readPositionRef.current;
      if (last) saveReadPosition(last.text, last.top);
    };
    window.addEventListener("pagehide", flush);
    return () => { window.removeEventListener("pagehide", flush); flush(); };
  }, []);

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
      container.scrollTop = Math.max(textTop + measureTextTop(ta, editAnchor) - editButtonZone, 0);
    });
  }, [isEditing, editAnchor, editButtonZone]);

  // 수정 취소 - 고친 내용은 버린다
  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
  }, []);


  // 카테고리 이름 수정 - 그 이름을 쓰는 모든 글의 카테고리 칸을 한 번에 바꾼다.
  // 고치는 것은 경로의 마지막 조각뿐이고 위층은 그대로 둔다 ("공무직/헌법" 의 "헌법").
  // 상위 이름을 고치면 그 아래 카테고리들의 앞부분도 함께 바뀐다.
  // 다른 카테고리와 이름이 겹치면 그 카테고리로 합쳐진다(따로 막지 않는다).
  const handleRenameCategory = useCallback((oldPath: string, rawNewLabel: string) => {
    const newLabel = rawNewLabel.trim();
    if (!newLabel) return;
    const parent = parentCategory(oldPath);
    const newPath = parent ? parent + CATEGORY_SEPARATOR + newLabel : newLabel;
    if (newPath === oldPath) return;

    const nextQuotes = quotesRef.current.map((q) => {
      const renamed = renameCategoryPath(q.category, oldPath, newPath);
      return renamed === q.category ? q : { ...q, category: renamed };
    });
    setQuoteList(nextQuotes);
    saveQuotesCache(nextQuotes);
    if (selectedCategory) setSelectedCategory(renameCategoryPath(selectedCategory, oldPath, newPath));
    if (currentQuote) {
      const renamed = renameCategoryPath(currentQuote.category, oldPath, newPath);
      if (renamed !== currentQuote.category) setCurrentQuote({ ...currentQuote, category: renamed });
    }

    syncToSheet({ action: "renameCategory", oldCategory: oldPath, newCategory: newPath });
  }, [selectedCategory, currentQuote, setQuoteList, syncToSheet]);

  // 이 글 하나만 다른 카테고리로 옮긴다 (이름 수정과 달리 다른 글은 그대로 둔다).
  // 본문 수정과 같이 화면에는 바로 반영하고 시트는 뒤따라 맞춘다.
  // 고른 자리(카테고리)는 건드리지 않는다 - 옮기고 나면 그 자리에서 사라지는 것이
  // 옮겨졌다는 가장 분명한 표시다.
  const handleMoveQuote = useCallback((rawCategory: string) => {
    const category = rawCategory.trim();
    if (!currentQuote || !category || category === currentQuote.category) return;

    const moved = { ...currentQuote, category };
    const nextQuotes = quotesRef.current.map((q) => (q.id === currentQuote.id ? moved : q));
    setQuoteList(nextQuotes);
    saveQuotesCache(nextQuotes);
    setCurrentQuote(moved);

    syncToSheet({ action: "moveQuote", id: currentQuote.sheetId, oldText: currentQuote.text, category });
  }, [currentQuote, setQuoteList, syncToSheet]);

  // 첫 화면 - 글 묶음이 600KB 가 넘어 느린 연결에서는 한참 걸린다. 빈 바탕만 보여 주면
  // 멈춘 것처럼 보이므로, 어디까지 왔는지 가는 막대로 알려 준다.
  if (isLoading || !loadBarFinished) {
    return (
      <LoadingBar
        progress={loadProgress}
        done={!isLoading}
        onFinished={() => setLoadBarFinished(true)}
        colors={colors}
      />
    );
  }

  const metrics = getTextMetrics(currentQuote?.text ?? "");
  const scaledFontSize = Math.round(metrics.fontSize * fontScale);
  // 눌렀다 뗄 때 살짝 튕기는 탄성 이징 - 반짝이 버튼의 팝 애니메이션과 같은 곡선을 쓴다.
  // 두 번째 값(휘어져 넘어가는 정도)을 키울수록 더 크게 튕긴다 - 다른 버튼들은 눌러도
  // 잘 안 보인다는 말에 기본값(1.56)의 세 배로 키웠다.
  // Tailwind 는 클래스 이름을 빌드 때 파일에서 문자 그대로 찾으므로, 여기(springPress)
  // 는 변수로 조립하지 않고 값을 직접 써야 한다 - 아래 SPRING_EASE(인라인 style 용)와
  // 값이 어긋나지 않도록 손으로 맞춰 둔다.
  const springPress = "spring-btn transition-transform duration-200 ease-[cubic-bezier(0.34,4.68,0.64,1)] active:scale-95";
  const SPRING_EASE = "cubic-bezier(0.34,4.68,0.64,1)";
  // 화살표(< >)는 연속으로 눌러도 밀리지 않게 짧고 튕김 없는 이징을 쓴다.
  // (불투명도 페이드와 탄성 곡선이 섞이면 어색해, 페이드가 걸리는 자리에서는 탄성을 뺀다.)
  const NAV_EASE = "ease-out";
  // 지름은 크기 조절 창에서 정한 값을 쓴다 - 읽기 화면의 버튼과 수정 화면의 버튼이 같은 크기로 이어진다
  const roundButton = `flex items-center justify-center rounded-full shadow-sm ${springPress}`;
  // 안 쓸 때 옅게(0.3) 물러났다 손을 올리면 또렷해지는 버튼 - 새 글(+)·수정(✏) 이 여기 든다
  // (왼쪽 위 검색창도 같은 결로 옅어진다). 페이드가 튕기지 않도록 탄성(spring) 대신
  // 평범한 ease-out 으로 누름·페이드를 함께 전환한다. 크기(지름)는 크기 조절 창에서 정한다.
  const idleButton = "flex items-center justify-center rounded-full shadow-sm transition-[transform,opacity] duration-200 ease-out active:scale-95 opacity-30 hover:opacity-100";
  const actionIconSize = Math.round(actionSize * 0.45); // 버튼 지름에 맞춘 아이콘 크기 (18px → 8px)

  // 지금 보는 글이 이 카테고리(또는 전체) 안에서 몇 번째인지 - <1/22> 처럼 보여준다.
  // 목록에 실린 순서를 그대로 기준으로 삼는다 - 무작위로 넘겨도 그 글의 제자리는 바뀌지 않는다.
  const categoryQuotes = selectedCategory
    ? quoteListState.filter((q) => isInCategory(q.category, selectedCategory))
    : quoteListState;
  const quoteIndexInCategory = currentQuote
    ? categoryQuotes.findIndex((q) =>
        currentQuote.sheetId ? q.sheetId === currentQuote.sheetId : q.text === currentQuote.text)
    : -1;
  const canGoBack = quoteIndexInCategory > 0;
  const canGoForward = quoteIndexInCategory !== -1 && quoteIndexInCategory < categoryQuotes.length - 1;

  // 카테고리는 "상위/하위" 두 층이다. 층마다 칩 줄을 쌓으면 본문이 그만큼 밀리므로,
  // 지금 있는 자리는 경로 한 줄(전체 › 공무직 › 헌법)로 보여주고 칩 줄에는 지금 층만 깐다.
  // 아래층이 있는 카테고리를 고르면 그 아래층을, 더 내려갈 데가 없으면 형제들을 보여준다.
  const categoryTrailItems = categoryTrail(selectedCategory);
  const chipParent = selectedCategory && childCategories(categories, selectedCategory).length > 0
    ? selectedCategory
    : parentCategory(selectedCategory);
  const levelCategories = childCategories(categories, chipParent);
  // 칩마다 글이 몇 개인지 - 상위는 아래층 글까지 함께 센다 (고르면 그만큼 나오므로 수가 맞는다)
  const levelCounts = new Map(levelCategories.map((cat) =>
    [cat, quoteListState.filter((q) => isInCategory(q.category, cat)).length]));

  // 본문 기둥의 절반 너비 - 화면 가장자리가 아니라 이 기둥 바로 바깥에 화살표를 붙이는 데 쓴다.
  // 기둥 너비는 min(화면 전체, contentWidth) 이므로 그 절반도 min(50vw, contentWidth/2) 다.
  // (넓은 PC 에서 본문이 가운데로 좁혀지면 화살표도 그 옆에 바짝 붙는다.)
  // 휴대폰처럼 기둥이 화면을 꽉 채워 바깥 여백이 아예 없을 때, 위 값 그대로 쓰면 화살표
  // 전체가 화면 밖으로 밀려나 버린다 - 화살표 너비(4.5rem)만큼은 화면 안에 남도록 잡아 둔다.
  const NAV_WIDTH = "4.5rem";
  const contentHalfWidth = contentWidth >= CONTENT_WIDTH_MAX ? "50vw" : `min(50vw, ${contentWidth / 2}px)`;
  const navEdgeOffset = `min(calc(50vw + ${contentHalfWidth}), calc(100vw - ${NAV_WIDTH}))`;

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{
        backgroundColor: colors.bg,
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      {/* 탄성 이징(overshoot)이 있는 눌림 버튼들이 연속 클릭으로 계속 커지던 버그 수정:
          누르는 순간은 전환 없이 즉시 눌린 크기로 고정해, 다음 눌림이 항상 같은 지점에서
          시작하게 한다 - 그래야 튕겨 돌아오는(overshoot) 정도가 클릭할 때마다 쌓이지 않는다.
          인라인 style 의 transition 보다 우선해야 하므로 !important 를 쓴다. */}
      <style>{`.spring-btn:active { transition-duration: 0s !important; }`}</style>
      {showSplash && <div
        className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
        style={{
          backgroundColor: colors.bg,
          opacity: splashFading ? 0 : 1,
          transition: "opacity 0.7s ease-out",
          pointerEvents: splashFading ? "none" : "auto",
        }}
      >
        <style>{`@keyframes pop-in-place { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }`}</style>
        <div style={{ animation: "pop-in-place 0.55s cubic-bezier(0.45, 0, 0.55, 1) infinite", transformOrigin: "center" }}>
          <svg width="160" height="160" viewBox="0 0 100 100">
            <path
              d="M50 6C54 32 68 46 94 50C68 54 54 68 50 94C46 68 32 54 6 50C32 46 46 32 50 6Z"
              fill={colors.buttonIcon}
            />
          </svg>
        </div>
      </div>}

      {/* 전자책처럼 본문 기둥 바로 바깥 가장자리에서 이전·다음 글로 넘긴다.
          화면 가장자리(0)가 아니라 본문 기둥의 실제 가장자리(navEdgeOffset)에 붙인다 -
          넓은 PC 에서 본문이 가운데로 좁혀지면 화살표도 화면 끝까지 멀어지지 않고
          본문 바로 옆에 붙어 있는다. 세로 4배·가로 2배로 키워도 본문 쪽이 아니라
          그 바깥(남는 여백)으로만 커진다.
          마우스를 올리면 옅게 있던 화살표가 또렷해진다 (누를 수 있다는 것을 알려준다).
          수정 중에는 본문 자리를 textarea 가 쓰므로 숨긴다. */}
      {!isEditing && currentQuote && (
        <>
          <button
            onClick={goBack}
            disabled={!canGoBack}
            aria-label="이전 글"
            className="spring-btn fixed top-1/2 z-30 flex h-64 w-[4.5rem] -translate-y-1/2 items-center justify-center opacity-30 hover:opacity-90 active:scale-90 disabled:pointer-events-none disabled:opacity-0"
            // scale 은 transform 과 따로 곱해지는 속성이라, Tailwind 가 넣은 가운데 맞춤
            // (-translate-y-1/2)을 지우지 않고 눌린 크기만 덧입힐 수 있다.
            style={{
              color: colors.textMuted, right: navEdgeOffset,
              scale: navPress === "back" ? "0.9" : "1",
              transition: `opacity 150ms ease, transform 120ms ${NAV_EASE}, scale 120ms ${NAV_EASE}`,
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={goForward}
            disabled={!canGoForward}
            aria-label="다음 글"
            className="spring-btn fixed top-1/2 z-30 flex h-64 w-[4.5rem] -translate-y-1/2 items-center justify-center opacity-30 hover:opacity-90 active:scale-90 disabled:pointer-events-none disabled:opacity-0"
            style={{
              color: colors.textMuted, left: navEdgeOffset,
              scale: navPress === "forward" ? "0.9" : "1",
              transition: `opacity 150ms ease, transform 120ms ${NAV_EASE}, scale 120ms ${NAV_EASE}`,
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </>
      )}

      {/* 화면이 넓은 PC 에서 양옆으로 퍼지지 않게, 카테고리·본문·버튼을 한 기둥에 담는다 */}
      <div
        className="mx-auto flex w-full min-h-0 flex-1 flex-col"
        style={{ maxWidth: contentWidth >= CONTENT_WIDTH_MAX ? undefined : contentWidth }}
      >
        {/* 경로 표시 - 지금 어느 자리에 있는지 보여주고, 조각을 누르면 그 층으로 돌아간다.
            칩 줄 위에 둬서 위에서 아래로 층이 내려가게 한다 (위: 지나온 길, 아래: 갈 수 있는 곳).
            조각도 카테고리 칩과 같은 둥근 테두리를 둘러 눌러도 되는 자리임을 알린다.
            최상위(전체)에서도 이 줄을 그대로 둔다 - 층을 오갈 때마다 줄이 생겼다 없어지면
            아래 본문까지 통째로 밀려 어수선하다. '전체'는 여기 한 곳에만 두고 칩 줄에는 두지 않는다.
            왼쪽에 맞춰, 층을 옮겨도 시작 자리가 그대로라 글이 이어져 읽힌다. */}
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center justify-start gap-0.5 px-1 pt-1">
            <button
              onClick={() => handleCategorySelect(null)}
              className="spring-btn rounded-full border px-1.5 py-0.5 font-medium active:scale-90"
              style={{
                fontSize: categorySize,
                borderColor: selectedCategory === null ? colors.categorySelected : colors.categoryBorder,
                color: selectedCategory === null ? colors.text : colors.categoryText,
                fontWeight: selectedCategory === null ? 600 : undefined,
                transition: `border-color 150ms ease, color 150ms ease, transform 200ms ${SPRING_EASE}`,
              }}
            >전체</button>
            {categoryTrailItems.map((crumb, i) => {
              const isCurrent = i === categoryTrailItems.length - 1;
              return (
                <Fragment key={crumb.path}>
                  <span className="text-[10px]" style={{ color: colors.textMuted }}>›</span>
                  {isCurrent ? (
                    // 지금 자리 - 테두리를 고른 칩과 같은 색으로 둬서 여기가 끝임을 알린다
                    <span
                      onContextMenu={(event) => handleCategoryQuiz(event, crumb.path)}
                      title="오른쪽 클릭: 시험문제"
                      className="flex items-center gap-0.5 rounded-full border py-0.5 pl-1.5 pr-1 font-semibold"
                      style={{ fontSize: categorySize, borderColor: colors.categorySelected, color: colors.text }}
                    >
                      {crumb.label}
                      {/* 이름 수정은 지금 고른 카테고리에만 - 상위 이름을 고치면 그 아래도 함께 바뀐다 */}
                      <button
                        onClick={() => setRenamingCategory(crumb.path)}
                        onContextMenu={(event) => event.stopPropagation()}
                        aria-label="카테고리 이름 수정"
                        title="카테고리 이름 수정"
                        className="spring-btn flex h-3.5 w-3.5 items-center justify-center opacity-70 hover:opacity-100 active:scale-90"
                        style={{ color: colors.textMuted, transition: `opacity 150ms ease, transform 200ms ${SPRING_EASE}` }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </span>
                  ) : (
                    // 경로에서 지금 자리보다 앞에 있는 조각은 모두 상위 카테고리다 - 칩 줄과 같은 색을 쓴다
                      <button
                        onClick={() => handleCategorySelect(crumb.path)}
                        onContextMenu={(event) => handleCategoryQuiz(event, crumb.path)}
                        className="spring-btn rounded-full border px-1.5 py-0.5 font-medium active:scale-90"
                      style={{
                        fontSize: categorySize,
                        borderColor: colors.categoryBorder, color: colors.categoryParentText,
                        transition: `border-color 150ms ease, color 150ms ease, transform 200ms ${SPRING_EASE}`,
                      }}
                    >{crumb.label}</button>
                  )}
                </Fragment>
              );
            })}
          </div>
        )}

        {/* 카테고리 */}
        {categories.length > 0 && (
          <div
            className="flex flex-wrap justify-start gap-0.5 px-1 pt-0.5 pb-0.5 max-h-20 overflow-y-auto overscroll-contain"
            style={{
              // 카테고리가 많으면 아래 줄이 반쯤 잘린 채 멈춰 고장난 것처럼 보였다.
              // 아래에 옅은 그늘을 둬서 '더 있다'는 것을 알린다.
              // local 층이 내용과 같이 움직이며 끝에 닿으면 그늘을 덮으므로,
              // 넘칠 때만 보인다 (넘치지 않으면 아예 나타나지 않는다).
              backgroundImage: `linear-gradient(to top, ${colors.bg}, transparent),`
                + " radial-gradient(farthest-side at 50% 100%, rgba(0,0,0,0.22), transparent)",
              backgroundPosition: "bottom, bottom",
              backgroundSize: "100% 10px, 100% 6px",
              backgroundRepeat: "no-repeat",
              backgroundAttachment: "local, scroll",
            }}
          >
            {levelCategories.map((cat) => {
              // 아래층이 있는 카테고리(상위)는 색을 달리해, 눌러서 더 들어갈 수 있음을 알린다
              const isParent = childCategories(categories, cat).length > 0;
              return (
                <button
                  key={cat}
                  onClick={() => handleCategorySelect(cat)}
                  onContextMenu={(event) => handleCategoryQuiz(event, cat)}
                  title="오른쪽 클릭: 시험문제"
                  className="spring-btn rounded-full border px-1.5 py-0.5 font-medium active:scale-90"
                  style={{
                    fontSize: categorySize,
                    backgroundColor: selectedCategory === cat ? colors.categorySelected : "transparent",
                    borderColor: selectedCategory === cat ? colors.categorySelected : colors.categoryBorder,
                    color: selectedCategory === cat ? colors.categorySelectedText
                      : isParent ? colors.categoryParentText : colors.categoryText,
                    transition: `background-color 150ms ease, border-color 150ms ease, color 150ms ease, transform 200ms ${SPRING_EASE}`,
                  }}
                >
                  {categoryLabel(cat)}
                  {/* 글 수는 이름보다 작고 옅게 - 고를 때 곁들여 보는 값이지 이름과 다투면 안 된다.
                      고른 칩은 바탕이 차 있어 회색이 묻히므로, 그때는 칩 글자색을 옅게 쓴다. */}
                  <span
                    className="ml-1 font-normal"
                    style={selectedCategory === cat
                      ? { fontSize: countSize, color: colors.categorySelectedText, opacity: 0.7 }
                      : { fontSize: countSize, color: colors.textMuted }}
                  >{levelCounts.get(cat)}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* 명언 영역 - 읽기와 수정이 같은 자리를 쓴다 */}
        {/* 버튼은 스크롤 영역 밖에 두어야 본문을 내려도 오른쪽 위에 그대로 남는다 */}
        <div className="relative flex min-h-0 flex-1">
          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-4 overscroll-contain">
            <div className="flex min-h-full items-center justify-center">
              {!currentQuote ? (
                <p style={{ color: colors.textMuted }}>표시할 글이 없습니다. 새 글을 등록하거나 시트를 동기화해주세요.</p>
              ) : isEditing ? (
                // 위아래로 같은 여백을 둬서, 글이 길 때 첫 줄이 오른쪽 위 버튼에 가리지 않게 한다
                // (짧은 명언은 가운데 정렬이라 여백이 있어도 자리가 그대로다)
                <SourceEditor
                  initialValue={currentQuote.text}
                  onChange={handleEditChange}
                  fontSize={scaledFontSize}
                  lineHeight={metrics.lineHeight}
                  colors={colors}
                  textareaRef={textareaRef}
                  marginY={editButtonZone}
                  onExitEdit={handleEditSave}
                  onMoveCategory={() => setIsMovingQuote(true)}
                  onDelete={handleDelete}
                />
              ) : (
                <RubyText
                  text={currentQuote.text}
                  fontSize={scaledFontSize}
                  lineHeight={metrics.lineHeight}
                  colors={colors}
                  scales={textScales}
                  rubyEmphasis={rubyEmphasis}
                  onTextChange={saveQuoteText}
                />
              )}
            </div>
          </div>

          {/* 검색창 - 돋보기가 있던 왼쪽 위 자리에 둔다 (수정 중에는 그 자리를 삭제 버튼이 쓴다).
              창(모달)으로 들어가지 않고 여기 바로 입력하면 아래로 결과가 펼쳐진다. */}
          {!isEditing && quoteListState.length > 0 && (
            <SearchBar ref={searchRef} quotes={quoteListState} colors={colors} size={actionSize} onSelect={handleSearchSelect} />
          )}

          {/* 삭제·카테고리 옮기기 - 실수로 누르지 않게 저장 버튼과 반대쪽(왼쪽 위)에 둔다.
              이 글을 어떻게 할지 정하는 버튼들이라 수정 중에만 나온다. */}
          {isEditing && (
            <div className="absolute left-1 top-1 flex gap-1.5">
              <button
                onClick={handleDelete}
                aria-label="글 삭제"
                className={roundButton}
                style={{ backgroundColor: colors.buttonPrimary, width: actionSize, height: actionSize }}
              >
                <svg width={actionIconSize} height={actionIconSize} viewBox="0 0 24 24" fill="none" stroke={colors.buttonIcon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
              {/* 이 글만 다른 카테고리로 - 화살표가 든 서랍 */}
              <button
                onClick={() => setIsMovingQuote(true)}
                aria-label="카테고리 옮기기"
                className={roundButton}
                style={{ backgroundColor: colors.buttonPrimary, width: actionSize, height: actionSize }}
              >
                <svg width={actionIconSize} height={actionIconSize} viewBox="0 0 24 24" fill="none" stroke={colors.buttonIcon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8V6a2 2 0 0 1 2-2h3.6a1 1 0 0 1 .8.4L11 6h6a2 2 0 0 1 2 2v1" />
                  <path d="M3 9h18v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
                  <path d="M9 14.5h6" />
                  <path d="m13 12.5 2 2-2 2" />
                </svg>
              </button>
            </div>
          )}

          {/* 새 글 등록·수정 버튼 - 화면을 옮기지 않고 본문 위에서 바로 열거나 고친다 */}
          <div className="absolute right-1 top-1 flex gap-1.5">
            {isEditing ? (
              <>
                <button
                  onClick={handleEditCancel}
                  aria-label="수정 취소"
                  className={roundButton}
                  style={{ backgroundColor: colors.buttonPrimary, width: actionSize, height: actionSize }}
                >
                  <svg width={actionIconSize} height={actionIconSize} viewBox="0 0 24 24" fill="none" stroke={colors.buttonIcon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
                <button
                  onClick={handleEditSave}
                  aria-label="수정 완료"
                  className={roundButton}
                  style={{ backgroundColor: colors.categorySelected, width: actionSize, height: actionSize }}
                >
                  <svg width={actionIconSize} height={actionIconSize} viewBox="0 0 24 24" fill="none" stroke={colors.categorySelectedText} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsNewQuoteOpen(true)}
                  disabled={isSyncing || isEditSyncing || pendingSave !== null}
                  aria-label="새 글 등록"
                  className={idleButton}
                  style={{ backgroundColor: colors.buttonPrimary, width: actionSize, height: actionSize }}
                >
                  <svg width={actionIconSize} height={actionIconSize} viewBox="0 0 24 24" fill="none" stroke={colors.buttonIcon} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <button
                  onClick={handleEditOpen}
                  disabled={!currentQuote}
                  aria-label="내용 수정"
                  className={idleButton}
                  style={{ backgroundColor: colors.buttonPrimary, width: actionSize, height: actionSize }}
                >
                  <svg width={actionIconSize} height={actionIconSize} viewBox="0 0 24 24" fill="none" stroke={colors.buttonIcon} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                </button>
              </>
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
              className={`flex h-[52px] w-[52px] items-center justify-center rounded-full shadow-md ${springPress}`}
              style={{ backgroundColor: colors.buttonPrimary }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={colors.buttonIcon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>

            <button
              onClick={handleNewQuote}
              aria-label="새 경전 보기"
              className={`flex h-[72px] w-[72px] items-center justify-center rounded-full shadow-lg ${springPress}`}
              style={{ backgroundColor: colors.buttonPrimary }}
            >
              <DharmaWheel size={34} color={colors.buttonIcon} rotate={wheelRotate * 45} />
            </button>

            <button
              onClick={handleSync}
              disabled={isSyncing}
              aria-label="Google Sheets 동기화"
              className={`flex h-[52px] w-[52px] items-center justify-center rounded-full shadow-md disabled:opacity-50 ${springPress}`}
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

          {/* 맨 아래 한 줄 - 가운데에 동기화 안내문(로그), 오른쪽에 카테고리 순번을 각각 둔다.
              순번은 자리를 넓게 안 차지하니 오른쪽에 고정해 두고, 안내문은 그 앞까지
              가운데에서 넓게 쓴다. 줄 높이를 고정해 안내문이 나타났다 사라져도
              버튼 자리가 흔들리지 않는다. */}
          <div className="relative mt-2 h-4 text-xs" style={{ color: colors.textMuted }}>
            {/* 왼쪽에 이 글을 마지막으로 고친 날. 시트에 그 열이 없던 때의 글은 값이 없어 감춘다.
                시각까지는 좁은 화면에서 자리를 많이 먹어 날짜만 보여 준다. */}
            {currentQuote?.updatedAt && (
              <span
                className="absolute left-0 font-mono"
                title={`마지막 수정 ${currentQuote.updatedAt}`}
                // 순번과 같은 때에 옅어지지만, 아주 사라지지는 않고 흐릿하게 남는다 -
                // 날짜는 넘길 때마다 챙겨 볼 값은 아니어도 언제든 눈에 들어와야 한다.
                style={{ opacity: showCounter ? 1 : 0.3, transition: "opacity 500ms ease" }}
              >
                {currentQuote.updatedAt.slice(0, 10)}
              </span>
            )}
            {lastSyncStatus && (
              <p
                className="absolute inset-x-24 overflow-hidden text-ellipsis whitespace-nowrap text-center"
                // 순번과 같은 방식 - 자리는 그대로 두고 투명도만 오간다
                style={{ opacity: syncStatus ? 1 : 0, transition: "opacity 500ms ease" }}
              >
                {lastSyncStatus}
              </p>
            )}
            {quoteIndexInCategory !== -1 && (
              <span
                className="absolute right-0 font-mono"
                // 넘긴 직후에만 또렷하고, 그 뒤로는 날짜처럼 흐릿하게 남는다
                style={{ opacity: showCounter ? 1 : 0.3, transition: "opacity 500ms ease" }}
              >
                {`<${quoteIndexInCategory + 1}/${categoryQuotes.length}>`}
              </span>
            )}
          </div>
        </div>
      </div>

      <CanonMapModal
        isOpen={isCanonMapOpen}
        onClose={() => setIsCanonMapOpen(false)}
        quotes={quoteListState}
        onSelectQuote={(quote) => { setIsCanonMapOpen(false); handleSearchSelect(quote); }}
        colors={colors}
      />
      <TranslationPromptModal isOpen={isTranslationOpen} onClose={() => setIsTranslationOpen(false)} colors={colors} />
      {isMeditationOpen && <MeditationModal onClose={() => setIsMeditationOpen(false)} colors={colors} duration={meditationDuration} />}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        fontScale={fontScale}
        contentWidth={contentWidth}
        onSizeOpen={() => { setIsSizeOpen(true); setIsSettingsOpen(false); }}
        onColorOpen={() => { setIsColorOpen(true); setIsSettingsOpen(false); }}
        onColorPinsOpen={() => { setIsColorPinsOpen(true); setIsSettingsOpen(false); }}
        onQROpen={() => { setIsQROpen(true); setIsSettingsOpen(false); }}
        onEditOpen={handleEditOpen}
        onSyncHelpOpen={() => setIsSyncHelpOpen(true)}
        onSheetSetupOpen={() => setIsSheetSetupOpen(true)}
        onPromptOpen={() => setIsPromptOpen(true)}
        onQuizAdminOpen={() => setIsQuizAdminOpen(true)}
        onCanonMapOpen={() => setIsCanonMapOpen(true)}
        onTranslationOpen={() => setIsTranslationOpen(true)}
        onMeditationStart={(duration) => { setMeditationDuration(duration); setIsMeditationOpen(true); }}
        onThemeChange={(theme) => setColors(THEMES[theme])}
        colors={colors}
      />
      {isNewQuoteOpen && <NewQuoteModal
        categories={categories}
        initialCategory={selectedCategory ?? ""}
        colors={colors}
        onClose={() => setIsNewQuoteOpen(false)}
        onCreated={handleQuoteCreated}
      />}
      {isDeleteAsking && currentQuote && <ConfirmModal
        title="글 삭제"
        message={"이 글을 삭제할까요?\n시트에서도 지워지며 되돌릴 수 없습니다."}
        confirmLabel="삭제"
        onConfirm={confirmDelete}
        onClose={() => setIsDeleteAsking(false)}
        colors={colors}
      />}
            {isMovingQuote && currentQuote && <MoveCategoryModal
        categories={categories}
        currentCategory={currentQuote.category}
        onSubmit={handleMoveQuote}
        onClose={() => setIsMovingQuote(false)}
        colors={colors}
      />}
            {renamingCategory !== null && <RenameCategoryModal
        categoryName={categoryLabel(renamingCategory)}
        onSubmit={(newName) => handleRenameCategory(renamingCategory, newName)}
        onClose={() => setRenamingCategory(null)}
        colors={colors}
      />}
      {quizCategory !== null && <QuizMode
        category={quizCategory}
        colors={colors}
        notes={quoteListState}
        onClose={() => setQuizCategory(null)}
      />}
      {isQuizAdminOpen && <QuizAdminModal
        colors={colors}
        onClose={() => setIsQuizAdminOpen(false)}
        onSaved={() => { void handleSync(); }}
      />}
      <SizeModal
        isOpen={isSizeOpen}
        onClose={() => setIsSizeOpen(false)}
        fontScale={fontScale}
        onFontScaleChange={setFontScale}
        contentWidth={contentWidth}
        onContentWidthChange={setContentWidth}
        textScales={textScales}
        onTextScaleChange={setTextScale}
        categorySize={categorySize}
        onCategorySizeChange={setCategorySize}
        countSize={countSize}
        onCountSizeChange={setCountSize}
        actionSize={actionSize}
        onActionSizeChange={setActionSize}
        colors={colors}
        onSheetSave={handleSettingsSave}
        onSheetLoad={handleSettingsLoad}
      />
      <ColorModal
        isOpen={isColorOpen}
        onClose={() => setIsColorOpen(false)}
        colors={colors}
        rubyEmphasis={rubyEmphasis}
        onRubyEmphasisChange={setRubyEmphasis}
        onSheetSave={handleSettingsSave}
        onSheetLoad={handleSettingsLoad}
      />
      {/* 색 조절 2 - 판이 본문 위에 뜨므로 수정 중에는 띄우지 않는다 (기댈 글자가 없다) */}
      <ColorPins
        isOpen={isColorPinsOpen && !isEditing}
        onClose={() => setIsColorPinsOpen(false)}
      />
      <QRModal
        isOpen={isQROpen}
        onClose={() => setIsQROpen(false)}
        colors={colors}
      />
      <SyncHelpModal
        isOpen={isSyncHelpOpen}
        onClose={() => setIsSyncHelpOpen(false)}
        colors={colors}
      />
      <SheetSetupModal
        isOpen={isSheetSetupOpen}
        onClose={() => setIsSheetSetupOpen(false)}
        colors={colors}
      />
      <PromptModal
        isOpen={isPromptOpen}
        onClose={() => setIsPromptOpen(false)}
        colors={colors}
        onSheetSave={handleSettingsSave}
      />
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
