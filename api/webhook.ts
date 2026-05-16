import type { VercelRequest, VercelResponse } from "@vercel/node";
import { redis, redisConfigured } from "./_lib/redis.js";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";
const APP_URL = process.env.APP_URL || "https://w52-app.vercel.app";
const HF_TOKEN = process.env.HUGGINGFACE_TOKEN || "";
const API = `https://api.telegram.org/bot${TOKEN}`;

const escapeHtml = (s: string) =>
  String(s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));

const sanitizeUsername = (s: string): string => {
  const m = String(s).replace(/^@/, "").match(/^[a-zA-Z0-9_]{1,32}$/);
  return m ? m[0] : "";
};

async function tgPost(method: string, body: object) {
  try {
    const r = await fetch(`${API}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) console.error(`${method} failed:`, r.status, await r.text());
    return r;
  } catch (e) {
    console.error(`${method} error:`, e);
  }
}

async function sendMessage(chatId: number | string, text: string, extra: object = {}): Promise<number | null> {
  const r = await tgPost("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true, ...extra });
  if (!r) return null;
  try {
    const data = await r.json();
    return data?.result?.message_id ?? null;
  } catch {
    return null;
  }
}

async function editMessage(chatId: number | string, messageId: number, text: string, extra: object = {}) {
  return tgPost("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...extra,
  });
}

async function answerCallback(id: string, text?: string) {
  return tgPost("answerCallbackQuery", { callback_query_id: id, ...(text ? { text } : {}) });
}

/**
 * Downloads a voice file from Telegram and transcribes it via HuggingFace
 * Whisper-large-v3. Returns the recognized text or null on failure.
 */
async function transcribeVoice(fileId: string): Promise<string | null> {
  if (!HF_TOKEN) {
    console.error("HUGGINGFACE_TOKEN not set");
    return null;
  }
  try {
    // 1. Resolve file_path
    const fileRes = await fetch(`${API}/getFile?file_id=${encodeURIComponent(fileId)}`);
    const fileJson = await fileRes.json();
    const filePath: string | undefined = fileJson?.result?.file_path;
    if (!filePath) {
      console.error("getFile failed:", fileJson);
      return null;
    }

    // 2. Download the audio
    const audioRes = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${filePath}`);
    if (!audioRes.ok) {
      console.error("audio download failed:", audioRes.status);
      return null;
    }
    const audioBuf = new Uint8Array(await audioRes.arrayBuffer());

    // 3. Transcribe via HuggingFace Inference API
    const hf = await fetch(
      "https://api-inference.huggingface.co/models/openai/whisper-large-v2",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/octet-stream",
          "x-wait-for-model": "true",
        },
        body: audioBuf,
      }
    );
    if (!hf.ok) {
      console.error("HF whisper failed:", hf.status, await hf.text());
      return null;
    }
    const data = await hf.json();
    const text = typeof data?.text === "string" ? data.text.trim() : "";
    return text || null;
  } catch (e) {
    console.error("transcribeVoice error:", e);
    return null;
  }
}

/** Open-App inline keyboard — used everywhere as the single CTA */
function openAppKeyboard() {
  return [[{ text: "📡 Открыть Echo", web_app: { url: APP_URL } }]];
}

/** Main keyboard — minimal: just one button to open the app */
function mainMenuKeyboard() {
  return openAppKeyboard();
}

