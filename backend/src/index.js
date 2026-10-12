import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import attendanceRoutes from "./routes/attendance.js";
import remarkRoutes from "./routes/remarks.js";
import studentRoutes from "./routes/students.js";
import reportRoutes from "./routes/reports.js";
import { cleanupExpiredPendingDeletions } from "./services/pendingDeletions.js";
import { deleteStudentByRoll } from "./services/googleSheets.js";

const app=express();
app.use(cors());
app.use(express.json());
app.get("/api/health",(req,res)=>res.json({ok:true,service:"GLBITM Attendance API"}));
app.use("/api/auth",authRoutes);
app.use("/api/attendance",attendanceRoutes);
app.use("/api/remarks",remarkRoutes);
app.use("/api/students",studentRoutes);
app.get("/api/students-debug", (req, res) => {
  res.json({ message: "Students path reached" });
});
console.log("Student router loaded");
app.use("/api/reports",reportRoutes);
// Serve the built React app (so one service hosts everything when deployed)
const dist=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../frontend/dist");
app.use(express.static(dist));
app.use((req,res,next)=>req.path.startsWith("/api")?next():res.sendFile(path.join(dist,"index.html"),e=>e&&next()));
app.use((err,req,res,next)=>{console.error(err);res.status(500).json({message:"Internal server error"})});
app.listen(config.port,()=>{
  console.log(`GLBITM backend running on http://localhost:${config.port}`);
  // Permanently remove mentor-deleted students after 24 hours.
  cleanupExpiredPendingDeletions(deleteStudentByRoll).catch(console.error);
  setInterval(() => cleanupExpiredPendingDeletions(deleteStudentByRoll).catch(console.error), 60 * 1000);
});