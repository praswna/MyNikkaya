"use client";

import { useState } from "react";
import { parseRubyText } from "@/lib/ruby";
import { ThemeColors } from "@/lib/theme";
import { RubySegment } from "@/lib/types";

interface RubyTextProps {
  text: string;
  fontSize: number;
  lineHeight: string;
  colors: ThemeColors;
}

// 주석 팝업에 표시할 내용
interface ActiveNote {
  base: string;    // 베이스 단어 (예: 불선법)
  ruby: string[];  // 루비 읽기들 (예: 不善法, unwholesome)
  note: string;    // 주석 본문
}

// 루비 베이스 텍스트 크기 - 너무 길면 자동 축소 (가로 스크롤 방지)
function getBaseFontSize(text: string): string {
  const len = text.length;
  if (len > 25) return "0.45em"; // 매우 긴 베이스
  if (len > 18) return "0.6em";  // 긴 베이스
  if (len > 12) return "0.8em";  // 중간 베이스
  return "1em";                  // 짧은 베이스 (기본)
}

// 루비 텍스트(위첨자) 크기 - 글자 수 기준 자동 조절
// 값이 작을수록 루비 텍스트가 작아짐
function getRubyFontSize(parts: string[]): string {
  const maxLen = Math.max(...parts.map((r) => r.length));
  if (maxLen > 12) return "0.38em"; // 매우 긴 루비
  if (maxLen > 8)  return "0.44em"; // 긴 루비
  if (maxLen > 4)  return "0.50em"; // 중간 루비
  return "0.55em";                  // 짧은 루비 (기본)
}

function renderSegment(
  seg: RubySegment,
  i: number,
  colors: ThemeColors,
  bold: boolean,
  onNoteOpen: (note: ActiveNote) => void,
): React.ReactNode {
  if (seg.type === "newline") {
    return <br key={i} />;
  }
  if (seg.type === "bold" && seg.innerSegments) {
    return (
      <strong key={i} style={{ color: colors.textBold, fontWeight: 900 }}>
        {seg.innerSegments.map((inner, j) => renderSegment(inner, j, colors, true, onNoteOpen))}
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
        style={{ color: colors.textEmphasis, textDecoration: "underline", wordBreak: "break-all", fontSize: "0.4em" /* 링크 텍스트 크기 */ }}
      >
        {seg.content}
      </a>
    );
  }
  if (seg.type === "ruby" && seg.ruby) {
    const note = seg.note;
    return (
      <ruby
        key={i}
        onClick={note ? () => onNoteOpen({ base: seg.content, ruby: seg.ruby ?? [], note }) : undefined}
        role={note ? "button" : undefined}
        tabIndex={note ? 0 : undefined}
        aria-label={note ? `${seg.content} 주석 보기` : undefined}
        onKeyDown={note ? (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onNoteOpen({ base: seg.content, ruby: seg.ruby ?? [], note });
          }
        } : undefined}
        style={{
          color: bold ? colors.textBold : colors.textEmphasis,
          verticalAlign: "bottom",
          fontSize: getBaseFontSize(seg.content),
          cursor: note ? "pointer" : undefined,
          outline: "none",
        } as React.CSSProperties}
      >
        {/* 주석이 있으면 베이스 단어에 점선 밑줄로 "누를 수 있음" 표시 */}
        {note ? (
          <span style={{ borderBottom: `1px dashed ${colors.rubyText}`, paddingBottom: "0.05em" }}>
            {seg.content}
          </span>
        ) : (
          seg.content
        )}
        <rt style={{
          fontSize: getRubyFontSize(seg.ruby),
          color: colors.rubyText,
          fontWeight: "normal",
          letterSpacing: "0.02em",
          lineHeight: "1",
          whiteSpace: "pre-line",
        }}>
          {seg.ruby.join("\n")}
        </rt>
      </ruby>
    );
  }
  return <span key={i}>{seg.content}</span>;
}

// 루비 주석 팝업 (QRModal 과 동일한 오버레이 패턴)
function NoteModal({ note, onClose, colors }: { note: ActiveNote | null; onClose: () => void; colors: ThemeColors }) {
  if (!note) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-[85vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 shadow-2xl"
        style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
      >
        <p className="text-lg font-semibold text-center" style={{ color: colors.textEmphasis }}>
          {note.base}
        </p>
        {note.ruby.length > 0 && (
          <p className="mt-1 text-xs text-center" style={{ color: colors.rubyText }}>
            {note.ruby.join(" · ")}
          </p>
        )}
        <div
          className="mt-4 max-h-[50vh] overflow-y-auto text-sm"
          style={{
            color: colors.text,
            lineHeight: "1.7",
            whiteSpace: "pre-line",
            wordBreak: "keep-all",
            borderTop: `1px solid ${colors.border}`,
            paddingTop: "1rem",
          }}
        >
          {note.note}
        </div>
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl py-3 text-sm font-medium"
          style={{ backgroundColor: colors.categorySelected, color: colors.categorySelectedText }}
        >닫기</button>
      </div>
    </>
  );
}

export function RubyText({ text, fontSize, lineHeight, colors }: RubyTextProps) {
  const segments = parseRubyText(text);
  const [activeNote, setActiveNote] = useState<ActiveNote | null>(null);

  // 명언이 바뀌면 열려 있던 주석 팝업은 닫기 (렌더 중 상태 조정 패턴)
  const [noteOwnerText, setNoteOwnerText] = useState(text);
  if (noteOwnerText !== text) {
    setNoteOwnerText(text);
    setActiveNote(null);
  }

  return (
    <>
      <p
        className="text-center font-semibold w-full"
        style={{
          fontSize,
          lineHeight,
          color: colors.text,
          wordBreak: "keep-all",
          overflowWrap: "break-word",
          maxWidth: "100%",
          overflowX: "hidden",
        }}
      >
        {segments.map((seg, i) => renderSegment(seg, i, colors, false, setActiveNote))}
      </p>
      <NoteModal note={activeNote} onClose={() => setActiveNote(null)} colors={colors} />
    </>
  );
}
