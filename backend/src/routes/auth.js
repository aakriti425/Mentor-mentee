import express from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { auth, requireAdmin } from "../middleware/auth.js";
import { getMentors, findMentor, updateMentor, removeMentor, createMentor, checkPassword } from "../services/mentors.js";
import { deleteStudentsByMentor, reassignMentor } from "../services/googleSheets.js";

const router = express.Router();

function fail(req, res, message) {
  return res.status(401).json({ message });
}

router.post("/login", async (req, res) => {
  const { username, password, role } = req.body || {};
  if (role === "admin") {
    if (username !== config.adminUser || password !== config.adminPassword) {
      return fail(req, res, "Invalid admin login details");
    }
    const safe = { username: "admin", role: "admin", name: "Admin" };
    return res.json({ token: jwt.sign(safe, config.jwtSecret, { expiresIn: "12h" }), user: safe });
  }

  const mentor = await findMentor(username);
  if (!mentor || !checkPassword(password, mentor.passwordHash)) {
    return fail(req, res, "Invalid mentor login details");
  }
  const safe = {
    username: mentor.username,
    role: "mentor",
    name: mentor.name || mentor.username,
    mentorName: mentor.mentorName || mentor.username,
    mentorPhone: mentor.mentorPhone || "",
    photo: mentor.photo || "",
  };
  res.json({ token: jwt.sign(safe, config.jwtSecret, { expiresIn: "12h" }), user: safe });
});

router.put("/mentor/account", auth, async (req, res) => {
  try {
    if (req.user.role !== "mentor") return res.status(403).json({ message: "Mentor access required" });
    const { username, password, currentPassword } = req.body || {};
    const before = await findMentor(req.user.username);
    if (!before) return res.status(404).json({ message: "Mentor account not found" });
    if (!currentPassword || !checkPassword(currentPassword, before.passwordHash)) return res.status(401).json({ message: "Current password is incorrect" });
    if (username !== undefined && String(username).trim().length < 3) return res.status(400).json({ message: "Login ID must be at least 3 characters" });
    if (password !== undefined && String(password).trim() && String(password).length < 6) return res.status(400).json({ message: "New password must be at least 6 characters" });
    const changes = {};
    if (username !== undefined) changes.username = String(username).trim();
    if (password !== undefined && String(password).trim()) changes.password = String(password).trim();
    const updated = await updateMentor(before.username, changes);
    const safe = { username: updated.username, role: "mentor", name: updated.name || updated.username, mentorName: updated.mentorName || updated.username, mentorPhone: updated.mentorPhone || "", photo: updated.photo || "" };
    const token = jwt.sign(safe, config.jwtSecret, { expiresIn: "12h" });
    res.json({ token, user: safe, message: "Login ID/password updated successfully" });
  } catch (e) { res.status(400).json({ message: e.message || "Unable to update mentor account" }); }
});

router.get("/mentors", auth, requireAdmin, async (req, res) => {
  const mentors = await getMentors();
  res.json({
    mentors: mentors.map(({ passwordHash, ...m }) => ({ ...m, mentorName: m.mentorName || m.username }))
  });
});

router.post("/mentors", auth, requireAdmin, async (req, res) => {
  try {
    const { username, password, mentorName, mentorPhone, section, photo } = req.body || {};
    if (!username || !password || !mentorName) return res.status(400).json({ message: "Login ID, password and mentor name are required" });
    if (String(password).length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
    const { passwordHash, ...safe } = await createMentor({ username, password, mentorName, mentorPhone, photo, section: String(section || "A").toUpperCase() });
    res.status(201).json({ mentor: safe });
  } catch (e) { res.status(400).json({ message: e.message }); }
});

router.put("/mentors/:username", auth, requireAdmin, async (req, res) => {
  try {
    const { mentorName, mentorPhone, section, password, photo } = req.body || {};
    const changes = {};
    if (mentorName !== undefined) changes.mentorName = String(mentorName).trim();
    if (mentorPhone !== undefined) changes.mentorPhone = String(mentorPhone).trim();
    if (photo !== undefined) changes.photo = String(photo || "");
    if (section !== undefined) {
      const s = String(section).toUpperCase();
      if (!["A", "B", "C"].includes(s)) return res.status(400).json({ message: "Section must be A, B or C" });
      changes.section = s;
    }
    if (password !== undefined && String(password).trim()) changes.password = String(password).trim();
    const before = await findMentor(req.params.username);
    const updated = await updateMentor(req.params.username, changes);
    if (before && (before.mentorName !== updated.mentorName || before.mentorPhone !== updated.mentorPhone))
      await reassignMentor(before.mentorName, updated.mentorName, updated.mentorPhone); // keep students linked
    const { passwordHash: _, ...safe } = updated;
    res.json({ mentor: safe });
  } catch (e) { res.status(404).json({ message: e.message }); }
});

router.delete("/mentors/:username", auth, requireAdmin, async (req, res) => {
  try {
    const mentor = await findMentor(req.params.username);
    if (!mentor) return res.status(404).json({ message: "Mentor not found" });
    await removeMentor(req.params.username);
    await deleteStudentsByMentor(mentor.mentorName || mentor.username);
    res.json({ message: "Mentor and their assigned students removed successfully" });
  } catch (e) { res.status(500).json({ message: e.message || "Unable to remove mentor" }); }
});

export default router;
