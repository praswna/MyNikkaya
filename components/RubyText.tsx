"use client";

import { useMemo } from "react";
import { parseRubyText } from "@/lib/ruby";
import { ThemeColors } from "@/lib/theme";

interface RubyTextProps {
  text: string;
  fontSize: number;
  lineHeight: string;
  colors: ThemeColors;
  animationKey?: string;
}

const ANIMATE_CHARS = 500;

function getRubyFontSize(parts: string[]): string {
  const maxLen = Math.max(...parts.map((r) => r.length));
  if (maxLen > 12) return "0.38em";
  if (maxLen > 8)  return "0.44em";
  if (maxLen > 4)  return "0.50em";
  return "0.55em";
}

function seededRandom(seed: number) {
  return ((seed * 9301 + 49297) % 233280) / 233280;
}

export function RubyText({ text, fontSize, lineHeight, colors, animationKey }: RubyTextProps) {
  const segments = parseRubyText(text);

  const durations = useMemo(() => {
    const seedBase = animationKey ? animationKey.length : 0;
    return Array.from({ length: text.length + 100 }, (_, i) => {
      const rand = seededRandom(seedBase + i * 7);
      return 0.4 + rand * 1.4;
    });
  }, [text, animationKey]);

  let charIndex = 0;

  const animatedChar = (char: string, style?: React.CSSProperties) => {
    const idx = charIndex++;
    const shouldAnimate = idx < ANIMATE_CHARS;
    const duration = durations[idx] ?? 1;
    return (
      <span
        style={{
          ...style,
          display: "inline-block",
          opacity: shouldAnimate ? 0 : 1,
          animation: shouldAnimate ? `char-fade-in ${duration}s ease-out forwards` : "none",
          whiteSpace: "pre",
        }}
      >
        {char}
      </span>
    );
  };

  const animatedRuby = (parts: string[]) => {
    return parts.map((r, j) => {
      const chars = Array.from(r).map((char, ci) => {
        const idx = charIndex++;
        const shouldAnimate = idx < ANIMATE_CHARS;
        const duration = durations[idx] ?? 1;
        return (
          <span
            key={ci}
            style={{
              display: "inline-block",
              opacity: shouldAnimate ? 0 : 1,
              animation: shouldAnimate ? `char-fade-in ${duration}s ease-out forwards` : "none",
            }}
          >
            {char}
          </span>
        );
      });
      return (
        <span key={j}>
          {chars}
          {j < parts.length - 1 && <br />}
        </span>
      );
    });
  };

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
      <style>{`
        @keyframes char-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      {segments.map((seg, i) => {
        if (seg.type === "newline") {
          return <br key={i} />;
        }
        if (seg.type === "ruby" && seg.ruby) {
          return (
            <ruby key={i} style={{ color: colors.textEmphasis, verticalAlign: "bottom" } as React.CSSProperties}>
              {Array.from(seg.content).map((char, ci) => (
                <span key={ci}>{animatedChar(char, { color: colors.textEmphasis })}</span>
              ))}
              <rt style={{
                fontSize: getRubyFontSize(seg.ruby),
                color: colors.rubyText,
                fontWeight: "normal",
                letterSpacing: "0.02em",
                lineHeight: "1",
              }}>
                {animatedRuby(seg.ruby)}
              </rt>
            </ruby>
          );
        }
        return (
          <span key={i}>
            {Array.from(seg.content).map((char, ci) => (
              <span key={ci}>{animatedChar(char)}</span>
            ))}
          </span>
        );
      })}
    </p>
  );
}
