import { RubySegment } from "./types";

// =============================================
// 루비/굵게/링크 마크업 파서
// =============================================
// 지원 문법:
//   루비:   단어{한자,영어,번역}  → 단어 위에 작은 글씨
//   주석:   단어{한자^설명}         → ^ 뒤는 주석, 클릭하면 팝업으로 표시
//   굵게:   [[텍스트]]            → 굵게 + 강조색 (textBold)
//   링크:   https://...           → 자동 하이퍼링크 (40% 크기)
//   줄바꿈: CSV 셀 안에서 엔터    → <br>

// offset: 이 조각이 원문 전체에서 시작하는 위치 (주석 추가/수정 시 원문을 되짚기 위함)
function parseInner(text: string, offset: number): RubySegment[] {
  const segments: RubySegment[] = [];
  const pattern = /\{([^}]+)\}|\n|(https?:\/\/[^\s]+)/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const matchStart = match.index;

    if (match[0] === "\n") {
      const before = text.slice(lastIndex, matchStart);
      if (before.length > 0) segments.push({ type: "text", content: before });
      segments.push({ type: "newline", content: "\n" });
      lastIndex = matchStart + 1;
      continue;
    }

    if (match[0].startsWith("http")) {
      const before = text.slice(lastIndex, matchStart);
      if (before.length > 0) segments.push({ type: "text", content: before });
      segments.push({ type: "link", content: match[0] });
      lastIndex = matchStart + match[0].length;
      continue;
    }

    const before = text.slice(lastIndex, matchStart);
    const wordMatch = before.match(/(\S+)$/);
    const word = wordMatch ? wordMatch[1] : "";
    const pureText = word ? before.slice(0, before.length - word.length) : before;
    if (pureText.length > 0) segments.push({ type: "text", content: pureText });

    // "^" 를 기준으로 앞은 루비(위첨자), 뒤는 주석 본문
    const caretIndex = match[1].indexOf("^");
    const topPart = caretIndex === -1 ? match[1] : match[1].slice(0, caretIndex);
    const notePart = caretIndex === -1 ? "" : match[1].slice(caretIndex + 1).trim();
    const rubyParts = topPart.split(",").map((s) => s.trim()).filter(Boolean);
    segments.push({
      type: "ruby",
      content: word,
      ruby: rubyParts,
      rubyRaw: topPart,
      braceStart: offset + matchStart,
      braceEnd: offset + matchStart + match[0].length,
      ...(notePart ? { note: notePart } : {}),
    });

    lastIndex = matchStart + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
}

export function parseRubyText(text: string): RubySegment[] {
  // 먼저 **bold** 를 분리
  const segments: RubySegment[] = [];
  const boldPattern = /\[\[([^\]]+)\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = boldPattern.exec(text)) !== null) {
    const matchStart = match.index;

    // bold 이전 텍스트는 일반 파싱
    if (matchStart > lastIndex) {
      const before = text.slice(lastIndex, matchStart);
      segments.push(...parseInner(before, lastIndex));
    }

    // bold 내부도 루비/링크/줄바꿈 파싱 ("[[" 두 글자만큼 원문 위치를 밀어준다)
    const innerSegments = parseInner(match[1], matchStart + 2);
    segments.push({
      type: "bold",
      content: match[1],
      innerSegments,
    });

    lastIndex = matchStart + match[0].length;
  }

  // 나머지 텍스트
  if (lastIndex < text.length) {
    segments.push(...parseInner(text.slice(lastIndex), lastIndex));
  }

  return segments;
}

// 주석 본문에 쓸 수 없는 문자 정리
// "{" "}" 는 마크업 경계라서 넣으면 파싱이 깨진다.
export function sanitizeNote(note: string): string {
  return note.replace(/[{}]/g, "").trim();
}

// 루비 세그먼트의 주석을 새 값으로 바꾼 명언 원문을 만든다.
// note 가 빈 문자열이면 주석을 지운다.
export function withNote(text: string, seg: RubySegment, note: string): string {
  if (seg.braceStart === undefined || seg.braceEnd === undefined) return text;
  const clean = sanitizeNote(note);
  const inner = clean ? `${seg.rubyRaw ?? ""}^${clean}` : (seg.rubyRaw ?? "");
  return text.slice(0, seg.braceStart) + `{${inner}}` + text.slice(seg.braceEnd);
}

// =============================================
// 수정 중에 보이는 원문 색칠하기
//
// 읽을 때는 마크업이 사라지지만, 고칠 때는 원문이 그대로 보인다.
// 이때도 루비·굵게·링크가 읽을 때와 같은 색으로 보이도록 글자를 조각낸다.
// 조각을 순서대로 이으면 원문과 정확히 같아야 한다 (한 글자도 빠지면 커서가 어긋난다).
// =============================================

export type SourceTokenKind =
  | "plain"  // 본문
  | "base"   // 루비가 붙는 낱말
  | "ruby"   // { } 안의 루비
  | "note"   // { } 안에서 ^ 뒤의 주석
  | "bold"   // [[ ]] 로 감싼 부분
  | "link";  // http(s) 주소

export interface SourceToken {
  text: string;
  kind: SourceTokenKind;
}

function pushToken(tokens: SourceToken[], text: string, kind: SourceTokenKind): void {
  if (!text) return;
  const last = tokens[tokens.length - 1];
  // 같은 색끼리는 붙여서 조각 수를 줄인다
  if (last && last.kind === kind) last.text += text;
  else tokens.push({ text, kind });
}

// 굵게 구간 안팎을 같은 규칙으로 훑는다.
// 굵게 구간 안에서는 본문과 루비 베이스가 모두 굵게 색을 쓴다 (읽기 화면과 같다).
function tokenizeInner(text: string, plain: SourceTokenKind, tokens: SourceToken[]): void {
  const pattern = /\{([^}]+)\}|(https?:\/\/[^\s]+)/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);

    if (match[0].startsWith("http")) {
      pushToken(tokens, before, plain);
      pushToken(tokens, match[0], "link");
      lastIndex = match.index + match[0].length;
      continue;
    }

    // "{" 바로 앞에 붙어 있는 낱말이 루비가 얹히는 글자다
    const wordMatch = before.match(/(\S+)$/);
    const word = wordMatch ? wordMatch[1] : "";
    pushToken(tokens, word ? before.slice(0, before.length - word.length) : before, plain);
    pushToken(tokens, word, plain === "bold" ? "bold" : "base");

    const inner = match[1];
    const caret = inner.indexOf("^");
    if (caret === -1) {
      pushToken(tokens, match[0], "ruby");
    } else {
      pushToken(tokens, `{${inner.slice(0, caret)}`, "ruby");
      pushToken(tokens, `${inner.slice(caret)}}`, "note");
    }

    lastIndex = match.index + match[0].length;
  }

  pushToken(tokens, text.slice(lastIndex), plain);
}

export function highlightSource(text: string): SourceToken[] {
  const tokens: SourceToken[] = [];
  const boldPattern = /\[\[([^\]]+)\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = boldPattern.exec(text)) !== null) {
    tokenizeInner(text.slice(lastIndex, match.index), "plain", tokens);
    pushToken(tokens, "[[", "bold");
    tokenizeInner(match[1], "bold", tokens);
    pushToken(tokens, "]]", "bold");
    lastIndex = match.index + match[0].length;
  }
  tokenizeInner(text.slice(lastIndex), "plain", tokens);

  return tokens;
}
