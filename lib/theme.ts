export type Theme = "dark" | "light";

// =============================================
// 테마 색상 설정
// 색상을 바꾸고 싶으면 아래 hex 값을 수정하세요
//
// 값은 모두 #RRGGBB 여야 한다. 설정 > 색 조절 이 색 선택기로 이 값들을
// 덮어쓰는데, 색 선택기는 반투명(rgba)을 다루지 못한다.
// 판 바탕도 반투명 대신 바탕색과 섞은 결과를 그대로 적어 둔다.
// =============================================
export const THEMES = {
  dark: {
    bg: "#2E2B28",              // 메인 배경색
    bgSecondary: "#3A3630",     // 카드/팝업 배경색
    border: "#3A3630",          // 테두리 색상
    text: "#AFA290",            // 본문 텍스트 색상 (평문 - 대화와 같은 색)
    textMuted: "#B8A898",       // 보조 텍스트 (카테고리, 안내문 등)
    textEmphasis: "#D4B896",    // 루비 베이스 강조 색상
    textBold: "#E5C88A",        // [[ ]] 굵게 강조 색상
    categorySelected: "#7A6E62", // 선택된 카테고리 배경색
    categorySelectedText: "#F0D080", // 선택된 카테고리 텍스트 색상
    categoryBorder: "#4A4438",  // 카테고리 테두리 색상
    categoryText: "#B8A898",    // 카테고리 텍스트 색상
    buttonPrimary: "#3A3630",   // 하단 버튼 배경색
    buttonIcon: "#B8A898",      // 하단 버튼 아이콘 + 스플래시 법륜 색상
    rubyText: "#B8A898",        // 루비 텍스트(위첨자) 색상
    scrollThumb: "#4A4438",     // 스크롤바 색상
    talkBg: "#353230",          // 대화 판 바탕 (> < )
    talkText: "#AFA290",                 // 대화 글자색 (평문과 같은 색)
    sayBg: "#3B362F",           // 부처님 말씀 판 바탕 (>> <<)
    sayText: "#FFE6AE",                  // 말씀 글자색 (채도를 올려 앞으로)
  },
  light: {
    bg: "#E5DED4",              // 메인 배경색
    bgSecondary: "#D8D0C4",     // 카드/팝업 배경색
    border: "#C8BEB0",          // 테두리 색상
    text: "#6E5C48",            // 본문 텍스트 색상 (평문 - 대화와 같은 색)
    textMuted: "#7A6248",       // 보조 텍스트
    textEmphasis: "#7B5B3A",    // 루비 베이스 강조 색상
    textBold: "#8B6914",        // [[ ]] 굵게 강조 색상
    categorySelected: "#9B8B7E", // 선택된 카테고리 배경색
    categorySelectedText: "#FFD700", // 선택된 카테고리 텍스트 색상
    categoryBorder: "#C4A882",  // 카테고리 테두리 색상
    categoryText: "#7A6248",    // 카테고리 텍스트 색상
    buttonPrimary: "#D8D0C4",   // 하단 버튼 배경색
    buttonIcon: "#5C4A32",      // 하단 버튼 아이콘 + 스플래시 법륜 색상
    rubyText: "#7A6248",        // 루비 텍스트(위첨자) 색상
    scrollThumb: "#C4A882",     // 스크롤바 색상
    talkBg: "#DED7CE",          // 대화 판 바탕 (> < )
    talkText: "#6E5C48",                 // 대화 글자색 (평문과 같은 색)
    sayBg: "#E0D7C8",           // 부처님 말씀 판 바탕 (>> <<)
    sayText: "#3A2600",                  // 말씀 글자색 (짙은 금갈색 - 채도를 올려 앞으로)
  },
} as const;

export type ThemeColors = {
  bg: string;
  bgSecondary: string;
  border: string;
  text: string;
  textMuted: string;
  textEmphasis: string;
  textBold: string;
  categorySelected: string;
  categorySelectedText: string;
  categoryBorder: string;
  categoryText: string;
  buttonPrimary: string;
  buttonIcon: string;
  rubyText: string;
  scrollThumb: string;
  talkBg: string;
  talkText: string;
  sayBg: string;
  sayText: string;
};
