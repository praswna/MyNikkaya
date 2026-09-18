"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { DEFAULT_COLORS } from "@/lib/color-storage";
import { mergeColors, useColorActions, useColorOverrides } from "@/lib/colors";
import { type ThemeColors } from "@/lib/theme";
import { useEscape } from "@/lib/use-escape";

// 색 조절 2 - 색 동그라미를 그 색이 칠해진 글자 바로 옆에 띄운다.
//
// 색 조절 창은 묶음을 한 번에 하나만 펼치므로 제목색과 부분강조색을 나란히 볼 수 없다.
// 여기서는 조절기를 전부 동시에, 각자 실제로 칠해진 글자 옆에 둔다.
//
// 동그라미는 '요소마다'가 아니라 '색 종류마다' 하나씩이다 - 제목이 세 번 나와도 바꾸는 값은
// textBold 하나뿐이라, 발생 위치마다 띄우면 같은 값을 바꾸는 동그라미가 수십 개 뜬다.
// 그래서 종류마다 화면에 처음 나온 자리 옆에 붙인다.
//
// 동그라미를 누르면 브라우저·운영체제의 색 고르개가 그 자리에 열린다
// (<input type="color"> 를 동그라미 크기로 덮어 두었다).

interface PinSpec {
  key: keyof ThemeColors;
  // 동그라미 위에 얹는 짧은 이름 - 무엇을 바꾸는 동그라미인지 보고 알 수 있게 한다
  name: string;
  // 표시 기호까지 붙인 긴 이름 (읽어 주는 이름·툴팁에 쓴다)
  label: string;
  // 본문에서 이 색이 칠해진 조각을 찾는 표식 (RubyText 가 data-mark 로 붙여 둔다).
  // "body" 는 본문 전체를 감싼 뿌리다 - 바탕·평문처럼 특정 조각이 없는 색이 여기 기댄다.
  mark: string;
  // 기댈 조각의 어느 쪽에 붙일지. 바탕과 평문은 같은 뿌리에 기대므로 좌우로 갈라 둔다.
  side: "left" | "right";
}

// 아래 차례는 본문에서 같은 자리에 겹쳤을 때만 쓴다 - 실제 차례는 글에 나온 순서를 따른다.
const PIN_SPECS: PinSpec[] = [
  { key: "bg", name: "배경색", label: "배경", mark: "body", side: "left" },
  { key: "text", name: "평문색", label: "평문", mark: "plain", side: "right" },
  { key: "textBold", name: "제목색", label: "제목 [[ ]]", mark: "bold", side: "right" },
  { key: "textAccent", name: "강조색", label: "부분강조 [ ]", mark: "accent", side: "right" },
  { key: "textEmphasis", name: "딸림글색", label: "딸림글 낱말{루비}", mark: "ruby", side: "right" },
  { key: "talkText", name: "대화색", label: "대화 글자 > <", mark: "talk", side: "right" },
  { key: "sayText", name: "말씀색", label: "말씀 글자 >> <<", mark: "say", side: "right" },
  // 판 바탕은 같은 판에 기대므로, 글자색은 판 오른쪽에 바탕색은 왼쪽에 갈라 붙인다
  { key: "talkBg", name: "대화판색", label: "대화 판 바탕 > <", mark: "talk", side: "left" },
  { key: "sayBg", name: "말씀판색", label: "말씀 판 바탕 >> <<", mark: "say", side: "left" },
];

const DOT = 22;    // 동그라미 지름
const GAP = 6;     // 글자와의 사이
const EDGE = 6;    // 화면 가장자리 여백
const NAME_H = 13; // 동그라미 위에 얹는 이름 줄 높이
// 아래쪽 버튼 줄이 차지하는 높이 - 거기 놓으면 버튼에 가려 보이지도, 눌리지도 않는다
const BOTTOM = 110;

interface Placed {
  spec: PinSpec;
  left: number;
  top: number;
}

