// 기존 저장값을 읽기 위한 원래 색상. 앱에는 모드 전환이 없다.

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
    // Gruvbox(레트로 그루브) 배색을 바탕으로 한 기본 팔레트 (본문 대비 약 11:1, WCAG AAA)
    bg: "#2E2B28",              // 메인 배경색
    bgSecondary: "#3A3630",     // 카드/팝업 배경색
    border: "#3A3630",          // 테두리 색상
    text: "#90887A",            // 본문 텍스트 색상 (평문 - 대화보다 한 걸음 뒤)
    textMuted: "#B8A898",       // 보조 텍스트 (카테고리, 안내문 등)
    textEmphasis: "#D9C496",    // 루비 베이스 강조 색상 - 빨강 (제목·부분강조·대화·말씀과 다른 계열)
    textBold: "#FFDA8A",        // [[ ]] 제목 색상 - 노랑
    textAccent: "#39C684",      // [ ] 부분강조 색상 - 초록 계열
    categorySelected: "#7A6E62", // 선택된 카테고리 배경색
    categorySelectedText: "#F0D080", // 선택된 카테고리 텍스트 색상
    categoryBorder: "#4A4438",  // 카테고리 테두리 색상
    categoryText: "#B8A898",    // 카테고리 텍스트 색상
    categoryParentText: "#CEA44B", // 상위 카테고리(아래층이 있는 것) 글자 색상
    buttonPrimary: "#3A3630",   // 하단 버튼 배경색
    buttonIcon: "#B8A898",      // 하단 버튼 아이콘 + 스플래시 마크 색상
    rubyText: "#B8A898",        // 루비 텍스트(위첨자) 색상
    scrollThumb: "#4A4438",     // 스크롤바 색상
    talkBg: "#353230",          // 대화 판 바탕 (> < )
    talkText: "#AFA290",        // 대화 글자색 - 평문과 같게 둔다 (기본 배색에서 대화는 판 바탕으로만 구분)
    sayBg: "#3B362F",           // 말씀 판 바탕 (>> <<)
    sayText: "#D2C6AD",         // 말씀 강조 글자색 - 대화와 같은 청록 계열, 한 단계 밝게
  },
  light: {
    bg: "#E5DED4",              // 메인 배경색
    bgSecondary: "#D8D0C4",     // 카드/팝업 배경색
    border: "#C8BEB0",          // 테두리 색상
    text: "#6E5C48",            // 본문 텍스트 색상 (평문 - 대화와 같은 색)
    textMuted: "#7A6248",       // 보조 텍스트
    textEmphasis: "#7B5B3A",    // 루비 베이스 강조 색상 - 초록 (제목·부분강조·대화·말씀과 다른 계열)
    textBold: "#8B6914",        // [[ ]] 굵게 강조 색상
    textAccent: "#876A22",      // [ ] 부분강조 색상 - 제목과 같은 계열, 한 단계 옅게
    categorySelected: "#9B8B7E", // 선택된 카테고리 배경색
    categorySelectedText: "#FFD700", // 선택된 카테고리 텍스트 색상
    categoryBorder: "#C4A882",  // 카테고리 테두리 색상
    categoryText: "#7A6248",    // 카테고리 텍스트 색상
    categoryParentText: "#8B6914", // 상위 카테고리(아래층이 있는 것) 글자 색상
    buttonPrimary: "#D8D0C4",   // 하단 버튼 배경색
    buttonIcon: "#5C4A32",      // 하단 버튼 아이콘 + 스플래시 마크 색상
    rubyText: "#7A6248",        // 루비 텍스트(위첨자) 색상
    scrollThumb: "#C4A882",     // 스크롤바 색상
    talkBg: "#DED7CE",          // 대화 판 바탕 (> < )
    talkText: "#6E5C48",        // 대화 글자색 - 청록 계열(제목·부분강조·루비와 다른 계열), 말씀보다 옅게
    sayBg: "#E0D7C8",           // 강조 판 바탕 (>> <<) - 금빛 판
    sayText: "#3A2600",         // 강조 글자색 - 대화와 같은 청록 계열, 한 단계 짙게
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
  textAccent: string;
  categorySelected: string;
  categorySelectedText: string;
  categoryBorder: string;
  categoryText: string;
  categoryParentText: string;
  buttonPrimary: string;
  buttonIcon: string;
  rubyText: string;
  scrollThumb: string;
  talkBg: string;
  talkText: string;
  sayBg: string;
  sayText: string;
};
