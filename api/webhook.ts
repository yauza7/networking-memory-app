import type { VercelRequest, VercelResponse } from "@vercel/node";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";
const APP_URL = process.env.APP_URL || "https://w52-app.vercel.app";
const API = `https://api.telegram.org/bot${TOKEN}`;

async function sendMessage(chatId: number | string, text: string, extra: object = {}) {
  try {
    const r = await fetch(`${API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...extra }),
    });
    if (!r.ok) console.error("sendMessage failed:", r.status, await r.text());
  } catch (e) {
    console.error("sendMessage error:", e);
  }
}

async function answerCallback(callbackQueryId: string) {
  try {
    await fetch(`${API}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId }),
    });
  } catch (e) {
    console.error("answerCallback error:", e);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(200).send("W·52 Bot is running");

  if (!TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is not set");
    return res.status(500).json({ ok: false, error: "Server misconfigured" });
  }

  // Verify Telegram webhook secret to reject spoofed requests
  if (WEBHOOK_SECRET) {
    const provided = req.headers["x-telegram-bot-api-secret-token"];
    if (provided !== WEBHOOK_SECRET) {
      return res.status(401).json({ ok: false });
    }
  }

  const update = req.body;
  if (!update || typeof update !== "object") {
    return res.status(200).json({ ok: true });
  }

  try {
    if (update.inline_query) {
      await fetch(`${API}/answerInlineQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inline_query_id: update.inline_query.id,
          results: [{
            type: "article",
            id: "open_app",
            title: "Открыть W·52",
            description: "Нетворкинг на конференциях",
            input_message_content: {
              message_text: "🌊 <b>W·52</b> — приложение для нетворкинга\n\nОткрой и обменяйся визиткой:",
              parse_mode: "HTML",
            },
            reply_markup: {
              inline_keyboard: [[
                { text: "Открыть W·52 🚀", web_app: { url: APP_URL } },
              ]],
            },
          }],
          cache_time: 0,
        }),
      });
      return res.status(200).json({ ok: true });
    }

    const msg = update.message || update.callback_query?.message;
    if (!msg) return res.status(200).json({ ok: true });

    const chatId = msg.chat.id;
    const rawText = update.message?.text || "";
    const text = typeof rawText === "string" ? rawText.slice(0, 4000) : "";
    const rawName = update.message?.from?.first_name || update.callback_query?.from?.first_name || "друг";
    // Escape HTML to prevent injection into our HTML-parsed messages
    const firstName = String(rawName).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!)).slice(0, 80);

    if (text === "/start" || text.startsWith("/start ")) {
      await sendMessage(chatId,
        `👋 Привет, <b>${firstName}</b>!\n\n` +
        `<b>W·52</b> — твой нетворкинг-помощник на конференциях.\n\n` +
        `• Обменивайся визитками через QR\n` +
        `• Сохраняй контакты с контекстом встречи\n` +
        `• Получай напоминания написать\n` +
        `• ИИ резюмирует каждый контакт\n`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🚀 Открыть W·52", web_app: { url: APP_URL } }],
              [{ text: "📇 Моя визитка", callback_data: "my_card" }],
              [{ text: "ℹ️ О приложении", callback_data: "about" }],
              [{ text: "🔒 Privacy", url: `${APP_URL}/privacy.html` }, { text: "📄 Terms", url: `${APP_URL}/terms.html` }],
            ],
          },
        }
      );
    } else if (update.callback_query?.data === "my_card") {
      await answerCallback(update.callback_query.id);
      await sendMessage(chatId,
        `📇 <b>Твоя визитка</b>\n\nОткрой приложение, чтобы настроить профиль и поделиться QR-кодом:`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Открыть профиль", web_app: { url: `${APP_URL}/my-card` } }],
            ],
          },
        }
      );
    } else if (update.callback_query?.data === "about") {
      await answerCallback(update.callback_query.id);
      await sendMessage(chatId,
        `🌊 <b>W·52</b>\n\n` +
        `Приложение для умного нетворкинга.\n\n` +
        `<b>Как использовать:</b>\n` +
        `1. Создай профиль с визиткой\n` +
        `2. На конференции — покажи QR или отсканируй чужой\n` +
        `3. Приложение напомнит написать контакту\n` +
        `4. ИИ создаст персональное follow-up сообщение\n\n` +
        `<i>Версия: 1.0</i>`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🚀 Открыть приложение", web_app: { url: APP_URL } }],
            ],
          },
        }
      );
    } else if (text && !text.startsWith("/")) {
      await sendMessage(chatId,
        `Привет! Нажми кнопку ниже, чтобы открыть W·52 👇`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🚀 Открыть W·52", web_app: { url: APP_URL } }],
            ],
          },
        }
      );
    }
  } catch (e) {
    console.error("Bot error:", e);
  }

  res.status(200).json({ ok: true });
}
