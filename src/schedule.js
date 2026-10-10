/* ════════════════════════════════════════
   排課系統：純邏輯工具（不依賴 Firebase，可單獨測試）
   所有日期一律使用「本地時間」的 YYYY-MM-DD 字串，
   避免 toISOString() 在台灣早上 8 點前變成前一天的問題。
════════════════════════════════════════ */

/* ── 課程時段狀態 ── */
export const SESSION_STATUS = {
  open:       { label: "可預約",   short: "可預約", color: "#3A4A6B", bg: "#ECF0F8", border: "rgba(58,74,107,.25)" },
  pending:    { label: "待確認",   short: "待確認", color: "#8A6820", bg: "#FEF3D0", border: "rgba(138,104,32,.25)" },
  confirmed:  { label: "已排定",   short: "已排定", color: "#4A7B5A", bg: "#EAF2EC", border: "rgba(74,123,90,.25)" },
  reschedule: { label: "請求改期", short: "改期",   color: "#8B3A2A", bg: "#F5EAE7", border: "rgba(139,58,42,.25)" },
};

export const STATUS_ORDER = ["pending", "reschedule", "open", "confirmed"];

/* ── 日期工具 ── */
const pad = (n) => String(n).padStart(2, "0");

export function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayStr() {
  return toDateStr(new Date());
}

export function parseDateStr(s) {
  const [y, m, d] = (s || "").split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(dateStr, n) {
  const d = parseDateStr(dateStr);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

export function toMinutes(hhmm) {
  const [h, m] = (hhmm || "0:0").split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function fromMinutes(min) {
  const m = Math.max(0, Math.min(min, 23 * 60 + 59));
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export function weekdayLabel(dateStr) {
  return WEEKDAYS[parseDateStr(dateStr).getDay()];
}

export function formatDateLabel(dateStr) {
  const d = parseDateStr(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）`;
}

export function relativeDayLabel(dateStr, today = todayStr()) {
  if (dateStr === today) return "今天";
  if (dateStr === addDays(today, 1)) return "明天";
  if (dateStr === addDays(today, 2)) return "後天";
  return formatDateLabel(dateStr);
}

/* ── 月曆格：回傳 6 週 × 7 天的日期字串（週日開頭） ── */
export function buildMonthGrid(year, month /* 0-11 */) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({ date: toDateStr(d), inMonth: d.getMonth() === month, day: d.getDate() });
  }
  // 若最後一週全部是下個月，就只顯示 5 週
  if (!cells.slice(35).some((c) => c.inMonth)) return cells.slice(0, 35);
  return cells;
}

/* ── 時段是否已過 ── */
export function isPast(session, now = new Date()) {
  const today = toDateStr(now);
  if (session.date < today) return true;
  if (session.date > today) return false;
  return toMinutes(session.end || session.start) <= now.getHours() * 60 + now.getMinutes();
}

/* ── 排序：日期 → 開始時間 ── */
export function sortSessions(list) {
  return [...list].sort((a, b) =>
    (a.date || "").localeCompare(b.date || "") || toMinutes(a.start) - toMinutes(b.start)
  );
}

/* ── 衝堂檢查：同一天、時間重疊 ── */
export function overlaps(a, b) {
  if (a.date !== b.date) return false;
  return toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);
}

/**
 * 找出與候選時段衝突的既有時段
 * @param candidate { date, start, end, studentUid }
 * @param existing  既有時段陣列
 * @param ignoreId  編輯時排除自己
 */
export function findConflicts(candidate, existing, ignoreId) {
  return existing.filter((s) => {
    if (s.id && s.id === ignoreId) return false;
    if (!overlaps(candidate, s)) return false;
    // 同一位教練的時段都算衝突；不同教練但同一位學員也算衝突
    const sameCoach = candidate.coachId && s.coachId === candidate.coachId;
    const sameStudent = candidate.studentUid && s.studentUid === candidate.studentUid;
    return sameCoach || sameStudent;
  });
}

/* ── 每週重複：產生 N 個日期 ── */
export function repeatDates(startDate, weeks) {
  const n = Math.max(1, Number(weeks) || 1);
  return Array.from({ length: n }, (_, i) => addDays(startDate, i * 7));
}

/* ── 驗證時段表單 ── */
export function validateSession(form) {
  if (form.mode === "assign" && !form.studentUid) return "請選擇學員";
  if (!form.date) return "請選擇日期";
  if (!form.start || !form.end) return "請填寫上課時間";
  if (toMinutes(form.end) <= toMinutes(form.start)) return "結束時間必須晚於開始時間";
  if (form.date < todayStr()) return "不能排在已經過去的日期";
  return "";
}

/* ── Google 行事曆連結（學員一鍵加入自己的行事曆） ── */
export function googleCalendarUrl(session) {
  const ymd = (session.date || "").replace(/-/g, "");
  const hm = (t) => (t || "00:00").replace(":", "") + "00";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `iSTAR｜${session.moduleTitle || "課程"}`,
    dates: `${ymd}T${hm(session.start)}/${ymd}T${hm(session.end)}`,
    ctz: "Asia/Taipei",
    details: [
      session.coachName ? `教練：${session.coachName}` : "",
      session.note ? `備註：${session.note}` : "",
    ].filter(Boolean).join("\n"),
    location: session.location || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/* ── 依狀態分組計數 ── */
export function countByStatus(list) {
  return list.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});
}
