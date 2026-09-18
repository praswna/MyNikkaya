export interface Quote {
  id: string;        // 화면에서 쓰는 임시 번호 (gs-1…) - 읽을 때마다 새로 매겨진다
  sheetId?: string;  // 시트 C열의 이름표 - 저장할 때 이걸로 행을 찾는다
  text: string;
  category: string;
  updatedAt?: string; // 시트 D열 - 본문을 마지막으로 고친 때 ("2026-09-07 14:30")
}

export interface RubySegment {
  type: "text" | "ruby" | "newline" | "link" | "bold" | "emphasis";
  content: string;
  ruby?: string[];
  note?: string;                 // 루비 주석 ({루비^주석}) - 클릭 시 팝업 표시
  rubyRaw?: string;              // 중괄호 안 루비 부분 원문 (주석 저장 시 그대로 보존)
  braceStart?: number;           // 원문에서 "{" 위치 (주석 추가/수정용)
  braceEnd?: number;             // 원문에서 "}" 다음 위치
  innerSegments?: RubySegment[]; // bold·emphasis 내부 세그먼트
}
