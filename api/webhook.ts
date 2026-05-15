import type { VercelRequest, VercelResponse } from "@vercel/node";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const APP_URL = "https://w52-app.vercel.app";
const API = `https://api.telegram.org/bot${TOKEN}`;

async function sendMessage(chatId: number | string, text: string, extra: object = {}) {
  await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...extra }),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(200).send("W·52 Bot is running");

  const update = req.body;

  try {
    // Inline query
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
    const text = update.message?.text || "";
    const firstName = update.message?.from?.first_name || update.callback_query?.from?.first_name || "друг";

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
            ],
          },
        }
      );
    } else if (update.callback_query?.data === "my_card") {
      await fetch(`${API}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: update.callback_query.id }),
      });
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
      await fetch(`${API}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: update.callback_query.id }),
      });
      await sendMessage(chatId,
        `🌊 <b>W·52</b>\n\n` +
        `Приложение для умного нетворкинга.\n\n` +
        `<b>Как использовать:</b>\n` +
        `1. Создай профиль с визиткой\n` +
        `2. На конференции — покажи QR или отсканируй чужой\n` +
        `3. Приложение напомнит написать контакту\n` +
        `4. ИИ создаст персональное follow-up сообщение\n\n` +
        `<i>Версия: 1.0 · w52-app.vercel.app</i>`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🚀 Открыть приложение", web_app: { url: APP_URL } }],
            ],
          },
        }
      );
    } else if (text && !text.startsWith("/")) {
      // Default response
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
