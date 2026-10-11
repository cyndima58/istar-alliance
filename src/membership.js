/*
 * 會員期間（學員）
 *   memberStart：會員起始日（YYYY-MM-DD；舊資料沒有時沿用 joinDate）
 *   memberEnd  ：會員到期日（YYYY-MM-DD；空白＝未設定，不限制）
 * 規則：到期日「當天」仍可上課；到期日之後的日期不能排課、預約或確認。
 */
const DAY = 86400000;
const pad = (n) => String(n).padStart(2, "0");
export const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toUTC = (s) => { const [y, m, d] = String(s).split("-").map(Number); return Date.UTC(y, m - 1, d); };
const valid = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

export const memberStartOf = (u) => (valid(u?.memberStart) ? u.memberStart : valid(u?.joinDate) ? u.joinDate : "");
export const memberEndOf   = (u) => (valid(u?.memberEnd) ? u.memberEnd : "");

/** 兩個日期相差幾天（b − a） */
export const daysBetween = (a, b) => Math.round((toUTC(b) - toUTC(a)) / DAY);

/** 加入星辰聯盟第幾天（起始日當天＝第 1 天）；還沒開始回 0；沒有起始日回 null */
export function daysJoined(u, today = ymd()) {
  const s = memberStartOf(u);
  if (!s) return null;
  const n = daysBetween(s, today) + 1;
  return n > 0 ? n : 0;
}

/** 距離到期還有幾天（到期日當天＝0；已過期為負數）；未設定回 null */
export function daysLeft(u, today = ymd()) {
  const e = memberEndOf(u);
  return e ? daysBetween(today, e) : null;
}

/** none 未設定 | upcoming 尚未開始 | active 有效 | expiring 30 天內到期 | expired 已到期 */
export function memberStatus(u, today = ymd()) {
  const e = memberEndOf(u), s = memberStartOf(u);
  if (e && today > e) return "expired";
  if (s && today < s) return "upcoming";
  if (!e) return "none";
  return daysBetween(today, e) <= 30 ? "expiring" : "active";
}

export const MEMBER_STATUS = {
  none:     { label: "未設定到期日", color: "var(--ink-3)",  bg: "var(--surface-2, #F2F1EC)" },
  upcoming: { label: "尚未開始",     color: "var(--slate)",  bg: "var(--slate-pale)" },
  active:   { label: "會員有效",     color: "var(--sage)",   bg: "var(--sage-pale)" },
  expiring: { label: "即將到期",     color: "#8A6820",       bg: "#FEF3D0" },
  expired:  { label: "已到期",       color: "var(--rust)",   bg: "var(--rust-pale)" },
};

/** 這個日期能不能排給／被這位學員選擇 */
export const canUseDate = (u, date) => { const e = memberEndOf(u); return !e || !date || date <= e; };

/** 一組日期中超過到期日的（排課用） */
export const datesAfterEnd = (u, dates) => { const e = memberEndOf(u); return e ? dates.filter(d => d > e) : []; };

export const fmtYmd = (s) => (valid(s) ? s.replace(/-/g, "/") : "—");

export const expiredMessage = (u, who = "你的", today = ymd()) => {
  const e = memberEndOf(u);
  const head = today > e ? `${who}會員已於 ${fmtYmd(e)} 到期` : `${who}會員到期日為 ${fmtYmd(e)}`;
  return `${head}，無法選擇到期日之後的課程時間。如需續約請聯絡星辰聯盟管理員。`;
};

/** 起始日加 n 個月的前一天（例：2026-10-11 起 12 個月 → 2027-10-10） */
export function addMonthsYmd(start, n) {
  const [y, m, d] = start.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, d));
  if (t.getUTCDate() !== d) t.setUTCDate(0);          // 目標月份沒有這一天 → 到該月最後一天（例：1/31 起 1 個月 → 2/28）
  else t.setUTCDate(t.getUTCDate() - 1);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}
