import { RubySegment } from "./types";

/**
 * 텍스트에서 루비 마크업과 줄바꿈을 파싱합니다.
 * 형식: 단어{한자,영어,번역}
 * \n → <br>
 */
export function parseRubyText(text: string): RubySegment[] {
  const segments: RubySegment[] = [];
  // {내용} 또는 \n 만 매칭 — 앞 단어는 별도로 처리
  const pattern = /\{([^}]+)\}|\n/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const matchStart = match.index;

    // 줄바꿈 처리
    if (match[0] === "\n") {
      const before = text.slice(lastIndex, matchStart);
      if (before.length > 0) segments.push({ type: "text", content: before });
      segments.push({ type: "newline", content: "\n" });
      lastIndex = matchStart + 1;
      continue;
    }

    // {} 앞 텍스트에서 마지막 단어(공백 없는 연속 문자) 추출
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
