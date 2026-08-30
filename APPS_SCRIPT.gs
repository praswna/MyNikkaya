// =============================================
// 구글 시트 ↔ 앱 연결 (Apps Script 웹앱)
//
//   읽기: GET  …/exec?format=csv          → 명언 탭을 모두 합쳐 CSV 한 장으로
//   쓰기: POST key, oldText, newText      → 본문이 똑같은 행을 찾아 덮어쓴다
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

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.format === "csv") return buildCsv();
  return handleRequest(params);
}

function doPost(e) {
  return handleRequest((e && e.parameter) || {});
}

// 1행이 category | text 인 탭만 명언 탭으로 본다
function targetSheets() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets().filter(function (sheet) {
    if (sheet.getLastRow() < 1 || sheet.getLastColumn() < 2) return false;
    const head = sheet.getRange(1, 1, 1, 2).getValues()[0];
    return String(head[0]).trim().toLowerCase() === "category"
        && String(head[1]).trim().toLowerCase() === "text";
  });
}

// 명언 탭을 시트 순서대로 이어 붙여 CSV 한 장으로 만든다 (머리글은 맨 위 한 줄만)
function buildCsv() {
  const lines = ["category,text"];
  const sheets = targetSheets();

  for (let s = 0; s < sheets.length; s++) {
    const rows = sheets[s].getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) { // 각 탭의 1행은 머리글이므로 건너뛴다
      const category = String(rows[i][0]).trim();
      const text = String(rows[i][1]);
      if (!category || !text.trim()) continue; // 빈 행은 버린다
      lines.push(csvCell(category) + "," + csvCell(text));
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

    const oldText = params.oldText;
    const newText = params.newText;

    if (!oldText || !newText) {
      Logger.log("oldText 또는 newText 없음");
      return buildResponse({ error: "Missing params" });
    }

    // 명언 탭을 순서대로 훑어 본문이 똑같은 행을 찾는다
    const sheets = targetSheets();
    for (let s = 0; s < sheets.length; s++) {
      const rows = sheets[s].getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][1] === oldText) {
          sheets[s].getRange(i + 1, 2).setValue(newText); // 1-based
          Logger.log("저장 완료: " + sheets[s].getName() + " " + (i + 1) + "행");
          return buildResponse({ success: true, sheet: sheets[s].getName(), row: i + 1 });
        }
      }
    }

    Logger.log("일치하는 행 없음");
    return buildResponse({ error: "Row not found" });

  } catch (err) {
    Logger.log("에러: " + err.message);
    return buildResponse({ error: err.message });
  }
}

function buildResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
