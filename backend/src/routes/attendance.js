import express from "express";
import { auth } from "../middleware/auth.js";
import { readAttendance } from "../services/googleSheets.js";
import { getRemarks } from "./remarks.js";
import { getPendingDeletions, cleanupExpiredPendingDeletions } from "../services/pendingDeletions.js";
import { deleteStudentByRoll } from "../services/googleSheets.js";
import { getAttendanceForDate, getAttendanceRecords, upsertAttendance, upsertAttendanceBatch } from "../services/attendanceRecords.js";

const router = express.Router();
const same = (a,b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();
const normDate = v => String(v || "").slice(0,10);

async function visibleStudents(req) {
  const pending = await getPendingDeletions();
  const pendingMap = new Map(pending.map(x => [String(x.rollNumber).trim().toLowerCase(), x]));
  let students = await readAttendance();

  if (req.user.role === "mentor") {
    students = students.filter(s => s.mentorName === req.user.mentorName);
    students = students.filter(s => !pendingMap.has(String(s.rollNumber).trim().toLowerCase()));
    if (req.user.section) students = students.filter(s => String(s.section || "").toUpperCase() === String(req.user.section).toUpperCase());
  }
  return {students,pendingMap};
}

router.get("/", auth, async (req,res) => {
  try {
    await cleanupExpiredPendingDeletions(deleteStudentByRoll);
    const date = normDate(req.query.date) || new Date().toISOString().slice(0,10);
    const {students,pendingMap} = await visibleStudents(req);
    const records = await getAttendanceForDate(date);
    const recordMap = new Map(records.map(r => [String(r.rollNumber).trim().toLowerCase(), r]));
    const remarks = await getRemarks();

    const result = students.map(s => {
      const key = String(s.rollNumber).trim().toLowerCase();
      const rec = recordMap.get(key);
      const found = remarks.find(r => same(r.rollNumber,s.rollNumber) && normDate(r.date) === date);
      const pendingDeletion = pendingMap.get(key);
      return {
        ...s,
        date,
        attendance: rec?.attendance || "Present",
        attendanceUpdatedAt: rec?.updatedAt || "",
        remark: found?.remark || "",
        remarkAt: found?.updatedAt || "",
        pendingDeletion: Boolean(pendingDeletion),
        deletionExpiresAt: pendingDeletion?.deletedAt ? new Date(new Date(pendingDeletion.deletedAt).getTime()+24*60*60*1000).toISOString() : null
      };
    });
    res.json({students:result,date});
  } catch(e) { res.status(500).json({message:e.message || "Unable to load attendance"}); }
});

router.post("/", auth, async (req,res) => {
  try {
    const date = normDate(req.body?.date);
    if (!date) return res.status(400).json({message:"Attendance date is required"});
    const {students} = await visibleStudents(req);
    const allowed = new Map(students.map(s => [String(s.rollNumber).trim().toLowerCase(),s]));
    const records = Array.isArray(req.body?.records) ? req.body.records : [];
    const clean = records.map(r => {
      const s = allowed.get(String(r.rollNumber || "").trim().toLowerCase());
      if (!s) return null;
      return {rollNumber:s.rollNumber, attendance:String(r.attendance).toLowerCase()==="absent"?"Absent":"Present", mentorName:s.mentorName};
    }).filter(Boolean);
    const saved = await upsertAttendanceBatch(clean,date);
    res.json({message:"Daily attendance saved",date,records:saved.filter(r=>clean.some(c=>same(c.rollNumber,r.rollNumber)))});
  } catch(e) { res.status(500).json({message:e.message || "Unable to save attendance"}); }
});

router.put("/:rollNumber", auth, async (req,res) => {
  try {
    const date = normDate(req.body?.date);
    if (!date) return res.status(400).json({message:"Attendance date is required"});
    const {students} = await visibleStudents(req);
    const student = students.find(s=>same(s.rollNumber,req.params.rollNumber));
    if (!student) return res.status(403).json({message:"You can update attendance only for students visible to you"});
    const record = await upsertAttendance({
      rollNumber:student.rollNumber,date,attendance:req.body?.attendance,mentorName:student.mentorName
    });
    res.json({record,message:"Attendance updated"});
  } catch(e) { res.status(500).json({message:e.message || "Unable to update attendance"}); }
});

// Daily/monthly absence data used by both Mentor and Admin dashboards.
router.get("/stats", auth, async (req,res) => {
  try {
    const month = String(req.query.month || new Date().toISOString().slice(0,7)).slice(0,7);
    const all = await getAttendanceRecords();
    const {students} = await visibleStudents(req);
    const allowed = new Set(students.map(s=>String(s.rollNumber).trim().toLowerCase()));
    const daily = new Map();
    for (const r of all) {
      const d=normDate(r.date);
      if (!d.startsWith(month+"-") || !allowed.has(String(r.rollNumber).trim().toLowerCase())) continue;
      if (String(r.attendance).toLowerCase() !== "absent") continue;
      daily.set(d,(daily.get(d)||0)+1);
    }
    const data=[...daily.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,absent])=>({date,absent}));
    res.json({month,data});
  } catch(e) { res.status(500).json({message:e.message || "Unable to load attendance statistics"}); }
});

export default router;
