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
          const hasBelow = seg.rubyBelow && seg.rubyBelow.length > 0;
          const topFontSize = getRubyFontSize(seg.ruby);
          return (
            <span key={i} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", verticalAlign: "bottom", lineHeight: "1.1" }}>
              {/* 윗 루비 */}
              <span style={{
                fontSize: topFontSize,
                color: colors.rubyText,
                fontWeight: "normal",
                letterSpacing: "0.02em",
                lineHeight: "1",
                marginBottom: "0em",
              }}>
                {seg.ruby.map((r, j) => (
                  <span key={j} style={{ display: "block" }}>{r}</span>
                ))}
              </span>
              {/* 베이스 */}
              <span style={{ color: colors.textEmphasis }}>
                {seg.content}
              </span>
              {/* 아랫 루비 */}
              {hasBelow && (
                <span style={{
                  fontSize: getRubyFontSize(seg.rubyBelow!),
                  color: colors.textEmphasis,
                  fontWeight: "normal",
                  letterSpacing: "0.02em",
                  lineHeight: "1",
                  marginTop: "0em",
                }}>
                  {seg.rubyBelow!.map((r, j) => (
                    <span key={j} style={{ display: "block" }}>{r}</span>
                  ))}
                </span>
              )}
            </span>
          );
        }
        return <span key={i}>{seg.content}</span>;
      })}
    </p>
  );
}
