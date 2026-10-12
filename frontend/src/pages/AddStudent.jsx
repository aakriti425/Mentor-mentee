import { useEffect, useState } from "react";
import { UserPlus, ShieldCheck } from "lucide-react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import api from "../api";

const initial={studentName:"",rollNumber:"",mentorName:"",mentorPhone:"",phoneNumber:"",branch:"",section:"",address:"",city:"",state:"",pinCode:"",photo:""};
export default function AddStudent(){
  const {user}=useAuth(); const isMentor=user?.role==="mentor";
  const [form,setForm]=useState(initial),[mentors,setMentors]=useState([]),[saving,setSaving]=useState(false),[message,setMessage]=useState({type:"",text:""});
  useEffect(()=>{if(!isMentor)api.get("/auth/mentors").then(r=>setMentors(r.data.mentors||[])).catch(()=>{});else setForm(f=>({...f,section:user.section||""}));},[isMentor,user?.section]);
  const change=(k,v)=>setForm(f=>({...f,[k]:v}));
  function photoChanged(e){
    const file=e.target.files?.[0]; if(!file)return;
    if(file.size>2*1024*1024){setMessage({type:"error",text:"Photo must be 2 MB or smaller."});return;}
    if(!file.type.startsWith("image/")){setMessage({type:"error",text:"Please select an image file."});return;}
    const reader=new FileReader(); reader.onload=()=>change("photo",reader.result); reader.readAsDataURL(file);
  }
  function mentorChanged(v){const m=mentors.find(x=>x.mentorName===v);setForm(f=>({...f,mentorName:v,mentorPhone:m?.mentorPhone||""}));}
  async function submit(e){
    e.preventDefault();setSaving(true);setMessage({type:"",text:""});
    try{await api.post("/students",form);setMessage({type:"success",text:"Student added once to the master list. You do not need to add this student again tomorrow."});setForm({...initial,section:isMentor?(user.section||""):""});}
    catch(e){setMessage({type:"error",text:e.response?.data?.message||"Unable to add student."})}
    finally{setSaving(false)}
  }
  return <Layout><div className="mx-auto max-w-4xl"><h1 className="text-2xl font-bold">Add New Student</h1>
  <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm"><div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4"><div className="rounded-xl bg-white p-3 shadow-sm"><UserPlus size={21}/></div><div><div className="font-semibold">{isMentor?"Add Student to Your Mentorship":"Add Student"}</div><div className="text-xs text-slate-500">{isMentor?`Automatically assigned to ${user.mentorName||user.username}.`:"Admin can choose the mentor."}</div></div></div>
  {message.text&&<div className={`mt-5 rounded-xl p-3 text-sm ${message.type==="success"?"bg-emerald-50 text-emerald-700":"bg-red-50 text-red-700"}`}>{message.text}</div>}
  <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2">
    <label className="text-sm font-medium">Student Name<input required value={form.studentName} onChange={e=>change("studentName",e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>
    <label className="text-sm font-medium">Roll Number<input required value={form.rollNumber} onChange={e=>change("rollNumber",e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>
    <label className="text-sm font-medium">Branch<input required value={form.branch} onChange={e=>change("branch",e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>
    <label className="text-sm font-medium">Section<select required value={form.section} onChange={e=>change("section",e.target.value)} className="mt-1 w-full rounded-xl border p-3"><option value="">Select section</option>{sections.map(x=><option key={x}>{x}</option>)}</select></label>
    {isMentor?<div className="rounded-xl border bg-slate-50 p-3 text-sm"><div className="text-xs text-slate-500">Mentor</div><b>{user.mentorName||user.username}</b></div>:<label className="text-sm font-medium">Mentor<select required value={form.mentorName} onChange={e=>mentorChanged(e.target.value)} className="mt-1 w-full rounded-xl border p-3"><option value="">Select mentor</option>{mentors.map(m=><option key={m.username} value={m.mentorName}>{m.mentorName}</option>)}</select></label>}
    <label className="text-sm font-medium">Mentor Phone<input value={form.mentorPhone} readOnly={isMentor} onChange={e=>change("mentorPhone",e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>
    <label className="text-sm font-medium">Student Phone<input required value={form.phoneNumber} onChange={e=>change("phoneNumber",e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>
    <label className="text-sm font-medium">Student Photo<input type="file" accept="image/*" onChange={photoChanged} className="mt-1 w-full rounded-xl border p-2.5"/></label>
    {form.photo&&<div className="flex items-center gap-3"><img src={form.photo} alt="Student preview" className="h-20 w-20 rounded-xl object-cover border"/><span className="text-xs text-slate-500">Photo preview</span></div>}
    <label className="text-sm font-medium md:col-span-2">Address<input value={form.address} onChange={e=>change("address",e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>
    <label className="text-sm font-medium">City<input value={form.city} onChange={e=>change("city",e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>
    <label className="text-sm font-medium">State<input value={form.state} onChange={e=>change("state",e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>
    <label className="text-sm font-medium">PIN Code<input value={form.pinCode} onChange={e=>change("pinCode",e.target.value)} className="mt-1 w-full rounded-xl border p-3"/></label>
    <div className="md:col-span-2"><button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 p-3 font-semibold text-white disabled:opacity-50"><UserPlus size={18}/>{saving?"Adding...":"Add Student to Master List"}</button></div>
  </form><div className="mt-5 flex items-start gap-2 text-xs text-slate-500"><ShieldCheck size={15}/><span>After adding students, use the dashboard every day to mark Present/Absent and enter that day's absence remarks.</span></div>
  </div></div></Layout>
}
const sections="ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
