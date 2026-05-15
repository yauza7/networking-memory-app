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

    // 3. Transcribe via HuggingFace Inference API (Whisper-large-v3)
    const hf = await fetch(
      "https://api-inference.huggingface.co/models/openai/whisper-large-v3",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "audio/ogg",
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

/** Open-App inline keyboard used as a default response */
function openAppKeyboard() {
  return [[{ text: "🚀 Открыть W·52", web_app: { url: APP_URL } }]];
}

/** Full menu inline keyboard */
function mainMenuKeyboard() {
  return [
    [
      { text: "🔍 Сканировать", web_app: { url: `${APP_URL}/scan` } },
      { text: "📇 Профиль", web_app: { url: `${APP_URL}/my-card` } },
    ],
    [
      { text: "👥 Контакты", web_app: { url: `${APP_URL}/contacts` } },
      { text: "✅ Задачи", web_app: { url: `${APP_URL}/tasks` } },
    ],
    [{ text: "🚀 Открыть W·52", web_app: { url: APP_URL } }],
  ];
}

const HELP_TEXT =
  "<b>Команды W·52</b>\n\n" +
  "📇 /share — поделиться своей визиткой\n" +
  "➕ /add @username заметка — быстро записать контакт\n" +
  "🔍 /scan — открыть QR-сканер\n" +
  "👥 /contacts — мои контакты\n" +
  "✅ /tasks — мои задачи\n" +
  "👤 /profile — мой профиль\n" +
  "ℹ️ /help — эта справка\n\n" +
  "<b>Совет:</b> Если связь плохая на конференции — просто пиши боту " +
  "<code>/add @user о чём говорили</code> — потом откроешь приложение и всё сохранится.";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(200).send("W·52 Bot is running");

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
            title: senderUsername ? "Моя визитка W·52" : "Открыть W·52",
            description: senderUsername
              ? "Отправить визитку в этот чат"
              : "Нетворкинг и обмен визитками",
            input_message_content: {
              message_text: senderUsername
                ? `📇 <b>Моя визитка W·52</b>\n${profileUrl}`
                : `🌊 <b>W·52</b> — приложение для нетворкинга`,
              parse_mode: "HTML",
            },
            reply_markup: {
              inline_keyboard: [[
                { text: senderUsername ? "Открыть визитку" : "Открыть W·52", web_app: { url: profileUrl } },
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
          `🌊 <b>W·52</b>\n\n` +
          `Умный нетворкинг для конференций. Помогаем не терять контакты после встреч и автоматически напоминаем написать.\n\n` +
          `<b>Особенности:</b>\n` +
          `• Обмен визитками через QR\n` +
          `• AI-резюме каждого контакта\n` +
          `• Follow-up напоминания\n` +
          `• Голосовые заметки\n` +
          `• Работает офлайн (через бота)\n\n` +
          `<i>Версия 1.1</i>`,
          { reply_markup: { inline_keyboard: openAppKeyboard() } }
        );
      } else if (data === "menu") {
        await sendMessage(chatId, "Главное меню:", { reply_markup: { inline_keyboard: mainMenuKeyboard() } });
      }
      return res.status(200).json({ ok: true });
    }

    // ─── /start ───────────────────────────────────────────
    if (text === "/start" || text.startsWith("/start ")) {
      await sendMessage(chatId,
        `👋 Привет, <b>${firstName}</b>!\n\n` +
        `<b>W·52</b> — нетворкинг-помощник для конференций.\n\n` +
        `Обменивайся визитками через QR, не теряй контакты, получай follow-up напоминания.\n\n` +
        `Жми кнопки ниже или используй команды — посмотри /help.`,
        {
          reply_markup: {
            inline_keyboard: [
              ...mainMenuKeyboard(),
              [{ text: "ℹ️ Помощь", callback_data: "help" }, { text: "📖 О приложении", callback_data: "about" }],
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
        const profileUrl = `${APP_URL}/u/${senderUsername}?ref=tg`;
        await sendMessage(chatId,
          `📇 <b>Твоя визитка W·52</b>\n\n` +
          `<code>${escapeHtml(profileUrl)}</code>\n\n` +
          `Перешли это сообщение или нажми кнопку — собеседник откроет твою визитку и добавит в контакты в один клик. Если он ещё не в W·52, его сразу попросят зарегистрироваться.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "📤 Поделиться визиткой", switch_inline_query: "" }],
                [{ text: "📇 Открыть мою визитку", web_app: { url: `${APP_URL}/my-card` } }],
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
              `\nНажми чтобы сохранить в W·52:`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "💾 Сохранить в W·52", web_app: { url } }],
                    [{ text: "✍️ Добавить ещё", switch_inline_query_current_chat: "" }],
                  ],
                },
              }
            );
          }
        }
      }
    }

    // ─── /scan ────────────────────────────────────────────
    else if (text === "/scan") {
      await sendMessage(chatId,
        `🔍 <b>Сканер QR</b>\n\nОткрой камеру и наведи на QR-код собеседника:`,
        { reply_markup: { inline_keyboard: [[{ text: "🔍 Открыть сканер", web_app: { url: `${APP_URL}/scan` } }]] } }
      );
    }

    // ─── /contacts ────────────────────────────────────────
    else if (text === "/contacts") {
      await sendMessage(chatId,
        `👥 <b>Контакты</b>\n\nОткрой список всех сохранённых контактов:`,
        { reply_markup: { inline_keyboard: [[{ text: "👥 Открыть контакты", web_app: { url: `${APP_URL}/contacts` } }]] } }
      );
    }

    // ─── /tasks ───────────────────────────────────────────
    else if (text === "/tasks") {
      await sendMessage(chatId,
        `✅ <b>Задачи</b>\n\nFollow-up напоминания и задачи по контактам:`,
        { reply_markup: { inline_keyboard: [[{ text: "✅ Открыть задачи", web_app: { url: `${APP_URL}/tasks` } }]] } }
      );
    }

    // ─── /profile ─────────────────────────────────────────
    else if (text === "/profile" || text === "/me") {
      await sendMessage(chatId,
        `👤 <b>Мой профиль</b>\n\nКарточка W·52 — её ты показываешь по QR:`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "📇 Открыть профиль", web_app: { url: `${APP_URL}/my-card` } }],
              [{ text: "✏️ Редактировать", web_app: { url: `${APP_URL}/edit-profile` } }],
            ],
          },
        }
      );
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
                  [{ text: "👥 Открыть контакты", web_app: { url: `${APP_URL}/contacts` } }],
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
        `Чтобы отсканировать QR-код — открой сканер в приложении (он работает быстрее, чем разбор фото):`,
        { reply_markup: { inline_keyboard: [[{ text: "🔍 Открыть сканер", web_app: { url: `${APP_URL}/scan` } }]] } }
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
        `\nДобавить в W·52?`,
        { reply_markup: { inline_keyboard: [[{ text: "💾 Сохранить в W·52", web_app: { url } }]] } }
      );
    }

    // ─── Unknown command ──────────────────────────────────
    else if (text.startsWith("/")) {
      await sendMessage(chatId,
        `🤔 Не знаю такой команды.\n\nПосмотри /help — там полный список.`,
        { reply_markup: { inline_keyboard: [[{ text: "ℹ️ Помощь", callback_data: "help" }]] } }
      );
    }

    // ─── Plain text ───────────────────────────────────────
    else if (text) {
      await sendMessage(chatId,
        `Открой W·52 кнопкой ниже 👇\n\n<i>Подсказка: попробуй <code>/add @username заметка</code> чтобы быстро сохранить контакт.</i>`,
        { reply_markup: { inline_keyboard: mainMenuKeyboard() } }
      );
    }
  } catch (e) {
    console.error("Bot error:", e);
  }

  res.status(200).json({ ok: true });
}
