"use client";

import { memo, useCallback, useState, type CSSProperties, type RefObject } from "react";
import { highlightSourceLines, type SourceToken, type SourceTokenKind } from "@/lib/ruby";
import { ThemeColors } from "@/lib/theme";

interface SourceEditorProps {
  initialValue: string;
  // 고칠 때마다 부른다. 부모는 이 값을 ref 에만 담아 두고 다시 그리지 않는다.
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
    case "talk": return colors.talkText;
    case "say": return colors.sayText;
    default: return colors.text;
  }
}

// 한 줄. 내용이 그대로면 다시 그리지 않는다 (타자 한 번에 건드리는 줄은 보통 하나뿐이다)
const SourceLine = memo(function SourceLine({ tokens, colors }: { tokens: SourceToken[]; colors: ThemeColors }) {
  // 빈 줄도 한 줄만큼 자리를 차지해야 글자가 어긋나지 않는다
  if (tokens.length === 0) return <div style={{ whiteSpace: "pre-wrap" }}>{"​"}</div>;
  return (
    <div style={{ whiteSpace: "pre-wrap" }}>
      {tokens.map((token, i) => (
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
  );
}, (prev, next) => {
  if (prev.colors !== next.colors || prev.tokens.length !== next.tokens.length) return false;
  return prev.tokens.every((token, i) => token.text === next.tokens[i].text && token.kind === next.tokens[i].kind);
});

// 본문 자리에서 원문을 고치는 입력칸.
//
// textarea 는 글자마다 색을 달리 칠할 수 없다.
// 그래서 색칠한 글을 뒤에 깔고, 그 위에 글자가 투명한 textarea 를 겹친다.
// 둘은 글꼴·크기·줄간격·정렬·줄바꿈 규칙이 모두 같아야 글자가 어긋나지 않는다.
//
// 높이는 뒤에 깔린 글이 정한다. textarea 는 그 위에 겹쳐 늘어나므로,
// 글자를 칠 때마다 높이를 재서 맞추지 않아도 된다.
export function SourceEditor({ initialValue, onChange, fontSize, lineHeight, colors, textareaRef, marginY }: SourceEditorProps) {
  // 글자는 여기서만 들고 있는다. 위로 올리면 글자 하나에 화면 전체가 다시 그려진다.
  const [value, setValue] = useState(initialValue);

  const handleChange = useCallback((next: string) => {
    setValue(next);
    onChange(next);
  }, [onChange]);

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

  const lines = highlightSourceLines(value);

  return (
    <div className="relative w-full" style={{ margin: `${marginY}px 0` }}>
      {/* 글자 선택 표시가 불투명하면 뒤에 깔린 색칠 글자가 가려진다 */}
      <style>{`.source-editor::selection { background-color: ${colors.categorySelected}66; }`}</style>

      {/* 뒤에 깔리는 색칠 글 - 이 높이가 곧 입력칸의 높이가 된다 */}
      <div aria-hidden className="pointer-events-none" style={{ ...textStyle, color: colors.text }}>
        {lines.map((tokens, i) => (
          <SourceLine key={i} tokens={tokens} colors={colors} />
        ))}
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        spellCheck={false}
        aria-label="명언 원문"
        className="source-editor absolute inset-0 h-full w-full resize-none overflow-hidden bg-transparent outline-none"
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
