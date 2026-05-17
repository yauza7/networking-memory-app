import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyInitData, getInitData } from "./_lib/auth.js";
import { redis, redisConfigured } from "./_lib/redis.js";
import { sendBotMessage } from "./_lib/telegram.js";

/**
 * Self-layer API.
 *
 *   POST /api/profile              create/update the caller's profile (auth: initData)
 *   GET  /api/profile?username=X   public read (no auth, 60s edge cache)
 *
 * Storage:
 *   profile:{username_lc}   hash with self fields + tg_id
 *   profile_tg:{tg_id}      → username_lc (reverse lookup for updates)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") return handleGet(req, res);
  if (req.method === "POST") return handlePost(req, res);
  return res.status(405).json({ error: "Method not allowed" });
}

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const raw = req.query.username;
  const username = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";
  const usernameLc = sanitizeUsername(username).toLowerCase();
  if (!usernameLc) return res.status(400).json({ error: "Invalid username" });

  if (!redisConfigured) return res.status(404).json({ error: "Not found" });

  const data = await redis.hgetall(`profile:${usernameLc}`);
  if (!data || !data.tg_id || data.public === "0") {
    return res.status(404).json({ error: "Not found" });
  }

  let tags: string[] = [];
  try {
    tags = JSON.parse(data.tags || "[]");
  } catch {
    tags = [];
  }

  res.setHeader("Cache-Control", "public, max-age=10, s-maxage=10, must-revalidate");
  return res.status(200).json({
    id: `u-${data.username}`,
    username: data.username,
    name: data.name || data.username,
    role: data.role || "",
    company: data.company || "",
    companyUrl: data.companyUrl || "",
    bio: data.bio || "",
    photo: `/api/user-photo?user_id=${data.tg_id}`,
    tags,
    links: [{ type: "telegram", url: `https://t.me/${data.username}` }],
    updated_at: data.updated_at,
  });
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const initData = getInitData(req);
  const auth = verifyInitData(initData);
  if (!auth.ok || !auth.user) return res.status(401).json({ error: "Unauthorized" });

  if (!redisConfigured) {
    return res.status(200).json({ ok: true, persisted: false, note: "Storage not configured" });
  }

  const body = (req.body || {}) as Record<string, unknown>;
  const username = sanitizeUsername(body.username) || sanitizeUsername(auth.user.username);
  if (!username) return res.status(400).json({ error: "Username required" });
  const usernameLc = username.toLowerCase();
  const tgId = String(auth.user.id);

  const existing = await redis.hgetall(`profile:${usernameLc}`);
  if (existing && existing.tg_id && existing.tg_id !== tgId) {
    return res.status(409).json({ error: "Username already claimed" });
  }

  const prevUsername = await redis.get(`profile_tg:${tgId}`);
  if (prevUsername && prevUsername !== usernameLc) {
    await redis.del(`profile:${prevUsername}`);
  }

  const isFirstClaim = !existing || !existing.tg_id;
  const cleanName = sanitizeStr(body.name, 80);

  await redis.hset(`profile:${usernameLc}`, {
    tg_id: tgId,
    username: usernameLc,
    name: cleanName,
    role: sanitizeStr(body.role, 80),
    company: sanitizeStr(body.company, 80),
    bio: sanitizeStr(body.bio, 500),
    companyUrl: sanitizeUrl(body.companyUrl),
    tags: JSON.stringify(sanitizeTags(body.tags)),
    public: body.public === false ? "0" : "1",
    updated_at: new Date().toISOString(),
  });
  await redis.set(`profile_tg:${tgId}`, usernameLc);

  // First time this username is claimed → fan out matching notifications.
  // Don't block the response on it.
  if (isFirstClaim) {
    notifyOwners(usernameLc, cleanName || usernameLc, tgId).catch(() => {});
  }

  return res.status(200).json({ ok: true, username: usernameLc });
}

const APP_URL = process.env.APP_URL || "https://w52-app.vercel.app";

/**
 * Find all users who saved a contact with this username and ping them via
 * the bot. Skips the registrant themselves (in case they saved their own
 * card during testing). Best-effort — never throws.
 */
async function notifyOwners(usernameLc: string, displayName: string, ownerTgId: string): Promise<void> {
  const owners = await redis.zrangebyscore(`contact_owners:${usernameLc}`, 0, Number.MAX_SAFE_INTEGER);
  if (!owners || owners.length === 0) return;

  const text =
    `🔗 <b>${escapeHtml(displayName)}</b> теперь в Echo.\n\n` +
    `Когда откроете карточку контакта, профиль обновится автоматически.`;
  const replyMarkup = {
    inline_keyboard: [[
      { text: "Открыть приложение", web_app: { url: APP_URL } },
    ]],
  };

  await Promise.all(
    owners
      .filter((tgId) => tgId !== ownerTgId)
      .map((tgId) => sendBotMessage(tgId, text, { reply_markup: replyMarkup }))
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sanitizeStr(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.replace(/[<>]/g, "").trim().slice(0, max);
}

function sanitizeUsername(v: unknown): string {
  if (typeof v !== "string") return "";
  const m = v.replace(/^@/, "").match(/^[a-zA-Z0-9_]{1,32}$/);
  return m ? m[0] : "";
}

function sanitizeUrl(v: unknown): string {
  if (typeof v !== "string" || v.length > 500) return "";
  try {
    const u = new URL(v.startsWith("http") ? v : `https://${v}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.toString();
  } catch {
    return "";
  }
}

function sanitizeTags(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((t) => sanitizeStr(t, 40)).filter(Boolean).slice(0, 24);
}
