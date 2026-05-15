import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyInitData, getInitData } from "../_lib/auth.js";
import { redis, redisConfigured } from "../_lib/redis.js";

/**
 * GET /api/voice/<id> — fetch a previously transcribed voice note.
 * Auth: Telegram WebApp initData. Users can only read their own transcriptions
 * (key is namespaced by chat_id == user_id).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const initData = getInitData(req);
  const auth = verifyInitData(initData);
  if (!auth.ok || !auth.user) return res.status(401).json({ error: "Unauthorized" });

  if (!redisConfigured) return res.status(503).json({ error: "Storage unavailable" });

  const id = String(req.query.id || "").slice(0, 128);
  if (!id) return res.status(400).json({ error: "id required" });

  const text = await redis.get(`voice:${auth.user.id}:${id}`);
  if (!text) return res.status(404).json({ error: "Not found or expired" });

  return res.status(200).json({ ok: true, text });
}