const HELP_TEXT =
  "<b>Echo · команды</b>\n" +
  "<i>Every signal finds its receiver.</i>\n\n" +
  "📇 /share — поделиться своей визиткой\n" +
  "➕ /add @username заметка — быстро записать контакт\n" +
  "🎙️ Голосовое — пришли голосовое, расшифрую и прикреплю к контакту\n" +
  "ℹ️ /help — эта справка\n\n" +
  "<b>Совет:</b> Плохая связь на конференции? Пиши боту " +
  "<code>/add @user о чём говорили</code> — синхронизируется когда откроешь приложение.";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(200).send("Echo Bot is running");

  if (!TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is not set");
    return res.status(500).json({ ok: false, error: "Server misconfigured" });
  }

  if (WEBHOOK_SECRET) {
    const provided = req.headers["x-telegram-bot-api-secret-token"];
    if (provided !== WEBHOOK_SECRET) return res.status(401).json({ ok: false });
  }

  const update = req.body;
  if (!update || typeof update !== "object") return res.status(200).json({ ok: true });

  try {
    // Inline query: result that opens the app
    if (update.inline_query) {
      const q = String(update.inline_query.query || "").slice(0, 100);
      const senderUsername = update.inline_query.from?.username || "";
      const profileUrl = senderUsername ? `${APP_URL}/u/${senderUsername}?ref=inline` : APP_URL;

      await tgPost("answerInlineQuery", {
        inline_query_id: update.inline_query.id,
        cache_time: 0,
        results: [
          {
            type: "article",
            id: "share_card",
            title: senderUsername ? "Моя визитка Echo" : "Открыть Echo",
            description: senderUsername
              ? "Отправить визитку в этот чат"
              : "Every signal finds its receiver.",
            input_message_content: {
              message_text: senderUsername
                ? `📇 <b>Моя визитка · Echo</b>\n${profileUrl}`
                : `<b>Echo.</b> <i>Every signal finds its receiver.</i>`,
              parse_mode: "HTML",
            },
            reply_markup: {
              inline_keyboard: [[
                { text: senderUsername ? "Открыть визитку" : "📡 Открыть Echo", web_app: { url: profileUrl } },
              ]],
            },
          },
        ],
      });
      return res.status(200).json({ ok: true });
    }

    const msg = update.message || update.callback_query?.message;
    if (!msg) return res.status(200).json({ ok: true });

    const chatId = msg.chat.id;
    const rawText = update.message?.text || "";
    const text = typeof rawText === "string" ? rawText.slice(0, 4000) : "";
    const fromUser = update.message?.from || update.callback_query?.from || {};
    const firstName = escapeHtml(String(fromUser.first_name || "друг").slice(0, 80));
    const senderUsername = String(fromUser.username || "");

    // ─── Callback queries ─────────────────────────────────
    if (update.callback_query?.data) {
      const data = update.callback_query.data;
      await answerCallback(update.callback_query.id);

      if (data === "help") {
        await sendMessage(chatId, HELP_TEXT, { reply_markup: { inline_keyboard: mainMenuKeyboard() } });
      } else if (data === "about") {
        await sendMessage(chatId,
          `<b>Echo.</b>\n` +
          `<i>Every signal finds its receiver.</i>\n\n` +
          `Нетворкинг-память для конференций. Один сигнал — и контакт уже у тебя.\n\n` +
          `<b>Что внутри:</b>\n` +
          `• Обмен визитками через QR\n` +
          `• AI-резюме каждого контакта\n` +
          `• Follow-up напоминания\n` +
          `• Голосовые заметки с расшифровкой\n` +
          `• Работает офлайн через бота\n\n` +
          `<code>WHALE · 52 HZ</code>`,
          { reply_markup: { inline_keyboard: openAppKeyboard() } }
        );
      } else if (data === "menu") {
        await sendMessage(chatId, "Echo.", { reply_markup: { inline_keyboard: mainMenuKeyboard() } });
      }
      return res.status(200).json({ ok: true });
    }

    // ─── /start ───────────────────────────────────────────
    if (text === "/start" || text.startsWith("/start ")) {
      await sendMessage(chatId,
        `👋 Привет, <b>${firstName}</b>.\n\n` +
        `<b>Echo.</b> <i>Every signal finds its receiver.</i>\n\n` +
        `Нетворкинг-память для конференций: обмен QR-визитками, AI-сводки и follow-up напоминания.\n\n` +
        `Открой приложение или пришли голосовое — я расшифрую.`,
        {
          reply_markup: {
            inline_keyboard: [
              ...mainMenuKeyboard(),
              [{ text: "ℹ️ Помощь", callback_data: "help" }, { text: "📖 О Echo", callback_data: "about" }],
            ],
          },
        }
      );
    }

    // ─── /help ────────────────────────────────────────────
    else if (text === "/help") {
      await sendMessage(chatId, HELP_TEXT, { reply_markup: { inline_keyboard: mainMenuKeyboard() } });
    }

    // ─── /share ───────────────────────────────────────────
    else if (text === "/share") {
      if (!senderUsername) {
        await sendMessage(chatId,
          `❌ В Telegram не задан username.\n\n` +
          `Чтобы делиться визиткой через бота, задай username в Настройках Telegram → Изменить профиль → Имя пользователя.\n\n` +
          `А пока можешь поделиться визиткой прямо из приложения:`,
          { reply_markup: { inline_keyboard: [[{ text: "📇 Открыть профиль", web_app: { url: `${APP_URL}/share-profile` } }]] } }
        );
      } else {
        const profileUrl = `${APP_URL}/u/${senderUsername}`;
        await sendMessage(chatId,
          `📇 <b>Твоя визитка Echo</b>\n\n` +
          `<code>${escapeHtml(profileUrl)}</code>\n\n` +
          `Перешли это сообщение или нажми кнопку — собеседник откроет визитку и добавит в контакты в один клик.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "📤 Поделиться визиткой", switch_inline_query: "" }],
                [{ text: "📡 Открыть Echo", web_app: { url: APP_URL } }],
              ],
            },
          }
        );
      }
    }

    // ─── /add @username note ──────────────────────────────
    else if (text === "/add" || text.startsWith("/add ") || text.startsWith("/add@")) {
      const args = text.replace(/^\/add(@\w+)?\s*/i, "").trim();
      if (!args) {
        await sendMessage(chatId,
          `📝 <b>Быстро добавить контакт</b>\n\n` +
          `Используй: <code>/add @username о чём говорили</code>\n\n` +
          `<b>Примеры:</b>\n` +
          `<code>/add @vasilisa Платёжки, MAC 2026</code>\n` +
          `<code>/add @nikita Арбитраж, Bangkok</code>\n\n` +
          `<i>Удобно когда связь плохая — пиши боту, потом синхронизируешь в приложении.</i>`
        );
      } else {
        const m = args.match(/^(@?\w+)\s*([\s\S]*)?$/);
        if (!m) {
          await sendMessage(chatId, `❌ Не понял команду. Используй: <code>/add @username заметка</code>`);
        } else {
          const username = sanitizeUsername(m[1]);
          const note = (m[2] || "").trim().slice(0, 500);
          if (!username) {
            await sendMessage(chatId, `❌ Некорректный username: <code>${escapeHtml(m[1])}</code>\nИспользуй латинские буквы, цифры и _ (5–32 символа).`);
          } else {
            const params = new URLSearchParams();
            params.set("username", username);
            if (note) params.set("note", note);
            params.set("event", "Из Telegram");
            const url = `${APP_URL}/add-contact?${params.toString()}`;
            await sendMessage(chatId,
              `💾 <b>Сохранить контакт</b>\n\n` +
              `Telegram: @${escapeHtml(username)}\n` +
              (note ? `\n<i>${escapeHtml(note)}</i>\n` : "") +
              `\nНажми чтобы сохранить в Echo:`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "💾 Сохранить в Echo", web_app: { url } }],
                    [{ text: "✍️ Добавить ещё", switch_inline_query_current_chat: "" }],
                  ],
                },
              }
            );
          }
        }
      }
    }

    // ─── Voice message ────────────────────────────────────
    else if (update.message?.voice) {
      const voice = update.message.voice;

      // 1. Quick ack so user knows we're working on it
      const ackId = await sendMessage(chatId, `🎙️ <b>Расшифровываю…</b>\n<i>Первая расшифровка может занять до минуты (модель прогревается).</i>`);

      // 2. Run Whisper
      const text = await transcribeVoice(voice.file_id);

      if (!text) {
        if (ackId) {
          await editMessage(chatId, ackId,
            `❌ <b>Не удалось расшифровать</b>\n\nПопробуй ещё раз через минуту — модель могла не прогреться.`
          );
        }
      } else {
        const safe = escapeHtml(text);
        // 3. Store in Redis with 24h TTL so the Mini App can fetch it
        const voiceId = `${voice.file_unique_id || Date.now()}`;
        if (redisConfigured) {
          await redis.setex(`voice:${chatId}:${voiceId}`, 86400, text);
        }
        const url = `${APP_URL}/voice-note?id=${encodeURIComponent(voiceId)}`;

        const display = safe.length > 3500 ? safe.slice(0, 3500) + "…" : safe;
        if (ackId) {
          await editMessage(chatId, ackId,
            `🎙️ <b>Расшифровано</b>\n\n<blockquote>${display}</blockquote>`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "💾 Сохранить к контакту", web_app: { url } }],
                ],
              },
            }
          );
        } else {
          await sendMessage(chatId,
            `🎙️ <b>Расшифровано</b>\n\n<blockquote>${display}</blockquote>`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "💾 Сохранить к контакту", web_app: { url } }],
                ],
              },
            }
          );
        }
      }
    }

    // ─── Photo ────────────────────────────────────────────
    else if (update.message?.photo) {
      await sendMessage(chatId,
        `📷 <b>Получил фото</b>\n\n` +
        `QR-коды быстрее распознаются прямо в приложении — открой Echo и наведи камеру:`,
        { reply_markup: { inline_keyboard: openAppKeyboard() } }
      );
    }

    // ─── Contact card ─────────────────────────────────────
    else if (update.message?.contact) {
      const c = update.message.contact;
      const username = sanitizeUsername(c.user_id ? "" : ""); // user_id, no username typically
      const name = escapeHtml(`${c.first_name || ""} ${c.last_name || ""}`.trim().slice(0, 80));
      const params = new URLSearchParams();
      if (name) params.set("note", `Контакт из Telegram: ${name}, тел. ${c.phone_number || ""}`);
      params.set("event", "Из Telegram");
      const url = `${APP_URL}/add-contact?${params.toString()}`;
      await sendMessage(chatId,
        `📇 <b>Получил контакт</b>\n\n` +
        (name ? `${name}\n` : "") +
        (c.phone_number ? `📞 ${escapeHtml(c.phone_number)}\n` : "") +
        `\nДобавить в Echo?`,
        { reply_markup: { inline_keyboard: [[{ text: "💾 Сохранить в Echo", web_app: { url } }]] } }
      );
    }

    // ─── Unknown command ──────────────────────────────────
    else if (text.startsWith("/")) {
      await sendMessage(chatId,
        `🤔 Не знаю такой команды.\n\nПосмотри /help — там полный список.`,
        { reply_markup: { inline_keyboard: [[{ text: "ℹ️ Помощь", callback_data: "help" }]] } }
      );
    }

    // ─── Plain text → quick draft note ───────────────────
    else if (text) {
      // Save as a draft voice-note entry so it can be attached to a contact
      const draftId = `draft_${Date.now()}`;
      if (redisConfigured) {
        await redis.setex(`voice:${chatId}:${draftId}`, 86400, text);
      }
      const url = `${APP_URL}/voice-note?id=${encodeURIComponent(draftId)}`;
      await sendMessage(chatId,
        `📝 <b>Заметка сохранена</b>\n\n<blockquote>${escapeHtml(text.slice(0, 500))}</blockquote>\n\n` +
        (redisConfigured
          ? `Прикрепи её к нужному контакту:`
          : `<i>Redis не подключён — заметка не сохранится между сессиями. Добавь REDIS_URL.</i>`),
        {
          reply_markup: {
            inline_keyboard: redisConfigured
              ? [[{ text: "💾 Прикрепить к контакту", web_app: { url } }]]
              : mainMenuKeyboard(),
          },
        }
      );
    }
  } catch (e) {
    console.error("Bot error:", e);
  }

  res.status(200).json({ ok: true });
}
