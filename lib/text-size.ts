// =============================================
// 텍스트 길이에 따른 폰트 크기 자동 조절
// =============================================
// 명언 글자 수에 따라 폰트 크기와 줄간격을 자동으로 조절합니다.
// 아래 수치를 수정해서 글자 크기를 조정할 수 있어요.

export function getTextMetrics(text: string): { fontSize: number; lineHeight: string } {
  const len = text.length;

  // 글자 수 기준 폰트 크기 (단위: px)
  // 숫자가 클수록 글자가 커짐
  if (len < 50)  return { fontSize: 28, lineHeight: "1.9" }; // 짧은 명언
  if (len < 100) return { fontSize: 24, lineHeight: "1.9" }; // 중간 명언
  if (len < 200) return { fontSize: 22, lineHeight: "2.0" }; // 긴 명언
  if (len < 400) return { fontSize: 20, lineHeight: "2.1" }; // 매우 긴 명언
  return           { fontSize: 18, lineHeight: "2.2" };       // 초장문 명언
}
