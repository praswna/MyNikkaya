// 검색용 글자 다듬기
//
// 화면에 보이는 대로 찾을 수 있게, 원문의 마크업을 걷어내고 눈에 보이는 꼴로 맞춘다.
// 검색창(SearchBar)만 쓰지만, 규칙이 눈에 보이지 않게 어긋나기 쉬운 자리라 따로 두고
// 시험으로 못박아 둔다.

// 마크업을 걷어내 "읽히는 대로" 검색·표시한다.
//   단어{한자,영어^1} → "단어 한자 영어"  (루비 낱말도 함께 찾게, 각주 번호는 뺀다)
//   [[ ]] · [ ] · > < · >> << 표시 기호와 각주 블록 구분선은 지운다.
// 각주 본문은 그대로 남겨 함께 검색된다.
export function plainText(text: string): string {
  return text
    .replace(/\{([^}]*)\}/g, (_whole, inner: string) => {
      const caret = inner.indexOf("^");
      const ruby = caret === -1 ? inner : inner.slice(0, caret);
      return ` ${ruby.replace(/,/g, " ")} `;
    })
    .replace(/--주석--/g, " ")
    .replace(/\^\d+/g, " ")           // 각주 번호 표식 (^1 …)
    .replace(/\[\[|\]\]|\[|\]/g, "")   // 굵게·부분강조 대괄호
    .replace(/>>|<<|>|</g, "")         // 말씀·대화 표시 기호
    .replace(/\s+/g, " ")
    .trim();
}

// 찾을 때만 쓰는 꼴로 바꾼다.
//
// 루비가 달리는 낱말은 빈칸을 쓸 수 없어 "개정-절차{...}" 처럼 "-" 로 이어 쓰고,
// 화면에는 다시 빈칸(줄바꿈 없는 빈칸)으로 보여준다. 그래서 눈에 보이는 대로
// "개정 절차" 를 찾으면 원문의 "-" 때문에 걸리지 않았다. 둘을 같은 글자로 친다.
//
// 글자 수는 그대로 두고 바꾼다 - 찾은 자리를 원문에서 잘라 보여주므로,
// 길이가 달라지면 밑줄이 엉뚱한 자리에 그어진다.
export function forSearch(text: string): string {
  return text.toLowerCase().replace(/[-\u00A0]/g, " ");
}

