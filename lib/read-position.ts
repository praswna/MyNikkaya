// =============================================
// 읽던 자리 기억
//
// 대열반경처럼 4만 자짜리 경은 한 번에 다 못 읽는다.
// 명언마다 어디까지 봤는지 기억해 두었다가 다시 그 자리에서 이어 읽는다.
//
// 명언을 가리키는 이름표로 id(gs-1…)를 쓸 수 없다. CSV 를 읽을 때마다 새로
// 매겨져서 어제의 gs-5 와 오늘의 gs-5 가 다른 경일 수 있다. 그래서 본문으로 만든다.
// 본문을 고치면 이름표가 달라져 자리는 처음으로 돌아간다.
// =============================================

const STORAGE_KEY = "read_positions";
const KEEP = 30; // 최근 30개만 남긴다

type Positions = Record<string, number>;

function keyOf(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return `${text.length}:${hash}`;
}

function readAll(): Positions {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Positions) : {};
  } catch {
    return {};
  }
}

export function loadReadPosition(text: string): number {
  const top = readAll()[keyOf(text)];
  return typeof top === "number" && top > 0 ? top : 0;
}

export function saveReadPosition(text: string, top: number): void {
  try {
    const all = readAll();
    const key = keyOf(text);
    // 지웠다 다시 넣어야 최근 읽은 것이 뒤로 간다 (아래에서 앞쪽부터 버린다)
    delete all[key];
    if (top > 0) all[key] = Math.round(top); // 맨 위면 굳이 남기지 않는다

    // 오래된 것부터 버린다 (자바스크립트 객체는 넣은 순서를 지킨다)
    const keys = Object.keys(all);
    for (const old of keys.slice(0, Math.max(0, keys.length - KEEP))) delete all[old];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}
