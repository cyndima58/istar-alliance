// Vercel 伺服器函式：POST /api/notify（App 回報事件，伺服器決定要通知誰）
import { handleNotify } from "./_push-core.js";

export default async function handler(req, res) {
  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body || "{}"); } catch { body = {}; } }
  const r = await handleNotify({ method: req.method, headers: req.headers, body, url: req.url }, { env: process.env, fetch });
  res.setHeader("Cache-Control", "no-store");
  res.status(r.status).json(r.json);
}
