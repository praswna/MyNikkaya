// =============================================
// 구글 시트 ↔ 앱 연결 (Apps Script 웹앱)
//
//   읽기: GET  …/exec?format=csv          → 명언 탭을 모두 합쳐 CSV 한 장으로
//   쓰기: POST key, id, newText           → id 로 행을 찾아 본문을 덮어쓴다
//         (id 가 없는 옛 앱은 key, oldText, newText 로 보내온다)
//
// 명언 탭은 이름이 아니라 머리글로 가린다.
// 1행이 "category | text" 인 탭이면 이름이 무엇이든 읽기·쓰기에 모두 포함된다.
// 계산용·메모용처럼 형식이 다른 탭은 저절로 빠진다.
// 잠깐 빼두고 싶으면 그 탭의 머리글을 "_category" 처럼 바꿔 놓으면 된다.
//
// 고친 뒤에는 [배포 관리 → 편집(연필) → 버전: 새 버전 → 배포] 로 올린다.
// 새 배포를 만들면 URL 이 바뀌므로, 그때는 Vercel 환경변수와
// GitHub 저장소 시크릿의 주소도 같이 고쳐야 한다 (CLAUDE_GUIDE.md 참고).
// =============================================

// 쓰기 키는 코드에 적지 않는다 - 이 파일은 공개 저장소에 그대로 올라간다.
// Apps Script 편집기 → [프로젝트 설정 → 스크립트 속성] 에 SECRET_KEY 로 넣는다.
// 속성이 없으면 쓰기는 아예 막힌다 (읽기는 열려 있다).
function secretKey() {
  return PropertiesService.getScriptProperties().getProperty("SECRET_KEY");
}

// =============================================
// id 열 (C열)
//
// 명언마다 붙어 다니는 이름표다. 사람이 적을 일은 없다 - 빈 칸은 읽을 때 채워진다.
// 새 명언을 넣을 때는 category · text 두 칸만 쓰면 된다.
//
// 이게 있으면 저장할 때 본문을 통째로 보내지 않아도 되고(양이 절반으로 준다),
// 시트에서도 본문을 다 읽어 대조하는 대신 id 열만 훑으면 된다.
// 본문이 완전히 똑같은 명언이 둘 있어도 제 행을 찾아간다.
// =============================================
const ID_COLUMN = 3;

function newId() {
  return Utilities.getUuid().replace(/-/g, "").slice(0, 8);
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.format === "csv") return buildCsv();
  return handleRequest(params);
}

function doPost(e) {
  return handleRequest((e && e.parameter) || {});
}

// 1행이 category | text 인 탭만 명언 탭으로 본다 (C열이 있든 없든 상관없다)
function targetSheets() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets().filter(function (sheet) {
    if (sheet.getLastRow() < 1 || sheet.getLastColumn() < 2) return false;
    const head = sheet.getRange(1, 1, 1, 2).getValues()[0];
    return String(head[0]).trim().toLowerCase() === "category"
        && String(head[1]).trim().toLowerCase() === "text";
  });
}

// 내용이 있는 행마다 id 를 하나씩 갖게 한다.
// 이미 다 차 있으면 시트에 아무 것도 쓰지 않는다 (대개 이쪽으로 지나간다).
function fillIds(sheet, rows) {
  const ids = [];
  const seen = {};
  let changed = false;

  for (let i = 0; i < rows.length; i++) {
    if (i === 0) { ids.push("id"); continue; } // 머리글

    const hasContent = String(rows[i][0]).trim() && String(rows[i][1]).trim();
    const current = rows[i].length > ID_COLUMN - 1 ? String(rows[i][ID_COLUMN - 1]).trim() : "";

    if (!hasContent) { ids.push(current); continue; } // 빈 행은 건드리지 않는다

    if (current && !seen[current]) {
      ids.push(current);
      seen[current] = true;
      continue;
    }

    // 비었거나 다른 행과 겹친다 (행을 복사해 붙인 경우) → 새로 매긴다
    let fresh = newId();
    for (let tries = 0; seen[fresh] && tries < 20; tries++) fresh = newId();
    // 그래도 겹치면 한 글자씩 붙인다. 길어지므로 반드시 끝난다
    // (여기까지 올 일은 없지만, 끝나지 않는 반복은 웹앱을 통째로 멈춘다)
    while (seen[fresh]) fresh = fresh + "x";
    ids.push(fresh);
    seen[fresh] = true;
    changed = true;
  }

  if (changed) {
    const column = ids.map(function (id) { return [id]; });
    sheet.getRange(1, ID_COLUMN, column.length, 1).setValues(column);
    Logger.log("id 채움: " + sheet.getName());
  }
  return ids;
}

