// =============================================
// 읽기 ↔ 수정 전환할 때 위치 맞추기
//
// 본문 자리에서 바로 수정하므로, 읽고 있던 글자가 수정 상태에서도
// 같은 자리에 오도록 원문에서의 글자 위치(anchor)를 찾고 그 픽셀 높이를 잰다.
//
// 두 상태는 글자 모양이 완전히 다르다.
//   읽기: 물질{rūpa, 색}  →  '물질' 위에 작은 루비가 붙은 두 글자
//   수정: 물질{rūpa, 색}  →  그대로 12글자
// 그래서 '원문 글자 수 × 비율' 같은 단순 환산은 크게 어긋난다.
// =============================================

import { splitNoteBlock } from "./ruby";

// 원문에서 실제로 눈에 보이는(=읽기 화면에서 본문으로 흐르는) 글자만 센다.
// 루비 주석 {…} 안쪽과 굵게 표시 [[ ]] 기호는 본문 흐름을 차지하지 않으므로 뺀다.
function visiblePrefixLengths(text: string): number[] {
  const lengths = new Array<number>(text.length + 1);
  let visible = 0;
  let inAnnotation = false;

  for (let i = 0; i < text.length; i++) {
    lengths[i] = visible;
    const ch = text[i];

    if (ch === "{") {
      inAnnotation = true;
      continue;
    }
    if (ch === "}") {
      inAnnotation = false;
      continue;
    }
    if (inAnnotation) continue;
    if (ch === "[" && text[i + 1] === "[") continue;
    if (ch === "]" && text[i + 1] === "]") continue;
    if (ch === "[" && text[i - 1] === "[") continue;
    if (ch === "]" && text[i - 1] === "]") continue;

    visible++;
  }
  lengths[text.length] = visible;
  return lengths;
}

// 보이는 글자 기준 비율 → 원문 인덱스
export function sourceIndexForRatio(text: string, ratio: number): number {
  const lengths = visiblePrefixLengths(text);
  const total = lengths[text.length];
  if (total === 0) return 0;
  const targetVisible = Math.round(ratio * total);

  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (lengths[mid] < targetVisible) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// 읽기 화면 맨 위에 실제로 보이는 글자를 집어서 원문 위치를 찾는다.
// 비율로 낸 추정치(prior) 근처에서 찾으므로 반복되는 문구에도 헷갈리지 않는다.
//
// 화면 좌표로 훑는 caretPositionFromPoint는 설정 모달 같은 오버레이가 덮고 있으면
// 그 오버레이를 집어버린다. 수정 모드는 설정 모달에서도 들어오므로 가려진 경우가 있다.
// 그래서 히트 테스트 대신 글자 노드를 직접 훑어 Range 좌표로 위치를 잰다.
function textNodesOf(container: HTMLElement): Text[] {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = (node as Text).parentElement;
      if (!parent || parent.closest("rt")) return NodeFilter.FILTER_REJECT; // 루비 주석은 본문이 아니다
      return (node as Text).data.trim().length > 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  return nodes;
}

function rangeTop(node: Text, start: number, end: number): number | null {
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  const rect = range.getBoundingClientRect();
  return rect.height === 0 && rect.width === 0 ? null : rect.top;
}

function refineWithVisibleText(container: HTMLElement, text: string, prior: number): number {
  const nodes = textNodesOf(container);
  if (nodes.length === 0) return prior;

  const top = container.getBoundingClientRect().top;

  // 화면 상단선에 걸치거나 그 아래로 내려온 첫 글자 노드를 찾는다
  let hit: Text | null = null;
  for (const node of nodes) {
    const rect = document.createRange();
    rect.selectNodeContents(node);
    const box = rect.getBoundingClientRect();
    if (box.bottom > top + 1) { hit = node; break; }
  }
  if (!hit) return prior;

  // 노드 안에서 상단선에 가장 가까운 글자 위치를 이분탐색
  let lo = 0;
  let hi = hit.data.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const y = rangeTop(hit, mid, Math.min(mid + 1, hit.data.length));
    if (y === null) break;
    if (y < top - 1) lo = mid + 1;
    else hi = mid;
  }

  const snippet = hit.data.slice(lo).trim().slice(0, 14);
  if (snippet.length < 4) return prior;

  // prior에 가장 가까운 출현 위치를 고른다
  let best = -1;
  let from = 0;
  for (;;) {
    const at = text.indexOf(snippet, from);
    if (at < 0) break;
    if (best < 0 || Math.abs(at - prior) < Math.abs(best - prior)) best = at;
    from = at + 1;
  }
  return best >= 0 ? best : prior;
}

// 수정 모드로 들어갈 때 맞출 원문 위치
// 글 끝 각주 블록은 읽기 화면에 나오지 않으므로 본문만 놓고 센다.
// 본문은 원문의 앞부분이라 여기서 찾은 위치를 원문에 그대로 쓸 수 있다.
export function findEditAnchor(container: HTMLElement | null, text: string): number {
  if (!container) return 0;
  const scrollable = container.scrollHeight - container.clientHeight;
  if (scrollable <= 0) return 0;

  const body = splitNoteBlock(text).body;
  const ratio = Math.min(Math.max(container.scrollTop / scrollable, 0), 1);
  const prior = sourceIndexForRatio(body, ratio);
  try {
    return refineWithVisibleText(container, body, prior);
  } catch {
    return prior;
  }
}

// textarea 위쪽 끝에서 해당 원문 위치까지가 몇 px인지 잰다.
// 줄바꿈 개수만 세면 자동 줄바꿈(wrap)이 빠져서 크게 어긋나므로,
// 같은 글꼴·폭을 가진 숨은 div에 그대로 흘려보고 측정한다.
export function measureTextTop(ta: HTMLTextAreaElement, index: number): number {
  if (index <= 0) return 0;

  const cs = getComputedStyle(ta);
  const mirror = document.createElement("div");
  const copy = [
    "fontSize", "fontFamily", "fontWeight", "fontStyle", "letterSpacing",
    "lineHeight", "textTransform", "wordSpacing", "wordBreak", "overflowWrap",
    "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  ] as const;
  for (const key of copy) mirror.style[key] = cs[key];

  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.top = "0";
  mirror.style.left = "-9999px";
  mirror.style.height = "auto";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.boxSizing = "border-box";
  mirror.style.width = `${ta.clientWidth}px`;

  mirror.textContent = ta.value.slice(0, index);
  const marker = document.createElement("span");
  marker.textContent = "​";
  mirror.appendChild(marker);

  document.body.appendChild(mirror);
  const top = marker.offsetTop - (parseFloat(cs.paddingTop) || 0);
  mirror.remove();

  return Math.max(top, 0);
}
