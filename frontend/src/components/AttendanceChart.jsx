export default function AttendanceChart({data=[], title="Absences by day", month=""}) {
  const max = Math.max(1, ...data.map(x=>Number(x.absent)||0));
  return <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
    <div className="mb-4">
      <h2 className="font-bold">{title}</h2>
      <p className="text-xs text-slate-500">{month ? `Daily absent count for ${month}` : "Daily absent count"}. The highest bar is the day on which the most students were absent.</p>
    </div>
    {data.length===0 ? <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">No attendance history for this month yet.</div> :
      <div className="overflow-x-auto"><div className="flex min-w-max items-end gap-3 px-2 pt-4" style={{height:260}}>
        {data.map(x=><div key={x.date} className="flex h-full w-10 flex-col items-center justify-end gap-2">
          <span className="text-xs font-semibold">{x.absent}</span>
          <div title={`${x.date}: ${x.absent} absent`} className="w-7 rounded-t-lg bg-red-400 transition-all" style={{height:`${Math.max(8,(Number(x.absent)||0)/max*170)}px`}} />
          <span className="text-[10px] text-slate-500">{x.date.slice(8,10)}</span>
        </div>)}
      </div><div className="mt-2 border-t pt-2 text-center text-xs text-slate-400">Day of month</div></div>}
  </section>
}
