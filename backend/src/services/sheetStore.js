import fs from "node:fs";
import { google } from "googleapis";
import { config } from "../config.js";

let client;
export function sheetsApi() {
  if (!client) {
    const raw = process.env.GOOGLE_CREDENTIALS || fs.readFileSync(config.serviceAccountPath, "utf8");
    client = google.sheets({ version: "v4", auth: new google.auth.GoogleAuth({ credentials: JSON.parse(raw), scopes: ["https://www.googleapis.com/auth/spreadsheets"] }) });
  }
  return client;
}
const localFile = (name) => new URL(`../../data/${name}.json`, import.meta.url);
const known = new Set();

async function ensureTab(api, name, headers) {
  if (known.has(name)) return;
  const meta = await api.spreadsheets.get({ spreadsheetId: config.sheetId });
  if (!meta.data.sheets.some((s) => s.properties.title === name)) {
    await api.spreadsheets.batchUpdate({ spreadsheetId: config.sheetId, requestBody: { requests: [{ addSheet: { properties: { title: name } } }] } });
    await api.spreadsheets.values.update({ spreadsheetId: config.sheetId, range: `${name}!A1`, valueInputOption: "RAW", requestBody: { values: [headers] } });
  }
  known.add(name);
}

// Stores small tables (mentors, remarks, pending deletions) in their own Google Sheet tab.
// With no GOOGLE_SHEET_ID it falls back to local JSON files (handy for testing).
export async function readTab(name, headers) {
  if (!config.sheetId) {
    try { return JSON.parse(await fs.promises.readFile(localFile(name), "utf8")); } catch { return []; }
  }
  const api = sheetsApi();
  await ensureTab(api, name, headers);
  const r = await api.spreadsheets.values.get({ spreadsheetId: config.sheetId, range: `${name}!A:Z` });
  const [, ...rows] = r.data.values || [];
  return rows.filter((x) => x.length).map((row) => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""])));
}

export async function writeTab(name, headers, items) {
  if (!config.sheetId) return fs.promises.writeFile(localFile(name), JSON.stringify(items, null, 2));
  const api = sheetsApi();
  await ensureTab(api, name, headers);
  await api.spreadsheets.values.clear({ spreadsheetId: config.sheetId, range: `${name}!A2:Z` });
  if (items.length)
    await api.spreadsheets.values.update({ spreadsheetId: config.sheetId, range: `${name}!A2`, valueInputOption: "RAW", requestBody: { values: items.map((it) => headers.map((h) => it[h] ?? "")) } });
}
