import { RubySegment } from "./types";

// =============================================
// 루비/굵게/링크 마크업 파서
// =============================================
// 지원 문법:
//   루비:   단어{한자,영어,번역}  → 단어 위에 작은 글씨
//   주석:   단어{한자^1}            → ^ 뒤는 각주 번호, 실제 주석은 글 끝 블록에
//          (옛 형식 단어{한자^설명} 도 그대로 읽는다)
//   굵게:   [[텍스트]]            → 굵게 + 강조색 (textBold)
//   링크:   https://...           → 자동 하이퍼링크 (40% 크기)
//   줄바꿈: CSV 셀 안에서 엔터    → <br>

// =============================================
// 주석은 글 끝 각주 블록에 모아 둔다
//
//   비여리작의{ayoniso manasikāra,非如理作意^1}로 인해 번뇌가 생겨나고
//
//   --주석--
//   ^1 비여리작의(ayoniso manasikāra)는 이치에 맞지 않는 …
//
// 주석이 길어도 본문 흐름이 끊기지 않는다.
// 번호는 앱이 매기므로 손으로 적을 일이 없다.
// =============================================

export const NOTE_BLOCK_MARK = "--주석--";

export interface SplitNotes {
  body: string;               // 각주 블록을 뺀 본문 (표시용, 원문의 앞부분 그대로)
  notes: Map<string, string>; // 각주 번호 → 주석 본문
  blockStart: number;         // 각주 블록이 시작하는 원문 위치 (없으면 -1)
}

export function splitNoteBlock(text: string): SplitNotes {
  const at = text.lastIndexOf(`\n${NOTE_BLOCK_MARK}`);
  if (at === -1) return { body: text, notes: new Map(), blockStart: -1 };

  // 블록 안에서 "^번호" 로 시작하는 줄마다 주석 하나
  const notes = new Map<string, string>();
  const area = text.slice(at + 1 + NOTE_BLOCK_MARK.length);
  const marks = [...area.matchAll(/^\^(\d+)[ \t]?/gm)];
  marks.forEach((mark, i) => {
    const from = (mark.index ?? 0) + mark[0].length;
    const to = i + 1 < marks.length ? (marks[i + 1].index ?? area.length) : area.length;
    notes.set(mark[1], area.slice(from, to).trim());
  });

  return { body: text.slice(0, at).trimEnd(), notes, blockStart: at };
}

// offset: 이 조각이 원문 전체에서 시작하는 위치 (주석 추가/수정 시 원문을 되짚기 위함)
// notes: 각주 번호를 실제 주석으로 바꿔 넣기 위한 표
function parseInner(text: string, offset: number, notes?: Map<string, string>): RubySegment[] {
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

    // "^" 를 기준으로 앞은 루비(위첨자), 뒤는 각주 번호(옛 형식이면 주석 본문)
    const caretIndex = match[1].indexOf("^");
    const topPart = caretIndex === -1 ? match[1] : match[1].slice(0, caretIndex);
    const ref = caretIndex === -1 ? "" : match[1].slice(caretIndex + 1).trim();
    const notePart = /^\d+$/.test(ref) ? (notes?.get(ref) ?? "") : ref;
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

export function parseRubyText(text: string, notes?: Map<string, string>): RubySegment[] {
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
      segments.push(...parseInner(before, lastIndex, notes));
    }

    // bold 내부도 루비/링크/줄바꿈 파싱 ("[[" 두 글자만큼 원문 위치를 밀어준다)
    const innerSegments = parseInner(match[1], matchStart + 2, notes);
    segments.push({
      type: "bold",
      content: match[1],
      innerSegments,
    });

    lastIndex = matchStart + match[0].length;
  }

  // 나머지 텍스트
  if (lastIndex < text.length) {
    segments.push(...parseInner(text.slice(lastIndex), lastIndex, notes));
  }

  return segments;
}

// 주석은 이제 중괄호 밖(각주 블록)에 있으므로 "{" "}" 도 마음껏 쓸 수 있다.
// 다만 블록 구분선과 "^번호"로 시작하는 줄은 블록을 깨뜨리므로 비켜 놓는다.
export function sanitizeNote(note: string): string {
  return note
    .split("\n")
    .filter((line) => line.trim() !== NOTE_BLOCK_MARK)
    .map((line) => (/^\^\d/.test(line) ? ` ${line}` : line))
    .join("\n")
    .trim();
}

// 새로 넣는 주석을 가리키는 임시 표식 (번호와 겹치지 않는다)
const NEW_NOTE_REF = "새";

// 본문의 주석을 처음부터 훑어 번호를 1부터 다시 매기고 각주 블록을 새로 만든다.
// 옛 형식(중괄호 안에 주석이 그대로 들어간 것)도 이 과정에서 각주로 옮겨진다.
function rebuildNotes(body: string, notes: Map<string, string>, newNote: string): string {
  const entries: string[] = [];

  const nextBody = body.replace(/\{([^}]+)\}/g, (whole, inner: string) => {
    const caret = inner.indexOf("^");
    if (caret === -1) return whole;

    const ruby = inner.slice(0, caret);
    const ref = inner.slice(caret + 1).trim();
    const note = ref === NEW_NOTE_REF ? newNote : (/^\d+$/.test(ref) ? notes.get(ref) ?? "" : ref);

    if (!note) return ruby ? `{${ruby}}` : "";
    entries.push(note);
    return `{${ruby}^${entries.length}}`;
  });

  const trimmed = nextBody.trimEnd();
  if (entries.length === 0) return trimmed;

  const block = entries.map((note, i) => `^${i + 1} ${note}`).join("\n\n");
  return `${trimmed}\n\n${NOTE_BLOCK_MARK}\n${block}`;
}

// 루비 세그먼트의 주석을 새 값으로 바꾼 명언 원문을 만든다.
// note 가 빈 문자열이면 주석을 지운다. 번호는 이 안에서 다시 매겨진다.
export function withNote(text: string, seg: RubySegment, note: string): string {
  if (seg.braceStart === undefined || seg.braceEnd === undefined) return text;

  const { body, notes } = splitNoteBlock(text);
  const clean = sanitizeNote(note);
  const ruby = seg.rubyRaw ?? "";
  const inner = clean ? `${ruby}^${NEW_NOTE_REF}` : ruby;
  // 루비도 주석도 없으면 중괄호째 지운다 (안 그러면 본문에 "{}" 가 남는다)
  const nextBody = body.slice(0, seg.braceStart) + (inner ? `{${inner}}` : "") + body.slice(seg.braceEnd);

  return rebuildNotes(nextBody, notes, clean);
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
  // 각주 블록은 본문이 아니므로 통째로 옅게 (구분선 포함)
  const { blockStart } = splitNoteBlock(text);
  const body = blockStart === -1 ? text : text.slice(0, blockStart);

  const boldPattern = /\[\[([^\]]+)\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = boldPattern.exec(body)) !== null) {
    tokenizeInner(body.slice(lastIndex, match.index), "plain", tokens);
    pushToken(tokens, "[[", "bold");
    tokenizeInner(match[1], "bold", tokens);
    pushToken(tokens, "]]", "bold");
    lastIndex = match.index + match[0].length;
  }
  tokenizeInner(body.slice(lastIndex), "plain", tokens);

  if (blockStart !== -1) pushToken(tokens, text.slice(blockStart), "note");

  return tokens;
}
