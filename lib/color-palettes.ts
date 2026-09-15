import { type ThemeColors } from "./theme";

export interface ColorPalette {
  id: string;
  name: string;
  family: string;
  colors: ThemeColors;
}

// 공개 팔레트의 고유 바탕·글자·포인트 색을 독서용으로 조정한다.
// 출처와 원본/변형 구분: docs/color-palette-sources.md
// [id, 이름, 계열, 바탕, 팝업, 본문, 포인트] — 색상환/명도 반복 생성 없음.
const PALETTE_SEEDS = [
  ["paper", "백지와 잉크", "reader", "#F8F7F3", "#EFEEE8", "#474747", "#3C6681"],
  ["cream", "크림 종이", "reader", "#F6EEDB", "#ECE1C8", "#62523F", "#89633B"],
  ["ivory", "아이보리 책장", "reader", "#EFEBDD", "#E3DECE", "#55544B", "#5D7057"],
  ["sepia", "세피아 서재", "reader", "#E9D8B8", "#DDCAA5", "#5C4932", "#765C35"],
  ["parchment", "오래된 양피지", "reader", "#D8C7A5", "#CBBA99", "#504739", "#66563B"],
  ["stone", "스톤 그레이", "reader", "#E2E3E1", "#D5D7D4", "#4D5555", "#496773"],
  ["mist", "안개 블루", "reader", "#E8EFF2", "#DAE4EA", "#485967", "#426E87"],
  ["mint", "연한 녹차", "reader", "#E9EFDF", "#DDE5CF", "#4C5D46", "#5D754C"],
  ["blush", "로즈 페이퍼", "reader", "#F2E6E4", "#E6D6D5", "#655153", "#8B5965"],
  ["graphite", "그래파이트", "reader", "#303234", "#3B3D3F", "#B9BABB", "#C5B697"],
  ["coffee", "커피빛 밤", "reader", "#352D28", "#423830", "#C3B49F", "#D4AD80"],
  ["quiet", "고요한 밤", "reader", "#222528", "#2D3135", "#B3B9BE", "#93AFB5"],
  ["solar-paper", "솔라라이즈드 종이", "solarized", "#FDF6E3", "#EEE8D5", "#657B83", "#268BD2"],
  ["solar-sand", "솔라라이즈드 모래", "solarized", "#EEE8D5", "#E3DDCA", "#586E75", "#859900"],
  ["solar-night", "솔라라이즈드 밤", "solarized", "#002B36", "#073642", "#839496", "#2AA198"],
  ["solar-dusk", "솔라라이즈드 황혼", "solarized", "#073642", "#12424A", "#93A1A1", "#B58900"],
  ["cat-latte", "캣푸치노 라테", "catppuccin", "#EFF1F5", "#E6E9EF", "#4C4F69", "#8839EF"],
  ["cat-frappe", "캣푸치노 프라페", "catppuccin", "#303446", "#292C3C", "#C6D0F5", "#A6D189"],
  ["cat-macchiato", "캣푸치노 마키아토", "catppuccin", "#24273A", "#1E2030", "#CAD3F5", "#F5A97F"],
  ["cat-mocha", "캣푸치노 모카", "catppuccin", "#1E1E2E", "#181825", "#CDD6F4", "#89B4FA"],
  ["ever-paper", "에버포레스트 밝은 종이", "everforest", "#FFFBEF", "#F8F5E4", "#5C6A72", "#8DA101"],
  ["ever-cream", "에버포레스트 크림", "everforest", "#FDF6E3", "#F4F0D9", "#5C6A72", "#3A94C5"],
  ["ever-soft", "에버포레스트 밀짚", "everforest", "#F3EAD3", "#EAE4CA", "#5C6A72", "#35A77C"],
  ["ever-deep", "에버포레스트 깊은 숲", "everforest", "#272E33", "#2E383C", "#D3C6AA", "#A7C080"],
  ["ever-night", "에버포레스트 숲의 밤", "everforest", "#2D353B", "#343F44", "#D3C6AA", "#DBBC7F"],
  ["ever-fog", "에버포레스트 안개 숲", "everforest", "#333C43", "#3A464C", "#D3C6AA", "#7FBBB3"],
  ["rose-dawn", "로제 파인 새벽", "rose-pine", "#FAF4ED", "#F2E9E1", "#464261", "#286983"],
  ["rose-main", "로제 파인 밤", "rose-pine", "#191724", "#1F1D2E", "#E0DEF4", "#EBBCBA"],
  ["rose-moon", "로제 파인 달빛", "rose-pine", "#232136", "#2A273F", "#E0DEF4", "#C4A7E7"],
  ["nord-snow", "노르드 설원", "nord", "#ECEFF4", "#E5E9F0", "#4C566A", "#5E81AC"],
  ["nord-frost", "노르드 서리", "nord", "#D8DEE9", "#E5E9F0", "#434C5E", "#5E81AC"],
  ["nord-night", "노르드 극야", "nord", "#2E3440", "#3B4252", "#D8DEE9", "#88C0D0"],
  ["linen-a", "리넨", "paper", "#F4F0E6", "#E8E2D5", "#57534B", "#796147"],
  ["linen-b", "리넨 · 다른 잉크", "paper", "#F4F0E6", "#E8E2D5", "#57534B", "#526C78"],
  ["oat-a", "오트밀", "paper", "#E8DFC9", "#DCD0B8", "#5B5140", "#7B5F37"],
  ["oat-b", "오트밀 · 다른 잉크", "paper", "#E8DFC9", "#DCD0B8", "#5B5140", "#5A6D49"],
  ["rice-a", "한지", "paper", "#F0EAD8", "#E1DAC6", "#595747", "#677146"],
  ["rice-b", "한지 · 다른 잉크", "paper", "#F0EAD8", "#E1DAC6", "#595747", "#7C604E"],
  ["wheat-a", "밀빛 책장", "paper", "#E5D1AD", "#D6C39F", "#534632", "#7A5639"],
  ["wheat-b", "밀빛 책장 · 다른 잉크", "paper", "#E5D1AD", "#D6C39F", "#534632", "#566749"],
  ["sandstone-a", "사암", "paper", "#D9CBB6", "#CCBDA5", "#504A40", "#735B45"],
  ["sandstone-b", "사암 · 다른 잉크", "paper", "#D9CBB6", "#CCBDA5", "#504A40", "#53666B"],
  ["almond-a", "아몬드", "paper", "#F0E3D3", "#E4D5C2", "#665449", "#866154"],
  ["almond-b", "아몬드 · 다른 잉크", "paper", "#F0E3D3", "#E4D5C2", "#665449", "#6A6746"],
  ["vanilla-a", "바닐라", "paper", "#F9F0D5", "#ECE1C3", "#625B44", "#866B35"],
  ["vanilla-b", "바닐라 · 다른 잉크", "paper", "#F9F0D5", "#ECE1C3", "#625B44", "#5C766D"],
  ["biscuit-a", "비스킷", "paper", "#DBC4A6", "#CEB695", "#524438", "#77513D"],
  ["biscuit-b", "비스킷 · 다른 잉크", "paper", "#DBC4A6", "#CEB695", "#524438", "#54634D"],
  ["fog-a", "안개 종이", "cool-paper", "#E6E9EB", "#D8DEE1", "#515B63", "#466D86"],
  ["fog-b", "안개 종이 · 다른 잉크", "cool-paper", "#E6E9EB", "#D8DEE1", "#515B63", "#765D77"],
  ["porcelain-a", "백자", "cool-paper", "#F1F4F0", "#E2E8E1", "#505A54", "#3F7066"],
  ["porcelain-b", "백자 · 다른 잉크", "cool-paper", "#F1F4F0", "#E2E8E1", "#505A54", "#78634A"],
  ["chalk-a", "분필 종이", "cool-paper", "#E8E6E1", "#DBD8D1", "#54534F", "#686B80"],
  ["chalk-b", "분필 종이 · 다른 잉크", "cool-paper", "#E8E6E1", "#DBD8D1", "#54534F", "#7D5B53"],
  ["silver-a", "실버 그레이", "cool-paper", "#D6DADD", "#C8CDD1", "#48515A", "#416A81"],
  ["silver-b", "실버 그레이 · 다른 잉크", "cool-paper", "#D6DADD", "#C8CDD1", "#48515A", "#785768"],
  ["glacier-a", "빙하", "cool-paper", "#DDE9ED", "#CDDBE0", "#465A62", "#376D7A"],
  ["glacier-b", "빙하 · 다른 잉크", "cool-paper", "#DDE9ED", "#CDDBE0", "#465A62", "#6A667D"],
  ["lavender-paper-a", "라벤더 종이", "pastel", "#EEE9F2", "#E0D9E8", "#5B5367", "#74568D"],
  ["lavender-paper-b", "라벤더 종이 · 다른 잉크", "pastel", "#EEE9F2", "#E0D9E8", "#5B5367", "#486D78"],
  ["lilac-paper-a", "라일락", "pastel", "#E5DEEA", "#D7CDDD", "#574C61", "#7A527D"],
  ["lilac-paper-b", "라일락 · 다른 잉크", "pastel", "#E5DEEA", "#D7CDDD", "#574C61", "#526C69"],
  ["peach-paper-a", "복숭아 종이", "pastel", "#F3E1D5", "#E6D2C4", "#655044", "#8E5D48"],
  ["peach-paper-b", "복숭아 종이 · 다른 잉크", "pastel", "#F3E1D5", "#E6D2C4", "#655044", "#657047"],
  ["sakura-a", "벚꽃 종이", "pastel", "#F0E0E2", "#E1CFD2", "#654D55", "#905569"],
  ["sakura-b", "벚꽃 종이 · 다른 잉크", "pastel", "#F0E0E2", "#E1CFD2", "#654D55", "#666E4D"],
  ["pistachio-a", "피스타치오", "garden", "#E5E9D4", "#D7DEC2", "#535B43", "#5B7142"],
  ["pistachio-b", "피스타치오 · 다른 잉크", "garden", "#E5E9D4", "#D7DEC2", "#535B43", "#87653D"],
  ["sage-paper-a", "세이지 종이", "garden", "#DCE5DA", "#CDD9CA", "#495949", "#466D56"],
  ["sage-paper-b", "세이지 종이 · 다른 잉크", "garden", "#DCE5DA", "#CDD9CA", "#495949", "#736347"],
  ["eucalyptus-a", "유칼립투스", "garden", "#DAE7E2", "#CADAD3", "#475B53", "#376D64"],
  ["eucalyptus-b", "유칼립투스 · 다른 잉크", "garden", "#DAE7E2", "#CADAD3", "#475B53", "#6E6478"],
  ["bamboo-a", "대나무 종이", "garden", "#D5DFC8", "#C5D2B9", "#49543E", "#5C7045"],
  ["bamboo-b", "대나무 종이 · 다른 잉크", "garden", "#D5DFC8", "#C5D2B9", "#49543E", "#7F5E42"],
  ["moss-night-a", "이끼의 밤", "forest-night", "#2B332C", "#374137", "#B9C3AF", "#AEC18E"],
  ["moss-night-b", "이끼의 밤 · 다른 잉크", "forest-night", "#2B332C", "#374137", "#B9C3AF", "#D0B68A"],
  ["pine-night-a", "소나무 그늘", "forest-night", "#22332E", "#2D423A", "#B1C3B7", "#8DBDA4"],
  ["pine-night-b", "소나무 그늘 · 다른 잉크", "forest-night", "#22332E", "#2D423A", "#B1C3B7", "#CBBB8C"],
  ["jade-night-a", "옥빛 밤", "forest-night", "#263B37", "#304A44", "#B5CBC0", "#8FC7B9"],
  ["jade-night-b", "옥빛 밤 · 다른 잉크", "forest-night", "#263B37", "#304A44", "#B5CBC0", "#C5C797"],
  ["ink-blue-a", "남빛 잉크", "blue-night", "#242F40", "#2D3C4E", "#B5C1D0", "#94B8D5"],
  ["ink-blue-b", "남빛 잉크 · 다른 잉크", "blue-night", "#242F40", "#2D3C4E", "#B5C1D0", "#C6AFD5"],
  ["harbor-a", "항구의 밤", "blue-night", "#243740", "#30464E", "#AEC6CD", "#87BEC8"],
  ["harbor-b", "항구의 밤 · 다른 잉크", "blue-night", "#243740", "#30464E", "#AEC6CD", "#D1B18C"],
  ["rain-a", "비 오는 저녁", "blue-night", "#343D47", "#414B56", "#C0C8D0", "#9DBBD0"],
  ["rain-b", "비 오는 저녁 · 다른 잉크", "blue-night", "#343D47", "#414B56", "#C0C8D0", "#C4B39D"],
  ["indigo-night-a", "인디고 밤", "violet-night", "#292D43", "#363B54", "#BAC0D7", "#AAAADD"],
  ["indigo-night-b", "인디고 밤 · 다른 잉크", "violet-night", "#292D43", "#363B54", "#BAC0D7", "#D3AFB7"],
  ["aubergine-a", "가지빛 밤", "violet-night", "#342C3B", "#44374C", "#C7B8CE", "#C3A4D5"],
  ["aubergine-b", "가지빛 밤 · 다른 잉크", "violet-night", "#342C3B", "#44374C", "#C7B8CE", "#D0B796"],
  ["dusk-rose-a", "장밋빛 황혼", "violet-night", "#3D2E35", "#4B3A43", "#CEBAC1", "#D1A2B2"],
  ["dusk-rose-b", "장밋빛 황혼 · 다른 잉크", "violet-night", "#3D2E35", "#4B3A43", "#CEBAC1", "#B7BFA0"],
  ["cocoa-a", "코코아 밤", "warm-night", "#322922", "#42362C", "#C5B5A0", "#D1AE80"],
  ["cocoa-b", "코코아 밤 · 다른 잉크", "warm-night", "#322922", "#42362C", "#C5B5A0", "#ABC0A3"],
  ["cedar-a", "삼나무 서재", "warm-night", "#3C342C", "#4B4137", "#C9BCA8", "#D6B789"],
  ["cedar-b", "삼나무 서재 · 다른 잉크", "warm-night", "#3C342C", "#4B4137", "#C9BCA8", "#B3C5B2"],
  ["charcoal-a", "목탄", "neutral-night", "#282A2A", "#353838", "#BDBFBB", "#ADC3BA"],
  ["charcoal-b", "목탄 · 다른 잉크", "neutral-night", "#282A2A", "#353838", "#BDBFBB", "#CBBB9F"],
  ["slate-a", "슬레이트", "neutral-night", "#373B3F", "#454A4E", "#C5C9C9", "#A7C3D0"],
  ["slate-b", "슬레이트 · 다른 잉크", "neutral-night", "#373B3F", "#454A4E", "#C5C9C9", "#C6B5D0"],

  // 널리 쓰이는 코드 편집기 배색을 독서용으로 옮긴 52개. 출처: docs/color-palette-sources.md
  ["dracula-purple", "드라큘라 보라", "dracula", "#282A36", "#343746", "#F8F8F2", "#BD93F9"],
  ["dracula-pink", "드라큘라 분홍", "dracula", "#282A36", "#343746", "#F8F8F2", "#FF79C6"],
  ["tokyo-night", "도쿄 나이트", "tokyo-night", "#1A1B26", "#292E42", "#A9B1D6", "#7AA2F7"],
  ["tokyo-storm", "도쿄 나이트 · 폭풍", "tokyo-night", "#24283B", "#2F334D", "#A9B1D6", "#BB9AF7"],
  ["tokyo-day", "도쿄 나이트 · 낮", "tokyo-night", "#D5D6DB", "#C8C9CE", "#343B58", "#34548A"],
  ["ayu-light", "아유 라이트", "ayu", "#FAFAFA", "#F0F0F0", "#5C6773", "#FA8D3E"],
  ["ayu-mirage", "아유 미라지", "ayu", "#1F2430", "#232834", "#CBCCC6", "#F28779"],
  ["ayu-dark", "아유 다크", "ayu", "#0A0E14", "#131721", "#B3B1AD", "#E6B450"],
  ["one-light-a", "원 라이트", "one", "#FAFAFA", "#EAEAEB", "#383A42", "#A626A4"],
  ["one-light-b", "원 라이트 · 다른 잉크", "one", "#FAFAFA", "#EAEAEB", "#383A42", "#4078F2"],
  ["one-dark-a", "원 다크", "one", "#282C34", "#21252B", "#ABB2BF", "#C678DD"],
  ["one-dark-b", "원 다크 · 다른 잉크", "one", "#282C34", "#21252B", "#ABB2BF", "#61AFEF"],
  ["kanagawa-wave-a", "카나가와 파도", "kanagawa", "#1F1F28", "#16161D", "#DCD7BA", "#7E9CD8"],
  ["kanagawa-wave-b", "카나가와 파도 · 단풍", "kanagawa", "#1F1F28", "#16161D", "#DCD7BA", "#FF9E3B"],
  ["kanagawa-lotus", "카나가와 연꽃", "kanagawa", "#F2ECBC", "#E7DBA0", "#545464", "#C84053"],
  ["kanagawa-dragon", "카나가와 용", "kanagawa", "#181616", "#0D0C0C", "#C5C9C5", "#8A9A7B"],
  ["monokai-pink", "모노카이 프로 분홍", "monokai", "#2D2A2E", "#221F22", "#FCFCFA", "#FF6188"],
  ["monokai-green", "모노카이 프로 초록", "monokai", "#2D2A2E", "#221F22", "#FCFCFA", "#A9DC76"],
  ["night-owl-purple", "나이트 아울 보라", "night-owl", "#011627", "#0E293F", "#D6DEEB", "#C792EA"],
  ["night-owl-teal", "나이트 아울 청록", "night-owl", "#011627", "#0E293F", "#D6DEEB", "#7FDBCA"],
  ["light-owl", "라이트 아울", "night-owl", "#FBFBFB", "#F0F0F0", "#403F53", "#994CC3"],
  ["material-palenight", "머티리얼 팰나이트", "material", "#292D3E", "#1B1E2B", "#A6ACCD", "#C792EA"],
  ["material-oceanic", "머티리얼 오셔닉", "material", "#263238", "#1E272C", "#B0BEC5", "#89DDFF"],
  ["material-lighter", "머티리얼 라이터", "material", "#FAFAFA", "#E7EAEC", "#546E7A", "#39ADB5"],
  ["horizon-pink", "호라이즌 분홍", "horizon", "#1C1E26", "#232530", "#CBCED0", "#E95678"],
  ["horizon-teal", "호라이즌 청록", "horizon", "#1C1E26", "#232530", "#CBCED0", "#25B0BC"],
  ["sonokai-red", "소노카이 빨강", "sonokai", "#2A2C34", "#24262D", "#E2E2E3", "#F87979"],
  ["sonokai-green", "소노카이 초록", "sonokai", "#2A2C34", "#24262D", "#E2E2E3", "#9ED072"],
  ["github-light-blue", "깃허브 라이트 파랑", "github", "#FFFFFF", "#F6F8FA", "#24292F", "#0969DA"],
  ["github-light-purple", "깃허브 라이트 보라", "github", "#FFFFFF", "#F6F8FA", "#24292F", "#8250DF"],
  ["github-dark-blue", "깃허브 다크 파랑", "github", "#0D1117", "#161B22", "#C9D1D9", "#58A6FF"],
  ["github-dark-purple", "깃허브 다크 보라", "github", "#0D1117", "#161B22", "#C9D1D9", "#BC8CFF"],
  ["cobalt-yellow", "코발트2 노랑", "cobalt", "#193549", "#122738", "#E8E8E8", "#FFC600"],
  ["cobalt-blue", "코발트2 파랑", "cobalt", "#193549", "#122738", "#E8E8E8", "#0088FF"],
  ["synthwave-pink", "신스웨이브 분홍", "synthwave", "#262335", "#241B2F", "#B4B4E0", "#F92AAD"],
  ["synthwave-cyan", "신스웨이브 청록", "synthwave", "#262335", "#241B2F", "#B4B4E0", "#36F9F6"],
  ["panda-pink", "판다 분홍", "panda", "#292A2B", "#24262D", "#E6E6E6", "#FF75B5"],
  ["panda-teal", "판다 청록", "panda", "#292A2B", "#24262D", "#E6E6E6", "#19F9D8"],
  ["nightfox-blue", "나이트폭스 파랑", "nightfox", "#192330", "#212E3F", "#CDCECF", "#86ABDC"],
  ["nightfox-green", "나이트폭스 초록", "nightfox", "#192330", "#212E3F", "#CDCECF", "#81B29A"],
  ["dayfox-teal", "데이폭스 청록", "nightfox", "#F6F2EE", "#ECE5DE", "#625A5F", "#45707A"],
  ["dayfox-red", "데이폭스 빨강", "nightfox", "#F6F2EE", "#ECE5DE", "#625A5F", "#A5222F"],
  ["duskfox-purple", "더스크폭스 보라", "nightfox", "#2A2A3C", "#232333", "#C4C6DD", "#916F9D"],
  ["duskfox-blue", "더스크폭스 파랑", "nightfox", "#2A2A3C", "#232333", "#C4C6DD", "#8398B7"],
  ["terafox-green", "테라폭스 초록", "nightfox", "#152528", "#1A2E30", "#E6EAE9", "#598A76"],
  ["terafox-rust", "테라폭스 붉은흙", "nightfox", "#152528", "#1A2E30", "#E6EAE9", "#B45341"],
  ["carbonfox-blue", "카본폭스 파랑", "nightfox", "#161616", "#1E1E1E", "#F2F4F8", "#78A9FF"],
  ["carbonfox-pink", "카본폭스 분홍", "nightfox", "#161616", "#1E1E1E", "#F2F4F8", "#FF7EB6"],
  ["gruvbox-light-orange", "그루브박스 라이트 주황", "gruvbox", "#FBF1C7", "#EBDBB2", "#3C3836", "#AF3A03"],
  ["gruvbox-light-yellow", "그루브박스 라이트 노랑", "gruvbox", "#FBF1C7", "#EBDBB2", "#3C3836", "#B57614"],
  ["zenburn-orange", "젠번 주황", "zenburn", "#3F3F3F", "#4F4F4F", "#DCDCCC", "#DFAF8F"],
  ["zenburn-cyan", "젠번 청록", "zenburn", "#3F3F3F", "#4F4F4F", "#DCDCCC", "#8CD0D3"],
  // 애플 시스템 색(iOS/macOS Human Interface Guidelines)을 독서용으로 옮긴 8개.
  // 출처: docs/color-palette-sources.md
  ["apple-snow", "애플 스노우", "apple", "#FFFFFF", "#F5F5F7", "#1D1D1F", "#0071E3"],
  ["apple-grouped", "애플 그룹 배경", "apple", "#F2F2F7", "#E5E5EA", "#1C1C1E", "#007AFF"],
  ["apple-indigo", "애플 인디고", "apple", "#F5F5F7", "#E8E8ED", "#2C2C2E", "#5856D6"],
  ["apple-teal", "애플 틸", "apple", "#F2F2F7", "#E5E5EA", "#1C1C1E", "#30B0C7"],
  ["apple-sunset", "애플 선셋", "apple", "#F5F5F7", "#E8E8ED", "#2C2C2E", "#FF9500"],
  ["apple-dark", "애플 다크", "apple", "#000000", "#1C1C1E", "#F5F5F7", "#0A84FF"],
  ["apple-elevated", "애플 다크 · 떠 있는 판", "apple", "#1C1C1E", "#2C2C2E", "#EBEBF5", "#64D2FF"],
  ["apple-graphite-night", "애플 그래파이트 밤", "apple", "#1C1C1E", "#2C2C2E", "#D1D1D6", "#FF9F0A"],
] as const;

