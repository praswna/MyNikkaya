"use client";

import type { CSSProperties, RefObject } from "react";
import { highlightSource, type SourceTokenKind } from "@/lib/ruby";
import { ThemeColors } from "@/lib/theme";

interface SourceEditorProps {
  value: string;
  onChange: (next: string) => void;
  fontSize: number;
  lineHeight: string;
  colors: ThemeColors;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  marginY: number; // 오른쪽 위 버튼에 첫 줄이 가리지 않도록 두는 위아래 여백
}

// 조각별 색 - 읽기 화면(RubyText)과 같은 색을 쓴다
function tokenColor(kind: SourceTokenKind, colors: ThemeColors): string {
  switch (kind) {
    case "base": return colors.textEmphasis;
    case "ruby": return colors.rubyText;
    case "note": return colors.rubyText;
    case "bold": return colors.textBold;
    case "link": return colors.textEmphasis;
    default: return colors.text;
  }
}

// 본문 자리에서 원문을 고치는 입력칸.
//
// textarea 는 글자마다 색을 달리 칠할 수 없다.
// 그래서 색칠한 글을 뒤에 깔고, 그 위에 글자가 투명한 textarea 를 겹친다.
// 둘은 글꼴·크기·줄간격·정렬·줄바꿈 규칙이 모두 같아야 글자가 어긋나지 않는다.
export function SourceEditor({ value, onChange, fontSize, lineHeight, colors, textareaRef, marginY }: SourceEditorProps) {
  const textStyle: CSSProperties = {
    fontSize,
    lineHeight,
    fontFamily: "inherit",
    fontWeight: 600,
    textAlign: "center",
    whiteSpace: "pre-wrap",
    wordBreak: "keep-all",
    overflowWrap: "break-word",
    letterSpacing: "normal",
    margin: 0,
    padding: 0,
    border: "none",
  };

  return (
    <div className="relative w-full" style={{ margin: `${marginY}px 0` }}>
      {/* 글자 선택 표시가 불투명하면 뒤에 깔린 색칠 글자가 가려진다 */}
      <style>{`.source-editor::selection { background-color: ${colors.categorySelected}66; }`}</style>

      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ ...textStyle, color: colors.text }}>
        {highlightSource(value).map((token, i) => (
          <span
            key={i}
            style={{
              color: tokenColor(token.kind, colors),
              // 주석은 읽을 때 본문에 흐르지 않으므로 옅게 둔다
              opacity: token.kind === "note" ? 0.6 : undefined,
            }}
          >
            {token.text}
          </span>
        ))}
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        aria-label="명언 원문"
        className="source-editor relative w-full resize-none overflow-hidden bg-transparent outline-none"
        style={{
          ...textStyle,
          color: "transparent",
          WebkitTextFillColor: "transparent", // iOS 사파리는 color 만으로 글자가 숨지 않는다
          caretColor: colors.textEmphasis,
          WebkitAppearance: "none",
        }}
      />
    </div>
  );
}
