// Vercel 排程：每天台灣時間早上 8 點，上課與待確認提醒（見 vercel.json）
import { handleDaily } from "./_push-core.js";

export default async function handler(req, res) {
  const r = await handleDaily({ method: req.method, headers: req.headers }, { env: process.env, fetch });
  res.setHeader("Cache-Control", "no-store");
  res.status(r.status).json(r.json);
}
