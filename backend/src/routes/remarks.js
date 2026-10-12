import express from "express";
import crypto from "node:crypto";
import { auth } from "../middleware/auth.js";
import { readAttendance } from "../services/googleSheets.js";
import { getAttendanceForDate } from "../services/attendanceRecords.js";
import { readTab, writeTab } from "../services/sheetStore.js";

const router = express.Router();
const TAB = "remarks", H = ["id","rollNumber","studentName","remark","date","mentorName","updatedAt"];
const same = (a,b) => String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

export const getRemarks = () => readTab(TAB,H);
export async function deleteRemarksByRoll(rollNumber) {
  const list=await getRemarks();
  await writeTab(TAB,H,list.filter(r=>!same(r.rollNumber,rollNumber)));
}

router.post("/",auth,async(req,res)=>{
  try {
    const {rollNumber,studentName,remark,date}=req.body||{};
    if(!rollNumber || !String(remark||"").trim()) return res.status(400).json({message:"Roll number and remark are required"});
    const d=String(date||"").slice(0,10);
    if(!d) return res.status(400).json({message:"Date is required"});

    const student=(await readAttendance()).find(s=>same(s.rollNumber,rollNumber));
    if(!student) return res.status(404).json({message:"Student not found"});
    if(req.user.role==="mentor" && student.mentorName!==req.user.mentorName)
      return res.status(403).json({message:"You can add remarks only for your assigned students"});

    const attendance=(await getAttendanceForDate(d)).find(r=>same(r.rollNumber,rollNumber));
    if(!attendance || !same(attendance.attendance,"absent"))
      return res.status(400).json({message:"Mark the student absent for this date before adding a remark"});

    const list=await getRemarks();
    const idx=list.findIndex(r=>same(r.rollNumber,rollNumber)&&String(r.date).slice(0,10)===d);
    const item={
      id:idx>=0?list[idx].id:crypto.randomUUID(), rollNumber:student.rollNumber,
      studentName:studentName||student.studentName, remark:String(remark).trim().slice(0,300),
      date:d, mentorName:req.user.mentorName||"Admin", updatedAt:new Date().toISOString()
    };
    if(idx>=0) list[idx]=item; else list.push(item);
    await writeTab(TAB,H,list);
    res.json({remark:item});
  } catch(e) { res.status(500).json({message:e.message||"Unable to save remark"}); }
});

router.delete("/:rollNumber",auth,async(req,res)=>{
  try {
    const records=(await readAttendance()).filter(s=>same(s.rollNumber,req.params.rollNumber));
    if(req.user.role==="mentor" && records.some(s=>s.mentorName!==req.user.mentorName))
      return res.status(403).json({message:"You can remove only your assigned students"});
    await deleteRemarksByRoll(req.params.rollNumber);
    res.json({message:"Remarks removed"});
  } catch(e) { res.status(500).json({message:e.message||"Unable to remove remarks"}); }
});
export default router;
