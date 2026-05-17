import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyInitData, getInitData } from "./_lib/auth.js";
import { redis, redisConfigured } from "./_lib/redis.js";

/**
 * Share-link API — pass a contact's observer fragment to a friend.
 *
 *   POST /api/share              auth, body: { contactRef, sharedTags, sharedNote }
 *                                returns { token }
 *   GET  /api/share?token=X      no auth, returns the share payload + sharer info
 *   POST /api/share?token=X&claim=1
 *                                auth, returns the Connection-shaped record to store locally
 *
 * Storage:
 *   share:{token}   JSON payload, 30-day TTL
 *
 * Token: 22-char URL-safe random string.
 */
const TTL_SECONDS = 30 * 24 * 60 * 60;
const MAX_BODY = 8 * 1024;

interface ContactRef {
  username?: string;
  name?: string;
  role?: string;
  company?: string;
  photo?: string;
  tags?: string[];
  bio?: string;
}

interface SharePayload {
  fromUsername: string;
  fromName: string;
  contactRef: ContactRef;
  sharedTags: string[];
  sharedNote: string;
  sharedAt: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!redisConfigured) return res.status(503).json({ error: "Storage not configured" });

  const token = sanitizeToken(req.query.token);

  // ── GET preview (no auth) ────────────────────────────────────────────────
  if (req.method === "GET") {
    if (!token) return res.status(400).json({ error: "token required" });
    const raw = await redis.get(`share:${token}`);
    if (!raw) return res.status(404).json({ error: "Not found or expired" });
    try {
      const payload = JSON.parse(raw) as SharePayload;
      return res.status(200).json({ ok: true, ...payload });
    } catch {
      return res.status(500).json({ error: "Corrupt payload" });
    }
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Everything POST requires auth.
  const initData = getInitData(req);
  const auth = verifyInitData(initData);
  if (!auth.ok || !auth.user) return res.status(401).json({ error: "Unauthorized" });

  // ── POST ?token=X&claim=1 ────────────────────────────────────────────────
  if (token && (req.query.claim === "1" || req.query.claim === "true")) {
    const raw = await redis.get(`share:${token}`);
    if (!raw) return res.status(404).json({ error: "Not found or expired" });
    let payload: SharePayload;
    try { payload = JSON.parse(raw) as SharePayload; }
    catch { return res.status(500).json({ error: "Corrupt payload" }); }

    return res.status(200).json({ ok: true, payload });
  }

  // ── POST create share ────────────────────────────────────────────────────
  const body = parseBody(req.body);
  if (!body || typeof body !== "object") return res.status(400).json({ error: "Invalid body" });

  const contactRef = sanitizeContactRef((body as any).contactRef);
  if (!contactRef.username && !contactRef.name) {
    return res.status(400).json({ error: "contactRef needs at least username or name" });
  }

  // Try to enrich fromName from the sharer's own profile (or fall back to first_name).
  const tgId = String(auth.user.id);
  const fromUsernameRaw = await redis.get(`profile_tg:${tgId}`);
  let fromName = [auth.user.first_name, auth.user.last_name].filter(Boolean).join(" ");
  let fromUsername = auth.user.username || fromUsernameRaw || "";
  if (fromUsernameRaw) {
    const prof = await redis.hgetall(`profile:${fromUsernameRaw}`);
    if (prof?.name) fromName = prof.name;
    fromUsername = fromUsernameRaw;
  }

  const payload: SharePayload = {
    fromUsername: sanitizeUsername(fromUsername),
    fromName: sanitizeStr(fromName, 80) || sanitizeUsername(fromUsername) || "Echo user",
    contactRef,
    sharedTags: sanitizeTags((body as any).sharedTags),
    sharedNote: sanitizeStr((body as any).sharedNote, 1000),
    sharedAt: new Date().toISOString(),
  };

  const json = JSON.stringify(payload);
  if (json.length > MAX_BODY) return res.status(413).json({ error: "Payload too large" });

  const newToken = generateToken();
  await redis.setex(`share:${newToken}`, TTL_SECONDS, json);
  return res.status(200).json({ ok: true, token: newToken });
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function generateToken(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 22; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function sanitizeToken(v: unknown): string {
  if (typeof v !== "string") return "";
  const m = v.match(/^[A-Za-z0-9_-]{8,64}$/);
  return m ? m[0] : "";
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

function sanitizePhoto(v: unknown): string {
  if (typeof v !== "string" || v.length > 500) return "";
  if (v.startsWith("/api/user-photo?")) return v;
  try {
    const u = new URL(v);
    return u.protocol === "https:" ? u.toString() : "";
  } catch {
    return "";
  }
}

function sanitizeTags(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((t) => sanitizeStr(t, 40)).filter(Boolean).slice(0, 24);
}

function sanitizeContactRef(v: unknown): ContactRef {
  if (!v || typeof v !== "object") return {};
  const r = v as any;
  return {
    username: sanitizeUsername(r.username) || undefined,
    name: sanitizeStr(r.name, 80) || undefined,
    role: sanitizeStr(r.role, 80) || undefined,
    company: sanitizeStr(r.company, 80) || undefined,
    photo: sanitizePhoto(r.photo) || undefined,
    bio: sanitizeStr(r.bio, 500) || undefined,
    tags: sanitizeTags(r.tags),
  };
}

function parseBody(b: unknown): unknown {
  if (typeof b === "string") {
    try { return JSON.parse(b); } catch { return null; }
  }
  return b;
}
