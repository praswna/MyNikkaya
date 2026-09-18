import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { deflateRawSync } from "node:zlib";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

function zipModule() {
  const loaded = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL("../lib/zip.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports: loaded.exports, require, Blob, Response, DecompressionStream, Uint8Array, DataView, TextDecoder, Error });
  return loaded.exports;
}

function makeZip(entries) {
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;
  for (const [name, text] of entries) {
    const nameBytes = Buffer.from(name);
    const original = Buffer.from(text);
    const compressed = deflateRawSync(original);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(8, 8);
    local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(original.length, 22); local.writeUInt16LE(nameBytes.length, 26);
    localParts.push(local, nameBytes, compressed);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(8, 10);
    central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(original.length, 24); central.writeUInt16LE(nameBytes.length, 28); central.writeUInt32LE(localOffset, 42);
    centralParts.push(central, nameBytes);
    localOffset += local.length + nameBytes.length + compressed.length;
  }
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localParts, ...centralParts, end]);
}

test("ZIP 안의 JSON 파일만 이름 순서대로 압축 해제한다", async () => {
  const { extractJsonFilesFromZip } = zipModule();
  const zip = makeZip([["part-002.json", '{"part":2}'], ["readme.txt", "ignore"], ["part-001.json", '{"part":1}']]);
  const file = { name: "quiz.zip", size: zip.length, arrayBuffer: async () => zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength) };
  const extracted = await extractJsonFilesFromZip(file);
  assert.deepEqual(Array.from(extracted, (entry) => entry.name), ["quiz.zip / part-001.json", "quiz.zip / part-002.json"]);
  assert.equal(await extracted[0].text(), '{"part":1}');
  assert.equal(await extracted[1].text(), '{"part":2}');
});

test("JSON이 없는 ZIP은 거부한다", async () => {
  const { extractJsonFilesFromZip } = zipModule();
  const zip = makeZip([["readme.txt", "none"]]);
  const file = { name: "empty.zip", size: zip.length, arrayBuffer: async () => zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength) };
  await assert.rejects(extractJsonFilesFromZip(file), /JSON 파일이 없습니다/);
});
