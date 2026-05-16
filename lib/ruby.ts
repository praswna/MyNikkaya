import { RubySegment } from "./types";

/**
 * 텍스트에서 루비 마크업과 줄바꿈을 파싱합니다.
 * 형식: 단어{한자,영어,번역} → <ruby>단어<rt>...</rt></ruby>
 * \n → <br>
 */
export function parseRubyText(text: string): RubySegment[] {
  const segments: RubySegment[] = [];
  const pattern = /(\S+)\{([^}]+)\}|\n/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const matchStart = match.index;

    // 줄바꿈 처리
    if (match[0] === "\n") {
      const pureText = text.slice(lastIndex, matchStart);
      if (pureText.length > 0) {
        segments.push({ type: "text", content: pureText });
      }
      segments.push({ type: "newline", content: "\n" });
      lastIndex = matchStart + 1;
      continue;
    }

    const word = match[1];
    const rubyContent = match[2];

    // 매치 이전 순수 텍스트 (word 제외)
    const pureText = text.slice(lastIndex, matchStart - word.length);
    if (pureText.length > 0) {
      segments.push({ type: "text", content: pureText });
    }

    // 루비 세그먼트
    const rubyParts = rubyContent.split(",").map((s) => s.trim()).filter(Boolean);
    segments.push({
      type: "ruby",
      content: word,
      ruby: rubyParts,
    });

    lastIndex = matchStart + match[0].length;
  }

  // 나머지 텍스트
  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
}
