export interface Quote {
  id: string;
  text: string;
  category: string;
}

export interface RubySegment {
  type: "text" | "ruby" | "newline" | "link" | "bold";
  content: string;
  ruby?: string[];
  note?: string;                 // 루비 주석 ({루비^주석}) - 클릭 시 팝업 표시
  rubyRaw?: string;              // 중괄호 안 루비 부분 원문 (주석 저장 시 그대로 보존)
  braceStart?: number;           // 원문에서 "{" 위치 (주석 추가/수정용)
  braceEnd?: number;             // 원문에서 "}" 다음 위치
  innerSegments?: RubySegment[]; // bold 내부 세그먼트
}
