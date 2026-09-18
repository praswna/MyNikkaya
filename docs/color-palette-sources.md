# 랜덤 배색의 참고 자료

2026-09-05 확인. 모든 배색은 앱의 본문·대화 판·강조 판·버튼에 맞춘 변형이며 공식 앱 테마의 완전한 복제는 아니다.
`lib/color-palettes.ts`의 고정 HEX 시드 160개를 사용한다. 실행 중 네트워크 요청이나 무작위 색 생성은 없다.

| 계열 | 수 | 참고 자료 | 원본과 조정 범위 |
|---|---:|---|---|
| 독서 화면 | 12 | [Apple Books의 페이지 테마](https://support.apple.com/guide/books/change-a-books-appearance-ibks8923126d/mac), [Readium 사용자 색 설정](https://readium.org/css/docs/CSS12-user_prefs.html) | 종이·세피아·회색·야간이라는 읽기 방향을 참고한 독자 배색. HEX는 Apple이나 Readium의 실제 값이라고 주장하지 않는다. |
| Solarized | 4 | [제작자 공식 팔레트](https://ethanschoonover.com/solarized/) | 종이/밤은 공식 기본 바탕·본문·포인트를 사용. 모래/황혼은 보조 바탕을 주 바탕으로 쓴 독서용 변형. |
| Catppuccin | 4 | [공식 팔레트 JSON](https://github.com/catppuccin/palette/blob/main/palette.json) | Latte·Frappé·Macchiato·Mocha의 base, mantle, text와 각각 mauve, green, peach, blue를 가져왔다. |
| Everforest | 6 | [공식 색상표](https://github.com/sainnhe/everforest/blob/master/palette.md) | light/dark의 hard·medium·soft 바탕과 본문색을 사용. 각 조합에 공식 포인트 색 하나를 선택했다. |
| Rosé Pine | 3 | [공식 팔레트](https://rosepinetheme.com/palette/) | Dawn·Main·Moon의 바탕·본문과 pine·rose·iris 포인트를 사용했다. |
| Nord | 3 | [공식 색상과 역할](https://www.nordtheme.com/docs/colors-and-palettes/) | Snow Storm의 밝은/중간 바탕, Polar Night의 어두운 바탕에 공식 본문·Frost 색을 대응했다. |
| Dracula | 2 | [공식 사양](https://draculatheme.com/contribute) | 바탕·전경은 공식 값 그대로, 포인트는 purple·pink 두 가지를 대응했다. |
| Tokyo Night | 3 | [공식 팔레트(VS Code 테마 저장소)](https://github.com/enkia/tokyo-night-vscode-theme) | Night·Storm·Day 세 변형의 바탕·전경·포인트를 대응했다. |
| Ayu | 3 | [공식 팔레트](https://github.com/ayu-theme/ayu-colors) | Light·Mirage·Dark 세 변형의 바탕·전경과 각 테마의 대표 포인트를 대응했다. |
| One (Atom) | 4 | [공식 syntax 색상](https://github.com/atom/one-light-syntax/blob/master/styles/colors.less) | Light·Dark 각각에 magenta/purple 계열과 blue 계열 포인트 두 가지씩 대응했다. |
| Kanagawa | 4 | [공식 색상표](https://github.com/rebelot/kanagawa.nvim/blob/master/lua/kanagawa/colors.lua) | Wave(파랑/단풍 포인트 2개)·Lotus(밝은 바탕)·Dragon(어두운 바탕) 변형을 대응했다. |
| Monokai Pro | 2 | [공식 팔레트](https://monokai.pro/) | 클래식 바탕·전경에 pink·green 포인트 두 가지를 대응했다. |
| Night Owl | 3 | [공식 팔레트](https://github.com/sdras/night-owl-vscode-theme) | 다크(purple·teal 포인트 2개)와 라이트(Light Owl) 변형을 대응했다. |
| Material Theme | 3 | [공식 팔레트](https://github.com/material-theme/vsc-material-theme) | Palenight·Oceanic(다크)과 Lighter(라이트) 변형을 대응했다. |
| Horizon | 2 | [공식 팔레트](https://github.com/jolaleye/horizon-theme.vscode) | 다크 바탕에 pink·teal 포인트 두 가지를 대응했다. |
| Sonokai | 2 | [공식 팔레트(Andromeda)](https://github.com/sainnhe/sonokai) | Andromeda 변형의 바탕·전경에 red·green 포인트 두 가지를 대응했다. |
| GitHub | 4 | [공식 Primer 색상](https://primer.style/foundations/color) | Light·Dark 각각에 blue·purple 포인트 두 가지씩 대응했다. |
| Cobalt2 | 2 | [공식 팔레트](https://github.com/wesbos/cobalt2-vscode) | 다크 바탕에 yellow·blue 포인트 두 가지를 대응했다. |
| Synthwave '84 | 2 | [공식 팔레트](https://github.com/robb0wen/synthwave-vscode) | 네온 바탕을 읽기 쉽게 누그러뜨리고 pink·cyan 포인트를 대응했다. |
| Panda | 2 | [공식 팔레트](https://github.com/tinkertrain/panda-syntax-vscode) | 다크 바탕에 pink·teal 포인트 두 가지를 대응했다. |
| Nightfox 계열 | 10 | [공식 팔레트](https://github.com/EdenEast/nightfox.nvim) | Nightfox·Dayfox·Duskfox·Terafox·Carbonfox 다섯 변형에 각 2개 포인트를 대응했다. |
| Gruvbox Light | 2 | [공식 색상표](https://github.com/morhetz/gruvbox) | 기본 다크 테마(`lib/theme.ts`)와 짝을 이루는 라이트 하드 변형. orange·yellow 포인트 두 가지. |
| Zenburn | 2 | [공식 팔레트](https://github.com/jnurmine/Zenburn) | 저채도 회색 바탕에 orange·cyan 포인트 두 가지를 대응했다. |
| Apple | 8 | [Human Interface Guidelines 색상](https://developer.apple.com/design/human-interface-guidelines/color) | 라이트의 systemBackground·secondarySystemGroupedBackground, 다크의 black·elevated 바탕과 label 색에 systemBlue·Indigo·Teal·Orange 등 시스템 강조색을 대응했다. |

## 독서용 조정

- 색상환을 일정 간격으로 돌리거나 명도만 바꿔 수를 늘리던 방식을 제거했다.
- 원본 본문 대비가 8:1보다 크면 배경 쪽으로 조금 섞어 완화한다.
- 본문과 보조 글자, 제목이 실제 표시되는 판 위에서 4.5:1 이상의 대비를 갖도록 필요할 때 밝기를 옮겨 조정한다(색상·채도는 최대한 지킨다). 원본 포인트 색이 옅은 밝은 테마에서도 글자가 사라지지 않게 하기 위한 조정이다.
- 제목([[ ]])·루비({ }) 등 강조 포인트 색은 배경 대비뿐 아니라 그 배색의 본문 글자색과도 최소한의 밝기 차이(1.8:1)를 갖도록 추가로 검사한다. 밝기만으로 본문과 갈라놓을 수 없을 만큼 원본 포인트가 본문과 같은 계열이면 색상환을 틀어 다른 색감으로 드러낸다. 강조가 본문에 묻혀 보이던 배색 47개를 이렇게 고쳤다.
- 제목·부분강조([ ])·루비·대화(><)·말씀(>><<), 다섯 표시가 서로 헷갈리지 않도록 강조 포인트에서 세 색 계열을 만든다. 제목·부분강조는 같은 색상에서 밝기만 다르게, 루비는 70도, 대화·말씀은 150도 돌린 색상을 새로 만들어 서로 겹치지 않게 한다. 색상은 고정한 채 밝기만 옮겨야 계열이 흐트러지지 않으므로, 대비를 맞추다 색상까지 틀어버리는 일반 조정과는 다른 방식을 쓴다.
- 대화 판은 배경과 팝업의 중간색, 강조 판은 배경에 원본 포인트를 10% 섞은 색이다.
- 카테고리/랜덤 버튼은 큰 원색 면 대신 옅게 물든 면을 사용한다.
- 개인별 편안함은 다를 수 있으므로 선택 후 개별 색 조절을 계속 지원한다.
- 최근 8개 조합을 제외하고 가능한 한 바로 이전과 다른 계열을 선택한다. 기존 저장값은 자동으로 덮어쓰지 않는다.

## 100개 확장

위 32개 원본 기반 조합을 유지하고, 종이·회백색·파스텔·정원·푸른 밤·보랏빛 밤·따뜻한 밤 등 34개 바탕을 직접 추가했다. 각 바탕에 개별 선택한 포인트 잉크 2개씩 대응하여 68개를 더했다. 추가 조합은 공식 테마의 원본 색이라고 주장하지 않는 독자 변형이다. 모든 조합에 같은 가독성 검사를 적용한다.

## 152개 확장

위 100개에 Dracula·Tokyo Night·Ayu·One·Kanagawa·Monokai Pro·Night Owl·Material Theme·
Horizon·Sonokai·GitHub·Cobalt2·Synthwave '84·Panda·Nightfox 계열·Gruvbox Light·Zenburn,
17개 계열 52개를 더했다(표 참고). 모두 코드 편집기에서 널리 쓰이는 배색으로, 공식 바탕·전경·
포인트 색을 가져와 같은 독서용 가독성 검사를 거쳤다.

이 확장과 함께 강조색 검사를 배경 대비뿐 아니라 본문 글자색과의 구분으로도 넓혔다(위 "독서용
조정" 참고). 기존 100개 중 다수가 포인트 색이 본문과 같은 계열이라 강조가 눈에 띄지 않았는데,
이번에 전부 다시 계산해 바로잡았다.

## 160개 확장

여기에 애플 시스템 색 계열 8개를 더했다. iOS·macOS의 밝은 바탕(systemBackground `#FFFFFF`,
그룹 바탕 `#F2F2F7`)과 어두운 바탕(`#000000`, 떠 있는 판 `#1C1C1E`·`#2C2C2E`), label 계열
글자색에 systemBlue·Indigo·Teal·Orange 같은 시스템 강조색을 짝지었다. 앞의 배색들과 마찬가지로
색 시드만 더한 것이며, 같은 독서용 가독성 검사를 그대로 거친다.
