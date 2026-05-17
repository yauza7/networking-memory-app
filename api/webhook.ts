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
  "🔔 Напоминаю окликнуть тех, кто завис, — чтобы знакомство не угасло.\n\n" +
  "<b>Быстрые команды</b>\n" +
  "<code>/add @user заметка</code> — записать контакт прямо в чате\n" +
  "<code>/note @user текст</code> — добавить заметку к существующему\n" +
  "🎙️ Голосовое — расшифрую и предложу прикрепить\n" +
  "Перешли мне сообщение — превращу в заметку\n\n" +
  "<b>Открыть в приложении</b>\n" +
  "/scan — сканер QR\n" +
  "/contacts — мои контакты\n" +
  "/tasks — задачи и напоминания\n" +
  "/me — моя визитка\n" +
  "/share — поделиться визиткой\n" +
  "/export — выгрузить контакты в CSV\n\n" +
  "<i>Плохая связь на стенде? Пиши прямо сюда — синхронизируется, когда вернётся сеть.</i>";

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
                  { text: "📄 Политика конфиденциальности", url: `${APP_URL}/privacy.html` },
                ],
                [
                  { text: "📑 Условия использования", url: `${APP_URL}/terms.html` },
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
        `Привет, <b>${firstName}</b>. Я — <b>Echo</b>.\n\n` +
        `Где-то в океане плавает кит, который поёт на 52 Hz — частоте, которую не слышит никто из его сородичей.\n\n` +
        `Echo появился из идеи, что важные связи не должны теряться: сохраняю контакты, помню о чём вы говорили и напоминаю, кому пора написать.\n\n` +
        `<i>Every signal finds its receiver.</i>\n\n` +
        `С чего начнём?`,
        {
          reply_markup: {
            inline_keyboard: [
              ...mainMenuKeyboard(),
              [{ text: "Как это работает?", callback_data: "about" }],
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

    // ─── /note @username text — append note to existing contact ─
    else if (text === "/note" || text.startsWith("/note ") || text.startsWith("/note@")) {
      const args = text.replace(/^\/note(@\w+)?\s*/i, "").trim();
      if (!args) {
        await sendMessage(chatId,
          `📝 <b>Добавить заметку к контакту</b>\n\n` +
          `Формат: <code>/note @username что добавить</code>\n\n` +
          `Пример: <code>/note @karim прислал кейс по LATAM</code>`
        );
      } else {
        const m = args.match(/^(@?\w+)\s*([\s\S]*)?$/);
        const username = m ? sanitizeUsername(m[1]) : "";
        const note = m ? (m[2] || "").trim().slice(0, 500) : "";
        if (!username || !note) {
          await sendMessage(chatId, `Нужны и username, и текст заметки. Формат: <code>/note @user текст</code>`);
        } else {
          const params = new URLSearchParams();
          params.set("username", username);
          params.set("note", note);
          params.set("append", "1");
          const url = `${APP_URL}/add-contact?${params.toString()}`;
          await sendMessage(chatId,
            `📝 К <b>@${escapeHtml(username)}</b>:\n<blockquote>${escapeHtml(note)}</blockquote>`,
            { reply_markup: { inline_keyboard: [[{ text: "💾 Сохранить заметку", web_app: { url } }]] } }
          );
        }
      }
    }

    // ─── /scan ────────────────────────────────────────────
    else if (text === "/scan") {
      await sendMessage(chatId,
        `🔍 Открой сканер и наведи на QR-код собеседника:`,
        { reply_markup: { inline_keyboard: [[{ text: "🔍 Открыть сканер", web_app: { url: `${APP_URL}/scan` } }]] } }
      );
    }

    // ─── /contacts ────────────────────────────────────────
    else if (text === "/contacts" || text === "/list") {
      await sendMessage(chatId,
        `👥 Все, кого ты сохранил — с тегами, заметками, поиском:`,
        { reply_markup: { inline_keyboard: [[{ text: "👥 Открыть контакты", web_app: { url: `${APP_URL}/contacts` } }]] } }
      );
    }

    // ─── /tasks ───────────────────────────────────────────
    else if (text === "/tasks" || text === "/todo" || text === "/followup") {
      await sendMessage(chatId,
        `✅ Кому пора написать и какие задачи на сегодня:`,
        { reply_markup: { inline_keyboard: [[{ text: "✅ Открыть задачи", web_app: { url: `${APP_URL}/tasks` } }]] } }
      );
    }

    // ─── /me · /profile — my card ─────────────────────────
    else if (text === "/me" || text === "/profile" || text === "/card") {
      await sendMessage(chatId,
        `📇 Твоя визитка — её ты показываешь по QR:`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "📇 Открыть визитку", web_app: { url: `${APP_URL}/my-card` } }],
              [{ text: "✏️ Редактировать", web_app: { url: `${APP_URL}/edit-profile` } }],
            ],
          },
        }
      );
    }

    // ─── /export · /csv — выгрузка ────────────────────────
    else if (text === "/export" || text === "/csv" || text === "/download") {
      await sendMessage(chatId,
        `📊 Выгрузить контакты в CSV (откроется в Numbers / Excel / Google Sheets):`,
        { reply_markup: { inline_keyboard: [[{ text: "📊 Открыть выгрузку", web_app: { url: `${APP_URL}/settings` } }]] } }
      );
    }

    // ─── /privacy · /terms — legal ────────────────────────
    else if (text === "/privacy" || text === "/policy" || text === "/legal") {
      await sendMessage(chatId,
        `📄 <b>Политика конфиденциальности</b>\n\nКакие данные собираю и где они хранятся:`,
        { reply_markup: { inline_keyboard: [[{ text: "Открыть политику", url: `${APP_URL}/privacy.html` }]] } }
      );
    }
    else if (text === "/terms" || text === "/tos") {
      await sendMessage(chatId,
        `📑 <b>Условия использования</b>`,
        { reply_markup: { inline_keyboard: [[{ text: "Открыть условия", url: `${APP_URL}/terms.html` }]] } }
      );
    }

    // ─── /about — то же что callback "about" ──────────────
    else if (text === "/about" || text === "/info") {
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
              [{ text: "📄 Политика конфиденциальности", url: `${APP_URL}/privacy.html` }],
              [{ text: "📑 Условия использования", url: `${APP_URL}/terms.html` }],
            ],
          },
        }
      );
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

    // ─── Plain text → smart intent matching, then draft note ────
    else if (text) {
      // 1. Try matching common intent words (1-2 word messages only)
      const cleaned = text.trim().toLowerCase().replace(/[?!.,]/g, "");
      const wordCount = cleaned.split(/\s+/).length;
      if (wordCount <= 3) {
        const intents: Array<{ match: RegExp; reply: () => Promise<unknown> }> = [
          {
            match: /^(политика|конфиденциальност|приватност|privacy|policy)/,
            reply: () => sendMessage(chatId,
              `📄 <b>Политика конфиденциальности</b>`,
              { reply_markup: { inline_keyboard: [[{ text: "Открыть политику", url: `${APP_URL}/privacy.html` }]] } }
            ),
          },
          {
            match: /^(услови|правила|terms|tos|оферт)/,
            reply: () => sendMessage(chatId,
              `📑 <b>Условия использования</b>`,
              { reply_markup: { inline_keyboard: [[{ text: "Открыть условия", url: `${APP_URL}/terms.html` }]] } }
            ),
          },
          {
            match: /^(контакт|люди|список|кого)/,
            reply: () => sendMessage(chatId, `👥 Все, кого ты сохранил:`,
              { reply_markup: { inline_keyboard: [[{ text: "👥 Открыть контакты", web_app: { url: `${APP_URL}/contacts` } }]] } }),
          },
          {
            match: /^(задач|напомин|todo|follow)/,
            reply: () => sendMessage(chatId, `✅ Кому пора написать:`,
              { reply_markup: { inline_keyboard: [[{ text: "✅ Открыть задачи", web_app: { url: `${APP_URL}/tasks` } }]] } }),
          },
          {
            match: /^(скан|qr|кьюар)/,
            reply: () => sendMessage(chatId, `🔍 Открой сканер:`,
              { reply_markup: { inline_keyboard: [[{ text: "🔍 Сканер QR", web_app: { url: `${APP_URL}/scan` } }]] } }),
          },
          {
            match: /^(визитк|профил|моя карт|обо мне)/,
            reply: () => sendMessage(chatId, `📇 Твоя визитка:`,
              { reply_markup: { inline_keyboard: [[{ text: "📇 Открыть визитку", web_app: { url: `${APP_URL}/my-card` } }]] } }),
          },
          {
            match: /^(экспорт|csv|выгруз|скача|excel)/,
            reply: () => sendMessage(chatId, `📊 Выгрузка в CSV:`,
              { reply_markup: { inline_keyboard: [[{ text: "📊 Открыть выгрузку", web_app: { url: `${APP_URL}/settings` } }]] } }),
          },
          {
            match: /^(помощ|справк|help|команд|что умеешь|как польз)/,
            reply: () => sendMessage(chatId, HELP_TEXT, { reply_markup: { inline_keyboard: mainMenuKeyboard() } }),
          },
          {
            match: /^(привет|здравствуй|hi|hello|здаров|хай|ку)/,
            reply: () => sendMessage(chatId,
              `Привет 👋\n\nЯ Echo — помогаю не терять людей с конференций. Жми кнопку или попроси /help.`,
              { reply_markup: { inline_keyboard: mainMenuKeyboard() } }
            ),
          },
          {
            match: /^(спасиб|благодар|thanks|thx|спс)/,
            reply: () => sendMessage(chatId, `На связи 🐋`),
          },
          {
            match: /^(echo|эхо|кит|whale|52)/,
            reply: () => sendMessage(chatId,
              `🐋 <i>Где-то в океане плавает кит, который поёт на 52 Hz — частоте, которую не слышит никто из его сородичей.</i>\n\nЯ Echo — чтобы важные связи не терялись.`,
              { reply_markup: { inline_keyboard: mainMenuKeyboard() } }
            ),
          },
        ];

        for (const intent of intents) {
          if (intent.match.test(cleaned)) {
            await intent.reply();
            return res.status(200).json({ ok: true });
          }
        }
      }

      // 2. Otherwise — treat as a draft note
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
