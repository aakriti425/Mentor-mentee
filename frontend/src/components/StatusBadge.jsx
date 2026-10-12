export default function StatusBadge({ status }) {
  const present = String(status).toLowerCase() === "present";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${present ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
    {present ? "Present" : "Absent"}
  </span>;
}