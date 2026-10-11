/*
 * 管理員專用的伺服器操作（重設成員密碼、刪除登入帳號）
 *
 * 只用 Node 內建的 crypto 與 fetch 直接呼叫 Google API，不需要安裝任何套件。
 * 需要在 Vercel 設定環境變數 FIREBASE_SERVICE_ACCOUNT（Firebase 服務帳戶金鑰 JSON 的完整內容）。
 *
 * 安全檢查：
 *   1. 呼叫者必須帶 Firebase 登入憑證（ID token），由 Google 驗證是否有效
 *   2. 呼叫者在 users 集合中必須是管理員
 *   3. 每次操作都寫入 adminLogs（App 端無法修改或刪除）
 */
import { loadServiceAccount, getAccessToken, getUserDoc, writeLog, verifyCaller } from "./_google.js";
export { loadServiceAccount, signJwt, _resetTokenCache } from "./_google.js";

const out = (status, json) => ({ status, json });

/**
 * @param req  { method, headers, body }
 * @param deps { env, fetch }
 */
export async function handle(req, { env = process.env, fetch: fetchImpl = fetch } = {}) {
  if (req.method !== "POST") return out(405, { error: "method_not_allowed" });
  const sa = loadServiceAccount(env);
  if (!sa) return out(503, { error: "not_configured" });

  // 1. 由 Google 驗證登入憑證，取得呼叫者 uid
  const hasToken = /^Bearer ./.test(req.headers?.authorization || req.headers?.Authorization || "");
  if (!hasToken) return out(401, { error: "no_token" });
  const callerUid = await verifyCaller(req, env, fetchImpl);
  if (!callerUid) return out(401, { error: "invalid_token" });

  let token;
  try { token = await getAccessToken(sa, fetchImpl); } catch { return out(500, { error: "service_account_auth_failed" }); }

  // 2. 呼叫者必須是管理員
  const caller = await getUserDoc(sa.project_id, callerUid, token, fetchImpl).catch(() => null);
  if (!caller || !caller.roles.includes("admin")) return out(403, { error: "not_admin" });

  const { action, uid, password } = req.body || {};
  if (typeof uid !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(uid)) return out(400, { error: "bad_uid" });
  const target = await getUserDoc(sa.project_id, uid, token, fetchImpl).catch(() => null);
  const idtk = `https://identitytoolkit.googleapis.com/v1/projects/${sa.project_id}`;
  const authed = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  if (action === "resetPassword") {
    if (typeof password !== "string" || password.length < 6 || password.length > 128) return out(400, { error: "weak_password" });
    const r = await fetchImpl(`${idtk}/accounts:update`, { method: "POST", headers: authed, body: JSON.stringify({ localId: uid, password }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return out(r.status === 400 && /USER_NOT_FOUND/.test(JSON.stringify(j)) ? 404 : 502, { error: /USER_NOT_FOUND/.test(JSON.stringify(j)) ? "user_not_found" : "update_failed" });
    await writeLog(sa.project_id, token, fetchImpl, { action: "resetPassword", targetUid: uid, targetName: target?.name, targetEmail: target?.email || j.email, byUid: callerUid, byName: caller.name });
    return out(200, { ok: true, email: target?.email || j.email || "" });
  }

  if (action === "deleteAccount") {
    if (uid === callerUid) return out(400, { error: "cannot_delete_self" });
    const r = await fetchImpl(`${idtk}/accounts:delete`, { method: "POST", headers: authed, body: JSON.stringify({ localId: uid }) });
    const j = await r.json().catch(() => ({}));
    const gone = /USER_NOT_FOUND/.test(JSON.stringify(j));
    if (!r.ok && !gone) return out(502, { error: "delete_failed" });
    await writeLog(sa.project_id, token, fetchImpl, { action: "deleteAccount", targetUid: uid, targetName: target?.name, targetEmail: target?.email, byUid: callerUid, byName: caller.name });
    return out(200, { ok: true, alreadyGone: gone });
  }

  return out(400, { error: "unknown_action" });
}
