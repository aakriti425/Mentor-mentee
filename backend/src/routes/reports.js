import express from "express";
import { auth } from "../middleware/auth.js";
import { readAttendance } from "../services/googleSheets.js";
import { getAttendanceRecords } from "../services/attendanceRecords.js";
import { getRemarks } from "./remarks.js";

const router = express.Router();
const same=(a,b)=>String(a??"").trim().toLowerCase()===String(b??"").trim().toLowerCase();
const escCsv=v=>{const s=String(v??"");return /[",\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s};

async function buildRows(req){
  let students=await readAttendance();
  if(req.user.role==="mentor") students=students.filter(s=>same(s.mentorName,req.user.mentorName));
  const attendance=await getAttendanceRecords();
  const remarks=await getRemarks();
  const byRoll=new Map(students.map(s=>[String(s.rollNumber).trim().toLowerCase(),s]));
  const rows=[];
  for(const r of attendance){
    const s=byRoll.get(String(r.rollNumber).trim().toLowerCase());
    if(!s) continue;
    const remark=remarks.find(x=>same(x.rollNumber,s.rollNumber)&&String(x.date).slice(0,10)===String(r.date).slice(0,10));
    rows.push({date:String(r.date).slice(0,10),rollNumber:s.rollNumber,studentName:s.studentName,branch:s.branch,section:s.section,studentPhone:s.phoneNumber,mentorName:s.mentorName,mentorPhone:s.mentorPhone,address:[s.address,s.city,s.state,s.pinCode].filter(Boolean).join(", "),attendance:r.attendance,remark:remark?.remark||""});
  }
  // Include students who have no attendance record yet, so their details are still reportable.
  for(const s of students){
    if(!rows.some(r=>same(r.rollNumber,s.rollNumber))) rows.push({date:"",rollNumber:s.rollNumber,studentName:s.studentName,branch:s.branch,section:s.section,studentPhone:s.phoneNumber,mentorName:s.mentorName,mentorPhone:s.mentorPhone,address:[s.address,s.city,s.state,s.pinCode].filter(Boolean).join(", "),attendance:"",remark:""});
  }
  return rows.sort((a,b)=>(a.rollNumber||"").localeCompare(b.rollNumber||"")||(a.date||"").localeCompare(b.date||""));
}

router.get("/",auth,async(req,res)=>{
 try{
  const rows=await buildRows(req); const format=String(req.query.format||"csv").toLowerCase();
  const headers=["Date","Roll Number","Student Name","Branch","Section","Student Phone","Mentor Name","Mentor Phone","Address","Attendance","Remark"];
  if(format==="pdf"){
   const lines=["GL Bajaj Institute of Technology and Management","Student Attendance & Mentor Report","",headers.join(" | "),...rows.map(r=>headers.map((_,i)=>[r.date,r.rollNumber,r.studentName,r.branch,r.section,r.studentPhone,r.mentorName,r.mentorPhone,r.address,r.attendance,r.remark][i]).join(" | "))];
   const pdf=makePdf(lines);
   res.setHeader("Content-Type","application/pdf");res.setHeader("Content-Disposition",`attachment; filename="GLBITM-student-report.pdf"`);return res.send(pdf);
  }
  const cells=v=>`<td>${String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}</td>`;
  const table=`<html><head><meta charset="utf-8"></head><body><h2>GL Bajaj Institute of Technology and Management - Student Report</h2><table border="1"><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr>${rows.map(r=>`<tr>${[r.date,r.rollNumber,r.studentName,r.branch,r.section,r.studentPhone,r.mentorName,r.mentorPhone,r.address,r.attendance,r.remark].map(cells).join("")}</tr>`).join("")}</table></body></html>`;
  res.setHeader("Content-Type","application/vnd.ms-excel; charset=utf-8");res.setHeader("Content-Disposition",`attachment; filename="GLBITM-student-report.xls"`);res.send(table);
 }catch(e){res.status(500).json({message:e.message||"Unable to generate report"});}
});

function pdfEscape(s){return String(s).replaceAll("\\","\\\\").replaceAll("(","\\(").replaceAll(")","\\)").replaceAll("\r","").replaceAll("\n"," ");}
function makePdf(lines){
 const max=92, wrapped=[]; for(const line of lines){let s=String(line);while(s.length>max){wrapped.push(s.slice(0,max));s=s.slice(max)}wrapped.push(s)}
 const pages=[]; for(let i=0;i<wrapped.length;i+=42) pages.push(wrapped.slice(i,i+42));
 const objs=[]; const add=x=>{objs.push(x);return objs.length};
 const catalog=add(null), pagesObj=add(null), font=add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"); const pageRefs=[];
 for(const page of pages){let content="BT\n/F1 7 Tf\n36 806 Td\n"; page.forEach((line,j)=>{if(j)content+="0 -18 Td\n";content+=`(${pdfEscape(line.slice(0,115))}) Tj\n`;});content+="ET";const stream=add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);const p=add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${stream} 0 R >>`);pageRefs.push(p)}
 objs[catalog-1]=`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`; objs[pagesObj-1]=`<< /Type /Pages /Kids [${pageRefs.map(r=>r+" 0 R").join(" ")}] /Count ${pageRefs.length} >>`;
 let out="%PDF-1.4\n"; const offsets=[0]; for(let i=0;i<objs.length;i++){offsets.push(out.length);out+=`${i+1} 0 obj\n${objs[i]}\nendobj\n`;} const xref=out.length;out+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`;for(let i=1;i<offsets.length;i++)out+=`${String(offsets[i]).padStart(10,"0")} 00000 n \n`;out+=`trailer\n<< /Size ${objs.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;return Buffer.from(out,"binary");
}
export default router;
