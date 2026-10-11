/*
 * App 推播通知（手機跳出的通知）
 *   ・Android／電腦：直接可用
 *   ・iPhone／iPad：iOS 16.4 以上，而且要先「加入主畫面」，從主畫面打開 App 才能開啟
 */
import { getMessaging, getToken, deleteToken, isSupported } from "firebase/messaging";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import app, { auth, db } from "./firebase";

const TOKEN_KEY = "istar.pushToken";
const DISMISS_KEY = "istar.pushPromptDismissed";
const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} } };

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;

/* 伺服器是否已設定好發送通知（只問一次） */
let serverReady = null;
export function pushServerReady() {
  if (typeof window !== "undefined" && window.__ISTAR_NO_PUSH) return Promise.resolve(true);
  if (!serverReady) serverReady = fetch("/api/notify", { cache: "no-store" }).then(r => r.ok ? r.json() : {}).then(j => !!j.configured).catch(() => false);
  return serverReady;
}

/* 狀態：unsupported | ios-install | denied | on | off | not-ready */
export async function pushStatus() {
  if (!(await pushServerReady())) return "not-ready";
  const basic = "serviceWorker" in navigator && "Notification" in window && "PushManager" in window;
  if (!basic) return isIOS() && !isStandalone() ? "ios-install" : "unsupported";
  const ok = await isSupported().catch(() => false);
  if (!ok) return isIOS() && !isStandalone() ? "ios-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  return Notification.permission === "granted" && ls.get(TOKEN_KEY) ? "on" : "off";
}

export async function enablePush() {
  const st = await pushStatus();
  if (st === "unsupported" || st === "ios-install" || st === "denied") return { ok: false, reason: st };
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: perm === "denied" ? "denied" : "dismissed" };
  try {
    const reg = await navigator.serviceWorker.ready;
    const token = await getToken(getMessaging(app), { serviceWorkerRegistration: reg });
    if (!token) return { ok: false, reason: "no_token" };
    await setDoc(doc(db, "pushTokens", token), {
      uid: auth.currentUser.uid, token, platform: isIOS() ? "ios" : /android/i.test(navigator.userAgent) ? "android" : "web",
      updatedAt: serverTimestamp(),
    });
    ls.set(TOKEN_KEY, token);
    notify("test");
    return { ok: true };
  } catch (e) { return { ok: false, reason: "error", error: e.message }; }
}

export async function disablePush() {
  const token = ls.get(TOKEN_KEY);
  try { if (token) await deleteDoc(doc(db, "pushTokens", token)); } catch {}
  try { await deleteToken(getMessaging(app)); } catch {}
  ls.set(TOKEN_KEY, null);
  return { ok: true };
}

/* 登入另一個帳號時，這台裝置改綁新帳號 */
export async function rebindPush() {
  const token = ls.get(TOKEN_KEY);
  if (!token || Notification?.permission !== "granted" || !auth.currentUser) return;
  try { await setDoc(doc(db, "pushTokens", token), { uid: auth.currentUser.uid, token, updatedAt: serverTimestamp() }, { merge: true }); } catch {}
}
export async function unbindPushOnLogout() {
  const token = ls.get(TOKEN_KEY);
  if (token) { try { await deleteDoc(doc(db, "pushTokens", token)); } catch {} }
}

export const promptDismissed = () => ls.get(DISMISS_KEY) === "1";
export const dismissPrompt = () => ls.set(DISMISS_KEY, "1");

/*
 * 回報事件給伺服器，由伺服器決定通知誰（不等結果、失敗也不影響原本的操作）
 * 例：notify("session_confirmed", { id: sessionId })
 */
export function notify(type, payload = {}) {
  if (typeof window !== "undefined" && window.__ISTAR_NO_PUSH) return;
  const u = auth.currentUser; if (!u) return;
  u.getIdToken().then((t) => fetch("/api/notify", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
    body: JSON.stringify({ type, ...payload }), keepalive: true,
  })).catch(() => {});
}
