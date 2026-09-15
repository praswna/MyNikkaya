import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const requestId = "12345678-1234-4234-8234-123456789012";
// 등록·수정은 고친 날짜(D열)를 nowStamp() 으로 적는다. 실제 Apps Script 의
// Utilities·Session 을 여기서 흉내 내, 날짜는 언제 돌려도 같은 값이 나오게 한다.
const STAMP = "2026-01-01 00:00";
let nextSheetId = 1;

function sheet(name, rows) {
  let sheetName = name;
  const id = nextSheetId++;
  const value = {
    rows,
    getName: () => sheetName,
    setName: (next) => { sheetName = next; return value; },
    getSheetId: () => id,
    getLastRow: () => rows.length,
    getLastColumn: () => Math.max(...rows.map((row) => row.length)),
    getDataRange: () => ({ getValues: () => rows.map((row) => [...row]) }),
    getRange: (r, c, height = 1, width = 1) => ({
      getValues: () => Array.from({ length: height }, (_, i) => Array.from({ length: width }, (_, j) => rows[r - 1 + i]?.[c - 1 + j] ?? "")),
      setValue: (value) => { rows[r - 1][c - 1] = value; },
      setValues: (values) => values.forEach((row, i) => row.forEach((value, j) => {
        rows[r - 1 + i] ??= [];
        rows[r - 1 + i][c - 1 + j] = typeof value === "string" && value.startsWith("'=") ? value.slice(1) : value;
      })),
      clearContent: () => {
        for (let i = 0; i < height; i++) {
          for (let j = 0; j < width; j++) if (rows[r - 1 + i]) rows[r - 1 + i][c - 1 + j] = "";
        }
      },
    }),
    deleteRow: (r) => { rows.splice(r - 1, 1); },
    deleteRows: (r, howMany) => { rows.splice(r - 1, howMany); },
    appendRow: (row) => { rows.push([...row]); },
    copyTo: (book) => {
      const copied = sheet(sheetName + " copy", rows.map((row) => [...row]));
      book._add(copied);
      return copied;
    },
  };
  return value;
}

function script(sheets) {
  let held = false;
  const book = {
    _add: (item) => sheets.push(item),
    getSheets: () => sheets,
    getSheetById: (id) => sheets.find((item) => item.getSheetId() === id) || null,
    getSheetByName: (name) => sheets.find((item) => item.getName() === name) || null,
    insertSheet: (name) => {
      const created = sheet(name, []);
      sheets.push(created);
      return created;
    },
  };
  const properties = { SECRET_KEY: "test-key" };
  const context = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: (key) => properties[key] || null, setProperty: (key, value) => { properties[key] = value; } }) },
    SpreadsheetApp: { getActiveSpreadsheet: () => book, flush() {} },
    LockService: { getScriptLock: () => ({ waitLock() { assert.equal(held, false); held = true; }, releaseLock() { held = false; } }) },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: (raw) => ({ setMimeType: () => JSON.parse(raw) }) },
    Logger: { log() {} },
    Utilities: {
      Charset: { UTF_8: "utf8" }, DigestAlgorithm: { SHA_256: "sha256" },
      computeDigest: (_algorithm, value) => Array.from(Buffer.from(String(value))),
      formatDate: () => STAMP, getUuid: () => "00000000-0000-4000-8000-000000000000",
    },
    Session: { getScriptTimeZone: () => "Asia/Seoul" },
  });
  vm.runInContext(readFileSync(new URL("../APPS_SCRIPT.gs", import.meta.url), "utf8"), context);
  const request = (params) => context.handleRequest({ key: "test-key", action: "create", requestId, category: "한국사", newText: "[[새 글]]\n내용", ...params });
  request.context = context;
  return request;
}

test("등록은 해당 카테고리 탭에 추가하며 응답 유실 후 재시도는 중복되지 않는다", () => {
  const first = sheet("첫 탭", [["category", "text", "id"], ["국어", "기존", "old-1"]]);
  const second = sheet("둘째 탭", [["category", "text", "id"], ["한국사", "기존", "old-2"]]);
  const save = script([first, second]);
  assert.equal(save({}).id, requestId);
  assert.equal(save({}).success, true);
  assert.equal(first.rows.length, 2);
  assert.deepEqual(second.rows[2], ["한국사", "[[새 글]]\n내용", requestId, STAMP]);
  assert.equal(second.rows.length, 3);
  assert.ok(save({ newText: "다른 글" }).error);
  assert.equal(second.rows.length, 3);
});

