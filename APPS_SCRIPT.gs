const SHEET_NAME = "quotes_export";
const SECRET_KEY = "my-nikkaya-2024";

function doGet(e) {
  try {
    Logger.log("params: " + JSON.stringify(e.parameter));

    const { key, id, text } = e.parameter;

    if (key !== SECRET_KEY) {
      Logger.log("키 불일치");
      return ContentService.createTextOutput(JSON.stringify({ error: "Unauthorized" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (!id || !text) {
      Logger.log("id 또는 text 없음");
      return ContentService.createTextOutput(JSON.stringify({ error: "Missing params" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    const rows = sheet.getDataRange().getValues();

    const targetIndex = parseInt(id.replace("gs-", ""));
    const targetRow = targetIndex + 1; // 헤더 포함

    Logger.log("targetRow: " + targetRow + ", rows: " + rows.length);

    if (targetRow < 2 || targetRow > rows.length) {
      Logger.log("행 없음");
      return ContentService.createTextOutput(JSON.stringify({ error: "Row not found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    sheet.getRange(targetRow, 2).setValue(text);
    Logger.log("저장 완료: " + targetRow + "행");

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log("에러: " + err.message);
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
