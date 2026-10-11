/* ════════════════════════════════════════
   出席（簽到／簽退）與上課時數：純邏輯（不依賴 Firebase，可單獨測試）

   sessions/{id} 上的欄位：
     checkIn:  { at: Timestamp(伺服器時間), by: uid, byName, role: "student"|"coach"|"admin" }
     checkOut: { at: Timestamp(伺服器時間), by: uid, byName, summary }
     photoCount: 上課證明照片數
   照片：sessions/{id}/photos/{photoId} { data, thumb, name, size, addedByUid, createdAt }

   時間一律用伺服器時間戳記（規則強制 == request.time），任何人都無法偽造簽到時間。
════════════════════════════════════════ */
import { todayStr, toMinutes, isPast, parseDateStr } from "./schedule.js";

export const CHECKIN_EARLY_MIN = 30;   // 上課前 30 分鐘開放簽到
export const CHECKIN_LATE_MIN  = 60;   // 下課後 60 分鐘內仍可簽到（遲到）
export const MAX_PHOTOS        = 8;

/* Firestore Timestamp / {seconds} / Date / ms → 毫秒 */
export function tsMs(t) {
  if (!t) return null;
  if (typeof t === "number") return t;
  if (t instanceof Date) return t.getTime();
  if (typeof t.toDate === "function") return t.toDate().getTime();
  if (typeof t.seconds === "number") return t.seconds * 1000;
  return null;
}

