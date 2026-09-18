import { parseGoogleSheetsCSV } from "./csv";
import type { Quote } from "./types";

export type QuoteLoadSource = "google-sheets" | "local-storage" | "fallback-csv";

export interface QuoteLoadResult {
  quotes: Quote[];
  source: QuoteLoadSource;
}

export const QUOTES_CACHE_KEY = "quotes_cache";

export function saveQuotesCache(quotes: Quote[]): void {
  try {
    localStorage.setItem(QUOTES_CACHE_KEY, JSON.stringify(quotes));
  } catch {}
}

// 받는 동안 얼마나 왔는지 알려 주는 자리.
//   0~1 - 이만큼 왔다
//   null - 얼마나 오는지 서버가 말해 주지 않았다 (숫자 대신 흐르는 막대를 보여 주면 된다)
export type ProgressFn = (ratio: number | null) => void;

async function fetchCSV(
  url: string,
  timeoutMs = 8000,
  cache: RequestCache = "no-store",
  onProgress?: ProgressFn,
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { cache, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (!onProgress || !response.body) return await response.text();

    // Content-Length 는 '줄여서 보낸 뒤의' 크기인데, 손에 들어오는 조각은 이미 풀린 것이라
    // 둘을 견주면 금세 100% 를 넘어선다. 줄여 보냈다고 하면(Content-Encoding) 아예
    // 모르는 것으로 치고 흐르는 막대를 보여 준다 - 엉터리 숫자보다 낫다.
    const squeezed = response.headers.get("Content-Encoding");
    const total = squeezed ? 0 : Number(response.headers.get("Content-Length") ?? 0);
    if (!total) onProgress(null);

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (total) onProgress(Math.min(1, received / total));
    }
    onProgress(1);

    const merged = new Uint8Array(received);
    let at = 0;
    for (const chunk of chunks) { merged.set(chunk, at); at += chunk.length; }
    return new TextDecoder("utf-8").decode(merged);
  } finally {
    clearTimeout(timeoutId);
  }
}

// 저장소에 함께 실려 있는 CSV (매일 시트에서 갱신된다).
//
// 주소에 시각을 붙이거나 no-store 를 쓰면 300KB 를 매번 새로 받는다.
// 그냥 두면 브라우저가 "이거 바뀌었나요?" 하고 물어보고(ETag),
// 그대로면 서버가 304 만 돌려주므로 받는 양이 0 이 된다. 바뀌었으면 그때 받는다.
export async function loadBundledQuotes(onProgress?: ProgressFn): Promise<Quote[]> {
  const csvText = await fetchCSV("/quotes_export.csv", 8000, "default", onProgress);
  return parseGoogleSheetsCSV(csvText);
}

// 앱 시작 시: localStorage → 로컬 CSV 순서로 로드
export async function loadQuotes(onProgress?: ProgressFn): Promise<QuoteLoadResult> {
  // localStorage 확인
  try {
    const cached = localStorage.getItem(QUOTES_CACHE_KEY);
    if (cached) {
      const quotes = JSON.parse(cached) as Quote[];
      if (quotes.length > 0) {
        return { quotes, source: "local-storage" };
      }
    }
  } catch {
    // localStorage 접근 실패 시 무시
  }

  // 로컬 CSV 폴백
  return { quotes: await loadBundledQuotes(onProgress), source: "fallback-csv" };
}

// 우측 버튼: Google Sheets에서 가져와서 localStorage에 저장
// 시트 주소는 서버(/api/quotes)만 알고 있다 - 브라우저에 노출하지 않기 위해서다
export async function syncFromGoogleSheets(): Promise<QuoteLoadResult> {
  // Apps Script 를 거치므로 기본값(8초)보다 넉넉히 기다린다
  const csvText = await fetchCSV(`/api/quotes?t=${Date.now()}`, 20000);
  const quotes = parseGoogleSheetsCSV(csvText);

  if (quotes.length === 0) {
    throw new Error("Google Sheets에서 자료를 가져오지 못했습니다.");
  }

  // localStorage에 저장
  saveQuotesCache(quotes);

  return { quotes, source: "google-sheets" };
}
