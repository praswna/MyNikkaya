import { RubySegment } from "./types";

/**
 * 루비 마크업, 줄바꿈, URL을 파싱합니다.
 * - 단어{윗루비1,윗루비2} → <ruby>
 * - 단어{윗루비^아랫루비} → 위아래 둘 다
 * - \n → <br>
 * - https://... → <a>
 */
export function parseRubyText(text: string): RubySegment[] {
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

    // {윗루비^아랫루비} 분리
    const fullContent = match[1];
    const [topPart, bottomPart] = fullContent.split("^");
    const topRuby = topPart.split(",").map((s) => s.trim()).filter(Boolean);
    const bottomRuby = bottomPart
      ? bottomPart.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    segments.push({
      type: "ruby",
      content: word,
      ruby: topRuby,
      rubyBelow: bottomRuby,
    });

    lastIndex = matchStart + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
}