// 동그라미를 기댈 글자 바로 옆에 놓는다.
//
// 겹칠 때는 아래로만 민다 - 서로를 넘어서지 않아야 위에서 아래로 읽는 차례가 글과 같아진다.
// 미는 것은 세로로 겹치면서 가로로도 겹칠 때뿐이다 (멀리 떨어진 동그라미는 건드리지 않는다).
function layout(
  items: { spec: PinSpec; anchor: DOMRect }[],
  viewport: { width: number; height: number },
): Placed[] {
  const minTop = EDGE + NAME_H;
  const maxTop = viewport.height - DOT - EDGE - BOTTOM;
  const step = DOT + NAME_H + 2; // 이름 줄까지 셈한 사이 - 아래 이름이 위 동그라미에 깔리지 않게

  const placed: Placed[] = [];
  for (const { spec, anchor } of items) {
    const left = spec.side === "right"
      ? Math.min(anchor.right + GAP, viewport.width - DOT - EDGE)
      : Math.max(anchor.left - DOT - GAP, EDGE);
    let top = Math.max(minTop, Math.min(anchor.top + (anchor.height - DOT) / 2, maxTop));
    // 같은 세로줄에서 겹치면 아래로만 민다 - 서로를 넘어서지 않아야 글에 나온 차례가 지켜진다
    for (const other of placed) {
      if (Math.abs(other.left - left) < DOT + 2 && top < other.top + step) top = other.top + step;
    }
    placed.push({ spec, left, top });
  }

  // 아래로만 밀다 보면 마지막 동그라미가 화면 밖으로 나간다.
  // 그 세로줄을 통째로 끌어올리고, 그래도 모자라면 위에서부터 차곡차곡 쌓는다 - 차례는 그대로다.
  const columns = new Map<number, Placed[]>();
  for (const pin of placed) {
    const column = Math.round(pin.left / (DOT + 2));
    const group = columns.get(column);
    if (group) group.push(pin); else columns.set(column, [pin]);
  }
  for (const group of columns.values()) {
    const overflow = Math.max(...group.map((pin) => pin.top)) - maxTop;
    if (overflow <= 0) continue;
    let ceiling = minTop;
    for (const pin of group) {
      pin.top = Math.max(ceiling, pin.top - overflow);
      ceiling = pin.top + step;
    }
  }
  return placed;
}

