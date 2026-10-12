import { useEffect, useMemo, useState } from "react";
import { KeyRound, MessageSquare, Phone, RefreshCw, Save, Trash2, UserCheck, UserX, Users, X } from "lucide-react";
import StatCard from "../components/StatCard";
import { today, isToday } from "../utils";
import Layout from "../components/Layout";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import AttendanceChart from "../components/AttendanceChart";
import StudentProfileModal from "../components/StudentProfileModal";

const sections="ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function MentorDashboard(){
  const {user,updateSession}=useAuth();
  const [rows,setRows]=useState([]), [date,setDate]=useState(today()), [query,setQuery]=useState("");
  const [onlyAbsent,setOnlyAbsent]=useState(false), [remarkDrafts,setRemarkDrafts]=useState({});
  const [message,setMessage]=useState(""), [loading,setLoading]=useState(true), [saving,setSaving]=useState("");
  const [chart,setChart]=useState([]), [profileStudent,setProfileStudent]=useState(null), [accountOpen,setAccountOpen]=useState(false);

  async function load(){
    setLoading(true);
    try{
      const [r,c]=await Promise.all([api.get("/attendance",{params:{date}}),api.get("/attendance/stats",{params:{month:date.slice(0,7)}})]);
      const students=r.data.students||[];
      setRows(students);
      setRemarkDrafts(Object.fromEntries(students.map(s=>[`${s.rollNumber}|${date}`,s.remark||""])));
      setChart(c.data.data||[]);
    }catch(e){setMessage(e.response?.data?.message||"Unable to load attendance");}
    finally{setLoading(false);}
  }
  useEffect(()=>{load()},[date]);

  const filtered=useMemo(()=>rows.filter(s=>(!onlyAbsent||s.attendance==="Absent")&&`${s.studentName} ${s.rollNumber} ${s.branch} ${s.section} ${s.phoneNumber}`.toLowerCase().includes(query.toLowerCase())),[rows,query,onlyAbsent]);
  const stats={total:rows.length,present:rows.filter(s=>s.attendance==="Present").length,absent:rows.filter(s=>s.attendance==="Absent").length,remarks:rows.filter(s=>isToday(s.remarkAt)).length};

  async function setAttendance(s, absent){
    const attendance=absent?"Absent":"Present";
    setSaving(`a:${s.rollNumber}`);
    setRows(r=>r.map(x=>x.rollNumber===s.rollNumber?{...x,attendance}:x));
    try{await api.put(`/attendance/${encodeURIComponent(s.rollNumber)}`,{date,attendance});setMessage(`${s.studentName}: ${attendance} for ${date}`);}
    catch(e){setRows(r=>r.map(x=>x.rollNumber===s.rollNumber?{...x,attendance:s.attendance}:x));setMessage(e.response?.data?.message||"Unable to save attendance");}
    finally{setSaving("");}
  }

  async function saveRemark(s){
    const key=`${s.rollNumber}|${date}`, text=(remarkDrafts[key]||"").trim();
    if(!text){setMessage("Please enter a remark");return;}
    setSaving(`r:${s.rollNumber}`);
    try{await api.post("/remarks",{rollNumber:s.rollNumber,studentName:s.studentName,remark:text,date});setMessage(`Remark saved for ${s.studentName}`);await load();}
    catch(e){setMessage(e.response?.data?.message||"Unable to save remark");}
    finally{setSaving("");}
  }

  async function savePhoto(s,photo){await api.put(`/students/${encodeURIComponent(s.rollNumber)}`,{photo});setRows(r=>r.map(x=>x.rollNumber===s.rollNumber?{...x,photo}:x));setProfileStudent(x=>x?{...x,photo}:x);setMessage("Student photo updated");}
  async function saveDetails(s){
    setSaving(`d:${s.rollNumber}`);
    try{await api.put(`/students/${encodeURIComponent(s.rollNumber)}`,{studentName:s.studentName,phoneNumber:s.phoneNumber,branch:s.branch,section:s.section,address:s.address,city:s.city,state:s.state,pinCode:s.pinCode});setMessage("Student details updated");await load();}
    catch(e){setMessage(e.response?.data?.message||"Unable to update student");}
    finally{setSaving("");}
  }

  async function removeStudent(s){
    if(!confirm(`Remove ${s.studentName} (${s.rollNumber})?`))return;
    try{await api.delete(`/students/${encodeURIComponent(s.rollNumber)}`);setRows(current=>current.filter(x=>String(x.rollNumber)!==String(s.rollNumber)));setMessage(`${s.studentName} removed from your dashboard. It will be permanently removed after 24 hours.`);}
    catch(e){setMessage(e.response?.data?.message||"Unable to remove student");}
  }

  return <Layout><div>
    <div className="flex flex-col justify-between gap-4 md:flex-row">
      <div className="flex items-center gap-3"><div className="h-14 w-14 overflow-hidden rounded-full border-2 border-white bg-slate-100 shadow">{user?.photo?<img src={user.photo} alt={user.mentorName} className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center text-xs text-slate-400">—</div>}</div><div><h1 className="text-2xl font-bold">Mentor Dashboard</h1><p className="mt-1 text-sm text-slate-500">{user?.mentorName||user?.username} · Mentor Phone: {user?.mentorPhone||"—"}</p></div></div>
      <div className="flex flex-wrap gap-2"><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="rounded-lg border bg-white px-3 py-2"/><button onClick={load} className="rounded-lg border bg-white p-2"><RefreshCw size={18}/></button><button onClick={()=>setAccountOpen(true)} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold"><KeyRound size={16}/>Change Login</button></div>
    </div>
    {message&&<div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">{message}</div>}
    <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4"><StatCard label="Total Students" value={stats.total} icon={Users}/><StatCard label="Present Today" value={stats.present} icon={UserCheck}/><StatCard label="Absent Today" value={stats.absent} icon={UserX}/><StatCard label="Remarks Today" value={stats.remarks} icon={MessageSquare}/></div>
    <AttendanceChart data={chart} title="My students — absence graph" month={date.slice(0,7)}/>
    <section className="mt-6 rounded-2xl border bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 border-b p-4 md:flex-row md:items-center">
        <div><h2 className="font-semibold">My Students — {date}</h2><p className="text-xs text-slate-500">The student list is permanent; only attendance and daily remarks change.</p></div>
        <div className="flex items-center gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyAbsent} onChange={e=>setOnlyAbsent(e.target.checked)}/>Absent only</label><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search student or roll" className="rounded-lg border px-3 py-2"/></div>
      </div>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Roll</th><th className="p-4">Student</th><th className="p-4">Branch</th><th className="p-4">Section</th><th className="p-4">Phone</th><th className="p-4">Attendance</th><th className="p-4 min-w-[280px]">Daily Remark</th></tr></thead>
        <tbody>{loading?<tr><td colSpan="7" className="p-8 text-center">Loading...</td></tr>:filtered.length===0?<tr><td colSpan="7" className="p-8 text-center text-slate-500">No students found.</td></tr>:filtered.map(s=>{
          const key=`${s.rollNumber}|${date}`;
          return <tr key={s.rollNumber} className="border-t align-top">
            <td className="p-4 font-medium">{s.rollNumber}</td><td className="p-4"><button onClick={()=>setProfileStudent(s)} className="font-medium text-left text-blue-700 hover:underline">{s.studentName}</button></td>
            <td className="p-4"><input value={s.branch||""} onChange={e=>setRows(r=>r.map(x=>x.rollNumber===s.rollNumber?{...x,branch:e.target.value}:x))} className="w-28 rounded-lg border p-2"/></td>
            <td className="p-4"><select value={s.section||""} onChange={e=>setRows(r=>r.map(x=>x.rollNumber===s.rollNumber?{...x,section:e.target.value}:x))} className="rounded-lg border p-2">{sections.map(x=><option key={x}>{x}</option>)}</select></td>
            <td className="p-4">{s.phoneNumber?<a href={`tel:${s.phoneNumber}`} className="inline-flex items-center gap-1 underline"><Phone size={14}/>{s.phoneNumber}</a>:"—"}</td>
            <td className="p-4"><label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border px-3 py-2"><input type="checkbox" checked={s.attendance==="Absent"} onChange={e=>setAttendance(s,e.target.checked)} disabled={saving===`a:${s.rollNumber}`} className="h-5 w-5"/><span className={s.attendance==="Absent"?"font-semibold text-red-700":"font-semibold text-emerald-700"}>{s.attendance==="Absent"?"Absent":"Present"}</span></label><button onClick={()=>saveDetails(s)} disabled={saving===`d:${s.rollNumber}`} className="mt-2 inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs"><Save size={13}/>{saving===`d:${s.rollNumber}`?"Saving":"Save details"}</button></td>
            <td className="p-4">{s.attendance==="Absent"?<div className="space-y-2"><textarea rows="2" value={remarkDrafts[key]||""} onChange={e=>setRemarkDrafts(d=>({...d,[key]:e.target.value}))} placeholder="Enter today's absence remark..." className="w-full rounded-lg border p-2"/><div className="flex flex-wrap gap-2"><button disabled={saving===`r:${s.rollNumber}`} onClick={()=>saveRemark(s)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">{saving===`r:${s.rollNumber}`?"Saving...":"Save Remark"}</button><button type="button" onClick={()=>removeStudent(s)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700"><Trash2 size={13}/>Remove Student</button></div>{s.remark&&<div className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900"><b>Saved:</b> {s.remark}</div>}</div>:<div className="text-slate-400">No absence remark</div>}</td>
          </tr>
        })}</tbody>
      </table></div>
    </section>
    {profileStudent&&<StudentProfileModal student={profileStudent} onClose={()=>setProfileStudent(null)} onSavePhoto={savePhoto}/>}
    {accountOpen&&<MentorAccountModal user={user} onClose={()=>setAccountOpen(false)} onUpdated={updateSession}/>}
  </div></Layout>
}


function MentorAccountModal({user,onClose,onUpdated}){
 const [username,setUsername]=useState(user?.username||""),[currentPassword,setCurrentPassword]=useState(""),[password,setPassword]=useState(""),[confirm,setConfirm]=useState(""),[saving,setSaving]=useState(false),[error,setError]=useState("");
 async function save(){
  setError("");
  if(!currentPassword)return setError("Enter your current password.");
  if(password && password!==confirm)return setError("New passwords do not match.");
  if(password && password.length<6)return setError("New password must be at least 6 characters.");
  if(username.trim().length<3)return setError("Login ID must be at least 3 characters.");
  setSaving(true);
  try{const {data}=await api.put("/auth/mentor/account",{username:username.trim(),currentPassword,password});localStorage.setItem("token",data.token);onUpdated(data);alert("Login details updated successfully. Use the new Login ID/password next time you log in.");onClose();}
  catch(e){setError(e.response?.data?.message||"Unable to update login details");}
  finally{setSaving(false);}
 }
 return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}><div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onMouseDown={e=>e.stopPropagation()}><div className="flex items-center justify-between border-b p-5"><div><h2 className="font-bold">Change Login ID & Password</h2><p className="mt-1 text-xs text-slate-500">Admin created your initial credentials. You can change them here.</p></div><button onClick={onClose}><X/></button></div><div className="space-y-4 p-5"><label className="block text-sm font-medium">New Login ID<input value={username} onChange={e=>setUsername(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label><label className="block text-sm font-medium">Current Password<input type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label><label className="block text-sm font-medium">New Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Leave blank to keep current password" className="mt-1 w-full rounded-lg border p-2"/></label><label className="block text-sm font-medium">Confirm New Password<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label>{error&&<div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}</div><div className="flex justify-end gap-2 border-t p-5"><button onClick={onClose} className="rounded-lg border px-4 py-2">Cancel</button><button disabled={saving} onClick={save} className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white">{saving?"Saving...":"Save Login Details"}</button></div></div></div>
}
