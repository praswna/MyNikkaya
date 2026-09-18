const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const MAX_ENTRY_COUNT = 200;
const MAX_EXPANDED_BYTES = 30_000_000;
export const MAX_JSON_BYTES = 1_500_000;
export const MAX_ZIP_BYTES = 15_000_000;

export type ExtractedJsonFile = { name: string; size: number; text: () => Promise<string> };

function findEndOfCentralDirectory(view: DataView) {
  const first = Math.max(0, view.byteLength - 65_557);
  for (let offset = view.byteLength - 22; offset >= first; offset--) {
    if (view.getUint32(offset, true) === EOCD_SIGNATURE) return offset;
  }
  return -1;
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const stream = new Blob([copy.buffer]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function extractJsonFilesFromZip(file: Blob & { name?: string }): Promise<ExtractedJsonFile[]> {
  if (file.size > MAX_ZIP_BYTES) throw new Error("ZIP 파일은 15MB 이하여야 합니다.");
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  const end = findEndOfCentralDirectory(view);
  if (end < 0) throw new Error("올바른 ZIP 파일이 아닙니다.");
  const entryCount = view.getUint16(end + 10, true);
  if (entryCount > MAX_ENTRY_COUNT) throw new Error("ZIP 안의 파일이 너무 많습니다.");
  let offset = view.getUint32(end + 16, true);
  const decoder = new TextDecoder("utf-8");
  const output: ExtractedJsonFile[] = [];
  let expandedBytes = 0;

  for (let index = 0; index < entryCount; index++) {
    if (offset + 46 > view.byteLength || view.getUint32(offset, true) !== CENTRAL_SIGNATURE) throw new Error("ZIP 파일 목록이 손상되었습니다.");
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const originalSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(new Uint8Array(buffer, offset + 46, nameLength)).replace(/\\/g, "/");
    offset += 46 + nameLength + extraLength + commentLength;
    if (name.endsWith("/") || !name.toLowerCase().endsWith(".json")) continue;
    if (originalSize > MAX_JSON_BYTES) throw new Error(`${name}: JSON 파일은 1.5MB 이하여야 합니다.`);
    expandedBytes += originalSize;
    if (expandedBytes > MAX_EXPANDED_BYTES) throw new Error("ZIP 압축 해제 크기가 30MB를 넘습니다.");
    if (localOffset + 30 > view.byteLength || view.getUint32(localOffset, true) !== LOCAL_SIGNATURE) throw new Error(`${name}: ZIP 항목이 손상되었습니다.`);
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    if (dataOffset + compressedSize > view.byteLength) throw new Error(`${name}: ZIP 데이터가 잘렸습니다.`);
    const compressed = new Uint8Array(buffer, dataOffset, compressedSize);
    const bytes = method === 0 ? new Uint8Array(compressed) : method === 8 ? await inflateRaw(compressed) : null;
    if (!bytes) throw new Error(`${name}: 지원하지 않는 ZIP 압축 방식입니다.`);
    if (bytes.byteLength !== originalSize || bytes.byteLength > MAX_JSON_BYTES) throw new Error(`${name}: 압축 해제된 크기가 올바르지 않습니다.`);
    const text = decoder.decode(bytes);
    output.push({ name: file.name ? `${file.name} / ${name}` : name, size: bytes.byteLength, text: async () => text });
  }
  if (!output.length) throw new Error("ZIP 안에 JSON 파일이 없습니다.");
  return output.sort((a, b) => a.name.localeCompare(b.name));
}