test("새 카테고리와 빈 자료 탭을 지원하고 수식 문자열은 글로 저장한다", () => {
  const target = sheet("빈 탭", [["category", "text"]]);
  const save = script([target]);
  assert.equal(save({ category: " =과목 ", newText: "=1+1" }).success, true);
  assert.deepEqual(target.rows[1], ["=과목", "=1+1", requestId, STAMP]);
  assert.equal(save({ category: " =과목 ", newText: "=1+1" }).success, true);
});

test("잘못된 키·빈 입력·자료 탭 부재는 행을 생성하지 않는다", () => {
  const target = sheet("자료", [["category", "text", "id"]]);
  const save = script([target]);
  for (const invalid of [{ key: "wrong" }, { category: " " }, { newText: "\n" }, { requestId: "bad" }, { newText: "x".repeat(50001) }]) {
    assert.ok(save(invalid).error);
  }
  assert.equal(target.rows.length, 1);
  assert.ok(script([])({}).error);
});

test("기존 ID 수정 요청은 새 행을 만들지 않는다", () => {
  const target = sheet("자료", [["category", "text", "id"], ["한국사", "기존", "old"]]);
  assert.equal(script([target])({ action: undefined, id: "old", newText: "수정" }).success, true);
  assert.equal(target.rows.length, 2);
  assert.equal(target.rows[1][1], "수정");
});

test("삭제는 id 로 해당 행만 지우고, 없는 id 는 아무 것도 지우지 않는다", () => {
  const first = sheet("첫 탭", [["category", "text", "id"], ["국어", "가", "a"], ["국어", "나", "b"]]);
  const second = sheet("둘째 탭", [["category", "text", "id"], ["한국사", "다", "c"]]);
  const save = script([first, second]);
  const removed = save({ action: "delete", id: "a" });
  assert.equal(removed.success, true);
  assert.equal(removed.deleted, true);
  assert.equal(first.rows.length, 2); // 머리글 + 남은 1행
  assert.deepEqual(first.rows[1], ["국어", "나", "b"]);
  const cross = save({ action: "delete", id: "c" }); // 다른 탭의 행도 찾아 지운다
  assert.equal(cross.success, true);
  assert.equal(second.rows.length, 1);
  assert.ok(save({ action: "delete", id: "missing" }).error); // 없는 행
  assert.equal(first.rows.length, 2);
});

test("삭제는 id 가 없으면 본문으로 찾고, 대상이 비면 거부한다", () => {
  const target = sheet("자료", [["category", "text", "id"], ["국어", "지울 글", "x"]]);
  const save = script([target]);
  assert.ok(save({ action: "delete", id: "", oldText: "" }).error); // 대상 없음
  assert.equal(target.rows.length, 2);
  assert.equal(save({ action: "delete", id: "", oldText: "지울 글" }).success, true);
  assert.equal(target.rows.length, 1);
});

test("미리 작성한 시험문제는 카테고리별 공개 읽기로 돌려준다", () => {
  const quiz = sheet("시험문제", [
    ["id", "category", "source_ids", "question", "correct_answer", "distractors", "explanation", "created"],
    ["q-a", "한국사", '["a"]', "준비한 문제", "정답", '["오1","오2","오3","오4"]', "해설", STAMP],
    ["keep-b", "국어", '["b"]', "남을 문제", "남을 답", '["가","나","다"]', "설명", STAMP],
  ]);
  const save = script([quiz]);
  const read = save.context.buildQuizJson({ category: "한국사" });
  assert.equal(read.questions.length, 1);
  assert.equal(read.questions[0].question, "준비한 문제");
  assert.equal(read.questions[0].correctAnswer, "정답");
  assert.deepEqual(Array.from(read.questions[0].distractors), ["오1", "오2", "오3", "오4"]);
});

