const SHEET_NAME = "quotes_export";
const SECRET_KEY = "my-nikkaya-2024";

function doGet(e) {
  return handleRequest(e.parameter);
}

function doPost(e) {
  // form-urlencoded로 올 때는 e.parameter에 파싱됨
  Logger.log("doPost e.parameter: " + JSON.stringify(e.parameter));
  Logger.log("doPost e.postData: " + JSON.stringify(e.postData));
  return handleRequest(e.parameter);
}

function handleRequest(params) {
  try {
    Logger.log("params: " + JSON.stringify(params));

    const key = params.key;
    const id = params.id;
    const text = params.text;

    if (key !== SECRET_KEY) {
      Logger.log("키 불일치: " + key);
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
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
