import { RubySegment } from "./types";

// =============================================
// 루비/굵게/링크 마크업 파서
// =============================================
// 지원 문법:
//   루비:   단어{한자,영어,번역}  → 단어 위에 작은 글씨
//   굵게:   [[텍스트]]            → 굵게 + 강조색 (textBold)
//   링크:   https://...           → 자동 하이퍼링크 (40% 크기)
//   줄바꿈: CSV 셀 안에서 엔터    → <br>

function parseInner(text: string): RubySegment[] {
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

    const topPart = match[1].split("^")[0];
    const rubyParts = topPart.split(",").map((s) => s.trim()).filter(Boolean);
    segments.push({ type: "ruby", content: word, ruby: rubyParts });

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
      segments.push(...parseInner(before));
    }

    // bold 내부도 루비/링크/줄바꿈 파싱
    const innerSegments = parseInner(match[1]);
    segments.push({
      type: "bold",
      content: match[1],
      innerSegments,
    });

    lastIndex = matchStart + match[0].length;
  }

  // 나머지 텍스트
  if (lastIndex < text.length) {
    segments.push(...parseInner(text.slice(lastIndex)));
  }

  return segments;
}