test("상위 카테고리 시험은 자신과 모든 하위 카테고리 문제를 함께 읽는다", () => {
  const header = ["id", "category", "source_ids", "question", "correct_answer", "distractors", "explanation", "created"];
  const row = (id, category) => [id, category, '["a"]', `${category} 문제`, "정답", '["오1","오2","오3","오4"]', "해설", STAMP];
  const quiz = sheet("시험문제", [
    header,
    row("q-root", "공무직"),
    row("q-child", "공무직/한국사"),
    row("q-grandchild", "공무직/한국사/조선"),
    row("q-similar", "공무직원"),
    row("q-other", "다른과목"),
  ]);
  const read = script([quiz]).context.buildQuizJson({ category: "공무직" });
  assert.deepEqual(Array.from(read.questions, (question) => question.id), ["q-root", "q-child", "q-grandchild"]);
});

test("출제 묶음을 만들고 유효한 AI 답변만 백업 후 문제은행에 추가한다", () => {
  const notes = sheet("노트", [["category", "text", "id"], ["한국사", "세종은 훈민정음을 창제했다.", "note-1"]]);
  const quiz = sheet("시험문제", [["id", "category", "source_ids", "question", "correct_answer", "distractors", "explanation", "created"]]);
  const save = script([notes, quiz]);
  const batch = save.context.handleRequest({ key: "test-key", action: "createQuizBatch" });
  assert.equal(batch.targetCount, 1);
  assert.match(batch.copyText, /note-1/);
  const answer = JSON.stringify({
    batch_id: batch.batchId,
    questions: [{ id: "quiz-00000000-0001", category: "한국사", source_ids: ["note-1"], question: "훈민정음을 창제한 왕은?", correct_answer: "세종", distractors: ["태조", "태종", "문종", "세조"], explanation: "원문에 세종이라고 적혀 있다.", created: "" }],
    results: [{ source_id: "note-1", status: "generated", reason: "" }],
  });
  const result = save.context.handleRequest({ key: "test-key", action: "importQuizAnswer", answer });
  assert.equal(result.added, 1);
  assert.equal(result.held.length, 0);
  assert.equal(quiz.rows[1][0], "quiz-00000000-0001");
  assert.ok(save.context.SpreadsheetApp.getActiveSpreadsheet().getSheets().some((item) => item.getName().startsWith("시험문제_백업_")));
  const retried = save.context.handleRequest({ key: "test-key", action: "importQuizAnswer", answer });
  assert.equal(retried.added, 0);
  assert.equal(retried.duplicates, 1);
});

test("AI 제외 결과는 원본 해시와 사유가 맞을 때만 기록한다", () => {
  const notes = sheet("노트", [["category", "text", "id"], ["국어", "출제하기 어려운 메모", "note-x"]]);
  const quiz = sheet("시험문제", [["id", "category", "source_ids", "question", "correct_answer", "distractors", "explanation", "created"]]);
  const save = script([notes, quiz]);
  const batch = save.context.handleRequest({ key: "test-key", action: "createQuizBatch" });
  const result = save.context.handleRequest({
    key: "test-key", action: "importQuizAnswer",
    answer: JSON.stringify({ batch_id: batch.batchId, questions: [], results: [{ source_id: "note-x", status: "excluded", reason: "사실 문장이 없음" }] }),
  });
  assert.equal(result.excluded, 1);
  const exclusion = save.context.SpreadsheetApp.getActiveSpreadsheet().getSheetByName("시험문제_출제제외");
  assert.equal(exclusion.rows[1][0], "note-x");
  const next = save.context.handleRequest({ key: "test-key", action: "createQuizBatch" });
  assert.match(next.error, /미출제 노트/);
});

