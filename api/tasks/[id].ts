import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyInitData, getInitData } from "../_lib/auth.js";
import { redis, redisConfigured } from "../_lib/redis.js";

/**
 * PATCH  /api/tasks/<id>  — body: { completed: boolean }
 * DELETE /api/tasks/<id>
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const initData = getInitData(req);
  const auth = verifyInitData(initData);
  if (!auth.ok || !auth.user) return res.status(401).json({ error: "Unauthorized" });

  if (!redisConfigured) return res.status(200).json({ ok: true, persisted: false });

  const tgId = auth.user.id;
  const id = String(req.query.id || "").slice(0, 64);
  if (!id) return res.status(400).json({ error: "id required" });

  const key = `task:${tgId}:${id}`;
  const member = `${tgId}:${id}`;

  if (req.method === "PATCH") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const completed = body.completed === true ? "1" : "0";
    await redis.hset(key, { completed });
    // Drop from the due-set so cron stops considering it
    if (completed === "1") await redis.zrem("tasks_due", member);
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    await redis.del(key);
    await redis.zrem("tasks_due", member);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
