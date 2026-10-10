/* ════════════════════════════════════════
   星辰聯盟成長路徑：純邏輯（不依賴 Firebase，可單獨測試）

   資料：journeys/{studentUid}
   {
     studentUid, studentName,
     currentStage: 1-9,
     stages:   { "4": { startedAt: "YYYY-MM-DD", completedAt?: "YYYY-MM-DD", skipped?: true } },
     claims:   { "4_1": { note, link, at } }        ← 學員回報（學員可寫）
     verified: { "4_1": { by, at } }                ← 教練確認（只有教練可寫）
     coachNote: { "4": "教練對這個階段的提醒" },
     updatedAt
   }
════════════════════════════════════════ */
import { todayStr, parseDateStr } from "./schedule.js";

export const STAGES = [
  { n: 1, name: "探索",     tag: "入星",       phase: "入星", color: "#9A7B3F", course: "定位探索班",
    goal: "感受星辰聯盟，初步盤點自己的能力",
    milestones: ["完成定位探索班課程", "與教練一起繪製個人能力初步地圖", "決定下一步要走的方向"] },
  { n: 2, name: "自我認知", tag: "認識自己",   phase: "賦能", color: "#3A4A6B", course: "個人賦能班 Week 1–2",
    goal: "看清自己的優勢與價值觀",
    milestones: ["完成 MBTI／優勢測評", "整理出個人優勢清單", "確立核心價值觀 Top 3"] },
  { n: 3, name: "內化",     tag: "沉澱",       phase: "賦能", color: "#3A4A6B", course: "教練 1 對 1 引導",
    goal: "把洞察轉化成能說出口的語言",
    milestones: ["完成 1 對 1 引導對話", "寫出一句話自我介紹初稿", "能在 90 秒內清楚介紹自己"] },
  { n: 4, name: "定位",     tag: "定位",       phase: "賦能", color: "#3A4A6B", course: "個人賦能班 Week 3–6",
    goal: "找到屬於你的位置，讓能力被市場看見",
    milestones: ["完成差異化分析", "描繪目標受眾輪廓", "完成個人品牌定位一頁紙", "向同儕小組分享並取得回饋"] },
  { n: 5, name: "方向",     tag: "方向",       phase: "賦能", color: "#3A4A6B", course: "個人賦能班 Week 7–12",
    goal: "把定位變成可以賺錢的模式",
    milestones: ["設計個人商業模式一頁紙", "規劃收入路徑", "擬定第一個 90 天行動計畫"] },
  { n: 6, name: "小驗",     tag: "驗證",       phase: "驗證", color: "#4A7B5A", course: "市場驗證（演講／文章／諮詢／工作坊）",
    goal: "用最低成本測試市場反應",
    milestones: ["設計最小可行的驗證行動", "執行至少一次真實市場驗證", "整理驗證報告：什麼有共鳴、哪裡要調整"] },
  { n: 7, name: "實作",     tag: "實作",       phase: "創業", color: "#8B3A2A", course: "創業預備班 Phase 1–2",
    goal: "做出可以重複銷售的產品或服務",
    milestones: ["完成產品／服務原型", "建立穩定的交付流程", "完成第一筆付費成交"] },
  { n: 8, name: "市場",     tag: "市場",       phase: "創業", color: "#8B3A2A", course: "創業預備班 Phase 3–4",
    goal: "讓收入穩定、可複製",
    milestones: ["建立可複製的獲客流程", "設計完整的客戶旅程", "達成可持續的月收入目標"] },
  { n: 9, name: "共創",     tag: "✦ 星辰成員", phase: "共創", color: "#9A7B3F", course: "創業預備班 Phase 5–6 ＋ 聯盟導師陪跑",
    goal: "成為星辰聯盟的共創夥伴",
    milestones: ["事業系統化運作", "與聯盟夥伴完成一個協作專案", "完成與 iSTAR Alliance 的股權共創綁定"] },
];

export const PHASES = [
  { key: "入星", color: "#9A7B3F" }, { key: "賦能", color: "#3A4A6B" },
  { key: "驗證", color: "#4A7B5A" }, { key: "創業", color: "#8B3A2A" }, { key: "共創", color: "#9A7B3F" },
];

export const stageOf = (n) => STAGES.find((s) => s.n === Number(n)) || STAGES[0];
// 用底線分隔：Firestore 的點路徑會把 "4.1" 誤認成巢狀欄位
export const mKey = (n, i) => `${n}_${i}`;

/* ── 課程班別名稱（舊名稱相容）── */
export const COURSE_TYPES = ["定位探索班", "個人賦能班", "創業預備班"];
export const normalizeCourse = (c) => (c === "定位體驗班" ? "定位探索班" : c || "");

/* ── 依課程班別決定起始階段 ── */
export function startStageFor(courseType) {
  const c = normalizeCourse(courseType);
  if (c === "創業預備班") return 7;
  if (c === "個人賦能班") return 2;
  return 1;
}

