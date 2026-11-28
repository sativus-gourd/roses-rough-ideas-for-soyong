/* Seoul answers for the ROSES site (Sativus Gourd). The same pattern as Hyperlink Heaven's guestbook.
 *
 * Setup, once:
 * 1. Make a Google Sheet and copy its ID (the long part of its URL) into SPREADSHEET_ID below.
 * 2. In the Sheet: Extensions > Apps Script. Paste this file over Code.gs and save.
 * 3. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone. Deploy and copy the URL ending in /exec.
 * 4. Put that URL in ENDPOINT at the top of assets/cyber/roses-seoul.js and push.
 *
 * To hide an answer from the site, type anything in its Hidden column.
 */
const SPREADSHEET_ID = 'PASTE_THE_SHEET_ID_HERE';
const SHEET_NAME = 'Answers';
const MAX_RETURNED = 100;
const BOUQUETS = 8;
const MAX_LEN = 240;

function sheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Created At', 'Bouquet', 'Message', 'Hidden']);
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 170);
    sheet.setColumnWidth(3, 520);
  }
  return sheet;
}

function clean_(value, limit) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function out_(data, callback) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  if (callback && /^[A-Za-z_$][\w$]{0,79}$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const callback = (e && e.parameter && e.parameter.callback) || '';
  try {
    const sheet = sheet_();
    const last = sheet.getLastRow();
    if (last <= 1) return out_({ ok: true, entries: [] }, callback);
    const first = Math.max(2, last - MAX_RETURNED * 2 + 1);
    const rows = sheet.getRange(first, 1, last - first + 1, 4).getValues();
    const entries = rows
      .filter(r => r[2] && !String(r[3] || '').trim())
      .slice(-MAX_RETURNED)
      .map(r => ({ date: new Date(r[0]).toISOString(), bouquet: Number(r[1]) || 0, message: String(r[2]) }));
    return out_({ ok: true, entries: entries }, callback);
  } catch (err) {
    return out_({ ok: false, error: String(err) }, callback);
  }
}

function doPost(e) {
  const p = (e && e.parameter) || {};
  if (p.website) return out_({ ok: true });
  const message = clean_(p.message, MAX_LEN);
  let bouquet = parseInt(p.bouquet, 10);
  if (!(bouquet >= 0 && bouquet < BOUQUETS)) bouquet = 0;
  if (!message) return out_({ ok: false, error: 'Empty answer.' });
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheet_().appendRow([new Date(), bouquet, message, '']);
  } finally {
    lock.releaseLock();
  }
  return out_({ ok: true });
}
