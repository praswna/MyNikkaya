"use client";

import { useMemo, useState } from "react";
import { parseRubyText, splitNoteBlock, splitSpeechBlocks, withNote, type SpeechKind } from "@/lib/ruby";
import { ThemeColors } from "@/lib/theme";
import { mixColors } from "@/lib/color-palettes";
import { useEscape } from "@/lib/use-escape";
import { RubySegment } from "@/lib/types";

// 제목·부분강조·대화·강조(말씀)·루비 각각의 크기를, 평문(fontSize) 대비 배수로 조절한다.
// 설정 > 크기 조절 탭에서 사용자가 하나씩 바꿀 수 있다.
export interface TextScales {
  title: number;    // [[ ]] 제목
  emphasis: number;  // [ ] 부분강조
  talk: number;      // > < 대화
  say: number;       // >> << 강조(말씀)
  ruby: number;      // 단어{루비} 의 딸림글(위에 붙는 작은 글씨)
  rubyBase: number;  // 단어{루비} 의 본체 낱말
}

// 아래 각 배수는 원래 코드에 고정돼 있던 값 그대로다 - 사용자가 아직 안 바꿨으면 예전과
// 똑같이 보이게 한다 (평문 1배, 대화 1.08배, 부분강조 1.1배, 강조 1.2배, 제목 1.3배).
export const DEFAULT_TEXT_SCALES: TextScales = { title: 2.38, emphasis: 1.12, talk: 1.02, say: 1.2, ruby: 1.16, rubyBase: 1.08 };

interface RubyTextProps {
  text: string;
  fontSize: number;
  lineHeight: string;
  colors: ThemeColors;
  scales: TextScales;
  // 딸림글(루비)을 둘레색에서 본문색 쪽으로 당기는 정도 (0이면 둘레색 그대로)
  rubyEmphasis: number;
  // 주석을 추가/수정하면 바뀐 명언 원문 전체를 돌려준다 (없으면 읽기 전용)
  onTextChange?: (newText: string) => void;
}

// 루비가 달리는 낱말은 공백을 쓸 수 없다({} 앞의 "\S+"만 낱말로 잡는다) -
// 그래서 여러 낱말에 걸쳐 루비를 달 때는 "-"로 이어 쓴다. 화면에는 그 "-"를
// 다시 빈칸으로 되돌려 보여준다 (저장된 원문은 그대로 두고 보이는 것만 바꾼다).
// 보통 빈칸을 쓰면 그 자리에서 줄이 갈라져 루비가 낱말 절반 위에서 끊길 수 있어,
// 줄바꿈 없는 빈칸(NBSP)을 대신 쓴다 - "-"와 똑같이 한 덩어리로 붙어 있는다.
function displayRubyWord(word: string): string {
  return word.replace(/-/g, "\u00A0");
}

// 루비 베이스 텍스트 크기 - 길이와 상관없이 항상 그대로 (자동 축소 안 함)
function getBaseFontSize(baseScale: number): string {
  return `${baseScale}em`;
}

// 루비 텍스트(위첨자) 크기 - 글자 수 기준 자동 조절, 사용자가 고른 배수(rubyScale)를 곱한다.
//
// 본문 크기는 글 길이에 따라 12px 까지 줄어드는데, 루비는 그 절반이라
// 긴 경에서는 5px 안팎이 되어 읽을 수가 없었다. 그래서 최소 크기를 둔다.
// max(9px, …) 는 본문이 아무리 작아져도 루비가 9px 아래로 내려가지 않게 한다.
function rubyEm(parts: string[], rubyScale: number): number {
  const maxLen = Math.max(...parts.map((r) => r.length));
  const em =
    maxLen > 12 ? 0.42 : // 매우 긴 루비
    maxLen > 8  ? 0.48 : // 긴 루비
    maxLen > 4  ? 0.54 : // 중간 루비
    0.58;                // 짧은 루비 (기본)
  return em * rubyScale;
}

function getRubyFontSize(parts: string[], rubyScale: number): string {
  return `max(9px, ${rubyEm(parts, rubyScale)}em)`;
}