test("AI 답변 내부의 같은 ID·다른 내용은 모두 보류한다", () => {
  const notes = sheet("노트", [["category", "text", "id"], ["과목", "근거", "n-1"]]);
  const quiz = sheet("시험문제", [["id", "category", "source_ids", "question", "correct_answer", "distractors", "explanation", "created"]]);
  const save = script([notes, quiz]);
  const batch = save.context.handleRequest({ key: "test-key", action: "createQuizBatch" });
  const base = { id: "quiz-00000000-0001", category: "과목", source_ids: ["n-1"], correct_answer: "정답", distractors: ["가", "나", "다", "라"], explanation: "해설", created: "" };
  const result = save.context.handleRequest({
    key: "test-key", action: "importQuizAnswer",
    answer: JSON.stringify({ batch_id: batch.batchId, questions: [{ ...base, question: "문제 1" }, { ...base, question: "문제 2" }], results: [] }),
  });
  assert.equal(result.added, 0);
  assert.equal(result.held.length, 2);
  assert.equal(quiz.rows.length, 1);
});

test("형식이 손상된 기존 문제는 노트를 출제 완료로 막지 않는다", () => {
  const notes = sheet("노트", [["category", "text", "id"], ["과목", "근거", "n-bad"]]);
  const quiz = sheet("시험문제", [
    ["id", "category", "source_ids", "question", "correct_answer", "distractors", "explanation", "created"],
    ["broken", "과목", '["n-bad"]', "문제", "정답", '["오답 하나"]', "해설", ""],
  ]);
  const batch = script([notes, quiz]).context.handleRequest({ key: "test-key", action: "createQuizBatch" });
  assert.equal(batch.targetCount, 1);
  assert.match(batch.copyText, /n-bad/);
});

test("전체 재출제는 기존 문제가 연결된 노트도 새 묶음에 포함한다", () => {
  const notes = sheet("노트", [["category", "text", "id"], ["과목", "이미 출제된 근거", "n-done"]]);
  const quiz = sheet("시험문제", [
    ["id", "category", "source_ids", "question", "correct_answer", "distractors", "explanation", "created"],
    ["q-old", "과목", '["n-done"]', "기존 문제", "정답", '["가","나","다","라"]', "해설", ""],
  ]);
  const save = script([notes, quiz]);
  const uncovered = save.context.handleRequest({ key: "test-key", action: "createQuizBatch", mode: "uncovered" });
  assert.match(uncovered.error, /미출제 노트/);
  const all = save.context.handleRequest({ key: "test-key", action: "createQuizBatch", mode: "all" });
  assert.equal(all.mode, "all");
  assert.equal(all.targetCount, 1);
  assert.match(all.copyText, /전체 노트 재출제/);
  assert.match(all.copyText, /"generation_mode": "all"/);
  assert.match(all.copyText, /JSON 파일 여러 개/);
  assert.match(all.copyText, /part-001\.json/);
  assert.match(all.copyText, /quiz-00000000\.zip/);
  assert.match(all.copyText, /ZIP 파일 링크/);
  assert.match(all.stagingName, /^시험문제_재생성_/);
});

test("전체 재출제는 임시 탭을 완성한 뒤 3단계 적용에서 운영 탭과 교체한다", () => {
  const notes = sheet("노트", [["category", "text", "id"], ["과목", "근거 하나", "n-1"], ["과목", "근거 둘", "n-2"]]);
  const quiz = sheet("시험문제", [
    ["id", "category", "source_ids", "question", "correct_answer", "distractors", "explanation", "created"],
    ["q-old", "과목", '["n-1"]', "기존 문제", "정답", '["가","나","다","라"]', "해설", ""],
  ]);
  const save = script([notes, quiz]);
  const batch = save.context.handleRequest({ key: "test-key", action: "createQuizBatch", mode: "all" });
  const staging = save.context.SpreadsheetApp.getActiveSpreadsheet().getSheetByName(batch.stagingName);
  assert.ok(staging);
  const makeQuestion = (number, source) => ({ id: `quiz-00000000-${String(number).padStart(4, "0")}`, category: "과목", source_ids: [source], question: `새 문제 ${number}`, correct_answer: "정답", distractors: ["가", "나", "다", "라"], explanation: "해설", created: "" });
  const first = save.context.handleRequest({ key: "test-key", action: "importQuizAnswer", answer: JSON.stringify({ batch_id: batch.batchId, questions: [makeQuestion(1, "n-1")], results: [{ source_id: "n-1", status: "generated", reason: "" }] }) });
  assert.equal(first.remainingCount, 1);
  assert.equal(quiz.rows.length, 2);
  assert.equal(staging.rows.length, 2);
  assert.match(save.context.handleRequest({ key: "test-key", action: "applyQuizBatch", batchId: batch.batchId }).error, /1개/);
  const second = save.context.handleRequest({ key: "test-key", action: "importQuizAnswer", answer: JSON.stringify({ batch_id: batch.batchId, questions: [makeQuestion(2, "n-2")], results: [{ source_id: "n-2", status: "generated", reason: "" }] }) });
  assert.equal(second.remainingCount, 0);
  assert.equal(second.readyToApply, true);
  const status = save.context.handleRequest({ key: "test-key", action: "getQuizBatchStatus", batchId: batch.batchId });
  assert.equal(status.resolvedCount, 2);
  const applied = save.context.handleRequest({ key: "test-key", action: "applyQuizBatch", batchId: batch.batchId });
  assert.equal(applied.applied, true);
  assert.equal(staging.getName(), "시험문제");
  assert.match(quiz.getName(), /^시험문제_이전_/);
  assert.equal(save.context.buildQuizJson({ category: "과목" }).questions.length, 2);
});

