"use client";

import { useMemo, useState } from "react";
import { ThemeColors } from "@/lib/theme";
import {
  CANON,
  buildCanonIndex,
  expandedIdsFor,
  allNodeIds,
  formatRef,
  type CanonNode,
  type CanonPlacement,
} from "@/lib/canon";
import type { Quote } from "@/lib/types";

interface CanonMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotes: Quote[];
  onSelectQuote: (quote: Quote) => void;
  colors: ThemeColors;
}

export function CanonMapModal({ isOpen, onClose, quotes, onSelectQuote, colors }: CanonMapModalProps) {
  const index = useMemo(() => buildCanonIndex(quotes), [quotes]);
  const [expanded, setExpanded] = useState<Set<string> | null>(null);
  const [ownedOnly, setOwnedOnly] = useState(true);

  // 처음 열릴 때는 보유한 경이 있는 가지만 펼쳐 둔다
  const openIds = expanded ?? expandedIdsFor(index);

  if (!isOpen) return null;

  const anyOpen = openIds.size > 0;
  const collapseAll = () => setExpanded(new Set());
  const expandAll = () => setExpanded(new Set(allNodeIds()));

  const toggle = (id: string) => {
    const next = new Set(openIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  const renderNode = (node: CanonNode, depth: number) => {
    const owned = index.subtreeCount[node.id] ?? 0;
    if (ownedOnly && owned === 0) return null;

    const here = index.byNode[node.id] ?? [];
    const visibleChildren = node.children ?? [];
    const hasChildren = visibleChildren.length > 0 || here.length > 0;
    const isOpen = openIds.has(node.id);

    return (
      <div key={node.id}>
        <button
          onClick={() => hasChildren && toggle(node.id)}
          className="flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 text-left transition-colors"
          style={{ paddingLeft: `${depth * 14 + 4}px`, cursor: hasChildren ? "pointer" : "default" }}
        >
          <span
            className="w-3 shrink-0 text-center text-[10px]"
            style={{ color: colors.textMuted, opacity: hasChildren ? 1 : 0 }}
          >
            {isOpen ? "▾" : "▸"}
          </span>
          <span className="min-w-0 flex-1">
            <span
              className="text-sm"
              style={{
                color: owned > 0 ? colors.textBold : colors.text,
                fontWeight: owned > 0 ? 600 : 400,
              }}
            >
              {node.ko}
            </span>
            {node.pali && (
              <span className="ml-1.5 text-[10px]" style={{ color: colors.rubyText }}>
                {node.pali}
              </span>
            )}
            {node.note && (
              <span className="ml-1.5 text-[10px]" style={{ color: colors.textMuted, opacity: 0.7 }}>
                {node.note}
              </span>
            )}
          </span>
          {owned > 0 && (
            <span
              className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: colors.categorySelected, color: colors.categorySelectedText }}
            >
              {owned}
            </span>
          )}
        </button>

        {isOpen && (
          <>
            {here.map((p) => renderQuote(p, depth + 1))}
            {visibleChildren.map((child) => renderNode(child, depth + 1))}
          </>
        )}
      </div>
    );
  };

  const renderQuote = (p: CanonPlacement, depth: number) => (
    <button
      key={p.quote.id}
      onClick={() => onSelectQuote(p.quote)}
      className="flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 text-left transition-transform active:scale-[0.99]"
      style={{ paddingLeft: `${depth * 14 + 4}px` }}
    >
      <span className="w-3 shrink-0 text-center text-[10px]" style={{ color: colors.textEmphasis }}>
        ·
      </span>
      <span className="min-w-0 flex-1 truncate text-sm" style={{ color: colors.textEmphasis }}>
        {p.title}
      </span>
      {p.ref && (
        <span className="shrink-0 text-[10px]" style={{ color: colors.textMuted }}>
          {formatRef(p.ref)}
        </span>
      )}
      <span className="shrink-0 text-[10px]" style={{ color: colors.textMuted }}>
        ›
      </span>
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{
        backgroundColor: colors.bg,
        paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)",
        paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)",
      }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 pb-2">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: colors.text }}>
            불교 경전 맵
          </h2>
          <p className="text-[11px]" style={{ color: colors.textMuted }}>
            삼장 구조 · 보유 {index.ownedTotal}
            {index.unplaced.length > 0 && ` · 미분류 ${index.unplaced.length}`}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="닫기"
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.bgSecondary }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* 보기 전환 */}
      <div className="flex items-center gap-2 px-4 pb-2">
        {[
          { key: true, label: "보유한 경만" },
          { key: false, label: "전체 구조" },
        ].map((opt) => (
          <button
            key={String(opt.key)}
            onClick={() => setOwnedOnly(opt.key)}
            className="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
            style={{
              backgroundColor: ownedOnly === opt.key ? colors.categorySelected : "transparent",
              borderColor: ownedOnly === opt.key ? colors.categorySelected : colors.categoryBorder,
              color: ownedOnly === opt.key ? colors.categorySelectedText : colors.categoryText,
            }}
          >
            {opt.label}
          </button>
        ))}

        <button
          onClick={anyOpen ? collapseAll : expandAll}
          className="ml-auto flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
          style={{ borderColor: colors.categoryBorder, color: colors.categoryText }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={colors.categoryText} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {anyOpen ? (
              <><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /></>
            ) : (
              <><polyline points="9 21 3 21 3 15" /><polyline points="15 3 21 3 21 9" /></>
            )}
          </svg>
          {anyOpen ? "전체 접기" : "전체 펼치기"}
        </button>
      </div>

      {/* 트리 */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
        {renderNode(CANON, 0)}

        {/* 경 번호를 찾지 못한 것들 */}
        {index.unplaced.length > 0 && (
          <div className="mt-4 border-t pt-3" style={{ borderColor: colors.border }}>
            <p className="mb-1 px-1 text-[11px] font-medium" style={{ color: colors.textMuted }}>
              경전 밖 · 출처 미표기
            </p>
            {index.unplaced.map((p) => renderQuote(p, 0))}
          </div>
        )}
      </div>
    </div>
  );
}
