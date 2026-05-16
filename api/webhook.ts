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
  return [[{ text: "⚡ Открыть приложение", web_app: { url: APP_URL } }]];
}

/** Main keyboard — minimal: just one button to open the app */
function mainMenuKeyboard() {
  return openAppKeyboard();
}

const HELP_TEXT =
  "<b>Что я умею</b>\n\n" +
  "📇 Сохраняю людей с конференций — по QR, по @username, по голосу.\n" +
  "🎙️ Расшифровываю голосовые — пришли запись, текст прикреплю к контакту.\n" +
  "✨ Делаю AI-сводку: о чём говорили, какие темы, когда написать.\n" +
  "🔔 Напоминаю окликнуть тех, кто завис — чтобы знакомство не угасло.\n\n" +
  "<b>Команды</b>\n" +
  "/share — отправить свою визитку\n" +
  "/add @username заметка — записать контакт прямо в чате\n" +
  "/help — эта справка\n\n" +
  "<i>Плохая связь на стенде? Просто пиши боту — синхронизируется потом.</i>";

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
          `<b>Echo</b> — твоя память о людях с конференций.\n` +
          `<i>Every signal finds its receiver.</i>\n\n` +
          `После трёх дней нетворкинга в голове каша: кто что обещал, кому надо написать, с кем созвон. Echo всё это держит за тебя.\n\n` +
          `<b>Как работает:</b>\n` +
          `• Знакомишься — сканируешь QR или пересылаешь @username\n` +
          `• Записываешь голосом, пока свежо — я расшифрую и сделаю сводку\n` +
          `• Через пару дней я напомню написать тем, кто ждёт ответа\n` +
          `• Утром на стенде покажу, кому из вчерашних окликнуть\n\n` +
          `Данные хранятся на твоём устройстве. Бесплатно.\n\n` +
          `<code>WHALE · 52 HZ</code>`,
          {
            reply_markup: {
              inline_keyboard: [
                ...openAppKeyboard(),
                [
                  { text: "📄 Политика", url: `${APP_URL}/privacy.html` },
                  { text: "📑 Условия", url: `${APP_URL}/terms.html` },
                ],
              ],
            },
          }
        );
      } else if (data === "menu") {
        await sendMessage(chatId, "Открыть Echo:", { reply_markup: { inline_keyboard: mainMenuKeyboard() } });
      }
      return res.status(200).json({ ok: true });
    }

    // ─── /start ───────────────────────────────────────────
    if (text === "/start" || text.startsWith("/start ")) {
      await sendMessage(chatId,
        `Привет, <b>${firstName}</b>. Я <b>Echo</b>.\n\n` +
        `Помогаю не терять людей с конференций: сохраняю контакты, помню о чём говорили, напоминаю написать.\n\n` +
        `<i>Every signal finds its receiver.</i>\n\n` +
        `С чего начнём?`,
        {
          reply_markup: {
            inline_keyboard: [
              ...mainMenuKeyboard(),
              [
                { text: "Настроить визитку", web_app: { url: `${APP_URL}/edit-profile` } },
                { text: "Как это работает?", callback_data: "about" },
              ],
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
          `Чтобы делиться визиткой через меня, задай username в Telegram: Настройки → Изменить профиль → Имя пользователя.\n\n` +
          `Пока — можно поделиться визиткой прямо из приложения:`,
          { reply_markup: { inline_keyboard: [[{ text: "📇 Моя визитка", web_app: { url: `${APP_URL}/share-profile` } }]] } }
        );
      } else {
        const profileUrl = `${APP_URL}/u/${senderUsername}`;
        await sendMessage(chatId,
          `📇 <b>Твоя визитка</b>\n\n` +
          `<code>${escapeHtml(profileUrl)}</code>\n\n` +
          `Перешли это сообщение собеседнику — он откроет визитку и сохранит тебя в контакты в один тап.`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "📤 Отправить в чат", switch_inline_query: "" }],
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
          `📝 <b>Записать контакт</b>\n\n` +
          `Формат: <code>/add @username о чём говорили</code>\n\n` +
          `Примеры:\n` +
          `<code>/add @vasilisa платёжки, MAC 2026</code>\n` +
          `<code>/add @nikita арбитраж, Bangkok</code>\n\n` +
          `<i>Связь на стенде слабая — пиши сюда, всё подтянется в приложение позже.</i>`
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
      const ackId = await sendMessage(chatId, `🎙️ <b>Слушаю…</b>\n<i>Первая расшифровка занимает до минуты — модель просыпается.</i>`);

      // 2. Run Whisper
      const text = await transcribeVoice(voice.file_id);

      if (!text) {
        if (ackId) {
          await editMessage(chatId, ackId,
            `Не удалось разобрать запись. Попробуй ещё раз через минуту.`
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
            `🎙️ <b>Готово</b>\n\n<blockquote>${display}</blockquote>`,
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
            `🎙️ <b>Готово</b>\n\n<blockquote>${display}</blockquote>`,
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
        `📷 Получил фото.\n\nЕсли это QR-визитка — открой приложение и наведи камеру, так быстрее:`,
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
        `📇 Получил контакт.\n` +
        (name ? `\n${name}` : "") +
        (c.phone_number ? `\n📞 ${escapeHtml(c.phone_number)}` : "") +
        `\n\nСохранить?`,
        { reply_markup: { inline_keyboard: [[{ text: "💾 Сохранить", web_app: { url } }]] } }
      );
    }

    // ─── Unknown command ──────────────────────────────────
    else if (text.startsWith("/")) {
      await sendMessage(chatId,
        `Не знаю такой команды. Посмотри /help — там всё, что я умею.`,
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
        `📝 <b>Записал заметку</b>\n\n<blockquote>${escapeHtml(text.slice(0, 500))}</blockquote>\n\n` +
        (redisConfigured
          ? `Привяжи её к человеку — пока свежо:`
          : `<i>Хранилище не настроено — заметка не доживёт до следующей сессии.</i>`),
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