// 글자 너비 어림 - 한글·한자·가나는 한 칸(1em), 로마자·숫자·기호는 그 절반, 빈칸은 더 좁게 본다.
// 실제로 재려면 그릴 때마다 화면을 다시 계산해야 하므로 글자 갈래로 어림한다.
const WIDE_CHARS = /[\u1100-\u11FF\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFF00-\uFF60]/;

function textWidthEm(text: string): number {
  return Array.from(text).reduce((sum, ch) => {
    if (ch === " " || ch === "\u00A0") return sum + 0.3;
    return sum + (WIDE_CHARS.test(ch) ? 1 : 0.5);
  }, 0);
}

// 딸림글이 본체보다 훨씬 넓으면 브라우저가 루비 상자를 그 너비까지 벌려서, 앞뒤 낱말
// 사이에 구멍이 뚫린 것처럼 보인다("...위한    4대    원칙"). 그래서 너무 넓어지면
// 낱말 사이에서 접어 아래로 쌓는다.
//
// 다만 본체 너비만으로 한 줄의 폭을 정하면, 본체가 짧을 때 딸림글이 잘게 부서진다 -
// "시화{시를 상징하는 꽃}" 이 세 줄로 쪼개지는 식이다. 그래서 본체가 아무리 짧아도
// 본문 글자 네다섯 자 너비까지는 한 줄에 둔다 - 그 정도 구멍은 눈에 거슬리지 않고,
// 짧은 딸림글은 대부분 한 줄에 들어간다.
const MIN_RUBY_LINE_BASE_EM = 4.5;

function rubyLineCapEm(baseText: string, parts: string[], rubyScale: number): number {
  const allowedBaseEm = Math.max(textWidthEm(baseText) * 1.2, MIN_RUBY_LINE_BASE_EM);
  // 본문 글자 기준 너비를, 딸림글 글자 기준으로 환산한다 (딸림글이 그만큼 작으므로 더 많이 들어간다)
  return allowedBaseEm / rubyEm(parts, rubyScale);
}

