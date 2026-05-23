"use client";

import { parseRubyText } from "@/lib/ruby";
import { ThemeColors } from "@/lib/theme";

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
      {segments.map((seg, i) => {
        if (seg.type === "newline") {
          return <br key={i} />;
        }
        if (seg.type === "bold") {
          return (
            <strong key={i} style={{ color: colors.textBold, fontWeight: 900 }}>
              {seg.content}
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
            <ruby key={i} style={{ color: colors.textEmphasis, verticalAlign: "bottom" } as React.CSSProperties}>
              {seg.content}
              <rt style={{
                fontSize: getRubyFontSize(seg.ruby),
                color: colors.rubyText,
                fontWeight: "normal",
                letterSpacing: "0.02em",
                lineHeight: "1",
              }}>
                {seg.ruby.map((r, j) => (
                  <span key={j}>
                    {r}
                    {j < seg.ruby!.length - 1 && <br />}
                  </span>
                ))}
              </rt>
            </ruby>
          );
        }
        return <span key={i}>{seg.content}</span>;
      })}
    </p>
  );
}
