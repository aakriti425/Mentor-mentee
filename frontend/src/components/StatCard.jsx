export default function StatCard({ label, value, icon: Icon }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <div><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-900">{value}</p></div>
      {Icon && <div className="rounded-xl bg-slate-100 p-3"><Icon size={22} className="text-slate-700"/></div>}
    </div>
  </div>;
}