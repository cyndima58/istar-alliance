/*
 * App 推播通知（Firebase Cloud Messaging，免費）
 *
 * App 只告訴伺服器「發生了什麼事」（事件類型＋資料 id），
 * 收件人與通知內容一律由伺服器讀資料庫決定，並檢查呼叫者確實是這件事的當事人，
 * 所以無法被拿來亂發通知。
 */
import { loadServiceAccount, serviceAccountStatus, getAccessToken, verifyCaller, fsGet, fsList, fsWhere, fsPatch, fsDelete } from "./_google.js";

const out = (status, json) => ({ status, json });
const fmtDate = (d) => { const [y, m, dd] = (d || "").split("-").map(Number); if (!m) return ""; const w = "日一二三四五六"[new Date(Date.UTC(y, m - 1, dd)).getUTCDay()]; return `${m}/${dd}（${w}）`; };
const money = (n) => "NT$ " + Math.round(Number(n) || 0).toLocaleString("en-US");
const rolesOf = (u) => (Array.isArray(u?.roles) && u.roles.length ? u.roles : u?.role ? [u.role] : []);
const mins = (a, b) => { const t = (x) => new Date(x).getTime(); return Math.max(0, Math.round((t(b) - t(a)) / 60000)); };
const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)} 小時${m % 60 ? ` ${m % 60} 分` : ""}` : `${m} 分`);

/* 傳給一群人（依 uid），回傳成功送出的裝置數；失效的裝置自動清除 */
export async function sendToUsers(ctx, uids, msg) {
  const { sa, token, fetchImpl } = ctx;
  let sent = 0;
  for (const uid of [...new Set(uids.filter(Boolean))]) {
    const devices = await fsWhere(sa.project_id, "pushTokens", "uid", uid, token, fetchImpl).catch(() => []);
    for (const d of devices) {
      const r = await fetchImpl(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: { token: d.token, data: { title: msg.title, body: msg.body, url: msg.url || "/", tag: msg.tag || "" }, webpush: { headers: { Urgency: "high", TTL: "86400" } } } }),
      });
      if (r.ok) { sent++; continue; }
      const j = await r.json().catch(() => ({}));
      if (r.status === 404 || /UNREGISTERED|NOT_FOUND|INVALID_ARGUMENT/.test(JSON.stringify(j))) await fsDelete(sa.project_id, `pushTokens/${encodeURIComponent(d.id)}`, token, fetchImpl);
    }
  }
  return sent;
}

/* 依事件決定收件人與內容；呼叫者不是當事人就回傳 null（403） */
export async function plan(type, body, callerUid, ctx) {
  const { sa, token, fetchImpl } = ctx;
  const get = (p) => fsGet(sa.project_id, p, token, fetchImpl);
  const caller = await get(`users/${callerUid}`).catch(() => null);
  const isAdmin = rolesOf(caller).includes("admin");
  const isStaff = isAdmin || rolesOf(caller).includes("coach");
  const sess = async () => body.id ? await get(`sessions/${encodeURIComponent(body.id)}`) : null;

  switch (type) {
    case "sessions_new": {                       // 教練排課（可一次多堂）→ 學員
      const list = [];
      for (const id of (body.ids || []).slice(0, 60)) { const s = await get(`sessions/${encodeURIComponent(id)}`).catch(() => null); if (s) list.push(s); }
      const mine = list.filter(s => s.coachId === callerUid && s.studentUid && s.status === "pending");
      if (!mine.length) return list.length ? null : [];
      const by = {}; mine.forEach(s => (by[s.studentUid] ||= []).push(s));
      return Object.entries(by).map(([uid, ss]) => ({ to: [uid], title: `${ss[0].coachName || "教練"}幫你排了 ${ss.length} 堂課`, body: `${ss.map(s => fmtDate(s.date) + " " + s.start).slice(0, 3).join("、")}${ss.length > 3 ? " …" : ""}，請到 App 確認時間`, url: "/?tab=courses", tag: "sessions" }));
    }
    case "session_updated": { const s = await sess(); if (!s || s.coachId !== callerUid || !s.studentUid) return null;
      return [{ to: [s.studentUid], title: "課程時間有異動", body: `${s.moduleTitle || "一對一課程"}改為 ${fmtDate(s.date)} ${s.start}–${s.end}，請到 App 確認`, url: "/?tab=courses", tag: "s-" + s.id }]; }
    case "session_cancelled": { const s = await sess(); if (!s || (s.coachId !== callerUid && !isAdmin) || !s.studentUid) return null;
      return [{ to: [s.studentUid], title: "課程已取消", body: `${fmtDate(s.date)} ${s.start} 的「${s.moduleTitle || "一對一課程"}」已取消`, url: "/?tab=courses", tag: "s-" + s.id }]; }
    case "session_confirmed": case "session_reschedule": case "session_booked": case "checkin": {
      const s = await sess(); if (!s || s.studentUid !== callerUid) return null;
      const who = s.studentName || "學員", when = `${fmtDate(s.date)} ${s.start}`;
      const m = { session_confirmed: [`${who} 已確認上課時間`, `${when}「${s.moduleTitle || "一對一課程"}」`],
        session_reschedule: [`${who} 請求改期`, `${when}：${s.studentNote || "（未填原因）"}`],
        session_booked: [`${who} 預約了你的時段`, `${when}，課程已排定`],
        checkin: [`${who} 已簽到`, `${when}「${s.moduleTitle || "一對一課程"}」，上課後記得上傳照片並簽退`] }[type];
      return [{ to: [s.coachId], title: m[0], body: m[1], url: "/?tab=assign", tag: "s-" + s.id }]; }
    case "checkout": { const s = await sess(); if (!s || s.coachId !== callerUid || !s.checkOut) return null;
      const d = s.checkIn?.at && s.checkOut?.at ? mins(s.checkIn.at, s.checkOut.at) : 0;
      return [{ to: [s.studentUid], title: "這堂課完成了 ✓", body: `${s.moduleTitle || "一對一課程"}・實際上課 ${fmtMin(d)}${s.checkOut.summary ? "：" + s.checkOut.summary : ""}`, url: "/?tab=courses", tag: "s-" + s.id }]; }
    case "record_new": { const r = body.id ? await get(`records/${encodeURIComponent(body.id)}`) : null;
      if (!r || r.coachId !== callerUid || !r.visibleStudent) return null;
      return [{ to: [r.studentUid], title: `${r.coachName || "教練"}寫了上課回饋`, body: r.topic || "", url: "/?tab=feedback", tag: "r-" + r.id }]; }
    case "milestone_claim": { if (body.studentUid !== callerUid) return null;
      const ss = await fsWhere(sa.project_id, "sessions", "studentUid", callerUid, token, fetchImpl).catch(() => []);
      let to = [...new Set(ss.map(s => s.coachId).filter(Boolean))];
      if (!to.length) to = (await fsList(sa.project_id, "users", token, fetchImpl)).filter(u => rolesOf(u).includes("coach")).map(u => u.id);
      return [{ to, title: `${caller?.name || "學員"} 回報完成里程碑`, body: body.text || "請到 App 確認", url: "/?tab=home", tag: "ms-" + callerUid }]; }
    case "milestone_verified": { if (!isStaff || !body.studentUid) return null;
      return [{ to: [body.studentUid], title: "教練確認了你的里程碑 ✓", body: body.text || "", url: "/?tab=growth", tag: "ms-" + body.studentUid }]; }
    case "payout_paid": { if (!isAdmin) return null; const o = body.id ? await get(`payouts/${encodeURIComponent(body.id)}`) : null;
      if (!o || o.status !== "paid") return null;
      return [{ to: [o.coachId], title: "分潤已匯款", body: `${o.period ? Number(o.period.slice(5)) + " 月" : ""}分潤 ${money(o.amount)} 已於 ${o.paidAt || "今天"} 匯出`, url: "/", tag: "po-" + o.id }]; }
    case "access_request": { const q = await get(`accessRequests/${callerUid}`).catch(() => null); if (!q) return null;
      const admins = (await fsList(sa.project_id, "users", token, fetchImpl)).filter(u => rolesOf(u).includes("admin")).map(u => u.id);
      return [{ to: admins, title: "有新帳號等待開通", body: `${q.name || ""}（${q.email || ""}）`, url: "/?tab=members", tag: "req" }]; }
    case "test": return [{ to: [callerUid], title: "通知已開啟 ✓", body: "之後排課、簽到、匯款等消息都會即時通知你", url: "/", tag: "test" }];
    default: return null;
  }
}

export async function handleNotify(req, { env = process.env, fetch: fetchImpl = fetch } = {}) {
  // GET：讓 App 知道伺服器是否已設定好，可以發通知（沒設定就不邀請成員開啟）
  if (req.method === "GET") {
    const st = serviceAccountStatus(env);
    return out(200, st.ok ? { configured: true } : { configured: false, reason: st.reason, ...(st.missing ? { missing: st.missing } : {}), ...(st.similarNames?.length ? { similarNames: st.similarNames } : {}), ...(st.startsWith ? { startsWith: st.startsWith, endsWith: st.endsWith, length: st.length } : {}) });
  }
  if (req.method !== "POST") return out(405, { error: "method_not_allowed" });
  const sa = loadServiceAccount(env);
  if (!sa) return out(503, { error: "not_configured" });
  const callerUid = await verifyCaller(req, env, fetchImpl);
  if (!callerUid) return out(401, { error: "invalid_token" });
  let token; try { token = await getAccessToken(sa, fetchImpl); } catch { return out(500, { error: "service_account_auth_failed" }); }
  const ctx = { sa, token, fetchImpl };
  const { type, ...body } = req.body || {};
  let msgs;
  try { msgs = await plan(type, body, callerUid, ctx); } catch { return out(500, { error: "plan_failed" }); }
  if (msgs === null) return out(403, { error: "not_allowed" });
  let sent = 0;
  for (const m of msgs) sent += await sendToUsers(ctx, m.to, m);
  return out(200, { ok: true, sent });
}

/*
 * 每天早上 8 點（台灣時間）：
 *   ・今天有課 → 提醒學員和教練
 *   ・三天內還沒確認的課 → 提醒學員確認
 * 每堂課每天只提醒一次（記在 remindedOn / confirmRemindedOn），重複觸發也不會重複發送。
 */
export async function handleDaily(req, { env = process.env, fetch: fetchImpl = fetch, now = new Date() } = {}) {
  if (env.CRON_SECRET && (req.headers?.authorization || "") !== `Bearer ${env.CRON_SECRET}`) return out(401, { error: "unauthorized" });
  const sa = loadServiceAccount(env);
  if (!sa) return out(503, { error: "not_configured" });
  let token; try { token = await getAccessToken(sa, fetchImpl); } catch { return out(500, { error: "service_account_auth_failed" }); }
  const ctx = { sa, token, fetchImpl };
  const tw = new Date(now.getTime() + 8 * 3600000);
  const ymd = (d) => d.toISOString().slice(0, 10);
  const today = ymd(tw);
  const soon = [1, 2, 3].map(n => ymd(new Date(tw.getTime() + n * 86400000)));
  let sent = 0, reminded = 0;

  const todays = await fsWhere(sa.project_id, "sessions", "date", today, token, fetchImpl);
  const coachDay = {};
  for (const s of todays.filter(x => x.status === "confirmed" && x.studentUid && x.remindedOn !== today)) {
    sent += await sendToUsers(ctx, [s.studentUid], { title: `今天 ${s.start} 有課`, body: `「${s.moduleTitle || "一對一課程"}」教練 ${s.coachName || ""}・上課前 30 分鐘可在 App 簽到`, url: "/", tag: "today-" + s.id });
    (coachDay[s.coachId] ||= []).push(s);
    await fsPatch(sa.project_id, `sessions/${encodeURIComponent(s.id)}`, { remindedOn: today }, token, fetchImpl); reminded++;
  }
  for (const [cid, ss] of Object.entries(coachDay)) {
    ss.sort((a, b) => (a.start || "").localeCompare(b.start || ""));
    sent += await sendToUsers(ctx, [cid], { title: `今天有 ${ss.length} 堂課`, body: ss.map(s => `${s.start} ${s.studentName || ""}`).join("、"), url: "/", tag: "today-coach" });
  }
  for (const d of soon) {
    const list = await fsWhere(sa.project_id, "sessions", "date", d, token, fetchImpl).catch(() => []);
    for (const s of list.filter(x => x.status === "pending" && x.studentUid && x.confirmRemindedOn !== today)) {
      sent += await sendToUsers(ctx, [s.studentUid], { title: "有課程等你確認時間", body: `${fmtDate(s.date)} ${s.start}「${s.moduleTitle || "一對一課程"}」`, url: "/?tab=courses", tag: "pending-" + s.id });
      await fsPatch(sa.project_id, `sessions/${encodeURIComponent(s.id)}`, { confirmRemindedOn: today }, token, fetchImpl); reminded++;
    }
  }
  return out(200, { ok: true, today, reminded, sent });
}
