import { useState } from "react";
import { X, Phone, MapPin, UserRound } from "lucide-react";

export default function StudentProfileModal({student,onClose,onSavePhoto}){
  const [photo,setPhoto]=useState(student?.photo||"");
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  async function choose(e){
    const file=e.target.files?.[0]; if(!file)return;
    if(file.size>2*1024*1024){setError("Photo must be 2 MB or smaller.");return;}
    if(!file.type.startsWith("image/")){setError("Please select an image file.");return;}
    const reader=new FileReader();
    reader.onload=async()=>{setPhoto(reader.result);setError("");setSaving(true);try{await onSavePhoto?.(student,reader.result)}catch(err){setError(err?.response?.data?.message||"Unable to save photo.");}finally{setSaving(false)}};
    reader.readAsDataURL(file);
  }
  if(!student)return null;
  const rows=[
    ["Roll Number",student.rollNumber],["Student Name",student.studentName],["Student Phone",student.phoneNumber],
    ["Branch",student.branch],["Section",student.section],["Mentor",student.mentorName],["Mentor Phone",student.mentorPhone],
    ["Address",student.address],["City",student.city],["State",student.state],["PIN Code",student.pinCode]
  ];
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={onClose}>
    <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-gradient-to-br from-sky-50 via-white to-indigo-50 shadow-2xl" onMouseDown={e=>e.stopPropagation()}>
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div><h2 className="text-xl font-bold text-slate-900">Student Profile</h2><p className="text-sm text-slate-500">Complete student details</p></div>
        <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-100"><X size={20}/></button>
      </div>
      <div className="grid gap-6 p-6 md:grid-cols-[180px_1fr]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-40 w-40 overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-100">
            {photo?<img src={photo} alt={student.studentName} className="h-full w-full object-cover"/>:<div className="flex h-full w-full items-center justify-center text-slate-400"><UserRound size={64}/></div>}
          </div>
          <label className="w-full cursor-pointer rounded-xl bg-slate-900 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-slate-800">
            {saving?"Saving...":"Upload / Change Photo"}
            <input type="file" accept="image/*" onChange={choose} className="hidden" disabled={saving}/>
          </label>
          {error&&<div className="text-center text-xs text-red-600">{error}</div>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map(([label,value])=><div key={label} className="rounded-xl border border-sky-100 bg-white/80 p-3"><div className="text-xs font-medium text-slate-500">{label}</div><div className="mt-1 break-words font-semibold text-slate-900">{value||"—"}</div></div>)}
          {student.phoneNumber&&<a href={`tel:${student.phoneNumber}`} className="inline-flex w-fit items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"><Phone size={15}/>Call Student</a>}
          {(student.address||student.city||student.state)&&<div className="inline-flex items-center gap-2 text-sm text-slate-600 sm:col-span-2"><MapPin size={15}/> {student.address||""}{student.city?`, ${student.city}`:""}{student.state?`, ${student.state}`:""}</div>}
        </div>
      </div>
    </div>
  </div>
}
