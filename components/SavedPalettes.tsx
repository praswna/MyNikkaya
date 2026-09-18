"use client";

import { useState } from "react";
import { deletePalette, renamePalette, sameColors, savePalette, useSavedPalettes } from "@/lib/saved-palettes";
import { type ThemeColors } from "@/lib/theme";

export function SavedPalettes({ colors, onApply }: { colors: ThemeColors; onApply: (colors: ThemeColors) => void }) {
  const saved = useSavedPalettes();
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState(false);
  const buttonStyle = { color: colors.text, backgroundColor: colors.bg, border: `1px solid ${colors.border}` };
  const act = (action: () => void) => {
    try { action(); } catch { setMessage("저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요."); }
  };
  return (
    <section aria-label="내 배색" className="mb-2 px-1">
      <div className="flex items-center gap-1">
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}
          className="min-h-9 flex-1 text-left text-[11px] font-medium" style={{ color: colors.text }}>
          {expanded ? "▾" : "▸"} 내 배색 {saved.length > 0 && `(${saved.length})`}
        </button>
        <button type="button" className="min-h-9 rounded-lg px-2 text-[11px]" style={buttonStyle}
          onClick={() => act(() => {
            const result = savePalette(colors);
            setExpanded(true);
            setMessage(result.exists ? `${result.palette.name}에 이미 저장되어 있어요.` : `${result.palette.name} 저장됨`);
          })}>현재 배색 저장</button>
      </div>
      {message && <p role="status" className="my-1 text-[10px]" style={{ color: colors.textMuted }}>{message}</p>}
      {expanded && <>
        <p className="mb-1 text-[10px]" style={{ color: colors.textMuted }}>이 브라우저에 저장됩니다. 이름을 눌러 다시 적용하세요.</p>
        {saved.length === 0 && <p className="py-1 text-[11px]" style={{ color: colors.textMuted }}>마음에 드는 배색을 저장해 보세요.</p>}
        {saved.map((item) => editing === item.id ? (
          <form key={item.id} className="my-1 flex flex-wrap gap-1" onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) { setMessage("이름을 입력해 주세요."); return; }
            act(() => { renamePalette(item.id, name); setEditing(null); setMessage("이름을 바꿨습니다."); });
          }}>
            <input autoFocus aria-label="배색 이름" maxLength={32} value={name} onChange={(e) => setName(e.target.value)}
              className="min-h-9 w-full rounded-lg px-2 text-base" style={buttonStyle} />
            <button type="submit" className="min-h-9 rounded-lg px-2 text-[11px]" style={buttonStyle}>이름 저장</button>
            <button type="button" className="min-h-9 px-2 text-[11px]" style={{ color: colors.textMuted }} onClick={() => setEditing(null)}>취소</button>
          </form>
        ) : (
          <div key={item.id} className="my-1 flex items-center gap-1">
            <button type="button" aria-label={`${item.name} 적용`} aria-pressed={sameColors(item.colors, colors)}
              onClick={() => { onApply(item.colors); setMessage(`${item.name} 적용됨`); }}
              className="flex min-h-10 min-w-0 flex-1 items-center gap-1.5 rounded-lg px-2 text-[11px]" style={buttonStyle}>
              <span aria-hidden="true" className="flex shrink-0 gap-0.5">{[item.colors.bg, item.colors.textBold].map((c, i) =>
                <span key={i} className="h-3 w-3 rounded-full" style={{ backgroundColor: c, border: `1px solid ${colors.border}` }} />)}</span>
              <span className="truncate">{sameColors(item.colors, colors) && "✓ "}{item.name}</span>
            </button>
            <button type="button" aria-label={`${item.name} 이름 변경`} className="min-h-10 px-1 text-[10px]" style={{ color: colors.textMuted }}
              onClick={() => { setEditing(item.id); setName(item.name); setMessage(""); }}>이름</button>
            <button type="button" aria-label={`${item.name} 삭제`} className="min-h-10 px-1 text-[10px]" style={{ color: colors.textMuted }}
              onClick={() => act(() => { deletePalette(item.id); setMessage(`${item.name} 삭제됨`); })}>삭제</button>
          </div>
        ))}
      </>}
    </section>
  );
}
