import { useEffect, useState } from "react";
import { LockKeyhole, LogIn, User, X, GraduationCap, Quote } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const quotes=[
 "Education is the most powerful weapon which you can use to change the world.",
 "The beautiful thing about learning is that nobody can take it away from you.",
 "Education is not preparation for life; education is life itself.",
 "An investment in knowledge pays the best interest.",
 "The roots of education may be bitter, but the fruit is sweet."
];

export default function Login(){
 const [role,setRole]=useState("admin"),[username,setUsername]=useState(""),[password,setPassword]=useState(""),[error,setError]=useState(""),[showHelp,setShowHelp]=useState(false),[quoteIndex,setQuoteIndex]=useState(0);
 const {login}=useAuth(); const navigate=useNavigate();
 useEffect(()=>{const t=setInterval(()=>setQuoteIndex(i=>(i+1)%quotes.length),4500);return()=>clearInterval(t)},[]);
 async function submit(e){e.preventDefault();setError("");try{const user=await login({username,password,role});navigate(user.role==="admin"?"/admin":"/mentor")}catch(e){setError(e.response?.data?.message||"Unable to login")}}
 return <div className="login-page">
   <div className="login-campus-image" aria-hidden="true"></div><div className="login-overlay" aria-hidden="true"></div>
   <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center justify-between gap-10 px-5 py-8 lg:px-10">
    <section className="login-quote-panel hidden max-w-2xl flex-1 text-white lg:block"><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm backdrop-blur"><GraduationCap size={18}/> GL Bajaj Institute of Technology and Management</div><h1 className="text-5xl font-black leading-tight xl:text-6xl">Learn today.<br/><span className="text-white/80">Lead tomorrow.</span></h1><div className="mt-9 max-w-xl rounded-3xl border border-white/20 bg-black/20 p-7 backdrop-blur-md"><Quote size={30} className="mb-4 text-white/70"/><p className="text-2xl font-semibold leading-relaxed">“{quotes[quoteIndex]}”</p><div className="mt-5 h-1 w-16 rounded-full bg-white/80"></div><p className="mt-3 text-sm text-white/70">Inspiring minds • Building futures</p></div></section>
    <section className="w-full max-w-md rounded-3xl border border-white/30 bg-white/95 p-7 shadow-2xl backdrop-blur-xl md:p-9"><div className="text-center"><img src="/logo.png" className="mx-auto h-24 w-24 object-contain" alt="GL Bajaj logo"/><p className="mt-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Attendance Management</p><h1 className="mt-2 text-xl font-bold text-slate-900">Welcome Back</h1><p className="mt-1 text-sm text-slate-500">Sign in to continue</p></div>
      <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1"><button type="button" onClick={()=>{setRole("admin");setError("")}} className={`rounded-lg py-2.5 text-sm font-semibold transition ${role==="admin"?"bg-white text-slate-900 shadow-sm":"text-slate-500"}`}>Admin</button><button type="button" onClick={()=>{setRole("mentor");setError("")}} className={`rounded-lg py-2.5 text-sm font-semibold transition ${role==="mentor"?"bg-white text-slate-900 shadow-sm":"text-slate-500"}`}>Mentor</button></div>
      <form onSubmit={submit} className="mt-5 space-y-4"><label className="block text-sm font-medium">Login ID<div className="relative mt-1"><User size={17} className="absolute left-3 top-3.5 text-slate-400"/><input required value={username} onChange={e=>setUsername(e.target.value)} className="w-full rounded-xl border py-3.5 pl-10 pr-3 outline-none focus:border-slate-500" placeholder="Enter login ID"/></div></label><label className="block text-sm font-medium">Password<div className="relative mt-1"><LockKeyhole size={17} className="absolute left-3 top-3.5 text-slate-400"/><input required type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-xl border py-3.5 pl-10 pr-3 outline-none focus:border-slate-500" placeholder="Enter password"/></div></label>{error&&<div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}<button className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 p-3.5 font-semibold text-white shadow-lg transition hover:bg-slate-800"><LogIn size={18}/>Login as {role==="admin"?"Admin":"Mentor"}</button></form><button onClick={()=>setShowHelp(true)} className="mt-4 w-full text-center text-sm text-slate-600 underline">Forgot Login ID / Password?</button>
      <p className="mt-6 text-center text-xs text-slate-400">GLBITM • Secure Student Attendance Portal</p></section>
   </div>
   {showHelp&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={()=>setShowHelp(false)}><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onMouseDown={e=>e.stopPropagation()}><div className="flex justify-between"><h2 className="font-bold">Login help</h2><button onClick={()=>setShowHelp(false)}><X/></button></div><p className="mt-4 text-sm text-slate-600">For the college deployment, the administrator can reset or issue login credentials.</p></div></div>}
 </div>
}
