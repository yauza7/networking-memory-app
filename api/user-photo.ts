import type { VercelRequest, VercelResponse } from "@vercel/node";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

/**
 * Proxies a Telegram user's profile photo so the front-end can embed it
 * without exposing the bot token. Cached at the CDN edge for a day.
 *
 * Usage: /api/user-photo?user_id=12345
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = String(req.query.user_id || "").replace(/[^0-9]/g, "");
  if (!userId) return res.status(400).json({ error: "user_id required" });
  if (!TOKEN) return res.status(500).json({ error: "bot not configured" });

  try {
    const photosRes = await fetch(
      `https://api.telegram.org/bot${TOKEN}/getUserProfilePhotos?user_id=${userId}&limit=1`
    );
    const photos = await photosRes.json();
    if (!photos.ok || !photos.result?.photos?.[0]?.length) {
      return res.status(404).json({ error: "no photo" });
    }
    const sizes = photos.result.photos[0];
    const fileId = sizes[sizes.length - 1].file_id; // largest size available

    const fileRes = await fetch(
      `https://api.telegram.org/bot${TOKEN}/getFile?file_id=${fileId}`
    );
    const file = await fileRes.json();
    if (!file.ok) return res.status(404).json({ error: "file not found" });

    const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${file.result.file_path}`;
    const photoRes = await fetch(fileUrl);
    if (!photoRes.ok) return res.status(502).json({ error: "upstream" });

    const buf = Buffer.from(await photoRes.arrayBuffer());
    res.setHeader("Content-Type", photoRes.headers.get("content-type") || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400, immutable");
    return res.send(buf);
  } catch (err) {
    console.error("user-photo error:", err);
    return res.status(500).json({ error: "internal" });
  }
}
