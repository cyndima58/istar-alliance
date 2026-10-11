/*
 * 伺服器共用：用 Firebase 服務帳戶（環境變數 FIREBASE_SERVICE_ACCOUNT）呼叫 Google API
 * 只用 Node 內建的 crypto 與 fetch，不需要安裝套件。
 */
import crypto from "node:crypto";

// Firebase 網頁設定裡的公開 API 金鑰（本來就在前端程式中，不是機密）
export const DEFAULT_API_KEY = "AIzaSyAr_FH3cyWmcHFW4icnhzUd1TaPC9gERaI";
const SCOPES = "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging";

/* 只回報設定狀態，不會洩漏任何金鑰內容 */
export function serviceAccountStatus(env = process.env) {
  const raw = env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    const near = Object.keys(env).filter(k => /FIREBASE|SERVICE/i.test(k) && k !== "FIREBASE_SERVICE_ACCOUNT");
    return { ok: false, reason: "missing", similarNames: near };
  }
  let sa;
  try { sa = JSON.parse(raw.trim().replace(/^['"]|['"]$/g, "")); } catch { return { ok: false, reason: "invalid_json", length: raw.length, startsWith: raw.trim().slice(0, 1) }; }
  const missing = ["project_id", "client_email", "private_key"].filter(k => !sa[k]);
  if (missing.length) return { ok: false, reason: "missing_fields", missing };
  return { ok: true, project: sa.project_id };
}

export function loadServiceAccount(env = process.env) {
  const raw = env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw.trim().replace(/^['"]|['"]$/g, ""));
    if (!sa.private_key || !sa.client_email || !sa.project_id) return null;
    sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    return sa;
  } catch { return null; }
}

const b64url = (buf) => Buffer.from(buf).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

export function signJwt(sa, now = Math.floor(Date.now() / 1000)) {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: SCOPES, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const sig = crypto.createSign("RSA-SHA256").update(`${header}.${claims}`).sign(sa.private_key);
  return `${header}.${claims}.${b64url(sig)}`;
}

let cachedToken = null;
export async function getAccessToken(sa, fetchImpl) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.email === sa.client_email && cachedToken.exp > now + 60) return cachedToken.token;
  const r = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: signJwt(sa, now) }).toString(),
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error("service_account_auth_failed");
  cachedToken = { token: j.access_token, exp: now + (j.expires_in || 3600), email: sa.client_email };
  return cachedToken.token;
}
export const _resetTokenCache = () => { cachedToken = null; };

export const fsBase = (pid) => `https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents`;
const strField = (f, k) => f?.[k]?.stringValue ?? "";

export async function getUserDoc(pid, uid, token, fetchImpl) {
  const r = await fetchImpl(`${fsBase(pid)}/users/${encodeURIComponent(uid)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("firestore_read_failed");
  const j = await r.json(); const f = j.fields || {};
  const roles = (f.roles?.arrayValue?.values || []).map(v => v.stringValue).filter(Boolean);
  const role = strField(f, "role");
  return { name: strField(f, "name"), email: strField(f, "email"), roles: roles.length ? roles : role ? [role] : [] };
}

export async function writeLog(pid, token, fetchImpl, data) {
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, { stringValue: String(v ?? "") }]));
  fields.at = { timestampValue: new Date().toISOString() };
  await fetchImpl(`${fsBase(pid)}/adminLogs`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ fields }) }).catch(() => {});
}


/* 由 Google 驗證呼叫者的登入憑證（ID token），回傳 uid；無效回傳 null */
export async function verifyCaller(req, env, fetchImpl) {
  const auth = req.headers?.authorization || req.headers?.Authorization || "";
  const idToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!idToken) return null;
  const apiKey = env.FIREBASE_API_KEY || DEFAULT_API_KEY;
  const r = await fetchImpl(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }),
  });
  const j = await r.json().catch(() => ({}));
  return r.ok ? j.users?.[0]?.localId || null : null;
}

/* Firestore REST 欄位 ↔ 一般物件 */
export function decode(v) {
  if (!v || typeof v !== "object") return v;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(decode);
  if ("mapValue" in v) return decodeFields(v.mapValue.fields || {});
  return null;
}
export const decodeFields = (f) => Object.fromEntries(Object.entries(f || {}).map(([k, v]) => [k, decode(v)]));

export async function fsGet(pid, path, token, fetchImpl) {
  const r = await fetchImpl(`${fsBase(pid)}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("firestore_read_failed");
  const j = await r.json();
  return { id: j.name.split("/").pop(), ...decodeFields(j.fields) };
}
export async function fsList(pid, col, token, fetchImpl) {
  const out = []; let page = "";
  do {
    const r = await fetchImpl(`${fsBase(pid)}/${col}?pageSize=300${page ? "&pageToken=" + page : ""}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error("firestore_list_failed");
    const j = await r.json();
    (j.documents || []).forEach(d => out.push({ id: d.name.split("/").pop(), ...decodeFields(d.fields) }));
    page = j.nextPageToken || "";
  } while (page);
  return out;
}
/* 單一欄位等於某值的查詢 */
export async function fsWhere(pid, col, field, value, token, fetchImpl) {
  const r = await fetchImpl(`${fsBase(pid)}:runQuery`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: col }], where: { fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: { stringValue: String(value) } } } } }),
  });
  if (!r.ok) throw new Error("firestore_query_failed");
  const rows = await r.json();
  return (rows || []).filter(x => x.document).map(x => ({ id: x.document.name.split("/").pop(), ...decodeFields(x.document.fields) }));
}
export async function fsPatch(pid, path, data, token, fetchImpl) {
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, { stringValue: String(v) }]));
  const mask = Object.keys(data).map(k => "updateMask.fieldPaths=" + encodeURIComponent(k)).join("&");
  await fetchImpl(`${fsBase(pid)}/${path}?${mask}`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ fields }) });
}
export async function fsDelete(pid, path, token, fetchImpl) {
  await fetchImpl(`${fsBase(pid)}/${path}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
}
