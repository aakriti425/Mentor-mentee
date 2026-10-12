import crypto from "node:crypto";
import { readTab, writeTab } from "./sheetStore.js";

const TAB = "attendance";
const H = ["id", "rollNumber", "date", "attendance", "mentorName", "updatedAt"];

const same = (a,b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();
const normDate = v => String(v ?? "").slice(0,10);

export async function getAttendanceRecords() {
  return readTab(TAB, H);
}

export async function getAttendanceForDate(date) {
  const d = normDate(date);
  return (await getAttendanceRecords()).filter(r => normDate(r.date) === d);
}

export async function upsertAttendance({ rollNumber, date, attendance, mentorName }) {
  const d = normDate(date);
  const list = await getAttendanceRecords();
  const idx = list.findIndex(r => same(r.rollNumber, rollNumber) && normDate(r.date) === d);
  const item = {
    id: idx >= 0 ? list[idx].id : crypto.randomUUID(),
    rollNumber: String(rollNumber).trim(),
    date: d,
    attendance: String(attendance).toLowerCase() === "absent" ? "Absent" : "Present",
    mentorName: String(mentorName || "").trim(),
    updatedAt: new Date().toISOString()
  };
  if (idx >= 0) list[idx] = item; else list.push(item);
  await writeTab(TAB, H, list);
  return item;
}

export async function upsertAttendanceBatch(records, date) {
  const d = normDate(date);
  const list = await getAttendanceRecords();
  for (const rec of records || []) {
    const roll = String(rec.rollNumber || "").trim();
    if (!roll) continue;
    const idx = list.findIndex(r => same(r.rollNumber, roll) && normDate(r.date) === d);
    const item = {
      id: idx >= 0 ? list[idx].id : crypto.randomUUID(),
      rollNumber: roll,
      date: d,
      attendance: String(rec.attendance).toLowerCase() === "absent" ? "Absent" : "Present",
      mentorName: String(rec.mentorName || "").trim(),
      updatedAt: new Date().toISOString()
    };
    if (idx >= 0) list[idx] = item; else list.push(item);
  }
  await writeTab(TAB, H, list);
  return list.filter(r => normDate(r.date) === d);
}

export async function deleteAttendanceByRoll(rollNumber) {
  const list = await getAttendanceRecords();
  await writeTab(TAB, H, list.filter(r => !same(r.rollNumber, rollNumber)));
}
