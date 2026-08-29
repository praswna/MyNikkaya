"use client";

import { useState } from "react";
import { parseRubyText, withNote } from "@/lib/ruby";
import { ThemeColors } from "@/lib/theme";
import { RubySegment } from "@/lib/types";

interface RubyTextProps {
  text: string;
  fontSize: number;
  lineHeight: string;
  colors: ThemeColors;
  // 주석을 추가/수정하면 바뀐 명언 원문 전체를 돌려준다 (없으면 읽기 전용)
  onTextChange?: (newText: string) => void;
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
  editable: boolean,
  onRubyOpen: (seg: RubySegment) => void,
): React.ReactNode {
  if (seg.type === "newline") {
    return <br key={i} />;
  }
  if (seg.type === "bold" && seg.innerSegments) {
    return (
      <strong key={i} style={{ color: colors.textBold, fontWeight: 900 }}>
        {seg.innerSegments.map((inner, j) => renderSegment(inner, j, colors, true, editable, onRubyOpen))}
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
    // 주석이 있거나(보기), 편집이 가능하면(주석 추가) 누를 수 있다
    const open = editable || seg.note ? () => onRubyOpen(seg) : undefined;
    return (
      <ruby
        key={i}
        onClick={open}
        role={open ? "button" : undefined}
        tabIndex={open ? 0 : undefined}
        aria-label={open ? `${seg.content} 주석` : undefined}
        onKeyDown={open ? (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        } : undefined}
        style={{
          color: bold ? colors.textBold : colors.textEmphasis,
          verticalAlign: "bottom",
          fontSize: getBaseFontSize(seg.content),
          cursor: open ? "pointer" : undefined,
          outline: "none",
        } as React.CSSProperties}
      >
        {/* 주석이 달린 단어만 점선 밑줄로 표시 */}
        {seg.note ? (
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
        }}>
          {/* 루비 조각을 위아래로 쌓는다.
              크롬은 rt 안에서 줄바꿈(\n, <br>, 블록 자식)을 모두 무시하고 한 줄로 붙여버린다.
              별도의 서식 문맥을 만드는 상자(inline-flex)로 감싸야 크롬에서도 줄이 나뉜다.
              사파리(아이폰)는 원래 잘 나뉘었고 이 방식도 그대로 나뉜다. */}
          <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
            {seg.ruby.map((part, k) => (
              <span key={k}>{part}</span>
            ))}
          </span>
        </rt>
      </ruby>
    );
  }
  return <span key={i}>{seg.content}</span>;
}

// 루비 주석 팝업 - 보기 / 추가 / 수정 / 삭제 (QRModal 과 동일한 오버레이 패턴)
function NoteModal({
  seg,
  onClose,
  onSave,
  colors,
  editable,
}: {
  seg: RubySegment;
  onClose: () => void;
  onSave: (note: string) => void;
  colors: ThemeColors;
  editable: boolean;
}) {
  // 주석이 없는 단어를 누른 경우엔 바로 입력 화면으로 연다
  const [isEditing, setIsEditing] = useState(editable && !seg.note);
  const [draft, setDraft] = useState(seg.note ?? "");

  const buttonBase = "flex-1 rounded-xl py-2.5 text-sm font-medium";
  const subtleStyle = { backgroundColor: colors.bg, color: colors.textMuted, border: `1px solid ${colors.border}` };
  const primaryStyle = { backgroundColor: colors.categorySelected, color: colors.categorySelectedText };

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-[88vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 shadow-2xl"
        style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}` }}
      >
        <p className="text-lg font-semibold text-center" style={{ color: colors.textEmphasis }}>
          {seg.content}
        </p>
        {seg.ruby && seg.ruby.length > 0 && (
          <p className="mt-1 text-xs text-center" style={{ color: colors.rubyText }}>
            {seg.ruby.join(" · ")}
          </p>
        )}

        {isEditing ? (
          <>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              rows={5}
              placeholder="이 단어에 대한 주석을 적어주세요"
              className="mt-4 w-full rounded-xl p-3 text-sm resize-none outline-none"
              style={{
                backgroundColor: colors.bg,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                fontFamily: "inherit",
                lineHeight: "1.6",
              }}
            />
            <div className="mt-4 flex gap-2">
              <button onClick={onClose} className={buttonBase} style={subtleStyle}>취소</button>
              {seg.note && (
                <button onClick={() => onSave("")} className={buttonBase} style={subtleStyle}>삭제</button>
              )}
              <button onClick={() => onSave(draft)} className={buttonBase} style={primaryStyle}>저장</button>
            </div>
          </>
        ) : (
          <>
            <div
              className="mt-4 max-h-[45vh] overflow-y-auto text-sm"
              style={{
                color: colors.text,
                lineHeight: "1.7",
                whiteSpace: "pre-line",
                wordBreak: "keep-all",
                borderTop: `1px solid ${colors.border}`,
                paddingTop: "1rem",
              }}
            >
              {seg.note}
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={onClose} className={buttonBase} style={subtleStyle}>닫기</button>
              {editable && (
                <button onClick={() => setIsEditing(true)} className={buttonBase} style={primaryStyle}>주석 수정</button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export function RubyText({ text, fontSize, lineHeight, colors, onTextChange }: RubyTextProps) {
  const segments = parseRubyText(text);
  const [activeSeg, setActiveSeg] = useState<RubySegment | null>(null);

  // 명언이 바뀌면 열려 있던 주석 팝업은 닫기 (렌더 중 상태 조정 패턴)
  const [noteOwnerText, setNoteOwnerText] = useState(text);
  if (noteOwnerText !== text) {
    setNoteOwnerText(text);
    setActiveSeg(null);
  }

  const editable = Boolean(onTextChange);
  const handleSave = (note: string) => {
    if (!activeSeg || !onTextChange) return;
    const next = withNote(text, activeSeg, note);
    setActiveSeg(null);
    if (next !== text) onTextChange(next);
  };

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
        {segments.map((seg, i) => renderSegment(seg, i, colors, false, editable, setActiveSeg))}
      </p>
      {activeSeg && (
        <NoteModal
          key={`${activeSeg.braceStart}-${activeSeg.note ?? ""}`}
          seg={activeSeg}
          editable={editable}
          onClose={() => setActiveSeg(null)}
          onSave={handleSave}
          colors={colors}
        />
      )}
    </>
  );
}