// 낱말들을 정확히 count 줄로 나눌 때, 가장 긴 줄이 제일 짧아지는 나눔을 찾는다.
// 줄 수가 같다면 한쪽만 길쭉한 것보다 고르게 나뉜 편이 좁고 보기에도 낫다.
function splitEvenly(words: string[], count: number): { lines: string[]; widest: number } {
  const n = words.length;
  const width = (from: number, to: number) => textWidthEm(words.slice(from, to).join(" "));

  // best[k][i] = 앞의 낱말 i 개를 k 줄로 나눴을 때 가장 긴 줄의 최소 너비, cut 은 그때의 마지막 줄 시작점
  const best: number[][] = Array.from({ length: count + 1 }, () => Array(n + 1).fill(Infinity));
  const cut: number[][] = Array.from({ length: count + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= n; i++) best[1][i] = width(0, i);
  for (let k = 2; k <= count; k++) {
    for (let i = k; i <= n; i++) {
      for (let j = k - 1; j < i; j++) {
        const candidate = Math.max(best[k - 1][j], width(j, i));
        if (candidate < best[k][i]) {
          best[k][i] = candidate;
          cut[k][i] = j;
        }
      }
    }
  }

  const lines: string[] = [];
  let end = n;
  for (let k = count; k >= 1; k--) {
    const start = k === 1 ? 0 : cut[k][end];
    lines.unshift(words.slice(start, end).join(" "));
    end = start;
  }
  return { lines, widest: best[count][n] };
}

// 딸림글 한 조각을, 한 줄이 정해진 폭을 넘지 않는 가장 적은 줄 수로 나눈다.
// 낱말 하나가 그 폭보다 넓어도 글자 중간에서 끊지는 않는다 - 못 읽는 글자가 되느니
// 살짝 넘치는 편이 낫다.
function wrapRubyPart(part: string, capEm: number): string[] {
  const words = part.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [part];
  for (let count = 1; count < words.length; count++) {
    const { lines, widest } = splitEvenly(words, count);
    if (widest <= capEm) return lines;
  }
  return words;
}

// 딸림글 조각들을, 화면에 그릴 줄 단위로 펼친다 (조각 하나가 여러 줄이 될 수 있다).
function rubyLines(baseText: string, parts: string[], rubyScale: number): string[] {
  const capEm = rubyLineCapEm(baseText, parts, rubyScale);
  return parts.flatMap((part) => wrapRubyPart(part, capEm));
}

// 루비 낱말이 지금 어떤 강조 안에 있는지 - 그에 맞는 계열 색을 쓴다.
// "none" 은 강조 밖의 보통 루비로, 루비 전용 색(textEmphasis)을 쓴다.
type Wrapper = "bold" | "accent" | "none";

function wrapperColor(wrapper: Wrapper, colors: ThemeColors): string {
  if (wrapper === "bold") return colors.textBold;
  if (wrapper === "accent") return colors.textAccent;
  return colors.textEmphasis;
}

// 딸림글(루비)을 둘레색에서 본문색 쪽으로 얼마나 당길지 - 0이면 둘레색 그대로다.
// 설정 > 색 조절에서 바꾼다.
export const DEFAULT_RUBY_EMPHASIS = 0.3;

function renderSegment(
  seg: RubySegment,
  i: number,
  colors: ThemeColors,
  wrapper: Wrapper,
  editable: boolean,
  onRubyOpen: (seg: RubySegment) => void,
  scales: TextScales,
  rubyEmphasis: number = DEFAULT_RUBY_EMPHASIS,
): React.ReactNode {
  if (seg.type === "newline") {
    return <br key={i} />;
  }
  if (seg.type === "bold" && seg.innerSegments) {
    return (
      <strong key={i} data-mark="bold" style={{ color: colors.textBold, fontWeight: 900, fontSize: `${scales.title}em` }}>
        {seg.innerSegments.map((inner, j) => renderSegment(inner, j, colors, "bold", editable, onRubyOpen, scales, rubyEmphasis))}
      </strong>
    );
  }
  if (seg.type === "emphasis" && seg.innerSegments) {
    return (
      <strong key={i} data-mark="accent" style={{ color: colors.textAccent, fontWeight: 700, fontSize: `${scales.emphasis}em` }}>
        {seg.innerSegments.map((inner, j) => renderSegment(inner, j, colors, "accent", editable, onRubyOpen, scales, rubyEmphasis))}
      </strong>
    );
  }
  if (seg.type === "link") {
    return (
      <a
        key={i}
        href={seg.content}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: colors.textEmphasis, textDecoration: "underline", wordBreak: "break-all", fontSize: "0.4em" /* 링크 텍스트 크기 */ }}
      >
        {seg.content}
      </a>
    );
  }
  if (seg.type === "ruby" && seg.ruby) {
    // 주석이 있거나(보기), 편집이 가능하면(주석 추가) 두 번 눌러서 연다.
    // 한 번 눌러 열면 글을 드래그해 고르거나 넘기다가 주석 창이 튀어나온다 -
    // 두 번 누름으로 두어 읽는 손길과 여는 손길을 갈라 놓는다.
    const open = editable || seg.note ? () => onRubyOpen(seg) : undefined;
    return (
      <ruby
        key={i}
        data-mark="ruby"
        onDoubleClick={open}
        // 두 번 누를 때 낱말이 파랗게 잡히는 것(브라우저 기본 낱말 선택)을 막는다
        onMouseDown={open ? (e) => { if (e.detail > 1) e.preventDefault(); } : undefined}
        role={open ? "button" : undefined}
        tabIndex={open ? 0 : undefined}
        aria-label={open ? `${displayRubyWord(seg.content)} 주석 (두 번 누르기)` : undefined}
        onKeyDown={open ? (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        } : undefined}
        style={{
          color: wrapperColor(wrapper, colors),
          verticalAlign: "bottom",
          fontSize: getBaseFontSize(scales.rubyBase),
          cursor: open ? "pointer" : undefined,
          // 손가락으로 두 번 톡톡 두드릴 때 확대(더블탭 줌)가 끼어들지 않게 한다 -
          // 이 낱말에서만 꺼지므로 손가락 두 개로 벌리는 확대는 그대로 쓸 수 있다.
          touchAction: open ? "manipulation" : undefined,
          outline: "none",
        } as React.CSSProperties}
      >
        {/* 주석이 달린 단어만 점선 밑줄로 표시 */}
        {seg.note ? (
          <span style={{ borderBottom: `1px dashed ${colors.rubyText}`, paddingBottom: "0.05em" }}>
            {displayRubyWord(seg.content)}
          </span>
        ) : (
          displayRubyWord(seg.content)
        )}
        {/* 색은 둘레(ruby 요소)의 계열을 따라간다 - 강조 안에서는 그 강조색, 평문에서는
            루비 전용색(textEmphasis). 따로 회갈색을 박아 두면 강조 곁에서 탁해 보이고,
            본문보다 밝아져 딸림글이 본문보다 튀는 일도 생겼다.
            거기에 '루비 강조'(rubyEmphasis)만큼 본문 글자색 쪽으로 당겨, 계열은 그대로
            두면서 딸림글만 조금 또렷해지게 한다 - 0이면 둘레색 그대로다.
            본문색 쪽으로 당기므로 어두운 배색에서는 밝아지고 밝은 배색에서는 짙어진다. */}
        <rt style={{
          fontSize: getRubyFontSize(seg.ruby, scales.ruby),
          color: mixColors(wrapperColor(wrapper, colors), colors.text, rubyEmphasis),
          fontWeight: "normal",
          letterSpacing: "0.02em",
          lineHeight: "1.15",
          // 딸림글 줄의 높이는 그 줄에서 가장 높은(여러 줄로 쌓인) 딸림글이 정한다.
          // 기본값(위 붙임)으로 두면 한 줄짜리 딸림글이 그 높이만큼 붕 떠서
          // 제 낱말과 멀어진다 - 아래로 붙여 낱말 바로 위에 오게 한다.
          verticalAlign: "bottom",
        }}>
          {/* 루비 조각을 위아래로 쌓는다.
              크롬은 rt 안에서 줄바꿈(\n, <br>, 블록 자식)을 모두 무시하고 한 줄로 붙여버린다.
              별도의 서식 문맥을 만드는 상자(inline-flex)로 감싸야 크롬에서도 줄이 나뉜다.
              사파리(아이폰)는 원래 잘 나뉘었고 이 방식도 그대로 나뉜다.

              어디서 접을지는 브라우저에 맡기지 않고 위(rubyLines)에서 미리 정한다 -
              폭만 좁혀 두고 맡기면 남는 자리를 못 채워 "시를 / 상징하는 / 꽃" 처럼
              잘게 부서졌다. 한 줄 한 줄을 그대로 그리고, 그 안에서는 접지 않는다. */}
          <span style={{
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "center",
          }}>
            {rubyLines(seg.content, seg.ruby, scales.ruby).map((line, k) => (
              <span key={k} style={{ whiteSpace: "nowrap" }}>{line}</span>
            ))}
          </span>
        </rt>
      </ruby>
    );
  }
  return <span key={i}>{seg.content}</span>;
}

