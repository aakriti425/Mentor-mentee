import { readTab, writeTab } from "./sheetStore.js";
const TAB = "pendingDeletions", H = ["rollNumber", "mentorName", "deletedAt"];
const TTL = 24 * 60 * 60 * 1000;
const key = (r) => String(r).trim().toLowerCase();
const expired = (x) => Date.now() - new Date(x.deletedAt).getTime() >= TTL;

export async function getPendingDeletions() { return (await readTab(TAB, H)).filter((x) => !expired(x)); }

export async function markStudentPendingDeletion(rollNumber, mentorName) {
  const list = (await getPendingDeletions()).filter((x) => key(x.rollNumber) !== key(rollNumber));
  list.push({ rollNumber: String(rollNumber).trim(), mentorName, deletedAt: new Date().toISOString() });
  await writeTab(TAB, H, list);
}
export async function isStudentPendingDeletion(rollNumber) {
  return (await getPendingDeletions()).some((x) => key(x.rollNumber) === key(rollNumber));
}
export async function cleanupExpiredPendingDeletions(deleteFn) {
  const raw = await readTab(TAB, H);
  if (!raw.some(expired)) return;
  const active = [];
  for (const item of raw) {
    if (!expired(item)) { active.push(item); continue; }
    try { await deleteFn(item.rollNumber); } catch (e) { console.error("Pending deletion cleanup failed:", e.message); if (!/not found/i.test(e.message)) active.push(item); }
  }
  await writeTab(TAB, H, active);
}
