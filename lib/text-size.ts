import { splitNoteBlock } from "./ruby";

export interface TextMetrics {
  fontSize: number;
  lineHeight: string;
}

// 화면에 흐르지 않는 것은 글자 크기 계산에서 뺀다
// (글 끝 각주 블록, 옛 형식의 중괄호 안 주석, 말씀·대화 표시)
function withoutNotes(text: string): string {
  return splitNoteBlock(text).body
    .replace(/\{([^}]*)\}/g, (whole, inner: string) => {
      const caret = inner.indexOf("^");
      return caret === -1 ? whole : `{${inner.slice(0, caret)}}`;
    })
    .replace(/[<>]/g, "");
}

export function getTextMetrics(text: string): TextMetrics {
  const len = Array.from(withoutNotes(text).trim()).length;

  if (len > 400) return { fontSize: 12, lineHeight: "1.6" };
  if (len > 320) return { fontSize: 13, lineHeight: "1.6" };
  if (len > 240) return { fontSize: 14, lineHeight: "1.7" };
  if (len > 180) return { fontSize: 16, lineHeight: "1.7" };
  if (len > 140) return { fontSize: 18, lineHeight: "1.8" };
  if (len > 80)  return { fontSize: 20, lineHeight: "1.8" };
  if (len > 40)  return { fontSize: 22, lineHeight: "1.9" };
  return { fontSize: 24, lineHeight: "1.9" };
}