test("같은 묶음의 여러 JSON 파일을 차례로 추가할 수 있다", () => {
  const notes = sheet("노트", [["category", "text", "id"], ["과목", "근거 하나", "n-1"], ["과목", "근거 둘", "n-2"]]);
  const quiz = sheet("시험문제", [["id", "category", "source_ids", "question", "correct_answer", "distractors", "explanation", "created"]]);
  const save = script([notes, quiz]);
  const batch = save.context.handleRequest({ key: "test-key", action: "createQuizBatch" });
  const question = (number, source) => ({ id: `quiz-00000000-${String(number).padStart(4, "0")}`, category: "과목", source_ids: [source], question: `문제 ${number}`, correct_answer: "정답", distractors: ["가", "나", "다", "라"], explanation: "해설", created: "" });
  const first = save.context.handleRequest({ key: "test-key", action: "importQuizAnswer", answer: JSON.stringify({ batch_id: batch.batchId, questions: [question(1, "n-1")], results: [{ source_id: "n-1", status: "generated", reason: "" }] }) });
  const second = save.context.handleRequest({ key: "test-key", action: "importQuizAnswer", answer: JSON.stringify({ batch_id: batch.batchId, questions: [question(2, "n-2")], results: [{ source_id: "n-2", status: "generated", reason: "" }] }) });
  assert.equal(first.added, 1);
  assert.equal(second.added, 1);
  assert.equal(quiz.rows.length, 3);
});

