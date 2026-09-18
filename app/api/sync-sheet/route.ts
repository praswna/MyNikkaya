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
  let body: { action?: unknown; category?: unknown; requestId?: unknown; id?: unknown; oldText?: unknown; newText?: unknown; oldCategory?: unknown; newCategory?: unknown; group?: unknown; entries?: unknown; password?: unknown };
  try {
    body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // 앱을 거치지 않고 이 주소로 바로 쏘는 것을 막는 관문.
  // 이게 없으면 주소만 아는 사람이 누구든 시트를 덮어쓸 수 있다.
  if (typeof body.password !== "string" || !sameSecret(body.password, editPassword)) {
    return NextResponse.json({ error: "편집 암호가 맞지 않습니다." }, { status: 401 });
  }

  try {
    const { id, oldText, newText } = body;

    const formData = new URLSearchParams();
    formData.append("key", scriptKey);

    // 삭제는 본문이 필요 없다 - 이름표(id)나 옛 본문으로 지울 행만 찾는다.
    if (body.action === "delete") {
      formData.append("action", "delete");
      if (typeof id === "string" && id) {
        formData.append("id", id);
      } else if (typeof oldText === "string" && oldText) {
        formData.append("oldText", oldText);
      } else {
        return NextResponse.json({ error: "Missing params" }, { status: 400 });
      }
    } else if (body.action === "renameCategory") {
      // 카테고리 이름 수정은 본문 없이, 그 이름을 쓰는 모든 행의 카테고리 칸만 바꾼다.
      const { oldCategory, newCategory } = body;
      if (typeof oldCategory !== "string" || !oldCategory.trim()
        || typeof newCategory !== "string" || !newCategory.trim()) {
        return NextResponse.json({ error: "Missing params" }, { status: 400 });
      }
      if (oldCategory.length > 50000 || newCategory.length > 50000) {
        return NextResponse.json({ error: "카테고리 이름은 50,000자 이내로 입력해주세요." }, { status: 400 });
      }
      formData.append("action", "renameCategory");
      formData.append("oldCategory", oldCategory.trim());
      formData.append("newCategory", newCategory.trim());
    } else if (body.action === "moveQuote") {
      // 글 하나를 다른 카테고리로 옮긴다 - 본문은 건드리지 않고 그 행의 카테고리 칸만 바꾼다.
      const { category } = body;
      if (typeof category !== "string" || !category.trim()) {
        return NextResponse.json({ error: "Missing params" }, { status: 400 });
      }
      if (category.length > 50000) {
        return NextResponse.json({ error: "카테고리 이름은 50,000자 이내로 입력해주세요." }, { status: 400 });
      }
      formData.append("action", "moveQuote");
      formData.append("category", category.trim());
      if (typeof id === "string" && id) {
        formData.append("id", id);
      } else if (typeof oldText === "string" && oldText) {
        formData.append("oldText", oldText);
      } else {
        return NextResponse.json({ error: "Missing params" }, { status: 400 });
      }
    } else if (body.action === "saveSettings") {
      // 설정은 본문이 아니라 갈래(크기·색·프롬프트)와 키/값 묶음을 보낸다.
      const { group, entries } = body;
      if (typeof group !== "string" || !group.trim() || typeof entries !== "string" || !entries) {
        return NextResponse.json({ error: "Missing params" }, { status: 400 });
      }
      // 프롬프트는 통째로 한 값이라 길다 - 본문과 같은 상한을 둔다.
      if (entries.length > 50000) {
        return NextResponse.json({ error: "설정은 50,000자 이내로 보내주세요." }, { status: 400 });
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(entries);
      } catch {
        return NextResponse.json({ error: "Missing params" }, { status: 400 });
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return NextResponse.json({ error: "Missing params" }, { status: 400 });
      }
      formData.append("action", "saveSettings");
      formData.append("group", group.trim());
      formData.append("entries", entries);
    } else if (body.action !== undefined && body.action !== "create" && body.action !== "update") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } else {
      if (typeof newText !== "string" || !newText.trim()) {
        return NextResponse.json({ error: "Missing params" }, { status: 400 });
      }
      formData.append("newText", newText);

      // 이름표(id)를 알면 그것만 보낸다 - 본문을 두 벌 보내지 않아도 된다.
      // 아직 모르는 경우(옛 캐시, id 열이 없는 CSV)에는 본문 전체로 찾는다.
      if (body.action === "create") {
        if (typeof body.category !== "string" || !body.category.trim()
          || typeof body.requestId !== "string"
          || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.requestId)) {
          return NextResponse.json({ error: "카테고리와 등록 요청 ID가 필요합니다." }, { status: 400 });
        }
        if (body.category.trim().length > 50000 || newText.length > 50000) {
          return NextResponse.json({ error: "카테고리와 본문은 각각 50,000자 이내로 입력해주세요." }, { status: 400 });
        }
        formData.append("action", "create");
        formData.append("category", body.category.trim());
        formData.append("requestId", body.requestId);
      } else if (typeof id === "string" && id) {
        formData.append("id", id);
      } else if (typeof oldText === "string" && oldText) {
        formData.append("oldText", oldText);
      } else {
        return NextResponse.json({ error: "Missing params" }, { status: 400 });
      }
    }

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
      const data = JSON.parse(raw);
      if (body.action === "create" && (!data?.success || data.id !== body.requestId)) {
        return NextResponse.json({ error: data?.error === "Missing params"
          ? "새 글 등록용 Apps Script 업데이트가 필요합니다."
          : data?.error || "새 글 등록 결과를 확인하지 못했습니다. 다시 시도해주세요." }, { status: 502 });
      }
      return NextResponse.json(data);
    } catch {
      throw new Error(`Apps Script 가 JSON 을 주지 않았습니다: ${raw.slice(0, 100)}`);
    }
  } catch (err) {
    console.error("sync-sheet 오류:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "시트에 저장하지 못했습니다." }, { status: 502 });
  }
}
