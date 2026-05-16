import { parseGoogleSheetsCSV } from "./csv";
import type { Quote } from "./types";

export type QuoteLoadSource = "google-sheets" | "local-storage" | "fallback-csv";

export interface QuoteLoadResult {
  quotes: Quote[];
  source: QuoteLoadSource;
}

const STORAGE_KEY = "quotes_cache";

async function fetchCSV(url: string, timeoutMs = 8000): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

// 앱 시작 시: localStorage → 로컬 CSV 순서로 로드
export async function loadQuotes(): Promise<QuoteLoadResult> {
  // localStorage 확인
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
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
  const csvText = await fetchCSV(`/quotes_export.csv?t=${Date.now()}`);
  const quotes = parseGoogleSheetsCSV(csvText);
  return { quotes, source: "fallback-csv" };
}

// 우측 버튼: Google Sheets에서 가져와서 localStorage에 저장
export async function syncFromGoogleSheets(): Promise<QuoteLoadResult> {
  const googleSheetsUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_URL;

  if (!googleSheetsUrl) {
    throw new Error("Google Sheets URL이 설정되지 않았습니다.");
  }

  const csvText = await fetchCSV(`${googleSheetsUrl}&t=${Date.now()}`);
  const quotes = parseGoogleSheetsCSV(csvText);

  if (quotes.length === 0) {
    throw new Error("Google Sheets에서 명언을 가져오지 못했습니다.");
  }

  // localStorage에 저장
  localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));

  return { quotes, source: "google-sheets" };
}
