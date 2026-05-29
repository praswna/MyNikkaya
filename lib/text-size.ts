export interface TextMetrics {
  fontSize: number;
  lineHeight: string;
}

export function getTextMetrics(text: string): TextMetrics {
  const len = Array.from(text.trim()).length;

  if (len > 400) return { fontSize: 12, lineHeight: "1.6" };
  if (len > 320) return { fontSize: 13, lineHeight: "1.6" };
  if (len > 240) return { fontSize: 14, lineHeight: "1.7" };
  if (len > 180) return { fontSize: 16, lineHeight: "1.7" };
  if (len > 140) return { fontSize: 18, lineHeight: "1.8" };
  if (len > 80)  return { fontSize: 20, lineHeight: "1.8" };
  if (len > 40)  return { fontSize: 22, lineHeight: "1.9" };
  return { fontSize: 24, lineHeight: "1.9" };
}
