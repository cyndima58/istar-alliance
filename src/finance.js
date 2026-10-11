/* ════════════════════════════════════════
   星辰聯盟財務：純邏輯（不依賴 Firebase，可單獨測試）

   payments/{id}  收款   { studentUid, studentName, amount, date, method, note }
   payouts/{id}   教練分潤 { coachId, coachName, amount, period:"YYYY-MM", date, hours, rate, note,
                           status:"pending"|"paid", paidAt:"YYYY-MM-DD", paidNote }
   expenses/{id}  支出   { item, category, amount, date, note }
   finance/settings      { tuition:{ studentUid: 應收學費 }, rates:{ coachId: 每小時分潤 } }

   公積金 = 已收金額 − 教練分潤（含待匯款）− 其他支出
════════════════════════════════════════ */
import { summarize as summarizeAttendance } from "./attendance.js";

export const PAY_METHODS = ["匯款", "現金", "刷卡", "LINE Pay", "其他"];
export const EXPENSE_CATS = ["場地", "行銷", "教材設備", "行政", "活動", "其他"];

/* 金額：只接受 0 以上的整數（新台幣），字串會去掉逗號與 NT$ */
export function parseAmount(v) {
  if (typeof v === "number") return Number.isFinite(v) && v >= 0 ? Math.round(v) : NaN;
  const t = String(v ?? "").replace(/[,\s]|NT\$|\$|元/gi, "");
  if (!/^\d+(\.\d+)?$/.test(t)) return NaN;
  return Math.round(Number(t));
}

export function fmtMoney(n, { sign = false } = {}) {
  const v = Math.round(Number(n) || 0);
  const s = Math.abs(v).toLocaleString("en-US");
  return `${v < 0 ? "−" : sign && v > 0 ? "+" : ""}NT$ ${s}`;
}

/* 期間：ym="2026-10" 單月、y="2026" 全年、"" 全部 */
export function periodRange(p) {
  if (!p) return { from: "", to: "" };
  if (/^\d{4}$/.test(p)) return { from: `${p}-01-01`, to: `${p}-12-31` };
  const [y, m] = p.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${p}-01`, to: `${p}-${String(last).padStart(2, "0")}` };
}
export const inPeriod = (date, p) => {
  const { from, to } = periodRange(p);
  return (!from || (date || "") >= from) && (!to || (date || "") <= to);
};

/* 分潤歸屬期間：有 period（YYYY-MM）就用 period，否則用 date */
const payoutDate = (o) => (o.period ? `${o.period}-01` : o.date);

export function financeSummary({ payments = [], payouts = [], expenses = [] }, p = "") {
  const sum = (arr) => arr.reduce((t, x) => t + (Number(x.amount) || 0), 0);
  const pay = payments.filter((x) => inPeriod(x.date, p));
  const out = payouts.filter((x) => inPeriod(payoutDate(x), p));
  const exp = expenses.filter((x) => inPeriod(x.date, p));
  const received = sum(pay);
  const payout = sum(out);
  const payoutPaid = sum(out.filter((x) => x.status === "paid"));
  const expense = sum(exp);
  return {
    received, payout, payoutPaid, payoutPending: payout - payoutPaid, expense,
    fund: received - payout - expense,
    counts: { payments: pay.length, payouts: out.length, pending: out.filter((x) => x.status !== "paid").length, expenses: exp.length },
  };
}

/* 每位學員：應收、已收（全期間累計）、未收 */
export function studentBalances(students, payments, tuition = {}) {
  return students.map((s) => {
    const due = Number(tuition[s.uid]) || 0;
    const paid = payments.filter((p) => p.studentUid === s.uid).reduce((t, p) => t + (Number(p.amount) || 0), 0);
    const last = payments.filter((p) => p.studentUid === s.uid).map((p) => p.date).sort().pop() || "";
    return { uid: s.uid, name: s.name, courseType: s.courseType || "", due, paid, owed: Math.max(0, due - paid), over: Math.max(0, paid - due), last };
  }).sort((a, b) => b.owed - a.owed || a.name.localeCompare(b.name));
}

/*
 * 依「完成交付」的上課時數試算教練分潤
 * 回傳 [{ coachId, coachName, hours, minutes, rate, amount, existing }]
 *   existing：這個月已建立的分潤單（避免重複建立）
 */
export function payoutSuggestions(sessions, ym, rates = {}, payouts = [], now = new Date()) {
  const { from, to } = periodRange(ym);
  const list = sessions.filter((s) => (!from || s.date >= from) && (!to || s.date <= to));
  return summarizeAttendance(list, "coach", now)
    .filter((r) => r.deliveredMin > 0)
    .map((r) => {
      const rate = Number(rates[r.key]) || 0;
      const hours = Math.round((r.deliveredMin / 60) * 100) / 100;
      return {
        coachId: r.key, coachName: r.name, minutes: r.deliveredMin, hours, rate,
        amount: Math.round(hours * rate), sessions: r.done,
        existing: payouts.filter((o) => o.coachId === r.key && o.period === ym),
      };
    });
}

/* CSV 匯出（含 BOM） */
const esc = (v) => { const t = String(v ?? ""); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
export function financeCsv({ payments = [], payouts = [], expenses = [] }, p = "") {
  const rows = [["類型", "日期", "對象／項目", "類別／方式", "金額", "狀態", "備註"]];
  payments.filter((x) => inPeriod(x.date, p)).forEach((x) => rows.push(["收款", x.date, x.studentName, x.method, x.amount, "已收", x.note]));
  payouts.filter((x) => inPeriod(payoutDate(x), p)).forEach((x) => rows.push(["教練分潤", x.period || x.date, x.coachName, x.hours ? `${x.hours} 小時 × ${x.rate}` : "", -x.amount, x.status === "paid" ? `已匯款 ${x.paidAt || ""}` : "待匯款", x.note]));
  expenses.filter((x) => inPeriod(x.date, p)).forEach((x) => rows.push(["支出", x.date, x.item, x.category, -x.amount, "", x.note]));
  const s = financeSummary({ payments, payouts, expenses }, p);
  rows.push([], ["合計", "", "已收金額", "", s.received], ["", "", "教練分潤", "", -s.payout], ["", "", "其他支出", "", -s.expense], ["", "", "星辰聯盟公積金", "", s.fund]);
  return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
}

/* 期間選項：有資料的月份 + 今年 + 全部 */
export function periodOptions(all, today) {
  const set = new Set();
  [...(all.payments || []), ...(all.expenses || [])].forEach((x) => x.date && set.add(x.date.slice(0, 7)));
  (all.payouts || []).forEach((x) => (x.period || x.date) && set.add((x.period || x.date).slice(0, 7)));
  set.add(today.slice(0, 7));
  return [...set].sort().reverse();
}
