// Vercel 伺服器函式：POST /api/admin-users（邏輯在 _admin-core.js，底線開頭的檔案不會變成網址）
import { handle } from "./_admin-core.js";

export default async function handler(req, res) {
  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body || "{}"); } catch { body = {}; } }
  const r = await handle({ method: req.method, headers: req.headers, body }, { env: process.env, fetch });
  res.setHeader("Cache-Control", "no-store");
  res.status(r.status).json(r.json);
}
