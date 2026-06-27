const SPREADSHEET_ID = "1NDC-tl0kA02FCfWvUPZ9ThDP1usAZ04Q_PeFU-pNYrQ";

const SHEET_RESPUESTAS = "Respuestas";
const SHEET_VISTA_MASIA = "Vista Masía";

const HEADERS_RESPUESTAS = [
  "fechaEnvio",
  "grupoId",
  "nombre",
  "apellidos",
  "nombreCompleto",
  "mesa",
  "alergiasIntolerancias",
  "primeroId",
  "primeroNombre",
  "segundoId",
  "segundoNombre",
  "postreId",
  "postreNombre",
  "comentarios",
  "userAgent",
];

const HEADERS_VISTA_MASIA = [
  "Nombre completo",
  "Mesa",
  "Alergias / intolerancias",
  "Primero elegido",
  "Segundo elegido",
  "Postre elegido",
  "Comentarios",
];

function doGet() {
  return jsonResponse({ ok: true, service: "boda-alergenos" });
}

function doPost(e) {
  try {
    const payload = parsePayload_(e);
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

    const respuestasSheet = ensureSheet_(spreadsheet, SHEET_RESPUESTAS);
    const vistaMasiaSheet = ensureSheet_(spreadsheet, SHEET_VISTA_MASIA);

    ensureHeaders_(respuestasSheet, HEADERS_RESPUESTAS);
    ensureHeaders_(vistaMasiaSheet, HEADERS_VISTA_MASIA);

    const allergiesText = formatAllergies_(payload.allergies);
    const mesa = String(payload.table || "").trim();

    respuestasSheet.appendRow([
      payload.submittedAt || new Date().toISOString(),
      payload.groupId || "",
      payload.firstName || "",
      payload.lastName || "",
      payload.fullName || "",
      mesa,
      allergiesText,
      payload.selectedFirstId || "",
      payload.selectedFirstName || "",
      payload.selectedSecondId || "",
      payload.selectedSecondName || "",
      payload.selectedDessertId || "",
      payload.selectedDessertName || "",
      payload.comments || "",
      payload.userAgent || "",
    ]);

    vistaMasiaSheet.appendRow([
      payload.fullName || "",
      mesa,
      allergiesText,
      payload.selectedFirstName || "",
      payload.selectedSecondName || "",
      payload.selectedDessertName || "",
      payload.comments || "",
    ]);

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function parsePayload_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("Missing POST body");
  }

  const raw = e.postData.contents;
  const payload = JSON.parse(raw);

  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid JSON payload");
  }

  return payload;
}

function formatAllergies_(allergies) {
  if (Array.isArray(allergies)) {
    return allergies
      .map(function (item) {
        return String(item || "").trim();
      })
      .filter(Boolean)
      .join(", ");
  }

  if (allergies == null) {
    return "";
  }

  return String(allergies).trim();
}

function ensureSheet_(spreadsheet, sheetName) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  return sheet;
}

function ensureHeaders_(sheet, expectedHeaders) {
  const lastColumn = sheet.getLastColumn();
  const hasAnyData = sheet.getLastRow() > 0 && lastColumn > 0;
  const currentHeaders = hasAnyData
    ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    : [];

  const normalizedCurrent = currentHeaders.map(function (value) {
    return String(value || "").trim();
  });

  const headersMatch =
    normalizedCurrent.length === expectedHeaders.length &&
    expectedHeaders.every(function (header, index) {
      return normalizedCurrent[index] === header;
    });

  if (!headersMatch) {
    sheet
      .getRange(1, 1, 1, expectedHeaders.length)
      .setValues([expectedHeaders]);
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}
