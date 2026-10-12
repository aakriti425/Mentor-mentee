import fs from "node:fs";
import { google } from "googleapis";
import { config } from "../config.js";

const localFile = new URL("../../data/students.json", import.meta.url);

async function readLocalStudents() {
  try { return JSON.parse(await fs.promises.readFile(localFile, "utf8")); }
  catch { return []; }
}
async function writeLocalStudents(items) { await fs.promises.writeFile(localFile, JSON.stringify(items, null, 2)); }

let cachedAuth;
function getAuthClient() {
  if (!cachedAuth) {
    const raw = process.env.GOOGLE_CREDENTIALS || fs.readFileSync(config.serviceAccountPath, "utf8");
    cachedAuth = new google.auth.GoogleAuth({ credentials: JSON.parse(raw), scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  }
  return cachedAuth;
}

// Student details are stored once in the main sheet. Daily attendance is stored separately
// in the "attendance" tab by services/attendanceRecords.js.
export function normDate(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const t = Date.parse(s);
  return isNaN(t) ? s : new Date(t).toISOString().slice(0, 10);
}

function mapRow(r) {
  return {
    studentName: r[0] || "", rollNumber: r[1] || "", mentorName: r[2] || "",
    mentorPhone: r[3] || "", phoneNumber: r[4] || "", attendance: "Present",
    date: "", branch: r[7] || "", section: r[8] || "", address: r[9] || "",
    city: r[10] || "", state: r[11] || "", pinCode: r[12] || "", photo: r[13] || ""
  };
}

function uniqueStudents(rows) {
  const map = new Map();
  for (const s of rows) {
    const key = String(s.rollNumber || "").trim().toLowerCase();
    if (!key) continue;
    // Prefer the latest row when old versions of the app created duplicates.
    map.set(key, s);
  }
  return [...map.values()];
}

export async function readAttendance() {
  if (!config.sheetId) return uniqueStudents(await readLocalStudents());
  const sheets = google.sheets({ version: "v4", auth: getAuthClient() });
  const result = await sheets.spreadsheets.values.get({ spreadsheetId: config.sheetId, range: config.sheetRange });
  const values = result.data.values || [];
  return uniqueStudents(values.length < 2 ? [] : values.slice(1).map(mapRow).filter(s => s.rollNumber || s.studentName));
}

export async function addStudent(student) {
  const clean = {
    studentName: String(student.studentName || "").trim(),
    rollNumber: String(student.rollNumber || "").trim(),
    mentorName: String(student.mentorName || "").trim(),
    mentorPhone: String(student.mentorPhone || "").trim(),
    phoneNumber: String(student.phoneNumber || "").trim(),
    attendance: "Present", date: "",
    branch: String(student.branch || "").trim(),
    section: String(student.section || "").trim().toUpperCase(),
    address: String(student.address || "").trim(), city: String(student.city || "").trim(),
    state: String(student.state || "").trim(), pinCode: String(student.pinCode || "").trim(), photo: String(student.photo || "")
  };
  if (!config.sheetId) {
    const current = await readLocalStudents();
    current.push(clean);
    await writeLocalStudents(current);
    return clean;
  }
  const row = [clean.studentName, clean.rollNumber, clean.mentorName, clean.mentorPhone,
    clean.phoneNumber, "", "", clean.branch, clean.section, clean.address, clean.city, clean.state, clean.pinCode, clean.photo];
  const sheets = google.sheets({ version: "v4", auth: getAuthClient() });
  await sheets.spreadsheets.values.append({
    spreadsheetId: config.sheetId, range: config.sheetRange, valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS", requestBody: { values: [row] }
  });
  return clean;
}

export async function updateStudentByRoll(rollNumber, changes) {
  const target = String(rollNumber).trim().toLowerCase();
  const allowed = ["studentName","mentorName","mentorPhone","phoneNumber","branch","section","address","city","state","pinCode","photo"];

  if (!config.sheetId) {
    const current = await readLocalStudents();
    let found = false;
    const updated = current.map(s => {
      if (String(s.rollNumber).trim().toLowerCase() !== target) return s;
      found = true;
      const next = { ...s };
      for (const f of allowed) if (changes[f] !== undefined) next[f] = changes[f];
      return next;
    });
    if (!found) throw new Error("Student not found");
    await writeLocalStudents(updated);
    return { updatedCount: 1 };
  }

  const sheets = google.sheets({ version: "v4", auth: getAuthClient() });
  const result = await sheets.spreadsheets.values.get({ spreadsheetId: config.sheetId, range: config.sheetRange });
  const values = result.data.values || [];
  const sheetName = config.sheetRange.split("!")[0] || "Sheet1";
  let count = 0;

  for (let i = 1; i < values.length; i++) {
    const row = values[i] || [];
    if (String(row[1] || "").trim().toLowerCase() !== target) continue;
    const next = [
      changes.studentName ?? row[0] ?? "", row[1] ?? "", changes.mentorName ?? row[2] ?? "",
      changes.mentorPhone ?? row[3] ?? "", changes.phoneNumber ?? row[4] ?? "",
      row[5] ?? "", row[6] ?? "", changes.branch ?? row[7] ?? "", changes.section ?? row[8] ?? "",
      changes.address ?? row[9] ?? "", changes.city ?? row[10] ?? "", changes.state ?? row[11] ?? "",
      changes.pinCode ?? row[12] ?? "", changes.photo ?? row[13] ?? ""
    ];
    await sheets.spreadsheets.values.update({
      spreadsheetId: config.sheetId, range: `${sheetName}!A${i+1}:N${i+1}`,
      valueInputOption: "USER_ENTERED", requestBody: { values: [next] }
    });
    count++;
  }
  if (!count) throw new Error("Student not found");
  return { updatedCount: count };
}

export async function deleteStudentByRoll(rollNumber) {
  const target = String(rollNumber).trim().toLowerCase();
  if (!config.sheetId) {
    const current = await readLocalStudents();
    const next = current.filter(s => String(s.rollNumber).trim().toLowerCase() !== target);
    if (next.length === current.length) throw new Error("Student not found");
    await writeLocalStudents(next);
    return { deletedCount: current.length - next.length };
  }
  const sheets = google.sheets({ version: "v4", auth: getAuthClient() });
  const result = await sheets.spreadsheets.values.get({ spreadsheetId: config.sheetId, range: config.sheetRange });
  const values = result.data.values || [];
  const sheetName = config.sheetRange.split("!")[0] || "Sheet1";
  const meta = await sheets.spreadsheets.get({ spreadsheetId: config.sheetId });
  const sheet = meta.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) throw new Error(`Sheet ${sheetName} not found`);
  const indexes = [];
  for (let i = 1; i < values.length; i++) {
    if (String(values[i]?.[1] || "").trim().toLowerCase() === target) indexes.push(i);
  }
  if (!indexes.length) throw new Error("Student not found");
  const requests = indexes.reverse().map(i => ({
    deleteDimension: { range: { sheetId: sheet.properties.sheetId, dimension: "ROWS", startIndex: i, endIndex: i + 1 } }
  }));
  await sheets.spreadsheets.batchUpdate({ spreadsheetId: config.sheetId, requestBody: { requests } });
  return { deletedCount: indexes.length };
}

export async function deleteStudentsByMentor(mentorName) {
  if (!config.sheetId) {
    const current = await readLocalStudents();
    await writeLocalStudents(current.filter(s => String(s.mentorName).trim() !== String(mentorName).trim()));
    return;
  }
  const sheets = google.sheets({ version: "v4", auth: getAuthClient() });
  const result = await sheets.spreadsheets.values.get({ spreadsheetId: config.sheetId, range: config.sheetRange });
  const values = result.data.values || [];
  const sheetName = config.sheetRange.split("!")[0] || "Sheet1";
  const meta = await sheets.spreadsheets.get({ spreadsheetId: config.sheetId });
  const sheet = meta.data.sheets.find(s => s.properties.title === sheetName);
  const indexes = [];
  for (let i = 1; i < values.length; i++) {
    if (String(values[i]?.[2] || "").trim() === String(mentorName).trim()) indexes.push(i);
  }
  if (!indexes.length) return;
  const requests = indexes.reverse().map(i => ({
    deleteDimension: { range: { sheetId: sheet.properties.sheetId, dimension: "ROWS", startIndex: i, endIndex: i + 1 } }
  }));
  await sheets.spreadsheets.batchUpdate({ spreadsheetId: config.sheetId, requestBody: { requests } });
}

export async function reassignMentor(oldName, newName, newPhone) {
  if (!config.sheetId) {
    const cur = await readLocalStudents();
    await writeLocalStudents(cur.map(s => s.mentorName === oldName ? { ...s, mentorName: newName, mentorPhone: newPhone } : s));
    return;
  }
  const sheets = google.sheets({ version: "v4", auth: getAuthClient() });
  const sheetName = config.sheetRange.split("!")[0] || "Sheet1";
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: config.sheetId, range: config.sheetRange });
  const data = [];
  (r.data.values || []).forEach((row, i) => {
    if (i > 0 && String(row[2] || "").trim() === String(oldName).trim())
      data.push({ range: `${sheetName}!C${i+1}:D${i+1}`, values: [[newName, newPhone]] });
  });
  if (data.length) await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: config.sheetId, requestBody: { valueInputOption: "USER_ENTERED", data }
  });
}
