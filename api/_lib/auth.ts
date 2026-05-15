import crypto from "crypto";

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

/**
 * Verifies a Telegram Mini App `initData` query string against the bot token.
 * Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyInitData(initData: string): { ok: boolean; user?: TelegramUser } {
  if (!initData || !BOT_TOKEN) return { ok: false };
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return { ok: false };
    params.delete("hash");

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const secretKey: Buffer = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
    const computed = crypto.createHmac("sha256", secretKey as unknown as crypto.BinaryLike).update(dataCheckString).digest("hex");
    if (computed !== hash) return { ok: false };

    const userJson = params.get("user");
    if (!userJson) return { ok: false };

    const authDate = parseInt(params.get("auth_date") || "0", 10);
    // Reject stale data older than 24 hours
    if (!authDate || Date.now() / 1000 - authDate > 86400) return { ok: false };

    const user = JSON.parse(userJson) as TelegramUser;
    if (!user?.id) return { ok: false };
    return { ok: true, user };
  } catch {
    return { ok: false };
  }
}

/** Extract initData from a Vercel request (header preferred, then body) */
export function getInitData(req: { headers: Record<string, any>; body?: any }): string {
  const h = req.headers["x-telegram-init-data"];
  if (typeof h === "string" && h) return h;
  if (Array.isArray(h) && h[0]) return h[0];
  if (req.body && typeof req.body === "object" && typeof (req.body as any).initData === "string") {
    return (req.body as any).initData;
  }
  return "";
}
