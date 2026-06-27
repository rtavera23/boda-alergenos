# Apps Script — Menú especial alergias

This folder contains the Google Apps Script Web App that receives form submissions from `alergenos.bodadoloyradha.com` and appends rows to the spreadsheet **Boda - Menú especial alergias**.

Spreadsheet ID (already configured in `Code.gs`):

`1NDC-tl0kA02FCfWvUPZ9ThDP1usAZ04Q_PeFU-pNYrQ`

Spreadsheet URL:

https://docs.google.com/spreadsheets/d/1NDC-tl0kA02FCfWvUPZ9ThDP1usAZ04Q_PeFU-pNYrQ/edit

## What the script does

- `doGet()` — health check, returns `{ "ok": true, "service": "boda-alergenos" }`
- `doPost(e)` — parses JSON from `e.postData.contents` (supports `text/plain` bodies from `sendBeacon` / `fetch` no-cors)
- Ensures sheets **Respuestas** and **Vista Masía** exist
- Ensures header rows exist on both sheets
- Appends one full row to **Respuestas**
- Appends one simplified row to **Vista Masía**
- Returns `{ "ok": true }` on success or `{ "ok": false, "error": "..." }` on failure

## Manual deployment

### 1. Open the spreadsheet

Open the spreadsheet linked above.

### 2. Create the Apps Script project

1. In Google Sheets, go to **Extensions → Apps Script**
2. Delete any default code in `Code.gs`
3. Paste the contents of `apps-script/Code.gs` from this repository
4. Save the project (name suggestion: `Boda alergenos webhook`)

### 3. Authorize the script

1. In the Apps Script editor, select `doGet` from the function dropdown
2. Click **Run**
3. Accept the Google authorization prompts
4. The script needs permission to access the linked spreadsheet

### 4. Deploy as Web App

1. Click **Deploy → New deployment**
2. Click the gear icon and choose **Web app**
3. Settings:
   - **Description:** `Boda alergenos form endpoint`
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
4. Click **Deploy**
5. Copy the **Web app URL**

Important: every time you change `Code.gs`, create a **New deployment** (or manage deployments and update the existing one) so the live URL uses the latest code.

### 5. Connect the frontend

In `script.js`, replace the placeholder:

```js
const FORM_ENDPOINT = "PASTE_APPS_SCRIPT_WEB_APP_URL_HERE";
```

with the deployed Web App URL.

### 6. Test

#### Health check

Open the Web App URL in a browser. Expected response:

```json
{ "ok": true, "service": "boda-alergenos" }
```

#### Form submission

1. Open the allergy menu site locally or on GitHub Pages
2. Fill the form and submit
3. Confirm a new row appears in:
   - `Respuestas`
   - `Vista Masía`

You can also test POST manually with curl:

```bash
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: text/plain" \
  -d '{"submittedAt":"2026-07-25T12:00:00.000Z","groupId":"test-1","firstName":"Ana","lastName":"Test","fullName":"Ana Test","table":"","allergies":["gluten","leche"],"selectedFirstId":"primero-1","selectedFirstName":"Plato primero","selectedSecondId":"segundo-1","selectedSecondName":"Plato segundo","selectedDessertId":"postre-1","selectedDessertName":"Plato postre","comments":"Prueba"}'
```

## Expected payload from the frontend

```json
{
  "submittedAt": "2026-07-25T12:00:00.000Z",
  "groupId": "uuid",
  "firstName": "Nombre",
  "lastName": "Apellidos",
  "fullName": "Nombre Apellidos",
  "table": "",
  "allergies": ["gluten", "leche"],
  "selectedFirstId": "...",
  "selectedFirstName": "...",
  "selectedSecondId": "...",
  "selectedSecondName": "...",
  "selectedDessertId": "...",
  "selectedDessertName": "...",
  "comments": "..."
}
```

## Sheet mapping

### Respuestas

| Column | Source |
|---|---|
| fechaEnvio | `submittedAt` |
| grupoId | `groupId` |
| nombre | `firstName` |
| apellidos | `lastName` |
| nombreCompleto | `fullName` |
| mesa | `table` (blank if missing) |
| alergiasIntolerancias | `allergies` joined by comma |
| primeroId | `selectedFirstId` |
| primeroNombre | `selectedFirstName` |
| segundoId | `selectedSecondId` |
| segundoNombre | `selectedSecondName` |
| postreId | `selectedDessertId` |
| postreNombre | `selectedDessertName` |
| comentarios | `comments` |
| userAgent | `userAgent` if sent, otherwise blank |

### Vista Masía

| Column | Source |
|---|---|
| Nombre completo | `fullName` |
| Mesa | `table` |
| Alergias / intolerancias | `allergies` joined by comma |
| Primero elegido | `selectedFirstName` |
| Segundo elegido | `selectedSecondName` |
| Postre elegido | `selectedDessertName` |
| Comentarios | `comments` |

## Notes

- No secrets or credentials belong in this script. Only the public spreadsheet ID is stored.
- The frontend currently sends JSON as `text/plain` because `sendBeacon` and `fetch` with `no-cors` cannot rely on reading the response.
- If headers in the spreadsheet are edited manually, the script will rewrite row 1 to match the expected headers the next time a submission arrives.
