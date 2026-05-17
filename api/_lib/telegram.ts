/**
 * Minimal Telegram Bot API helper used by serverless endpoints that need to
 * fan out notifications outside of the webhook flow (e.g. profile.ts
 * matching). webhook.ts has its own copy; this one is intentionally tiny.
 */
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

export async function sendBotMessage(
  chatId: number | string,
  text: string,
  extra: Record<string, unknown> = {}
): Promise<boolean> {
  if (!TOKEN) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...extra,
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