function rgb(hex: string): number[] {
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
}

export function mixColors(from: string, to: string, weight: number): string {
  return mix(from, to, weight);
}

function mix(from: string, to: string, weight: number): string {
  const a = rgb(from), b = rgb(to);
  return "#" + a.map((value, index) => Math.round(value + (b[index] - value) * weight)
    .toString(16).padStart(2, "0")).join("").toUpperCase();
}

function luminance(hex: string): number {
  const c = rgb(hex).map((value) => {
    const v = value / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
}

function contrast(a: string, b: string): number {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return [h, s, l];
}

export function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return ("#" + toHex(r) + toHex(g) + toHex(b)).toUpperCase();
}

// bg 는 이 대비 이상을 유지해야 하는 배경들, text 를 주면 그 글자색과도
// 최소한의 밝기 차이를 두어야 한다 (강조색이 본문과 겹쳐 보이지 않게).
interface ReadableOptions { bg: string[]; text?: string; minTextContrast?: number }

function passes(candidate: string, { bg, text, minTextContrast = 1 }: ReadableOptions): boolean {
  if (!bg.every((surface) => contrast(candidate, surface) >= 4.5)) return false;
  return !text || contrast(candidate, text) >= minTextContrast;
}

// 대비가 모자라면 밝기만 옮겨서 배경과 맞춘다 - 색상·채도를 지켜야
// 강조색이 본문 잉크색으로 바래 구분이 사라지지 않는다.
// 밝기만으로 본문 글자와 갈라놓을 수 없으면(원래 색상 자체가 비슷하면)
// 색상환을 틀어 그 계열에서 벗어난 색으로 강조가 드러나게 한다.
function readable(color: string, options: ReadableOptions, ink: string): string {
  if (passes(color, options)) return color;
  const toward = luminance(ink) > 0.5 ? 1 : 0; // 밝은 잉크(다크 테마)면 밝게, 어두운 잉크(라이트 테마)면 어둡게
  const [h, s, l0] = hexToHsl(color);
  const s2 = Math.min(1, s * 1.1 + 0.04); // 밝기를 옮기며 옅어질 채도를 살짝 보정

  for (const hue of [h, h + 35, h - 35, h + 70, h - 70, h + 140, h - 140]) {
    const hueAdjusted = ((hue % 360) + 360) % 360;
    const saturation = hue === h ? s2 : Math.max(s2, 0.42); // 색상을 틀 때는 색감이 드러나야 의미가 있다
    for (let step = 0; step <= 20; step++) {
      const l = l0 + (toward - l0) * (step / 20);
      const candidate = hslToHex(hueAdjusted, saturation, l);
      if (passes(candidate, options)) return candidate;
    }
  }
  return ink;
}

// readable() 과 달리 색상(hue)을 절대 틀지 않고 명도만 옮긴다.
// 제목·부분강조처럼 "같은 계열, 다른 세기"로 짝지어야 하는 색은 readable() 의
// 색상 회전 탈출구를 타면 짝이 서로 다른 계열로 갈라질 수 있어 이 함수를 따로 쓴다.
//
// 흰색(L=1)·검은색(L=0)에 가까워질수록 채도를 아무리 줘도 색상이 사라진다
// (HSL 에서 L=1 은 색상과 무관하게 항상 순백, L=0 은 항상 순흑이다).
// 그래서 0.08~0.92 안에서만 찾는다 - 그 안에서 못 찾으면 색이 안 보일 만큼
// 바래는 것이므로, 어중간하게 바랜 "가짜 색" 대신 차라리 잉크색으로 분명히 넘어간다.
function shadeInHue(hue: number, sat: number, startLight: number, options: ReadableOptions, ink: string): string {
  const start = hslToHex(hue, sat, startLight);
  if (passes(start, options)) return start;
  const toward = luminance(ink) > 0.5 ? 0.92 : 0.08;
  for (let step = 1; step <= 20; step++) {
    const l = startLight + (toward - startLight) * (step / 20);
    const candidate = hslToHex(hue, sat, l);
    if (passes(candidate, options)) return candidate;
  }
  return ink;
}

export const COLOR_PALETTES: readonly ColorPalette[] = PALETTE_SEEDS.map(
  ([id, name, family, bg, panel, originalText, originalAccent]) => {
    const dark = luminance(bg) < 0.3;
    const ink = dark ? "#F2F0ED" : "#252525";
    // 지나치게 강한 원본 본문 대비는 조금 누그러뜨린다.
    let text: string = originalText;
    for (let step = 1; step <= 12 && contrast(text, bg) > 8; step++) {
      text = mix(originalText, bg, step / 40);
    }
    const talkBg = mix(bg, panel, 0.55);
    const sayBg = mix(bg, originalAccent, 0.10);
    const surfaces = [bg, panel, talkBg, sayBg];
    text = readable(text, { bg: surfaces }, ink);
    const muted = readable(mix(text, bg, 0.10), { bg: surfaces }, ink);
    // 강조색은 배경과도, 방금 정한 본문 글자색과도 구분되어야 진짜 강조로 보인다.
    const accent = readable(originalAccent, { bg: surfaces, text, minTextContrast: 1.8 }, ink);

    // 제목([[ ]])·부분강조([ ])·루비({ })·대화(><)·말씀(>><<), 다섯 표시가 서로 헷갈리지
    // 않도록 세 색 계열로 나눈다. 제목·부분강조는 같은 색상(계열)에서 밝기만 다르게,
    // 루비와 대화·말씀은 색상환을 70도·150도 돌려 각각 다른 계열을 새로 만든다.
    // 색상을 고정한 채 명도만 옮기는 shadeInHue 를 써야, 대비를 맞추다 색상까지
    // 틀어버리는 readable() 의 탈출구를 타지 않아 계열이 흐트러지지 않는다.
    const [accentHue, accentSat, accentLight] = hexToHsl(accent);
    const textLight = hexToHsl(text)[2];
    // 본문이 원래 아주 밝거나 어두운 극단적인 배색에서는 accent 도 잉크색에 가깝게 밀려
    // accentLight 가 거의 끝까지 가 있을 수 있다 - 그 값을 그대로 물려받으면 루비·말씀이
    // 밝기를 옮길 여지가 없어 결국 다 같은 잉크색으로 수렴해버린다. 그래서 이 둘은
    // accent 의 밝기에 매이지 않는, 여지가 넉넉한 중간 밝기에서 새로 시작한다.
    const vividLight = luminance(ink) > 0.5 ? 0.62 : 0.38;

    // 부분강조 - 제목과 같은 색상, 채도·밝기를 본문 쪽으로 낮춰 "한 단계 아래"로 보이게 한다.
    const accentSoftLight = accentLight + (textLight - accentLight) * 0.4;
    const textAccent = shadeInHue(accentHue, Math.max(accentSat * 0.75, 0.25),
      accentSoftLight, { bg: surfaces, text, minTextContrast: 1.3 }, ink);

    // 루비 - 제목·부분강조 계열과 겹치지 않도록 70도 돌린 색상을 새로 만든다.
    const rubyHue = ((accentHue + 70) % 360 + 360) % 360;
    const rubyAccent = shadeInHue(rubyHue, Math.max(accentSat, 0.4), vividLight,
      { bg: surfaces, text, minTextContrast: 1.3 }, ink);

    // 대화·말씀 - 위 둘과도 다른 계열이 되도록 150도 돌린다. 말씀이 대화보다 진하다.
    // 대화는 말씀과 정확히 같은 색상을 쓰도록, 말씀의 결과 hue 를 그대로 물려받는다.
    const speechHue = ((accentHue + 150) % 360 + 360) % 360;
    const sayText = shadeInHue(speechHue, Math.max(accentSat, 0.4), vividLight,
      { bg: [sayBg], text, minTextContrast: 1.3 }, ink);
    const [sayHue, saySat, sayLight] = hexToHsl(sayText);
    const talkLight = sayLight + (textLight - sayLight) * 0.4;
    const talkText = shadeInHue(sayHue, Math.max(saySat * 0.75, 0.25), talkLight, { bg: [talkBg] }, ink);

    const border = mix(bg, text, 0.26);
    const selected = mix(bg, accent, 0.16);
    return {
      id, name, family,
      colors: {
        bg, bgSecondary: panel, border, text, textMuted: muted,
        textBold: accent, textAccent, textEmphasis: rubyAccent,
        categorySelected: selected,
        categorySelectedText: readable(accent, { bg: [selected] }, ink),
        categoryBorder: border, categoryText: muted,
        // 상위 카테고리는 보통 카테고리 색을 강조색 쪽으로 당겨, 더 들어갈 수 있는 자리임을 알린다
        categoryParentText: mix(muted, accent, 0.55),
        buttonPrimary: panel, buttonIcon: accent, rubyText: muted,
        scrollThumb: border, talkBg, talkText, sayBg, sayText,
      },
    };
  },
);

export function findColorPalette(colors: ThemeColors): ColorPalette | undefined {
  return COLOR_PALETTES.find((palette) =>
    (Object.keys(palette.colors) as (keyof ThemeColors)[]).every(
      (key) => palette.colors[key].toUpperCase() === colors[key].toUpperCase(),
    ),
  );
}

export function pickRandomPalette(colors: ThemeColors, recentIds: readonly string[]): ColorPalette {
  const currentId = findColorPalette(colors)?.id;
  const others = COLOR_PALETTES.filter((palette) => palette.id !== currentId);
  const fresh = others.filter((palette) => !recentIds.includes(palette.id));
  const currentFamily = findColorPalette(colors)?.family;
  const differentFamily = fresh.filter((palette) => palette.family !== currentFamily);
  const choices = differentFamily.length > 0 ? differentFamily : fresh.length > 0 ? fresh : others;
  return choices[Math.floor(Math.random() * choices.length)];
}
