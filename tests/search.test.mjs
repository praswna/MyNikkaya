import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function searchModule() {
  const loaded = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL("../lib/search.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports, require: () => ({}) });
  return loaded.exports;
}

const { plainText, forSearch } = searchModule();

test("루비로 이어 쓴 낱말은 빈칸으로 친다", () => {
  // 루비 낱말은 빈칸을 못 써서 "-" 로 잇고 화면에는 빈칸으로 보인다.
  // 보이는 대로 "개정 절차" 를 쳐도 찾아져야 한다.
  const source = "헌법 개정-절차{改正節次}를 정리한다.";
  const haystack = forSearch(plainText(source));
  assert.ok(haystack.includes(forSearch("개정 절차")));
  assert.ok(haystack.includes(forSearch("개정-절차")));   // 원문 그대로 쳐도 찾아진다
});

test("줄바꿈 없는 빈칸도 보통 빈칸과 같게 본다", () => {
  // 화면에 그려질 때 "-" 는 NBSP 가 된다 - 그 글을 끌어다 검색어로 넣어도 찾아져야 한다.
  assert.equal(forSearch("개정 절차"), forSearch("개정 절차"));
});

test("찾는 글자 수는 그대로 둔다", () => {
  // 찾은 자리를 원문에서 잘라 밑줄을 긋는다 - 길이가 달라지면 엉뚱한 자리에 그어진다.
  for (const sample of ["개정-절차", "a b", "그냥 글", "2024-2025"]) {
    assert.equal(forSearch(sample).length, sample.length);
  }
});

test("마크업은 걷어내고 루비 뜻도 함께 찾는다", () => {
  const plain = plainText("[[지주회사{持株會社,holding^1}]]\n--주석--\n^1 설명");
  assert.ok(plain.includes("지주회사"));
  assert.ok(plain.includes("持株會社"));
  assert.ok(plain.includes("holding"));
  assert.ok(!plain.includes("[["));
  assert.ok(!plain.includes("--주석--"));
});