function route(env, upstream) {
  const routeModule = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL("../app/api/sync-sheet/route.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports: routeModule.exports, require, process: { env }, Buffer, URLSearchParams, AbortSignal, fetch: upstream, console: { error() {} } });
  return (body) => routeModule.exports.POST({ json: async () => body });
}

function quizAdminRoute(env, upstream) {
  const routeModule = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL("../app/api/quiz-admin/route.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports: routeModule.exports, require, process: { env }, Buffer, URLSearchParams, AbortSignal, fetch: upstream, console: { error() {} } });
  return (body) => routeModule.exports.POST({ json: async () => body });
}
const env = { APPS_SCRIPT_URL: "https://example.invalid/exec", APPS_SCRIPT_KEY: "test-key", EDIT_PASSWORD: "테스트" };
const valid = { password: "테스트", action: "create", requestId, category: " 한국사 ", newText: "새 글" };

test("API는 설정·암호·요청을 검증한 뒤에만 시트에 전송한다", async () => {
  const never = () => { assert.fail("upstream must not be called"); };
  assert.equal((await route({}, never)(valid)).status, 503);
  assert.equal((await route(env, never)({ ...valid, password: "bad" })).status, 401);
  for (const body of [null, [], { ...valid, category: " " }, { ...valid, requestId: "bad" }, { ...valid, newText: " " }, { ...valid, action: "delete" }]) {
    assert.equal((await route(env, never)(body)).status, 400);
  }
});

test("API는 생성 ID를 전달하고 구버전 스크립트의 응답을 성공으로 처리하지 않는다", async () => {
  const response = await route(env, async (_url, options) => {
    const params = new URLSearchParams(options.body);
    assert.equal(params.get("action"), "create");
    assert.equal(params.get("requestId"), requestId);
    assert.equal(params.get("category"), "한국사");
    assert.equal(params.has("password"), false);
    return Response.json({ success: true, id: requestId });
  })(valid);
  assert.equal((await response.json()).id, requestId);
  for (const data of [{ success: true }, { error: "Missing params" }]) {
    assert.equal((await route(env, async () => Response.json(data))(valid)).status, 502);
  }
  assert.equal((await route(env, async () => { throw new Error("offline"); })(valid)).status, 502);
});

test("API는 삭제 요청을 검증한 뒤 action=delete 로 전달한다", async () => {
  const never = () => { assert.fail("upstream must not be called"); };
  assert.equal((await route(env, never)({ action: "delete", id: "a" })).status, 401); // 암호 없음
  assert.equal((await route(env, never)({ password: "테스트", action: "delete" })).status, 400); // 대상 없음
  const response = await route(env, async (_url, options) => {
    const params = new URLSearchParams(options.body);
    assert.equal(params.get("action"), "delete");
    assert.equal(params.get("id"), "a");
    assert.equal(params.has("newText"), false);
    assert.equal(params.has("password"), false);
    return Response.json({ success: true, deleted: true });
  })({ password: "테스트", action: "delete", id: "a" });
  assert.equal((await response.json()).deleted, true);
});

test("시험문제 관리 API는 암호와 크기를 검사하고 시트 키만 서버에서 붙인다", async () => {
  const never = () => { assert.fail("upstream must not be called"); };
  assert.equal((await quizAdminRoute(env, never)(null)).status, 400);
  assert.equal((await quizAdminRoute(env, never)({ action: "createBatch", password: "wrong" })).status, 401);
  assert.equal((await quizAdminRoute(env, never)({ action: "unknown", password: "테스트" })).status, 400);
  assert.equal((await quizAdminRoute(env, never)({ action: "createBatch", password: "테스트", mode: "bad" })).status, 400);
  assert.equal((await quizAdminRoute(env, never)({ action: "importAnswer", password: "테스트", answer: "" })).status, 400);
  assert.equal((await quizAdminRoute(env, never)({ action: "importAnswer", password: "테스트", answer: "x".repeat(1500001) })).status, 413);
  assert.equal((await quizAdminRoute(env, never)({ action: "batchStatus", password: "테스트" })).status, 400);
  assert.equal((await quizAdminRoute(env, never)({ action: "applyBatch", password: "테스트" })).status, 400);
  const response = await quizAdminRoute(env, async (_url, options) => {
    const params = new URLSearchParams(options.body);
    assert.equal(params.get("key"), "test-key");
    assert.equal(params.get("action"), "createQuizBatch");
    assert.equal(params.get("mode"), "uncovered");
    assert.equal(params.has("password"), false);
    return Response.json({ batchId: "batch", targetCount: 1, copyText: "prompt" });
  })({ action: "createBatch", password: "테스트" });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).batchId, "batch");

  for (const [action, expected] of [["batchStatus", "getQuizBatchStatus"], ["applyBatch", "applyQuizBatch"]]) {
    const forwarded = await quizAdminRoute(env, async (_url, options) => {
      const params = new URLSearchParams(options.body);
      assert.equal(params.get("action"), expected);
      assert.equal(params.get("batchId"), "batch-1");
      return Response.json({ batchId: "batch-1", remainingCount: 0 });
    })({ action, password: "테스트", batchId: "batch-1" });
    assert.equal(forwarded.status, 200);
  }
});

test("하위 카테고리는 맨 윗 조각과 짝이 되는 탭으로 간다", () => {
  const first = sheet("첫 탭", [["category", "text", "id"], ["국어", "기존", "old-1"]]);
  const pingpong = sheet("탁구", [["category", "text", "id"], ["탁구", "기존", "old-2"]]);
  const save = script([first, pingpong]);
  assert.equal(save({ category: "탁구/대회구분" }).success, true);
  assert.equal(first.rows.length, 2); // 첫 탭으로 흘러들지 않는다
  assert.deepEqual(pingpong.rows[2], ["탁구/대회구분", "[[새 글]]\n내용", requestId, STAMP]);
});