/* ── 建立新的成長紀錄：起始階段之前的視為「已具備」 ── */
export function initialJourney(student, today = todayStr()) {
  const start = startStageFor(student.courseType);
  const stages = {};
  for (let n = 1; n < start; n++) stages[n] = { startedAt: today, completedAt: today, skipped: true };
  stages[start] = { startedAt: today };
  return {
    studentUid: student.uid, studentName: student.name || "",
    currentStage: start, stages, claims: {}, verified: {}, coachNote: {},
  };
}

/* ── 里程碑狀態：done 已確認 / claimed 待教練確認 / todo 未完成 ── */
export function milestoneState(j, n, i) {
  const k = mKey(n, i);
  if (j?.verified?.[k]) return "done";
  if (j?.claims?.[k]) return "claimed";
  if (j?.stages?.[n]?.skipped) return "done";
  return "todo";
}

/* ── 階段狀態 ── */
export function stageStatus(j, n) {
  if (!j) return n === 1 ? "active" : "locked";
  if (n < j.currentStage) return "done";
  if (n === j.currentStage) return j.stages?.[n]?.completedAt ? "done" : "active";
  return "locked";
}

export function stageProgress(j, n) {
  const ms = stageOf(n).milestones;
  if (stageStatus(j, n) === "done") return { done: ms.length, claimed: 0, total: ms.length, pct: 100 };
  let done = 0, claimed = 0;
  ms.forEach((_, i) => {
    const st = milestoneState(j, n, i);
    if (st === "done") done++;
    else if (st === "claimed") claimed++;
  });
  return { done, claimed, total: ms.length, pct: Math.round((done / ms.length) * 100) };
}

/* 整體進度：已完成階段 + 目前階段的比例 */
export function overallProgress(j) {
  if (!j) return 0;
  const cur = j.currentStage;
  const doneStages = STAGES.filter((s) => s.n < cur).length;
  const curPct = stageProgress(j, cur).pct / 100;
  const finished = cur === 9 && j.stages?.[9]?.completedAt;
  return Math.round(((finished ? 9 : doneStages + curPct) / 9) * 100);
}

export const canAdvance = (j) => {
  const p = stageProgress(j, j.currentStage);
  return p.done === p.total && !j.stages?.[j.currentStage]?.completedAt;
};

/* ── 升階：回傳要更新的欄位（Firestore 用點路徑） ── */
export function advanceUpdate(j, today = todayStr()) {
  const cur = j.currentStage;
  const upd = { [`stages.${cur}.completedAt`]: today };
  if (cur < 9) {
    upd.currentStage = cur + 1;
    upd[`stages.${cur + 1}.startedAt`] = today;
  }
  return upd;
}

/* ── 教練手動設定階段（例如學員中途加入）── */
export function setStageUpdate(j, target, today = todayStr()) {
  const stages = {};
  STAGES.forEach(({ n }) => {
    const prev = j.stages?.[n] || {};
    if (n < target) stages[n] = { startedAt: prev.startedAt || today, completedAt: prev.completedAt || today, ...(prev.completedAt ? {} : { skipped: true }) };
    else if (n === target) stages[n] = { startedAt: prev.startedAt && !prev.completedAt ? prev.startedAt : today };
  });
  return { currentStage: target, stages };
}

/* ── 天數 ── */
export function daysBetween(a, b = todayStr()) {
  if (!a) return 0;
  return Math.max(0, Math.round((parseDateStr(b) - parseDateStr(a)) / 86400000));
}
export const daysInStage = (j, today = todayStr()) => daysBetween(j?.stages?.[j?.currentStage]?.startedAt, today);

/* ── 待教練確認的回報 ── */
export function pendingClaims(j) {
  if (!j) return [];
  return Object.keys(j.claims || {})
    .filter((k) => !j.verified?.[k])
    .map((k) => {
      const [n, i] = k.split("_").map(Number);
      return { key: k, n, i, text: stageOf(n).milestones[i], ...j.claims[k] };
    })
    .filter((c) => c.text);
}

/* ════════════════════════════════════════
   聯盟總覽（管理員）
════════════════════════════════════════ */
export function funnel(journeys, today = todayStr()) {
  return STAGES.map((s) => {
    const here = journeys.filter((j) => j.currentStage === s.n && !(s.n === 9 && j.stages?.[9]?.completedAt));
    // 平均花費天數：所有真的走完這階段（非跳過）的學員
    const durations = journeys
      .map((j) => j.stages?.[s.n])
      .filter((x) => x?.completedAt && !x.skipped)
      .map((x) => daysBetween(x.startedAt, x.completedAt));
    const avg = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
    const reached = journeys.filter((j) => j.currentStage >= s.n).length;
    return { n: s.n, name: s.name, count: here.length, reached, avgDays: avg, students: here };
  });
}

export function stuckStudents(journeys, threshold = 30, today = todayStr()) {
  return journeys
    .map((j) => ({ ...j, days: daysInStage(j, today) }))
    .filter((j) => j.days >= threshold && !(j.currentStage === 9 && j.stages?.[9]?.completedAt))
    .sort((a, b) => b.days - a.days);
}
