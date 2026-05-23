"use client";

import { parseRubyText } from "@/lib/ruby";
import { ThemeColors } from "@/lib/theme";
import { RubySegment } from "@/lib/types";

interface RubyTextProps {
  text: string;
  fontSize: number;
  lineHeight: string;
  colors: ThemeColors;
}

function getRubyFontSize(parts: string[]): string {
  const maxLen = Math.max(...parts.map((r) => r.length));
  if (maxLen > 12) return "0.38em";
  if (maxLen > 8)  return "0.44em";
  if (maxLen > 4)  return "0.50em";
  return "0.55em";
}

function renderSegment(seg: RubySegment, i: number, colors: ThemeColors, bold: boolean): React.ReactNode {
  if (seg.type === "newline") {
    return <br key={i} />;
  }
  if (seg.type === "bold" && seg.innerSegments) {
    return (
      <strong key={i} style={{ color: colors.textBold, fontWeight: 900 }}>
        {seg.innerSegments.map((inner, j) => renderSegment(inner, j, colors, true))}
      </strong>
    );
  }
  if (seg.type === "link") {
    return (
      <a
        key={i}
        href={seg.content}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: colors.textEmphasis, textDecoration: "underline", wordBreak: "break-all", fontSize: "0.4em" }}
      >
        {seg.content}
      </a>
    );
  }
  if (seg.type === "ruby" && seg.ruby) {
    return (
      <ruby key={i} style={{ color: bold ? colors.textBold : colors.textEmphasis, verticalAlign: "bottom" } as React.CSSProperties}>
        {seg.content}
        <rt style={{
          fontSize: getRubyFontSize(seg.ruby),
          color: colors.rubyText,
          fontWeight: "normal",
          letterSpacing: "0.02em",
          lineHeight: "1",
          whiteSpace: "pre-line",
        }}>
          {seg.ruby.join("
")}
        </rt>
      </ruby>
    );
  }
  return <span key={i}>{seg.content}</span>;
}

export function RubyText({ text, fontSize, lineHeight, colors }: RubyTextProps) {
  const segments = parseRubyText(text);

  return (
    <p
      className="text-center font-semibold w-full"
      style={{
        fontSize,
        lineHeight,
        color: colors.text,
        wordBreak: "keep-all",
        overflowWrap: "break-word",
        maxWidth: "100%",
      }}
    >
      {segments.map((seg, i) => renderSegment(seg, i, colors, false))}
    </p>
  );
}
