import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * One-time setup: updates bot name, description, short description,
 * and command list via Telegram Bot API. Idempotent — safe to re-run.
 *
 * Call with the WEBHOOK_SECRET as ?secret= to authorize:
 *   GET /api/setup-bot?secret=<TELEGRAM_WEBHOOK_SECRET>
 */
const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";
const API = `https://api.telegram.org/bot${TOKEN}`;

const BOT_NAME = "Echo";

// Shown at the very top of the chat-with-bot screen (above the Start button)
// Max 512 characters. This is what new users see first.
const BOT_DESCRIPTION =
  "Я Echo. Помогаю не терять людей с конференций: " +
  "сохраняю контакты по QR и @username, " +
  "расшифровываю голосовые заметки, " +
  "напоминаю окликнуть тех, кто ждёт ответа. " +
  "Every signal finds its receiver.";

// Shown in chat list and bot profile preview. Max 120 characters.
const BOT_SHORT_DESCRIPTION =
  "Память о людях с конференций. Контакты, голосовые заметки, follow-up без ручной работы.";

const COMMANDS = [
  { command: "start", description: "Открыть Echo" },
  { command: "add", description: "Записать контакт: /add @user заметка" },
  { command: "note", description: "Добавить заметку: /note @user текст" },
  { command: "scan", description: "Сканер QR" },
  { command: "contacts", description: "Мои контакты" },
  { command: "tasks", description: "Задачи и напоминания" },
  { command: "me", description: "Моя визитка" },
  { command: "share", description: "Поделиться визиткой" },
  { command: "export", description: "Выгрузить контакты в CSV" },
  { command: "help", description: "Что я умею" },
];

const MENU_BUTTON = {
  type: "web_app" as const,
  text: "⚡ Открыть Echo",
  web_app: { url: process.env.APP_URL || "https://w52-app.vercel.app" },
};

async function tg(method: string, body: object) {
  const r = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok && (data as any).ok, status: r.status, data };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!TOKEN) return res.status(500).json({ ok: false, error: "TELEGRAM_BOT_TOKEN not set" });

  const provided = (req.query.secret as string) || req.headers["x-setup-secret"];
  if (!WEBHOOK_SECRET || provided !== WEBHOOK_SECRET) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const results: Record<string, any> = {};

  // 1. Bot display name (shown in header)
  results.setMyName = await tg("setMyName", { name: BOT_NAME });

  // 2. Long description (the big text new users see before pressing Start)
  results.setMyDescription = await tg("setMyDescription", { description: BOT_DESCRIPTION });

  // 3. Short description (preview / about line)
  results.setMyShortDescription = await tg("setMyShortDescription", {
    short_description: BOT_SHORT_DESCRIPTION,
  });

  // 4. Slash-command list (the / menu)
  results.setMyCommands = await tg("setMyCommands", { commands: COMMANDS });

  // 5. The persistent menu button (next to the message input, replaces "/")
  //    This is the button that was still showing the old name.
  results.setChatMenuButton = await tg("setChatMenuButton", { menu_button: MENU_BUTTON });

  return res.status(200).json({ ok: true, results });
}
