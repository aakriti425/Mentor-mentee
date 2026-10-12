import { Link, useLocation } from "react-router-dom";
import { Download, FileSpreadsheet, LayoutDashboard, LogOut, UserPlus, Menu, X, UserCog } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import api from "../api";

async function downloadReport(format){
  const r=await api.get(`/reports?format=${format}`,{responseType:"blob"});
  const blob=new Blob([r.data],{type:format==="pdf"?"application/pdf":"application/vnd.ms-excel"});
  const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`GLBITM-student-report.${format==="pdf"?"pdf":"xls"}`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function greeting(){const h=new Date().getHours();if(h<12)return "Good Morning";if(h<17)return "Good Afternoon";if(h<21)return "Good Evening";return "Good Night";}

export default function Layout({children}){
 const {user,logout}=useAuth(); const location=useLocation(); const [open,setOpen]=useState(false);
 const report=async f=>{try{await downloadReport(f)}catch(e){alert(e.response?.data?.message||"Unable to download report")}};
 const dash=user?.role==="admin"?"/admin":"/mentor";
 const nav=[{to:dash,label:"Dashboard",icon:LayoutDashboard},{to:"/add-student",label:"Add Students",icon:UserPlus}];
 return <div className="min-h-screen bg-slate-50">
   <div className="dashboard-campus-banner" aria-hidden="true"></div>
   <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3"><button onClick={()=>setOpen(true)} className="rounded-xl border p-2 hover:bg-slate-100" aria-label="Open menu"><Menu size={20}/></button><img src="/logo.png" alt="GL Bajaj logo" className="h-10 w-10 shrink-0 object-contain"/><div className="min-w-0"><div className="truncate font-bold text-slate-900">GL Bajaj Institute of Technology and Management</div><div className="text-xs text-slate-500">Student Attendance & Mentor Monitoring · College Code 192</div></div></div>
      <div className="hidden items-center gap-3 sm:flex"><div className="text-right"><div className="text-sm font-bold text-slate-800">{greeting()}, {user?.name||user?.username}</div><div className="text-xs capitalize text-slate-500">{user?.role}</div></div><button onClick={logout} className="rounded-lg border px-3 py-2 text-sm"><LogOut size={16} className="mr-1 inline"/>Logout</button></div>
    </div>
   </header>
   {open&&<div className="fixed inset-0 z-[60] bg-slate-950/40" onMouseDown={()=>setOpen(false)}>
     <aside className="h-full w-80 bg-white shadow-2xl" onMouseDown={e=>e.stopPropagation()}>
       <div className="flex items-center justify-between border-b p-5"><div><div className="font-bold text-slate-900">Menu</div><div className="text-xs text-slate-500">{greeting()}</div></div><button onClick={()=>setOpen(false)} className="rounded-lg p-2 hover:bg-slate-100"><X/></button></div>
       <nav className="space-y-2 p-4">
        {nav.map(({to,label,icon:Icon})=><Link key={to} to={to} onClick={()=>setOpen(false)} className={`flex items-center gap-3 rounded-xl px-4 py-3 font-semibold ${location.pathname===to?"bg-slate-900 text-white":"text-slate-700 hover:bg-slate-100"}`}><Icon size={19}/>{label}</Link>)}
        {user?.role==="mentor"&&<Link to="/mentor" onClick={()=>setOpen(false)} className="flex items-center gap-3 rounded-xl px-4 py-3 font-semibold text-slate-700 hover:bg-slate-100"><UserCog size={19}/>Change Login ID / Password</Link>}
        <button onClick={()=>{setOpen(false);report("xls")}} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-semibold text-slate-700 hover:bg-slate-100"><FileSpreadsheet size={19}/>Download Excel Report</button>
        <button onClick={()=>{setOpen(false);report("pdf")}} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-semibold text-slate-700 hover:bg-slate-100"><Download size={19}/>Download PDF Report</button>
       </nav>
       <div className="absolute bottom-0 w-80 border-t bg-white p-4"><button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 font-semibold text-red-700 hover:bg-red-50"><LogOut size={19}/>Logout</button></div>
     </aside>
   </div>}
   <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
 </div>
}
