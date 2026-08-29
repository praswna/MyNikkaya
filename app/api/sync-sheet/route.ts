// 명언 본문을 구글 시트에 되돌려 쓰는 창구.
//
// 설정은 전부 환경변수로 둔다. 이 저장소는 공개라, 코드에 적으면 주소도 키도
// 그대로 새어 나가고 누구나 시트를 고칠 수 있게 된다.
//
//   APPS_SCRIPT_URL  Apps Script 웹앱 주소 (…/exec, ?format=csv 는 빼고)
//   APPS_SCRIPT_KEY  Apps Script 의 스크립트 속성 SECRET_KEY 와 같은 값
//   EDIT_PASSWORD    앱에서 본문을 고칠 때 물어보는 암호
//
// 셋 중 하나라도 없으면 저장 기능은 꺼진다.
// 설정하지 않은 곳(로컬 개발 등)에서 실수로 운영 시트를 고치지 않게 하기 위해서다.
// 값을 바꾼 뒤에는 재배포해야 적용된다.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

const TIMEOUT_MS = 20000;

// 길이가 다르면 그 사실만 새어 나가고, 같으면 내용 비교 시간이 일정하다
function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const scriptUrl = process.env.APPS_SCRIPT_URL;
  const scriptKey = process.env.APPS_SCRIPT_KEY;
  const editPassword = process.env.EDIT_PASSWORD;

  if (!scriptUrl || !scriptKey || !editPassword) {
    return NextResponse.json(
      { error: "저장 기능이 설정되지 않았습니다. (APPS_SCRIPT_URL · APPS_SCRIPT_KEY · EDIT_PASSWORD)" },
      { status: 503 },
    );
  }

  // 암호는 헤더가 아니라 본문에 담는다.
  // HTTP 헤더는 라틴-1 이라 한글 암호를 넣으면 브라우저가 요청 자체를 거부한다.
  let body: { oldText?: unknown; newText?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // 앱을 거치지 않고 이 주소로 바로 쏘는 것을 막는 관문.
  // 이게 없으면 주소만 아는 사람이 누구든 시트를 덮어쓸 수 있다.
  if (typeof body.password !== "string" || !sameSecret(body.password, editPassword)) {
    return NextResponse.json({ error: "편집 암호가 맞지 않습니다." }, { status: 401 });
  }

  try {
    const { oldText, newText } = body;
    if (typeof oldText !== "string" || typeof newText !== "string" || !oldText || !newText) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const formData = new URLSearchParams();
    formData.append("key", scriptKey);
    formData.append("oldText", oldText);
    formData.append("newText", newText);

    const res = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Apps Script HTTP ${res.status}`);

    // 명언 본문은 로그에 남기지 않는다 (배포 로그에 경전 전문이 쌓인다).
    // 다만 JSON 이 아닌 답(로그인 페이지 등)은 설정이 틀렸다는 뜻이라 앞부분만 남긴다.
    const raw = await res.text();
    try {
      return NextResponse.json(JSON.parse(raw));
    } catch {
      throw new Error(`Apps Script 가 JSON 을 주지 않았습니다: ${raw.slice(0, 100)}`);
    }
  } catch (err) {
    console.error("sync-sheet 오류:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "시트에 저장하지 못했습니다." }, { status: 502 });
  }
}