export function ColorPins({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const overrides = useColorOverrides();
  const { setColor } = useColorActions();
  const colors = mergeColors(overrides);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const frame = useRef(0);

  useEscape(isOpen, onClose);

  // 기댈 조각의 자리를 잰다. 본문이 스크롤되거나 창 크기가 바뀌면 다시 잰다.
  const measure = useCallback(() => {
    const body = document.querySelector<HTMLElement>('[data-mark="body"]');
    if (!body) { setPlaced([]); return; }
    // 평문 덩어리는 제목·부분강조·딸림글까지 품고 있어서, 첫 줄이 곧 제목 줄인 일이 잦다.
    // 그 줄에 붙이면 제목 동그라미와 같은 자리를 다투므로, 다른 표시가 없는 줄을 골라 붙인다.
    const taken: DOMRect[] = [];
    for (const mark of ["bold", "accent", "ruby"]) {
      for (const el of body.querySelectorAll<HTMLElement>(`[data-mark="${mark}"]`)) {
        taken.push(...Array.from(el.getClientRects()));
      }
    }
    const clean = (r: DOMRect) => !taken.some((t) => r.top < t.bottom && t.top < r.bottom);

    const items: { spec: PinSpec; anchor: DOMRect }[] = [];
    for (const spec of PIN_SPECS) {
      const el = spec.mark === "body" ? body : body.querySelector<HTMLElement>(`[data-mark="${spec.mark}"]`);
      if (!el) continue; // 이 글에 안 쓰인 표시는 동그라미도 띄우지 않는다
      // 줄바꿈된 조각을 통째로 재면 여러 줄을 덮는 큰 상자가 나온다 -
      // 줄 하나의 상자를 써야 동그라미가 그 글자 바로 옆에 붙는다.
      const rects = Array.from(el.getClientRects());
      const r = (spec.mark === "plain" ? rects.find(clean) : undefined)
        ?? rects[0] ?? el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      // 글이 길면 조각이 화면 위아래로 뻗어 나간다 - 그 상자의 가운데는 화면 밖이다.
      // 보이는 만큼만 잘라서 재야 동그라미가 눈에 보이는 자리에 붙는다.
      const top = Math.max(r.top, 0);
      const bottom = Math.min(r.bottom, window.innerHeight);
      items.push({ spec, anchor: new DOMRect(r.left, top, r.width, Math.max(bottom - top, 0)) });
    }
    // 글에 나온 순서 - 같은 높이면 위 PIN_SPECS 차례를 따른다
    items.sort((a, b) => a.anchor.top - b.anchor.top
      || PIN_SPECS.indexOf(a.spec) - PIN_SPECS.indexOf(b.spec));
    setPlaced(layout(items, { width: window.innerWidth, height: window.innerHeight }));
  }, []);

  // 자리 재기는 한 그림틀에 한 번만 - 스크롤 중에 매 이벤트마다 재면 동그라미가 떨린다
  const remeasure = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(measure);
  }, [measure]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const again = remeasure;
    again(); // 열린 다음 한 그림틀 뒤에 잰다 - 그래야 글이 자리잡은 뒤의 값을 얻는다
    // 본문 스크롤은 안쪽 상자에서 일어나므로 캡처 단계로 받는다
    window.addEventListener("scroll", again, true);
    window.addEventListener("resize", again);
    const body = document.querySelector<HTMLElement>('[data-mark="body"]');
    const observer = body ? new ResizeObserver(again) : null;
    if (body && observer) observer.observe(body);
    return () => {
      cancelAnimationFrame(frame.current);
      window.removeEventListener("scroll", again, true);
      window.removeEventListener("resize", again);
      observer?.disconnect();
    };
  }, [isOpen, remeasure]);

  // 색이 바뀌면 글자 자리도 달라질 수 있다 (판 바탕이 생기거나 사라지는 등)
  useEffect(() => { if (isOpen) remeasure(); }, [isOpen, remeasure, colors.text]);

  if (!isOpen) return null;

  return (
    <>
      {placed.map(({ spec, left, top }) => {
        const value = colors[spec.key];
        const changed = value !== DEFAULT_COLORS[spec.key];
        return (
          <div
            key={spec.key}
            className="fixed z-50 rounded-full shadow-lg"
            style={{
              left, top, width: DOT, height: DOT,
              backgroundColor: value,
              // 바탕색 동그라미는 배경에 묻히므로 테두리로 테를 두른다.
              // 사람이 바꾼 색은 테를 진하게 해서 건드린 자리를 알아볼 수 있게 한다.
              border: `2px solid ${changed ? colors.textBold : colors.border}`,
            }}
          >
            {/* 동그라미를 누르면 이 고르개가 열린다 - 보이지 않게 덮어 두고 자리만 맞춘다.
                (색 조각을 직접 input 으로 그리면 브라우저마다 모서리 모양이 제각각이다) */}
            <input
              type="color"
              value={value}
              aria-label={`${spec.label} 색`}
              title={spec.label}
              onInput={(e) => setColor(spec.key, e.currentTarget.value.toUpperCase())}
              className="h-full w-full cursor-pointer rounded-full opacity-0"
              style={{ padding: 0, border: "none", background: "transparent" }}
            />
            {/* 이름 - 동그라미만으로는 무엇을 바꾸는 색인지 알 수 없다.
                글 위에 얹히므로 판 바탕을 깔아 본문과 섞이지 않게 한다.
                누르는 것은 동그라미가 맡으므로 이름은 건드려지지 않는다. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-1 text-[9px] leading-[12px]"
              style={{
                bottom: DOT + 1,
                backgroundColor: colors.bgSecondary,
                color: colors.textMuted,
                border: `1px solid ${colors.border}`,
              }}
            >{spec.name}</span>
          </div>
        );
      })}

      {/* 닫기 - 동그라미는 글자 옆에 흩어져 있으므로 닫는 자리는 하나만 둔다 */}
      <button
        type="button"
        onClick={onClose}
        aria-label="색 조절 2 닫기"
        className="fixed z-50 rounded-full px-3 py-1.5 text-[11px] font-medium shadow-lg"
        style={{
          left: EDGE,
          bottom: "calc(env(safe-area-inset-bottom) + 6.5rem)",
          backgroundColor: colors.categorySelected,
          color: colors.categorySelectedText,
        }}
      >색 조절 2 닫기 ✕</button>

      {placed.length === 0 && (
        <p
          role="status"
          className="fixed left-1/2 z-50 -translate-x-1/2 rounded-lg px-3 py-1.5 text-[11px]"
          style={{
            bottom: "calc(env(safe-area-inset-bottom) + 9.5rem)",
            backgroundColor: colors.bgSecondary, color: colors.textMuted,
            border: `1px solid ${colors.border}`,
          }}
        >기댈 글이 없습니다. 글을 띄운 뒤 다시 열어 주세요.</p>
      )}
    </>
  );
}
