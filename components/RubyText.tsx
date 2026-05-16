"use client";

import { parseRubyText } from "@/lib/ruby";
import { ThemeColors } from "@/lib/theme";

interface RubyTextProps {
  text: string;
  fontSize: number;
  lineHeight: string;
  colors: ThemeColors;
}

function getRubyFontSize(text: string): string {
  const len = text.length;
  if (len > 12) return "0.38em";
  if (len > 8)  return "0.44em";
  if (len > 4)  return "0.50em";
  return "0.55em";
}

export function RubyText({ text, fontSize, lineHeight, colors }: RubyTextProps) {
  const segments = parseRubyText(text);

  return (
    <p
      className="text-center font-semibold select-none w-full"
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
        if (seg.type === "ruby" && seg.ruby) {
          return (
            <ruby key={i} style={{ color: colors.textEmphasis, rubyAlign: "center" } as React.CSSProperties}>
              {seg.content}
              <rt style={{
                color: colors.rubyText,
                fontWeight: "normal",
                letterSpacing: "0.02em",
                whiteSpace: "pre",
                lineHeight: "1",
              }}>
                {seg.ruby.map((r, j) => (
                  <span key={j} style={{ fontSize: getRubyFontSize(r), display: "block" }}>
                    {r}
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
