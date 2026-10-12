import { useState } from "react";
import { X } from "lucide-react";

const presets = ["Phone switched off","Medical Leave","Family Emergency","Will attend tomorrow","Parent informed","No response"];

export default function RemarkModal({ student, onClose, onSave }) {
  const [remark, setRemark] = useState(student.remark || "");
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
      <div className="flex items-start justify-between">
        <div><h2 className="text-xl font-bold">Add Remark</h2><p className="mt-1 text-sm text-slate-500">{student.studentName} • {student.rollNumber}</p></div>
        <button onClick={onClose}><X/></button>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {presets.map(p => <button key={p} onClick={() => setRemark(p)} className="rounded-full border px-3 py-1.5 text-xs hover:bg-slate-50">{p}</button>)}
      </div>
      <textarea value={remark} onChange={e=>setRemark(e.target.value)} rows="4" placeholder="Enter mentor remark..." className="mt-4 w-full rounded-xl border p-3 outline-none focus:ring-2 focus:ring-slate-300"/>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border px-4 py-2">Cancel</button>
        <button disabled={!remark.trim()} onClick={()=>onSave(remark.trim())} className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50">Save Remark</button>
      </div>
    </div>
  </div>;
}