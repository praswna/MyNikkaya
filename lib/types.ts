export interface Quote {
  id: string;
  text: string;
  category: string;
}

export interface RubySegment {
  type: "text" | "ruby" | "newline" | "link";
  content: string;
  ruby?: string[];       // 윗 루비
  rubyBelow?: string[];  // 아랫 루비
}
