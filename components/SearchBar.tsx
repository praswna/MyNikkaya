"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ThemeColors } from "@/lib/theme";
import type { Quote } from "@/lib/types";
import { CATEGORY_SEPARATOR } from "@/lib/category";
import { forSearch, plainText } from "@/lib/search";

interface SearchBarProps {
  quotes: Quote[];
  colors: ThemeColors;
  size: number; // 버튼(돋보기·입력창) 지름(px). 크기 조절 창에서 정하며, 입력 글자도 이에 맞춰 커진다.
  onSelect: (quote: Quote) => void;
}

// 부모(f 단축키)가 검색창에 초점을 주거나, 드래그해 둔 글을 그대로 넣어 바로 찾게 한다.
export interface SearchBarHandle {
  focusWith: (text?: string) => void;
}

const MAX_RESULTS = 50;   // 결과가 많아도 화면과 손이 밀리지 않게 앞쪽만 보여준다
const SNIPPET_BEFORE = 30; // 찾은 자리 앞에 남길 글자 수
const SNIPPET_AFTER = 90;  // 찾은 자리 뒤에 남길 글자 수

// 첫 [[제목]] 의 알맹이만 뽑아 결과의 표제로 쓴다 (루비·각주·표시 기호는 걷어낸다).
function titleOf(text: string): string {
  const m = text.match(/\[\[([^\]]+)\]\]/);
  if (!m) return "";
  return m[1]
    .replace(/\{[^}]*\}/g, "")   // 루비 딸림글은 제목에서 뺀다 (지주회사{持株會社} → 지주회사)
    .replace(/\^\d+/g, "")
    .replace(/[[\]<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface Indexed {
  quote: Quote;
  plain: string;
  lowerPlain: string;
  catPath: string;
  lowerCat: string;
  title: string;
}

interface SnippetPart {
  text: string;
  hit: boolean;
}

// 찾은 자리 둘레만 잘라 보여준다. 없으면 앞부분만.
function makeSnippet(plain: string, lowerPlain: string, q: string): SnippetPart[] {
  const idx = q ? lowerPlain.indexOf(q) : -1;
  if (idx === -1) {
    const head = plain.slice(0, SNIPPET_BEFORE + SNIPPET_AFTER);
    return [{ text: head, hit: false }, ...(plain.length > head.length ? [{ text: "…", hit: false }] : [])];
  }
  const start = Math.max(0, idx - SNIPPET_BEFORE);
  const end = Math.min(plain.length, idx + q.length + SNIPPET_AFTER);
  const parts: SnippetPart[] = [];
  if (start > 0) parts.push({ text: "…", hit: false });
  if (idx > start) parts.push({ text: plain.slice(start, idx), hit: false });
  parts.push({ text: plain.slice(idx, idx + q.length), hit: true });
  if (end > idx + q.length) parts.push({ text: plain.slice(idx + q.length, end), hit: false });
  if (end < plain.length) parts.push({ text: "…", hit: false });
  return parts;
}

// 돋보기가 있던 왼쪽 위 자리에 놓이는 작은 검색창. 창(모달)으로 들어가지 않고
// 여기 바로 입력하면 아래로 결과가 펼쳐지고, 고르면 그 글로 넘어간다.
// 안 쓸 때는 옅게(0.3) 물러났다 손을 올리거나 초점이 가면 또렷해진다.
// 부모가 / 단축키로 초점을 주려고 input 에 ref 를 건다.
export const SearchBar = forwardRef<SearchBarHandle, SearchBarProps>(function SearchBar(
  { quotes, colors, size, onSelect }, ref,
) {
  // 버튼 지름(size)에 맞춰 아이콘·입력창·글자를 함께 키운다 (18px 일 때 지금까지의 값과 같다).
  const iconSize = Math.round(size * 0.45);        // 돋보기·+·✕ 아이콘 (18 → 8)
  const inputIcon = Math.round(size * 0.4);        // 입력창 안 아이콘 (18 → 7)
  const inputWidth = Math.round(size * 5.8);       // 펼친 입력칸 너비 (18 → 104)
  const inputPad = Math.round(size * 0.8);         // 아이콘 자리를 남기는 좌우 여백 (18 → 14)
  const iconInset = Math.round(size * 0.33);       // 입력창 안 아이콘의 좌우 위치 (18 → 6)
  const inputFont = Math.round(size * 0.66);       // 입력 글자 - 검색칸이 작아지면 함께 작아진다 (18 → 12)
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false); // 닫히면 돋보기 아이콘만 남고, 열리면 입력창이 펼쳐진다
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // 닫기 - 아이콘만 남긴다. 검색어도 비워 다음에 열 때 새로 시작한다.
  const close = () => { setOpen(false); setQuery(""); setActive(0); };

  // 열리면 입력창에 초점을 준다 (열림 상태가 되고 나서 그려진 뒤에)
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  // 펼친 검색창 바깥을 누르면 닫는다. (결과 줄·지우기 버튼은 안쪽이라 여기 걸리지 않는다)
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useImperativeHandle(ref, () => ({
    focusWith(text?: string) {
      // 드래그해 둔 글이 있으면 그대로 검색어로 넣는다 (없으면 펼치기만 한다). 초점은 위 effect 가 준다.
      if (text && text.trim()) { setQuery(text.trim()); setActive(0); }
      setOpen(true);
    },
  }), []);

  // 마크업을 걷어낸 검색용 글자는 목록이 바뀔 때만 다시 만든다 (키 하나마다 다시 훑지 않는다)
  const indexed = useMemo<Indexed[]>(() => quotes.map((quote) => {
    const plain = plainText(quote.text);
    const catPath = quote.category.split(CATEGORY_SEPARATOR).join(" › ");
    return { quote, plain, lowerPlain: forSearch(plain), catPath, lowerCat: forSearch(catPath), title: titleOf(quote.text) };
  }), [quotes]);

  const q = forSearch(query.trim());
  const results = useMemo(() => {
    if (!q) return [];
    const hits: Indexed[] = [];
    for (const item of indexed) {
      if (item.lowerPlain.includes(q) || item.lowerCat.includes(q)) {
        hits.push(item);
        if (hits.length >= MAX_RESULTS) break;
      }
    }
    return hits;
  }, [indexed, q]);

  const activeIndex = results.length === 0 ? 0 : Math.min(active, results.length - 1);

  const choose = (item: Indexed | undefined) => {
    if (!item) return;
    onSelect(item.quote);
    close();   // 고르면 검색창을 닫아 아이콘만 남긴다
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(Math.min(activeIndex + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(Math.max(activeIndex - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); choose(results[activeIndex]); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
  };

  return (
    // 돋보기가 있던 자리(왼쪽 위). 닫혀 있으면 아이콘만, 안 쓸 때 옅게 물러났다 손을 올리면
    // 또렷해진다. 펼쳐지면 또렷하게 둔다. 탄성 없이 평범한 페이드만 준다.
    <div
      ref={rootRef}
      className={`absolute left-1 top-1 z-30 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-30 hover:opacity-100"}`}
    >
      {!open ? (
        // 닫힌 상태 - 돋보기 아이콘만. 누르면 펼쳐진다 (/f 단축키로도 펼쳐진다).
        <button
          onClick={() => setOpen(true)}
          aria-label="글 검색"
          className="flex items-center justify-center rounded-full shadow-sm transition-transform duration-200 ease-out active:scale-95"
          style={{ backgroundColor: colors.buttonPrimary, width: size, height: size }}
        >
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={colors.buttonIcon} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      ) : (
        <>
        <div className="relative">
        <span className="pointer-events-none absolute top-1/2 -translate-y-1/2" style={{ color: colors.buttonIcon, left: iconInset }}>
          <svg width={inputIcon} height={inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActive(0); }}
          onKeyDown={onKeyDown}
          placeholder="찾기"
          aria-label="글 검색"
          className="rounded-full shadow-sm outline-none"
          style={{
            height: size,
            width: inputWidth,
            paddingLeft: inputPad,
            paddingRight: inputPad,
            fontSize: inputFont,
            backgroundColor: colors.buttonPrimary,
            color: colors.buttonIcon,
            fontFamily: "inherit",
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setActive(0); }}
            aria-label="검색어 지우기"
            className="absolute top-1/2 -translate-y-1/2"
            style={{ color: colors.buttonIcon, right: iconInset }}
          >
            <svg width={inputIcon} height={inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 결과는 카드를 밀지 않게 검색창 바로 아래에 떠서 펼쳐진다 (입력칸보다 넓게 잡아 스니펫이 읽힌다) */}
      {q && (
        <div
          className="absolute left-0 top-full mt-1 max-h-[58vh] w-[min(78vw,22rem)] overflow-y-auto overscroll-contain rounded-xl p-1 shadow-2xl"
          style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
        >
          {results.length === 0 ? (
            <p className="px-2.5 py-2 text-xs" style={{ color: colors.textMuted }}>찾는 글이 없습니다.</p>
          ) : (
            <>
              {results.map((item, i) => {
                const isActive = i === activeIndex;
                return (
                  <button
                    key={item.quote.sheetId ?? item.quote.id}
                    // input 이 blur 되기 전에 눌리도록 mousedown 으로 고른다
                    onMouseDown={(e) => { e.preventDefault(); choose(item); }}
                    onMouseEnter={() => setActive(i)}
                    className="block w-full rounded-lg px-2.5 py-2 text-left"
                    style={{
                      backgroundColor: isActive ? colors.bg : "transparent",
                      border: `1px solid ${isActive ? colors.categorySelected : "transparent"}`,
                    }}
                  >
                    <span className="block truncate text-[11px]" style={{ color: colors.categoryParentText }}>
                      {item.catPath}
                    </span>
                    {/* [[제목]] 이 있으면 표제로 보여, 본문 어디를 맞혔든 어느 글인지 한눈에 안다 */}
                    {item.title && (
                      <span className="mt-0.5 block truncate text-[13px] font-semibold leading-snug" style={{ color: colors.textBold }}>
                        {item.title}
                      </span>
                    )}
                    <span className="mt-0.5 block text-sm leading-snug" style={{ color: colors.text }}>
                      {makeSnippet(item.plain, item.lowerPlain, q).map((part, j) =>
                        part.hit ? (
                          <mark key={j} style={{ backgroundColor: colors.categorySelected, color: colors.categorySelectedText, borderRadius: 3, padding: "0 1px" }}>
                            {part.text}
                          </mark>
                        ) : (
                          <span key={j}>{part.text}</span>
                        ),
                      )}
                    </span>
                  </button>
                );
              })}
              {results.length >= MAX_RESULTS && (
                <p className="px-2.5 py-1.5 text-[11px]" style={{ color: colors.textMuted }}>
                  {MAX_RESULTS}개까지 보여줍니다. 검색어를 더 좁혀보세요.
                </p>
              )}
            </>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
});
