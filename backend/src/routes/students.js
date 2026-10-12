import express from "express";
import { auth } from "../middleware/auth.js";
import { readAttendance, addStudent, updateStudentByRoll, deleteStudentByRoll } from "../services/googleSheets.js";
import { deleteRemarksByRoll } from "./remarks.js";
import { deleteAttendanceByRoll } from "../services/attendanceRecords.js";
import { markStudentPendingDeletion } from "../services/pendingDeletions.js";

const router = express.Router();
router.get("/", auth, async (req, res) => {
  try {
    const students = await readAttendance();
    res.json({ students });
  } catch (e) {
    res.status(500).json({
      message: e.message || "Unable to fetch students"
    });
  }
});

router.post("/", auth, async (req,res) => {
  try {
    const { studentName, rollNumber, mentorName, mentorPhone, phoneNumber, branch, section, address="", city="", state="", pinCode="", photo="" } = req.body || {};
    if (!studentName || !rollNumber || !phoneNumber || !branch || !section)
      return res.status(400).json({message:"Student name, roll number, phone, branch and section are required"});
    const sec = String(section).toUpperCase();
    if (!/^[A-Z]$/.test(sec)) return res.status(400).json({message:"Section must be a single letter from A to Z"});
    const finalMentor = req.user.role === "mentor" ? req.user.mentorName : String(mentorName || "").trim();
    if (!finalMentor) return res.status(400).json({message:"Mentor is required"});

    const all = await readAttendance();
    if (all.some(s => String(s.rollNumber).trim().toLowerCase() === String(rollNumber).trim().toLowerCase()))
      return res.status(409).json({message:"This student is already in the student list. Students are added only once."});

    const student = {
      studentName:String(studentName).trim(), rollNumber:String(rollNumber).trim(), mentorName:finalMentor,
      mentorPhone:req.user.role==="mentor" ? (req.user.mentorPhone || "") : String(mentorPhone || "").trim(),
      phoneNumber:String(phoneNumber).trim(), branch:String(branch).trim(), section:sec,
      address:String(address).trim(), city:String(city).trim(), state:String(state).trim(), pinCode:String(pinCode).trim(), photo:String(photo || "")
    };
    await addStudent(student);
    res.status(201).json({student,message:"Student added to the master list. Daily attendance can now be marked from the dashboard."});
  } catch(e) { res.status(500).json({message:e.message || "Unable to add student"}); }
});

router.put("/:rollNumber", auth, async (req,res) => {
  try {
    const all = await readAttendance();
    const student = all.find(s => String(s.rollNumber).trim().toLowerCase() === String(req.params.rollNumber).trim().toLowerCase());
    if (!student) return res.status(404).json({message:"Student not found"});
    if (req.user.role === "mentor" && student.mentorName !== req.user.mentorName)
      return res.status(403).json({message:"You can edit only your assigned students"});

    const fields=["studentName","phoneNumber","branch","section","address","city","state","pinCode","photo"];
    const changes={};
    for (const f of fields) if (req.body[f] !== undefined) changes[f] = String(req.body[f]).trim();
    if (req.user.role === "admin") {
      for (const f of ["mentorName","mentorPhone"]) if (req.body[f] !== undefined) changes[f] = String(req.body[f]).trim();
    }
    if (changes.section) {
      changes.section = changes.section.toUpperCase();
      if (!/^[A-Z]$/.test(changes.section)) return res.status(400).json({message:"Section must be a single letter from A to Z"});
    }
    await updateStudentByRoll(req.params.rollNumber, changes);
    res.json({message:"Student details updated successfully"});
  } catch(e) { res.status(500).json({message:e.message || "Unable to update student"}); }
});

router.delete("/:rollNumber", auth, async (req,res) => {
  try {
    const all = await readAttendance();
    const target = String(req.params.rollNumber).trim().toLowerCase();
    const student = all.find(s => String(s.rollNumber).trim().toLowerCase() === target);
    if (!student) return res.status(404).json({message:"Student not found"});
    if (req.user.role === "mentor" && student.mentorName !== req.user.mentorName)
      return res.status(403).json({message:"You can remove only your assigned students"});

    if (req.user.role === "mentor") {
      await markStudentPendingDeletion(req.params.rollNumber, req.user.mentorName);
      return res.json({message:"Student removed from your dashboard. It will be permanently removed after 24 hours.",rollNumber:req.params.rollNumber,pendingDeletion:true});
    }

    await deleteStudentByRoll(req.params.rollNumber);
    await deleteRemarksByRoll(req.params.rollNumber);
    await deleteAttendanceByRoll(req.params.rollNumber);
    res.json({message:"Student removed permanently",rollNumber:req.params.rollNumber});
  } catch(e) { res.status(500).json({message:e.message || "Unable to remove student"}); }
});

export default router;
