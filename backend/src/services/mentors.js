import crypto from "node:crypto";
import { readTab, writeTab } from "./sheetStore.js";
import { config } from "../config.js";

const TAB = "mentors";
const H = ["username", "passwordHash", "mentorName", "mentorPhone", "section", "name", "photo"];

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString("hex");
  return `${salt}:${crypto.scryptSync(String(pw), salt, 32).toString("hex")}`;
}
export function checkPassword(pw, stored = "") {
  const [salt, key] = String(stored).split(":");
  if (!salt || !key) return false;
  const a = Buffer.from(key, "hex"), b = crypto.scryptSync(String(pw), salt, 32);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function getMentors() {
  let list = await readTab(TAB, H);

  // Local/demo installations created by older versions stored passwords as
  // plain text in data/mentors.json. readTab only reads the current hashed
  // schema, so migrate those records before authentication is attempted.
  if (!config.sheetId) {
    const legacyFile = new URL("../../data/mentors.json", import.meta.url);
    try {
      const raw = JSON.parse(await (await import("node:fs/promises")).readFile(legacyFile, "utf8"));
      if (raw.some((m) => m.password && !m.passwordHash)) {
        list = raw.map((m) => ({
          username: String(m.username || "").trim().toLowerCase(),
          passwordHash: m.passwordHash || (m.password ? hashPassword(m.password) : ""),
          mentorName: m.mentorName || m.name || m.username || "",
          mentorPhone: m.mentorPhone || "",
          section: m.section || "A",
          name: m.name || m.mentorName || m.username || "",
          photo: m.photo || ""
        }));
        await writeTab(TAB, H, list);
      }
    } catch {}
  }

  return list;
}
const save = (list) => writeTab(TAB, H, list);

export async function findMentor(username) {
  const key = String(username || "").trim().toLowerCase();
  return (await getMentors()).find((m) => m.username.toLowerCase() === key);
}
export async function createMentor({ username, password, mentorName, mentorPhone = "", section = "A", photo = "" }) {
  const list = await getMentors();
  const u = String(username).trim().toLowerCase();
  if (list.some((m) => m.username.toLowerCase() === u)) throw new Error("This Login ID already exists");
  if (list.some((m) => m.mentorName.trim().toLowerCase() === String(mentorName).trim().toLowerCase())) throw new Error("A mentor with this name already exists");
  const m = { username: u, passwordHash: hashPassword(password), mentorName: String(mentorName).trim(), mentorPhone: String(mentorPhone).trim(), section, name: String(mentorName).trim(), photo: String(photo || "") };
  await save([...list, m]);
  return m;
}
export async function updateMentor(username, changes) {
  const list = await getMentors();
  const i = list.findIndex((m) => m.username.toLowerCase() === String(username).trim().toLowerCase());
  if (i < 0) throw new Error("Mentor not found");
  const { password, username: nextUsername, ...rest } = changes;
  if (nextUsername !== undefined) {
    const u = String(nextUsername).trim().toLowerCase();
    if (!u) throw new Error("Login ID cannot be empty");
    if (list.some((m, idx) => idx !== i && m.username.toLowerCase() === u)) throw new Error("This Login ID already exists");
    rest.username = u;
  }
  list[i] = { ...list[i], ...rest, ...(password ? { passwordHash: hashPassword(password) } : {}) };
  await save(list);
  return list[i];
}
export async function removeMentor(username) {
  const list = await getMentors();
  const next = list.filter((m) => m.username !== username);
  if (next.length === list.length) throw new Error("Mentor not found");
  await save(next);
}
