"use client";

import { parseRubyText } from "@/lib/ruby";
import { ThemeColors } from "@/lib/theme";

interface RubyTextProps {
  text: string;
  fontSize: number;
  lineHeight: string;
  colors: ThemeColors;
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
            <ruby key={i} style={{ color: colors.textEmphasis }}>
              {seg.content}
              <rt style={{
                fontSize: "0.55em",
                color: colors.rubyText,
                fontWeight: "normal",
                letterSpacing: "0.02em",
                whiteSpace: "pre",
                textAlign: "left",
                rubyAlign: "start",
              } as React.CSSProperties}>
                {seg.ruby.join("\n")}
              </rt>
            </ruby>
          );
        }
        return <span key={i}>{seg.content}</span>;
      })}
    </p>
  );
}
