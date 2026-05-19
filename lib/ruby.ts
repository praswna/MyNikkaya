import { RubySegment } from "./types";

/**
 * 텍스트에서 루비 마크업, 줄바꿈, URL을 파싱합니다.
 * 형식: 단어{한자,영어,번역}
 * \n → <br>
 * https://... → <a href>
 */
export function parseRubyText(text: string): RubySegment[] {
  const segments: RubySegment[] = [];
  const pattern = /\{([^}]+)\}|\n|(https?:\/\/[^\s]+)/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const matchStart = match.index;

    // 줄바꿈
    if (match[0] === "\n") {
      const before = text.slice(lastIndex, matchStart);
      if (before.length > 0) segments.push({ type: "text", content: before });
      segments.push({ type: "newline", content: "\n" });
      lastIndex = matchStart + 1;
      continue;
    }

    // URL
    if (match[0].startsWith("http")) {
      const before = text.slice(lastIndex, matchStart);
      if (before.length > 0) segments.push({ type: "text", content: before });
      segments.push({ type: "link", content: match[0] });
      lastIndex = matchStart + match[0].length;
      continue;
    }

    // 루비 {} 처리
    const before = text.slice(lastIndex, matchStart);
    const wordMatch = before.match(/(\S+)$/);
    const word = wordMatch ? wordMatch[1] : "";
    const pureText = word ? before.slice(0, before.length - word.length) : before;
    if (pureText.length > 0) segments.push({ type: "text", content: pureText });

    const rubyParts = match[1].split(",").map((s) => s.trim()).filter(Boolean);
    segments.push({ type: "ruby", content: word, ruby: rubyParts });

    lastIndex = matchStart + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
}