const pad = (n) => String(n).padStart(2, "0");
export function fmtClock(t) {
  const ms = tsMs(t);
  if (ms == null) return "";
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function fmtDateTime(t) {
  const ms = tsMs(t);
  if (ms == null) return "";
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const nowMin = (now) => now.getHours() * 60 + now.getMinutes();
const dateOf = (now) => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

/* ── 學員是否可以自己簽到 ── */
export function checkInWindow(s, now = new Date()) {
  if (!s || s.status !== "confirmed" || s.checkIn) return "closed";
  const today = dateOf(now);
  if (s.date > today) return "early";
  if (s.date < today) return "late";
  const m = nowMin(now);
  if (m < toMinutes(s.start) - CHECKIN_EARLY_MIN) return "early";
  if (m > toMinutes(s.end) + CHECKIN_LATE_MIN) return "late";
  return "open";
}
export const canStudentCheckIn = (s, now = new Date()) => checkInWindow(s, now) === "open";

/* 何時開放簽到（顯示用） */
export function checkInOpensAt(s) {
  const m = Math.max(0, toMinutes(s.start) - CHECKIN_EARLY_MIN);
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/*
 * 出席狀態
 *   none       不是已排定的課（可預約／待確認／改期）
 *   upcoming   還沒到簽到時間
 *   open       可以簽到
 *   inClass    已簽到、上課中
 *   needOut    已簽到、課程已結束，等教練簽退
 *   done       已簽退，完成交付
 *   missed     課程已結束，沒有簽到
 */
export function attendanceState(s, now = new Date()) {
  if (!s || s.status !== "confirmed") return "none";
  if (s.checkOut) return "done";
  if (s.checkIn) return isPast(s, now) ? "needOut" : "inClass";
  const w = checkInWindow(s, now);
  if (w === "open") return "open";
  if (w === "early") return "upcoming";
  return isPast(s, now) ? "missed" : "upcoming";
}

export const ATTEND = {
  upcoming: { label: "未開始",   color: "#5E5A51", bg: "#F4F3EE" },
  open:     { label: "可簽到",   color: "#2F5E8A", bg: "#E6EFF8" },
  inClass:  { label: "上課中",   color: "#2F6B45", bg: "#E3F1E7" },
  needOut:  { label: "待簽退",   color: "#8A5A10", bg: "#FCEFD2" },
  done:     { label: "已完成",   color: "#2F6B45", bg: "#E3F1E7" },
  missed:   { label: "未簽到",   color: "#8B3A2A", bg: "#F7E6E2" },
};

/* ── 時數 ── */
export const scheduledMinutes = (s) => Math.max(0, toMinutes(s.end) - toMinutes(s.start));

export function deliveredMinutes(s) {
  const a = tsMs(s?.checkIn?.at), b = tsMs(s?.checkOut?.at);
  if (a == null || b == null || b < a) return 0;
  return Math.round((b - a) / 60000);
}

/* 實際時數比排定少 10 分鐘以上 → 標示時數不足 */
export const isShort = (s) => s.checkOut && deliveredMinutes(s) < scheduledMinutes(s) - 10;

export function formatMinutes(min) {
  const m = Math.max(0, Math.round(min || 0));
  const h = Math.floor(m / 60), r = m % 60;
  if (!h) return `${r} 分`;
  return r ? `${h} 小時 ${r} 分` : `${h} 小時`;
}
export const toHours = (min) => Math.round(((min || 0) / 60) * 10) / 10;

/* 只算「已排定且已到時間」的課，判斷是否完整交付 */
export function inRange(s, from, to) {
  return (!from || s.date >= from) && (!to || s.date <= to);
}

export function monthRange(ym) {
  if (!ym) return { from: "", to: "" };
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${ym}-01`, to: `${ym}-${pad(last)}` };
}

export function monthOptions(sessions, today = todayStr()) {
  const set = new Set(sessions.map((s) => (s.date || "").slice(0, 7)).filter(Boolean));
  set.add(today.slice(0, 7));
  return [...set].sort().reverse();
}

/*
 * 依學員或教練彙總
 * 回傳 [{ key, name, total, done, missed, needOut, scheduledMin, deliveredMin, rate }]
 *   total：已到上課時間的已排定課程數（未來的課不計入）
 */
export function summarize(sessions, by = "student", now = new Date()) {
  const keyOf = by === "coach" ? (s) => s.coachId : (s) => s.studentUid;
  const nameOf = by === "coach" ? (s) => s.coachName : (s) => s.studentName;
  const map = new Map();
  sessions.forEach((s) => {
    if (s.status !== "confirmed" || !s.studentUid) return;
    const st = attendanceState(s, now);
    if (st === "upcoming" || st === "open") return;   // 還沒上的課不算
    const k = keyOf(s) || "—";
    const row = map.get(k) || { key: k, name: nameOf(s) || "—", total: 0, done: 0, missed: 0, needOut: 0, inClass: 0, scheduledMin: 0, deliveredMin: 0 };
    row.total++;
    row.scheduledMin += scheduledMinutes(s);
    if (st === "done") { row.done++; row.deliveredMin += deliveredMinutes(s); }
    else if (st === "missed") row.missed++;
    else if (st === "needOut") row.needOut++;
    else if (st === "inClass") row.inClass++;
    map.set(k, row);
  });
  return [...map.values()]
    .map((r) => ({ ...r, rate: r.total ? Math.round((r.done / r.total) * 100) : 0 }))
    .sort((a, b) => b.deliveredMin - a.deliveredMin || a.name.localeCompare(b.name));
}

export function totals(rows) {
  return rows.reduce((t, r) => ({
    total: t.total + r.total, done: t.done + r.done, missed: t.missed + r.missed,
    needOut: t.needOut + r.needOut, scheduledMin: t.scheduledMin + r.scheduledMin, deliveredMin: t.deliveredMin + r.deliveredMin,
  }), { total: 0, done: 0, missed: 0, needOut: 0, scheduledMin: 0, deliveredMin: 0 });
}

/* 已經過去的已排定課程（含今天已開始的），新到舊 */
export function deliveredList(sessions, now = new Date()) {
  return sessions
    .filter((s) => s.status === "confirmed" && s.studentUid && !["upcoming", "none"].includes(attendanceState(s, now)))
    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || toMinutes(b.start) - toMinutes(a.start));
}

/* ── 匯出 CSV（含 BOM，Excel 開啟中文不亂碼）── */
const esc = (v) => {
  const t = String(v ?? "");
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};
export function sessionsCsv(sessions, now = new Date()) {
  const head = ["日期", "排定時間", "學員", "教練", "課程", "方式", "狀態", "簽到時間", "簽到者", "簽退時間", "排定分鐘", "實際分鐘", "證明照片數", "課堂摘要"];
  const rows = deliveredList(sessions, now).map((s) => {
    const st = attendanceState(s, now);
    return [
      s.date, `${s.start}-${s.end}`, s.studentName, s.coachName, s.moduleTitle || "一對一課程", s.method || "",
      ATTEND[st]?.label || "", fmtDateTime(s.checkIn?.at),
      s.checkIn ? (s.checkIn.role === "student" ? "學員本人" : `${s.checkIn.byName || ""}（代簽）`) : "",
      fmtDateTime(s.checkOut?.at), scheduledMinutes(s), deliveredMinutes(s) || "", s.photoCount || 0, s.checkOut?.summary || "",
    ];
  });
  return "﻿" + [head, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
}

/* 給測試用：把 "YYYY-MM-DD HH:MM" 變成 Date */
export function at(dateStr, hhmm = "00:00") {
  const d = parseDateStr(dateStr);
  const [h, m] = hhmm.split(":").map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}
