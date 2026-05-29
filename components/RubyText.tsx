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

// =============================================
// 루비 텍스트(위첨자) 크기 자동 조절
// 루비 내용 글자 수 기준으로 크기 결정
// =============================================
function getRubyFontSize(parts: string[]): string {
  const maxLen = Math.max(...parts.map((r) => r.length));
  if (maxLen > 12) return "0.38em"; // 매우 긴 루비
  if (maxLen > 8)  return "0.44em"; // 긴 루비
  if (maxLen > 4)  return "0.50em"; // 중간 루비
  return "0.55em";                  // 짧은 루비
}

// =============================================
// 루비 베이스 텍스트 크기 자동 조절
// 루비 베이스 글자 수 기준으로 크기 결정
// 너무 길면 작아져서 가로 스크롤 방지
// =============================================
function getBaseFontSize(text: string): string {
  const len = text.length;
  if (len > 25) return "0.45em"; // 매우 긴 베이스
  if (len > 18) return "0.6em";  // 긴 베이스
  if (len > 12) return "0.8em";  // 중간 베이스
  return "1em";                  // 짧은 베이스 (기본)
}

// 세그먼트 하나를 렌더링 (bold 내부 재귀 지원)
function renderSegment(seg: RubySegment, i: number, colors: ThemeColors, bold: boolean): React.ReactNode {
  if (seg.type === "newline") {
    return <br key={i} />;
  }

  if (seg.type === "bold" && seg.innerSegments) {
    return (
      <strong key={i} style={{
        color: colors.textBold,
        fontWeight: 900,
        wordBreak: "break-word",
        overflowWrap: "break-word",
      }}>
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
        style={{
          color: colors.textEmphasis,
          textDecoration: "underline",
          wordBreak: "break-all",
          fontSize: "0.4em", // 링크 텍스트 크기 (기본 대비 40%)
        }}
      >
        {seg.content}
      </a>
    );
  }

  if (seg.type === "ruby" && seg.ruby) {
    return (
      <ruby key={i} style={{
        color: bold ? colors.textBold : colors.textEmphasis,
        verticalAlign: "bottom",
        fontSize: getBaseFontSize(seg.content), // 베이스 길이에 따라 자동 축소
      } as React.CSSProperties}>
        {seg.content}
        <rt style={{
          fontSize: getRubyFontSize(seg.ruby),
          color: colors.rubyText,
          fontWeight: "normal",
          letterSpacing: "0.02em",
          lineHeight: "1",
          whiteSpace: "pre-line", // 쉼표로 구분된 루비를 줄바꿈으로 표시
        }}>
          {seg.ruby.join("\n")}
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
        wordBreak: "break-word",        // 긴 단어 줄바꿈
        overflowWrap: "break-word",     // 가로 스크롤 방지
        maxWidth: "100%",
      }}
    >
      {segments.map((seg, i) => renderSegment(seg, i, colors, false))}
    </p>
  );
}
