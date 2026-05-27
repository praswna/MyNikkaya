const SHEET_NAME = "quotes_export";
const SECRET_KEY = "my-nikkaya-2024";

function doGet(e) {
  const output = handleRequest(e);
  return output;
}

function doPost(e) {
  const output = handleRequest(e);
  return output;
}

function handleRequest(e) {
  try {
    Logger.log("params: " + JSON.stringify(e.parameter));

    const { key, id, text } = e.parameter;

    if (key !== SECRET_KEY) {
      Logger.log("키 불일치");
      return buildResponse({ error: "Unauthorized" });
    }

    if (!id || !text) {
      Logger.log("id 또는 text 없음");
      return buildResponse({ error: "Missing params" });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    const rows = sheet.getDataRange().getValues();

    const targetIndex = parseInt(id.replace("gs-", ""));
    const targetRow = targetIndex + 1;

    Logger.log("targetRow: " + targetRow + ", rows: " + rows.length);

    if (targetRow < 2 || targetRow > rows.length) {
      Logger.log("행 없음");
      return buildResponse({ error: "Row not found" });
    }

    sheet.getRange(targetRow, 2).setValue(text);
    Logger.log("저장 완료: " + targetRow + "행");

    return buildResponse({ success: true });

  } catch (err) {
    Logger.log("에러: " + err.message);
    return buildResponse({ error: err.message });
  }
}

function buildResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
