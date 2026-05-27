const SHEET_NAME = "quotes_export";
const SECRET_KEY = "my-nikkaya-2024";

function doGet(e) {
  return handleRequest(e.parameter);
}

function doPost(e) {
  Logger.log("doPost e.parameter: " + JSON.stringify(e.parameter));
  return handleRequest(e.parameter);
}

function handleRequest(params) {
  try {
    Logger.log("params: " + JSON.stringify(params));

    const key = params.key;
    const oldText = params.oldText;
    const newText = params.newText;

    if (key !== SECRET_KEY) {
      Logger.log("키 불일치");
      return buildResponse({ error: "Unauthorized" });
    }

    if (!oldText || !newText) {
      Logger.log("oldText 또는 newText 없음");
      return buildResponse({ error: "Missing params" });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    const rows = sheet.getDataRange().getValues();

    // 원본 텍스트로 행 찾기
    let targetRow = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] === oldText) {
        targetRow = i + 1; // 1-based
        break;
      }
    }

    if (targetRow === -1) {
      Logger.log("일치하는 행 없음");
      return buildResponse({ error: "Row not found" });
    }

    sheet.getRange(targetRow, 2).setValue(newText);
    Logger.log("저장 완료: " + targetRow + "행");

    return buildResponse({ success: true });

  } catch (err) {
    Logger.log("에러: " + err.message);
    return buildResponse({ error: err.message });
  }
}

function buildResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
