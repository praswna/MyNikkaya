export interface Quote {
  id: string;
  text: string;
  category: string;
}

export interface RubySegment {
  type: "text" | "ruby" | "newline" | "link" | "bold";
  content: string;
  ruby?: string[];
}
