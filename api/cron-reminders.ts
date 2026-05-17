import type { VercelRequest, VercelResponse } from "@vercel/node";
import { redis, redisConfigured } from "./_lib/redis.js";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const APP_URL = process.env.APP_URL || "https://w52-app.vercel.app";
const CRON_SECRET = process.env.CRON_SECRET || "";

const escapeHtml = (s: string) =>
  String(s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));

async function sendBotMessage(chatId: string | number, text: string, replyMarkup?: object) {
  if (!TOKEN) return;
  try {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      }),
    });
    if (!r.ok) console.error("sendMessage failed:", r.status, await r.text());
  } catch (e) {
    console.error("sendMessage error:", e);
  }
}

/**
 * Daily cron — for every task due (today or earlier) that hasn't been
 * reminded yet, ping the owner in their bot chat.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (CRON_SECRET) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  if (!redisConfigured) return res.status(200).json({ ok: true, ran: false, reason: "no redis" });

  const now = Math.floor(Date.now() / 1000);
  const due = await redis.zrangebyscore("tasks_due", 0, now);

  const grouped: Record<string, { id: string; key: string }[]> = {};
  for (const member of due) {
    const [tgId, taskId] = member.split(":");
    if (!tgId || !taskId) continue;
    (grouped[tgId] = grouped[tgId] || []).push({ id: taskId, key: `task:${tgId}:${taskId}` });
  }

  let sent = 0;
  for (const [tgId, items] of Object.entries(grouped)) {
    const user = await redis.hgetall(`user:${tgId}`);
    if (!user?.chat_id) continue;

    const taskRows = await Promise.all(items.map((it) => redis.hgetall(it.key)));
    const active = taskRows
      .map((t, i) => ({ t, member: `${tgId}:${items[i].id}` }))
      .filter((x) => x.t && x.t.completed !== "1" && x.t.reminder_sent !== "1") as Array<{
        t: Record<string, string>;
        member: string;
      }>;

    if (!active.length) continue;

    const lines = active
      .slice(0, 10)
      .map(({ t }) =>
        t.contact_username
          ? `• ${escapeHtml(t.text)} (@${escapeHtml(t.contact_username)})`
          : `• ${escapeHtml(t.text)}`
      )
      .join("\n");

    const more = active.length > 10 ? `\n…и ещё ${active.length - 10}` : "";
    const text =
      `🔔 <b>Echo · напоминание</b>\n\n` +
      `Сегодня нужно написать (${active.length}):\n\n${lines}${more}`;

    await sendBotMessage(user.chat_id, text, {
      inline_keyboard: [
        [{ text: "📡 Открыть Echo", web_app: { url: APP_URL } }],
        [
          { text: "⏰ Напомнить завтра", callback_data: "snooze_1" },
          { text: "📅 Через неделю", callback_data: "snooze_7" },
        ],
      ],
    });

    await Promise.all(
      active.map(async ({ t, member }) => {
        await redis.hset(`task:${tgId}:${t.id}`, { reminder_sent: "1" });
        await redis.zrem("tasks_due", member);
      })
    );

    sent += active.length;
  }

  return res.status(200).json({ ok: true, ran: true, due: due.length, sent });
}
