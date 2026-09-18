// Server-side only: use this deployment's sheet, never the study-note sheet.
export function sheetReadUrl(format: "csv" | "settings" | "quiz"): URL {
  const configured = process.env.GOOGLE_SHEETS_URL || process.env.APPS_SCRIPT_URL;
  if (!configured) throw new Error("GOOGLE_SHEETS_URL이 설정되지 않았습니다.");
  const url = new URL(configured);
  url.searchParams.set("format", format);
  return url;
}
