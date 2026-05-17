import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyInitData, getInitData } from "./_lib/auth.js";
import { redis, redisConfigured } from "./_lib/redis.js";

/**
 *   GET    /api/tasks            list user's tasks
 *   POST   /api/tasks            upsert a task (id in body)
 *   PATCH  /api/tasks?id=X       body: { completed: boolean }
 *   DELETE /api/tasks?id=X
 *
 * All require Telegram initData auth.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const initData = getInitData(req);
  const auth = verifyInitData(initData);
  if (!auth.ok || !auth.user) return res.status(401).json({ error: "Unauthorized" });

  if (!redisConfigured) {
    if (req.method === "GET") return res.status(200).json({ ok: true, persisted: false, tasks: [] });
    return res.status(200).json({ ok: true, persisted: false });
  }

  const tgId = auth.user.id;

  if (req.method === "GET") {
    const keys = await redis.keys(`task:${tgId}:*`);
    const tasks = await Promise.all(keys.map((k) => redis.hgetall(k)));
    return res.status(200).json({ ok: true, tasks: tasks.filter(Boolean) });
  }

  if (req.method === "POST") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const id = String(body.id || "").slice(0, 64);
    const dueDate = String(body.dueDate || "").slice(0, 10);
    const text = String(body.text || "").slice(0, 200);
    const contactName = String(body.contactName || "").slice(0, 80);
    const contactId = String(body.contactId || "").slice(0, 64);
    const contactUsername = String(body.contactUsername || "").slice(0, 32);
    const completed = body.completed === true ? "1" : "0";

    if (!id || !dueDate || !text) return res.status(400).json({ error: "id, dueDate, text required" });

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

    const dueUnix = Math.floor(new Date(dueDate + "T00:00:00Z").getTime() / 1000);
    if (Number.isFinite(dueUnix)) {
      await redis.zadd("tasks_due", dueUnix, `${tgId}:${id}`);
    }

    return res.status(200).json({ ok: true });
  }

  // PATCH / DELETE require ?id=
  const id = String(req.query.id || "").slice(0, 64);
  if (!id) return res.status(400).json({ error: "id required" });
  const key = `task:${tgId}:${id}`;
  const member = `${tgId}:${id}`;

  if (req.method === "PATCH") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const completed = body.completed === true ? "1" : "0";
    await redis.hset(key, { completed });
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