// 평문 · 대화 · 부처님 말씀.
// 대화와 말씀은 판에 담아 누가 말하는지 한눈에 보이게 한다.
// 한 덩어리(> … < / >> … <<)가 판 하나다 - 안에 문단이 여럿이면 그대로 이어진다.
// 판 바탕은 아주 옅게만 깔고, 구분은 글자 크기가 맡는다.
// 뒤로 갈수록 커진다 - 서술보다 대화가, 대화보다 말씀이 앞에 온다 (기본값 기준, 설정 > 크기
// 조절에서 갈래별로 따로 바꿀 수 있다).
//
//   평문 1배   대화 1.08배   [부분강조] 1.1배(약간 굵게)   말씀 1.2배   [[제목]] 1.3배(굵게·강조색)
//
// 대화·말씀은 굵기를 건드리지 않는다(판 배경과 크기만으로 구분한다).
// 테두리도 두지 않는다 - 선이 있으면 글보다 상자가 먼저 눈에 들어온다.
function blockStyle(kind: SpeechKind, colors: ThemeColors, scales: TextScales): React.CSSProperties | undefined {
  if (kind === "plain") return undefined;
  const common: React.CSSProperties = {
    display: "block",
    borderRadius: "16px",
    margin: "1.2em 0",
    padding: "0.75em 0.9em",
  };
  if (kind === "talk") {
    return { ...common, backgroundColor: colors.talkBg, color: colors.talkText, fontSize: `${scales.talk}em` };
  }
  return { ...common, backgroundColor: colors.sayBg, color: colors.sayText, fontSize: `${scales.say}em` };
}

