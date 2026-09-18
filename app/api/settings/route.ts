// 시트의 "설정" 탭을 서버가 대신 받아 온다 (브라우저에서 곧장 부르면 CORS 에 막힌다).
// 읽기 주소는 글 CSV 와 같은 웹앱이므로 비밀이 아니다 - lib/config.ts 참고.

import { sheetReadUrl } from "@/lib/config";

// Apps Script 는 첫 요청이 느릴 수 있어 넉넉히 기다린다
const TIMEOUT_MS = 15000;

// 같은 웹앱의 다른 읽기 갈래다 - ?format=csv 를 ?format=settings 로만 바꾼다
function settingsUrl(): string {
  return sheetReadUrl("settings").toString();
}

export async function GET() {
  try {
    const res = await fetch(`${settingsUrl()}&t=${Date.now()}`, {
      cache: "no-store",
      redirect: "follow", // Apps Script 는 googleusercontent 로 한 번 돌려보낸다
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // 옛 Apps Script(설정 갈래를 모르는 판)는 JSON 이 아닌 것을 돌려줄 수 있다.
    // 그때는 설정이 비었다고 보고 넘어간다 - 앱은 지금 기기의 값을 그대로 쓴다.
    const raw = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return Response.json({ settings: {} }, { headers: { "Cache-Control": "no-store" } });
    }
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("설정 불러오기 실패:", err);
    return Response.json({ error: String(err) }, { status: 502 });
  }
}
