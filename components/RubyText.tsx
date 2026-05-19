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

function getRubyFontSize(parts: string[]): string {
  const maxLen = Math.max(...parts.map((r) => r.length));
  if (maxLen > 12) return "0.38em";
  if (maxLen > 8)  return "0.44em";
  if (maxLen > 4)  return "0.50em";
  return "0.55em";
}

// 시드 기반 의사 난수 (텍스트별로 일관된 랜덤)
function seededRandom(seed: number) {
  return ((seed * 9301 + 49297) % 233280) / 233280;
}

export function RubyText({ text, fontSize, lineHeight, colors, animationKey }: RubyTextProps) {
  const segments = parseRubyText(text);

  // 각 글자별 랜덤 딜레이 (animationKey가 바뀌면 새로 계산)
  const durations = useMemo(() => {
    const seedBase = animationKey ? animationKey.length : 0;
    return Array.from({ length: text.length }, (_, i) => {
      const rand = seededRandom(seedBase + i * 7);
      return 0.4 + rand * 1.4; // 0.4초 ~ 1.8초
    });
  }, [text, animationKey]);

  let charIndex = 0;

  const renderText = (str: string, baseStyle?: React.CSSProperties) => {
    return Array.from(str).map((char, i) => {
      const idx = charIndex++;
      const duration = durations[idx] ?? 1;
      const shouldAnimate = idx < 20;
      return (
        <span
          key={i}
          style={{
            ...baseStyle,
            display: "inline-block",
            opacity: shouldAnimate ? 0 : 1,
            animation: shouldAnimate ? `char-fade-in ${duration}s ease-out forwards` : "none",
            whiteSpace: "pre",
          }}
        >
          {char}
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
          const baseChars = renderText(seg.content, { color: colors.textEmphasis });
          return (
            <ruby key={i} style={{ color: colors.textEmphasis, verticalAlign: "bottom" } as React.CSSProperties}>
              {baseChars}
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
        return <span key={i}>{renderText(seg.content)}</span>;
      })}
    </p>
  );
}