// 글 하나를 판·조각으로 나눠 그린다 - 본문과 주석 팝업이 이 함수를 함께 쓴다.
// 주석 안에도 [[ ]], [ ], 낱말{ }, > < 를 그대로 쓸 수 있게 하기 위함이다.
function renderMarkupBlocks(
  text: string,
  colors: ThemeColors,
  scales: TextScales,
  editable: boolean,
  onRubyOpen: (seg: RubySegment) => void,
  rubyEmphasis: number = DEFAULT_RUBY_EMPHASIS,
): React.ReactNode {
  const { body, notes } = splitNoteBlock(text);
  return splitSpeechBlocks(body).map((block, i) => {
    const segments = parseRubyText(block.text, notes, block.offset);
    const children = segments.map((seg, j) => renderSegment(seg, j, colors, "none", editable, onRubyOpen, scales, rubyEmphasis));
    return block.kind === "plain"
      ? <span key={i} data-mark="plain">{children}</span>
      : <div key={i} data-mark={block.kind} style={blockStyle(block.kind, colors, scales)}>{children}</div>;
  });
}

// 루비 주석 팝업 - 보기 / 추가 / 수정 / 삭제 (QRModal 과 동일한 오버레이 패턴)
function NoteModal({
  seg,
  onClose,
  onSave,
  colors,
  editable,
}: {
  seg: RubySegment;
  onClose: () => void;
  onSave: (note: string) => void;
  colors: ThemeColors;
  editable: boolean;
}) {
  // 주석이 없는 단어를 누른 경우엔 바로 입력 화면으로 연다
  const [isEditing, setIsEditing] = useState(editable && !seg.note);
  const [draft, setDraft] = useState(seg.note ?? "");
  useEscape(true, onClose);

  const buttonBase = "flex-1 rounded-xl py-2.5 text-sm font-medium";
  const subtleStyle = { backgroundColor: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` };
  const primaryStyle = { backgroundColor: colors.categorySelected, color: colors.categorySelectedText };

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${displayRubyWord(seg.content)} 주석`}
        // 예전엔 max-w-md(작은 카드)로 고정돼 있어 넓은 화면에서 유독 작아 보였다.
        // 화면 비율(뷰포트 폭·높이)에 맞춰 스크린샷만 한 크기로 뜨게 하고,
        // 세로로 긴 화면에서만 그 안에서 줄어들게 한다.
        className="fixed left-1/2 top-1/2 z-50 flex w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl p-5 shadow-2xl"
        style={{
          backgroundColor: colors.bgSecondary,
          border: `1px solid ${colors.border}`,
          height: "min(85vh, 42rem)",
          maxHeight: "calc(100dvh - 3rem)",
        }}
      >
        <p className="text-lg font-semibold text-center" style={{ color: colors.textEmphasis }}>
          {displayRubyWord(seg.content)}
        </p>
        {seg.ruby && seg.ruby.length > 0 && (
          <p className="mt-1 text-xs text-center" style={{ color: colors.rubyText }}>
            {seg.ruby.join(" · ")}
          </p>
        )}

        {isEditing ? (
          <>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              placeholder="이 단어에 대한 주석을 적어주세요"
              className="mt-4 w-full min-h-0 flex-1 resize-none rounded-xl p-3 text-sm outline-none"
              style={{
                backgroundColor: colors.bg,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                fontFamily: "inherit",
                lineHeight: "1.6",
              }}
            />
            <div className="mt-4 flex gap-2">
              <button onClick={onClose} className={buttonBase} style={subtleStyle}>취소</button>
              {seg.note && (
                <button onClick={() => onSave("")} className={buttonBase} style={subtleStyle}>삭제</button>
              )}
              <button onClick={() => onSave(draft)} className={buttonBase} style={primaryStyle}>저장</button>
            </div>
          </>
        ) : (
          <>
            <div
              className="mt-4 min-h-0 flex-1 overflow-y-auto text-sm"
              style={{
                color: colors.text,
                lineHeight: "1.7",
                wordBreak: "keep-all",
                borderTop: `1px solid ${colors.border}`,
                paddingTop: "1rem",
              }}
            >
              {/* 주석 안의 [[ ]], [ ], 낱말{ }, > < 도 본문과 같은 규칙으로 그린다.
                  다만 창이 작으니, 본문에서 사용자가 키워 둔 크기(scales)가 아니라
                  기본 배수로 고정해 둔다 - 안 그러면 제목을 500% 로 키워 둔 경우
                  이 작은 창 안에서 글자가 넘쳐 버린다. */}
              {renderMarkupBlocks(seg.note ?? "", colors, DEFAULT_TEXT_SCALES, false, () => {})}
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={onClose} className={buttonBase} style={subtleStyle}>닫기</button>
              {editable && (
                <button onClick={() => setIsEditing(true)} className={buttonBase} style={primaryStyle}>주석 수정</button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export function RubyText({ text, fontSize, lineHeight, colors, scales, rubyEmphasis, onTextChange }: RubyTextProps) {
  // 글 끝 각주 블록은 본문으로 그리지 않고, 번호를 실제 주석으로 바꿔 넣는다.
  // 그 다음 평문 · 대화 · 말씀 덩어리로 나눈다.
  // 글이 그대로면 다시 훑지 않는다 (긴 경은 조각이 수천 개다).
  const blocks = useMemo(() => {
    const { body, notes } = splitNoteBlock(text);
    return splitSpeechBlocks(body).map((block) => ({
      kind: block.kind,
      // 원문에서의 위치를 그대로 넘겨야 주석을 되짚을 때 어긋나지 않는다
      segments: parseRubyText(block.text, notes, block.offset),
    }));
  }, [text]);
  const [activeSeg, setActiveSeg] = useState<RubySegment | null>(null);

  // 명언이 바뀌면 열려 있던 주석 팝업은 닫기 (렌더 중 상태 조정 패턴)
  const [noteOwnerText, setNoteOwnerText] = useState(text);
  if (noteOwnerText !== text) {
    setNoteOwnerText(text);
    setActiveSeg(null);
  }

  const editable = Boolean(onTextChange);
  const handleSave = (note: string) => {
    if (!activeSeg || !onTextChange) return;
    const next = withNote(text, activeSeg, note);
    setActiveSeg(null);
    if (next !== text) onTextChange(next);
  };

  return (
    <>
      {/* 판(div)을 담아야 하므로 p 가 아니라 div 를 쓴다 */}
      <div
        data-mark="body"
        className="text-center font-semibold w-full"
        style={{
          fontSize,
          lineHeight,
          color: colors.text,
          wordBreak: "keep-all",
          overflowWrap: "break-word",
          maxWidth: "100%",
          overflowX: "hidden",
        }}
      >
        {blocks.map((block, i) => {
          const children = block.segments.map((seg, j) => renderSegment(seg, j, colors, "none", editable, setActiveSeg, scales, rubyEmphasis));
          return block.kind === "plain"
            ? <span key={i} data-mark="plain">{children}</span>
            : <div key={i} data-mark={block.kind} style={blockStyle(block.kind, colors, scales)}>{children}</div>;
        })}
      </div>
      {activeSeg && (
        <NoteModal
          key={`${activeSeg.braceStart}-${activeSeg.note ?? ""}`}
          seg={activeSeg}
          editable={editable}
          onClose={() => setActiveSeg(null)}
          onSave={handleSave}
          colors={colors}
        />
      )}
    </>
  );
}
