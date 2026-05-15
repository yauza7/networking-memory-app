import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyInitData, getInitData } from "./_lib/auth.js";
import { redis, redisConfigured } from "./_lib/redis.js";

/**
 * GET  /api/tasks           — list user's tasks (server-side mirror)
 * POST /api/tasks           — upsert one task
 *   body: { id, contactId, contactName, contactUsername?, text, dueDate (YYYY-MM-DD), completed? }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const initData = getInitData(req);
  const auth = verifyInitData(initData);
  if (!auth.ok || !auth.user) return res.status(401).json({ error: "Unauthorized" });

  if (!redisConfigured) {
    return res.status(200).json({ ok: true, persisted: false, tasks: [] });
  }

  const tgId = auth.user.id;

  if (req.method === "GET") {
    const keys = (await redis.keys(`task:${tgId}:*`)) || [];
    const tasks = await Promise.all(keys.map((k) => redis.hgetall(k)));
    return res.status(200).json({
      ok: true,
      tasks: tasks.filter(Boolean),
    });
  }

  if (req.method === "POST") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const id = String(body.id || "").slice(0, 64);
    const dueDate = String(body.dueDate || "").slice(0, 10); // YYYY-MM-DD
    const text = String(body.text || "").slice(0, 200);
    const contactName = String(body.contactName || "").slice(0, 80);
    const contactId = String(body.contactId || "").slice(0, 64);
    const contactUsername = String(body.contactUsername || "").slice(0, 32);
    const completed = body.completed === true ? "1" : "0";

    if (!id || !dueDate || !text) {
      return res.status(400).json({ error: "id, dueDate, text required" });
    }

    const key = `task:${tgId}:${id}`;
    await redis.hset(key, {
      id,
      tg_id: tgId,
      text,
      contact_id: contactId,
      contact_name: contactName,
      contact_username: contactUsername,
      due_date: dueDate,
      completed,
      reminder_sent: "0",
      created_at: new Date().toISOString(),
    });

    // Add to sorted set for cron lookup (score = due-date midnight UTC unix seconds)
    const dueUnix = Math.floor(new Date(dueDate + "T00:00:00Z").getTime() / 1000);
    if (Number.isFinite(dueUnix)) {
      await redis.zadd("tasks_due", dueUnix, `${tgId}:${id}`);
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
