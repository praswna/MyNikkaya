import { Quote } from "./types";

function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;

  const text = csvText.replace(/^\uFEFF/, "");

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentField);
      currentField = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        if (currentRow.some((field) => field.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      }
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
    } else if (char === "\r" && insideQuotes && nextChar === "\n") {
      // 셀 안의 \r\n을 \n으로 정규화
      currentField += "\n";
      i++;
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function parseGoogleSheetsCSV(csvText: string): Quote[] {
  const quotes: Quote[] = [];
  const rows = parseCSV(csvText);

  if (rows.length === 0) return quotes;

  const firstRow = rows[0];
  const headerKeywords = ["category", "text", "명언", "quote", "saying"];
  const isHeader = firstRow.some((cell) =>
    headerKeywords.some((keyword) =>
      cell.toLowerCase().includes(keyword.toLowerCase())
    )
  );

  const startIndex = isHeader ? 1 : 0;
  let id = 1;

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;

    const category = row[0].trim();
    const text = row[1]; // 본문은 trim 안 함 (줄바꿈 보존)

    if (text && text.trim() && category) {
      quotes.push({
        id: `gs-${id++}`,
        text: text,
        category: category,
      });
    }
  }

  return quotes;
}
