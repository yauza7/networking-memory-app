import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyInitData, getInitData } from "./_lib/auth.js";
import { redis, redisConfigured } from "./_lib/redis.js";

/**
 * Observer-layer API — each user's private memory of contacts.
 *
 *   GET    /api/contacts?since=<ms>   return items updated after <ms> (incl. tombstones)
 *   POST   /api/contacts              upsert a contact (body: full Connection JSON)
 *   PATCH  /api/contacts?id=X         merge partial update (body: Partial<Connection>)
 *   DELETE /api/contacts?id=X         write tombstone (so other devices remove it on next sync)
 *
 * Storage:
 *   contact:{tg_id}:{id}     JSON (full record OR tombstone { id, deleted:true, updated_at })
 *   contacts_updates:{tg_id} ZSET score=updated_at_ms, member=id (drives delta sync)
 *
 * Records are size-capped at 16KB.
 */
const MAX_BODY = 16 * 1024;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const initData = getInitData(req);
  const auth = verifyInitData(initData);
  if (!auth.ok || !auth.user) return res.status(401).json({ error: "Unauthorized" });

  if (!redisConfigured) {
    if (req.method === "GET") return res.status(200).json({ ok: true, persisted: false, items: [], now: Date.now() });
    return res.status(200).json({ ok: true, persisted: false });
  }

  const tgId = String(auth.user.id);
  const zkey = `contacts_updates:${tgId}`;

  if (req.method === "GET") {
    const sinceRaw = String(req.query.since || "0");
    const since = Math.max(0, parseInt(sinceRaw, 10) || 0);
    const now = Date.now();
    const ids = await redis.zrangebyscore(zkey, since + 1, now);
    const items: any[] = [];
    for (const id of ids) {
      const raw = await redis.get(`contact:${tgId}:${id}`);
      if (raw) {
        try { items.push(JSON.parse(raw)); } catch {}
      }
    }
    // One-time backfill for the contact_owners index: when a user does a full
    // initial sync (since=0), re-index every saved contact. Cheap: only happens
    // once after install / after the user clears localStorage cursor.
    if (since === 0 && ids.length > 0) {
      for (const item of items) {
        if (!item || item.deleted) continue;
        await indexOwner(tgId, item);
      }
    }
    return res.status(200).json({ ok: true, items, now });
  }

  if (req.method === "POST") {
    const body = parseBody(req.body);
    if (!body || typeof body !== "object") return res.status(400).json({ error: "Invalid body" });
    const id = sanitizeId((body as any).id);
    if (!id) return res.status(400).json({ error: "id required" });

    const record = { ...(body as any), id, updated_at: new Date().toISOString() };
    const json = JSON.stringify(record);
    if (json.length > MAX_BODY) return res.status(413).json({ error: "Record too large" });

    const now = Date.now();
    await redis.set(`contact:${tgId}:${id}`, json);
    await redis.zadd(zkey, now, id);
    await indexOwner(tgId, record);
    return res.status(200).json({ ok: true, now });
  }

  if (req.method === "PATCH") {
    const id = sanitizeId(req.query.id);
    if (!id) return res.status(400).json({ error: "id required" });

    const body = parseBody(req.body);
    if (!body || typeof body !== "object") return res.status(400).json({ error: "Invalid body" });

    const key = `contact:${tgId}:${id}`;
    const existingRaw = await redis.get(key);
    let existing: any = {};
    if (existingRaw) {
      try { existing = JSON.parse(existingRaw); } catch { existing = {}; }
    }
    const merged = { ...existing, ...(body as any), id, updated_at: new Date().toISOString() };
    delete merged.deleted; // un-tombstone on edit
    const json = JSON.stringify(merged);
    if (json.length > MAX_BODY) return res.status(413).json({ error: "Record too large" });

    const now = Date.now();
    await redis.set(key, json);
    await redis.zadd(zkey, now, id);
    await indexOwner(tgId, merged);
    return res.status(200).json({ ok: true, now });
  }

  if (req.method === "DELETE") {
    const id = sanitizeId(req.query.id);
    if (!id) return res.status(400).json({ error: "id required" });
    const now = Date.now();
    // Read old record before tombstoning so we can de-index the owner.
    const oldRaw = await redis.get(`contact:${tgId}:${id}`);
    if (oldRaw) {
      try {
        const old = JSON.parse(oldRaw);
        await deindexOwner(tgId, old);
      } catch {}
    }
    const tombstone = JSON.stringify({ id, deleted: true, updated_at: new Date().toISOString() });
    await redis.set(`contact:${tgId}:${id}`, tombstone);
    await redis.zadd(zkey, now, id);
    return res.status(200).json({ ok: true, now });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

/**
 * Index contact owners by referenced username so /api/profile.ts can fan out
 * "now in Echo" notifications when a user registers and matches saved contacts.
 *
 * Key: `contact_owners:{username_lc}` → ZSET, score=ms, member=tg_id.
 * ZSET (rather than SET) so we can use the existing redis helper surface.
 */
async function indexOwner(tgId: string, record: any) {
  const username = extractUsername(record);
  if (!username) return;
  await redis.zadd(`contact_owners:${username}`, Date.now(), tgId);
}

async function deindexOwner(tgId: string, record: any) {
  const username = extractUsername(record);
  if (!username) return;
  await redis.zrem(`contact_owners:${username}`, tgId);
}

function extractUsername(record: any): string {
  if (!record || typeof record !== "object") return "";
  const u = record?.user?.username;
  if (typeof u !== "string") return "";
  const m = u.replace(/^@/, "").match(/^[a-zA-Z0-9_]{1,32}$/);
  return m ? m[0].toLowerCase() : "";
}

function sanitizeId(v: unknown): string {
  if (typeof v !== "string") return "";
  // alphanumeric, underscore, dash, dot, up to 64 chars
  const m = v.match(/^[a-zA-Z0-9_.\-]{1,64}$/);
  return m ? m[0] : "";
}

function parseBody(b: unknown): unknown {
  if (typeof b === "string") {
    try { return JSON.parse(b); } catch { return null; }
  }
  return b;
}
