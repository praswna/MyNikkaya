import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const TIMEOUT_MS = 30000;
const MAX_ANSWER_LENGTH = 1_500_000;

function sameSecret(given: string, expected: string) {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const scriptUrl = process.env.APPS_SCRIPT_URL;
  const scriptKey = process.env.APPS_SCRIPT_KEY;
  const editPassword = process.env.EDIT_PASSWORD;
  if (!scriptUrl || !scriptKey || !editPassword) {
    return NextResponse.json({ error: "시험문제 저장 기능이 설정되지 않았습니다." }, { status: 503 });
  }

  let body: { action?: unknown; password?: unknown; answer?: unknown; mode?: unknown; batchId?: unknown };
  try {
    body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("bad body");
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  if (typeof body.password !== "string" || !sameSecret(body.password, editPassword)) {
    return NextResponse.json({ error: "편집 암호가 맞지 않습니다." }, { status: 401 });
  }
  if (body.action !== "createBatch" && body.action !== "importAnswer" && body.action !== "batchStatus" && body.action !== "applyBatch") {
    return NextResponse.json({ error: "알 수 없는 작업입니다." }, { status: 400 });
  }
  if (body.action === "createBatch" && body.mode !== undefined && body.mode !== "uncovered" && body.mode !== "all") {
    return NextResponse.json({ error: "출제 범위가 올바르지 않습니다." }, { status: 400 });
  }
  if (body.action === "importAnswer" && (typeof body.answer !== "string" || !body.answer.trim())) {
    return NextResponse.json({ error: "AI 답변을 붙여넣어 주세요." }, { status: 400 });
  }
  if ((body.action === "batchStatus" || body.action === "applyBatch") && (typeof body.batchId !== "string" || !body.batchId.trim())) {
    return NextResponse.json({ error: "출제 묶음이 없습니다." }, { status: 400 });
  }
  if (typeof body.answer === "string" && body.answer.length > MAX_ANSWER_LENGTH) {
    return NextResponse.json({ error: "AI 답변이 처리 가능한 크기를 넘었습니다." }, { status: 413 });
  }

  try {
    const actions = { createBatch: "createQuizBatch", importAnswer: "importQuizAnswer", batchStatus: "getQuizBatchStatus", applyBatch: "applyQuizBatch" } as const;
    const form = new URLSearchParams({ key: scriptKey, action: actions[body.action] });
    if (typeof body.answer === "string") form.set("answer", body.answer);
    if (typeof body.batchId === "string") form.set("batchId", body.batchId);
    if (body.action === "createBatch") form.set("mode", body.mode === "all" ? "all" : "uncovered");
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(), redirect: "follow", cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Apps Script HTTP ${response.status}`);
    const raw = await response.text();
    const data = JSON.parse(raw) as { error?: unknown };
    return NextResponse.json(data, { status: typeof data.error === "string" ? 400 : 200 });
  } catch (error) {
    console.error("quiz-admin 오류:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "시험문제 시트 작업에 실패했습니다." }, { status: 502 });
  }
}