test("탭 이름이 달라도 그 카테고리를 쓰는 탭을 찾아간다", () => {
  const first = sheet("첫 탭", [["category", "text", "id"], ["국어", "기존", "old-1"]]);
  const other = sheet("운동", [["category", "text", "id"], ["탁구/기본기", "기존", "old-2"]]);
  const save = script([first, other]);
  assert.equal(save({ category: "탁구/대회구분" }).success, true);
  assert.equal(first.rows.length, 2);
  assert.equal(other.rows.length, 3);
});

test("짝이 되는 탭이 없으면 그 이름으로 새 탭을 만든다", () => {
  const first = sheet("첫 탭", [["category", "text", "id"], ["국어", "기존", "old-1"]]);
  const sheets = [first];
  const save = script(sheets);
  assert.equal(save({ category: "탁구/대회구분" }).success, true);
  assert.equal(first.rows.length, 2);
  const created = sheets.find((item) => item.getName() === "탁구");
  assert.ok(created, "탁구 탭이 만들어져야 한다");
  assert.deepEqual(created.rows[0], ["category", "text", "id", "updated"]);
  assert.deepEqual(created.rows[1], ["탁구/대회구분", "[[새 글]]\n내용", requestId, STAMP]);
});

test("카테고리를 옮기면 행도 짝이 되는 탭으로 따라간다", () => {
  const first = sheet("첫 탭", [["category", "text", "id"], ["국어", "옮길 글", "a"]]);
  const pingpong = sheet("탁구", [["category", "text", "id"], ["탁구", "기존", "b"]]);
  const save = script([first, pingpong]);
  const moved = save({ action: "moveQuote", id: "a", category: "탁구/대회구분" });
  assert.equal(moved.success, true);
  assert.equal(moved.sheet, "탁구");
  assert.equal(first.rows.length, 1); // 머리글만 남는다
  assert.deepEqual(pingpong.rows[2], ["탁구/대회구분", "옮길 글", "a", STAMP]);
});

test("tidyCategorySheets 는 엉뚱한 탭에 있는 행을 제자리로 옮긴다", () => {
  const first = sheet("첫 탭", [
    ["category", "text", "id"],
    ["국어", "그대로", "a"],
    ["탁구/대회구분", "옮겨갈 글", "b"],
  ]);
  const pingpong = sheet("탁구", [["category", "text", "id"], ["탁구", "기존", "c"]]);
  const save = script([first, pingpong]);
  assert.equal(save.context.tidyCategorySheets(), 1);
  assert.equal(first.rows.length, 2);
  assert.deepEqual(first.rows[1], ["국어", "그대로", "a", ""]);
  assert.deepEqual(pingpong.rows[2], ["탁구/대회구분", "옮겨갈 글", "b", ""]);
});

test("정리는 행이 많아도 탭마다 몇 번만 시트를 두드린다", () => {
  // 행마다 시트를 읽고 쓰면 몇 천 행에서 실행 시간 제한에 걸린다.
  // 탭 수에만 비례하는지를 호출 횟수로 못박아 둔다.
  const rows = [["category", "text", "id"]];
  for (let i = 0; i < 500; i++) rows.push([i % 2 ? "탁구/대회구분" : "국어", "글 " + i, "id-" + i]);
  const first = sheet("첫 탭", rows);
  const pingpong = sheet("탁구", [["category", "text", "id"], ["탁구", "기존", "c"]]);

  let calls = 0;
  for (const target of [first, pingpong]) {
    for (const name of ["getRange", "getDataRange", "deleteRow", "deleteRows", "appendRow"]) {
      const original = target[name];
      target[name] = (...args) => { calls++; return original(...args); };
    }
  }

  const save = script([first, pingpong]);
  calls = 0; // targetSheets() 가 머리글을 살피는 몫은 빼고 센다
  assert.equal(save.context.tidyCategorySheets(), 250);
  assert.ok(calls < 20, "시트 호출이 " + calls + "번으로 너무 많다");
  assert.equal(first.rows.length, 251); // 머리글 + 남은 국어 250행
  assert.equal(pingpong.rows.length, 252);
});