// 명언 탭을 시트 순서대로 이어 붙여 CSV 한 장으로 만든다 (머리글은 맨 위 한 줄만)
function buildCsv() {
  const lines = ["category,text,id"];
  const sheets = targetSheets();

  for (let s = 0; s < sheets.length; s++) {
    const rows = sheets[s].getDataRange().getValues();
    const ids = fillIds(sheets[s], rows);

    for (let i = 1; i < rows.length; i++) { // 각 탭의 1행은 머리글이므로 건너뛴다
      const category = String(rows[i][0]).trim();
      const text = String(rows[i][1]);
      if (!category || !text.trim()) continue; // 빈 행은 버린다
      lines.push(csvCell(category) + "," + csvCell(text) + "," + csvCell(ids[i]));
    }
  }

  Logger.log("CSV " + (lines.length - 1) + "행, 탭 " + sheets.length + "개");
  return ContentService.createTextOutput(lines.join("\n"))
    .setMimeType(ContentService.MimeType.TEXT);
}

// 명언 본문에는 줄바꿈·쉼표·따옴표가 들어 있으므로 항상 감싸고 따옴표는 두 번 쓴다
function csvCell(value) {
  return '"' + String(value).replace(/"/g, '""') + '"';
}

function handleRequest(params) {
  try {
    // 키와 본문은 로그에 남기지 않는다 (실행 기록에 그대로 쌓인다)
    const key = secretKey();
    if (!key) {
      Logger.log("스크립트 속성 SECRET_KEY 가 없어 쓰기를 막았습니다");
      return buildResponse({ error: "Server not configured" });
    }

    if (params.key !== key) {
      Logger.log("키 불일치");
      return buildResponse({ error: "Unauthorized" });
    }

    const id = params.id;
    const oldText = params.oldText;
    const newText = params.newText;

    if (!newText || (!id && !oldText)) {
      Logger.log("보낼 내용이 모자람");
      return buildResponse({ error: "Missing params" });
    }

    const sheets = targetSheets();
    for (let s = 0; s < sheets.length; s++) {
      const found = id ? findById(sheets[s], id) : findByText(sheets[s], oldText);
      if (found > 0) {
        sheets[s].getRange(found, 2).setValue(newText);
        Logger.log("저장 완료: " + sheets[s].getName() + " " + found + "행");
        return buildResponse({ success: true, sheet: sheets[s].getName(), row: found });
      }
    }

    Logger.log("일치하는 행 없음");
    return buildResponse({ error: "Row not found" });

  } catch (err) {
    Logger.log("에러: " + err.message);
    return buildResponse({ error: err.message });
  }
}

// id 로 찾기 - C열만 읽으면 되므로 본문을 통째로 불러오지 않는다
function findById(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const ids = sheet.getRange(2, ID_COLUMN, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === String(id).trim()) return i + 2; // 1-based, 머리글 한 줄
  }
  return 0;
}

// 본문 전체가 같은 행 찾기 - id 를 아직 모르는 앱을 위해 남겨 둔다
function findByText(sheet, oldText) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][1] === oldText) return i + 1;
  }
  return 0;
}

function buildResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
