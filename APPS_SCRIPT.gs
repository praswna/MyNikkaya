const SHEET_NAME = "quotes_export";
const SECRET_KEY = "my-nikkaya-2024";

function doPost(e) {
  try {
    Logger.log("postData: " + JSON.stringify(e.postData));
    Logger.log("parameter: " + JSON.stringify(e.parameter));

    let data;
    // no-cors로 오면 form data로 올 수 있음
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      data = e.parameter;
    } else {
      Logger.log("데이터 없음");
      return ContentService.createTextOutput(JSON.stringify({ error: "No data" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    Logger.log("data: " + JSON.stringify(data));

    if (data.key !== SECRET_KEY) {
      Logger.log("키 불일치: " + data.key);
      return ContentService.createTextOutput(JSON.stringify({ error: "Unauthorized" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    const rows = sheet.getDataRange().getValues();

    Logger.log("id: " + data.id + ", rows: " + rows.length);

    // 텍스트로 행 찾기 (순서 변경에 안전)
    let targetRow = -1;
    const targetIndex = parseInt(data.id.replace("gs-", ""));
    // 헤더 제외하고 targetIndex번째 데이터 행
    targetRow = targetIndex + 1; // 1-based, 헤더 있으므로 +1

    if (targetRow < 2 || targetRow > rows.length) {
      Logger.log("행 없음: " + targetRow);
      return ContentService.createTextOutput(JSON.stringify({ error: "Row not found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    sheet.getRange(targetRow, 2).setValue(data.text);
    Logger.log("저장 완료: " + targetRow + "행");

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log("에러: " + err.message);
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("MyNikkaya Apps Script 작동 중")
    .setMimeType(ContentService.MimeType.TEXT);
}
