import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function quizModule() {
  const loaded = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL("../lib/quiz.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports, require: () => ({}) });
  return loaded.exports;
}

const question = {
  id: "q1",
  category: "한국사",
  sourceIds: ["s1"],
  question: "정답은?",
  correctAnswer: "정답",
  distractors: ["가", "나", "다", "라", "마", "바"],
  explanation: "해설",
};

test("문제마다 정답 하나와 서로 다른 오답 셋만 제시한다", () => {
  const { makeQuizOptions } = quizModule();
  const options = Array.from(makeQuizOptions(question, [], () => 0));
  assert.equal(options.length, 4);
  assert.equal(options.filter((option) => option.correct).length, 1);
  assert.equal(new Set(options.map((option) => option.text)).size, 4);
});

test("저장된 문제는 서로 다른 유효 오답이 셋 이상일 때만 받는다", () => {
  const { isQuizQuestion } = quizModule();
  assert.equal(isQuizQuestion(question), true);
  assert.equal(isQuizQuestion({ ...question, distractors: ["가", "가", "정답", ""] }), false);
});

test("원본 노트는 임시 화면 ID가 아닌 시트 ID로 연결하고 누락도 유지한다", () => {
  const { findQuizSources } = quizModule();
  const notes = [
    { id: "s1", sheetId: "other", text: "다른 노트", category: "다른 과목" },
    { id: "gs-2", sheetId: "s1", text: "원본", category: "한국사" },
    { id: "gs-3", sheetId: "4ca4b23f", text: "짧은 ID", category: "정치" },
  ];
  const sources = findQuizSources(["s1", "missing", "s1", "4ca4b23f"], notes);
  assert.equal(sources.length, 3);
  assert.equal(sources[0].note, notes[1]);
  assert.equal(sources[1].note, undefined);
  assert.equal(sources[2].note, notes[2]);
  assert.equal(findQuizSources([], notes).length, 0);
});
