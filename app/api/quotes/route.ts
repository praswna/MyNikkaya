// 시트 주소를 브라우저에 내보내지 않기 위해 서버가 대신 받아 온다.
// (NEXT_PUBLIC_ 을 붙이면 그 값이 브라우저 번들에 그대로 박힌다)
//
// Vercel 환경변수: GOOGLE_SHEETS_URL = https://script.google.com/…/exec?format=csv
// 값을 바꾼 뒤에는 재배포해야 적용된다.

const SHEETS_URL = process.env.GOOGLE_SHEETS_URL;

// Apps Script 는 첫 요청이 느릴 수 있어 넉넉히 기다린다
const TIMEOUT_MS = 15000;

export async function GET() {
  if (!SHEETS_URL) {
    return Response.json({ error: "GOOGLE_SHEETS_URL이 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const separator = SHEETS_URL.includes("?") ? "&" : "?";
    const res = await fetch(`${SHEETS_URL}${separator}t=${Date.now()}`, {
      cache: "no-store",
      redirect: "follow", // Apps Script 는 googleusercontent 로 한 번 돌려보낸다
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const csv = await res.text();
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("quotes 불러오기 실패:", err);
    return Response.json({ error: String(err) }, { status: 502 });
  }
}
