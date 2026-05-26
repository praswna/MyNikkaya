// Google Apps Script 코드
// 구글 시트 → 확장 프로그램 → Apps Script → 아래 코드 붙여넣기 → 저장 → 배포

const SHEET_NAME = "quotes_export"; // 실제 시트 탭 이름으로 변경
const SECRET_KEY = "my-nikkaya-2024"; // 보안 키 (앱 환경변수랑 일치해야 함)

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // 보안 키 확인
    if (data.key !== SECRET_KEY) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Unauthorized" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    const rows = sheet.getDataRange().getValues();

    // id로 해당 행 찾기 (category + text로 매칭)
    const targetId = data.id; // "gs-1", "gs-2" 형식
    const index = parseInt(targetId.replace("gs-", "")) + 1; // 헤더 포함

    if (index < 2 || index > rows.length) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Row not found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // text 컬럼(B열) 업데이트
    sheet.getRange(index, 2).setValue(data.text);

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("MyNikkaya Apps Script 작동 중")
    .setMimeType(ContentService.MimeType.TEXT);
}
