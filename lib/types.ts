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
  innerSegments?: RubySegment[]; // bold 내부 세그먼트
}
