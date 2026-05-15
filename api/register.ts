import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyInitData, getInitData } from "./_lib/auth.js";
import { redis, redisConfigured } from "./_lib/redis.js";

/**
 * Registers (or refreshes) the calling user so the bot can later message them.
 * Idempotent — called on every Mini App startup.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const initData = getInitData(req);
  const auth = verifyInitData(initData);
  if (!auth.ok || !auth.user) return res.status(401).json({ error: "Unauthorized" });

  if (!redisConfigured) {
    return res.status(200).json({ ok: true, persisted: false, note: "Storage not configured" });
  }

  const u = auth.user;
  await redis.hset(`user:${u.id}`, {
    tg_id: u.id,
    chat_id: u.id,
    username: u.username || "",
    first_name: u.first_name || "",
    last_name: u.last_name || "",
    registered_at: new Date().toISOString(),
  });

  return res.status(200).json({ ok: true, persisted: true });
}
