import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyInitData, getInitData } from "./_lib/auth.js";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

/**
 * POST /api/send-csv
 * Body: { csv: string, filename?: string }
 * Sends the CSV as a Telegram document to the authenticated user's chat.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const initData = getInitData(req);
  const auth = verifyInitData(initData);
  if (!auth.ok || !auth.user) return res.status(401).json({ error: "Unauthorized" });

  if (!TOKEN) return res.status(500).json({ error: "Bot not configured" });

  const { csv, filename } = req.body as { csv?: string; filename?: string };
  if (!csv || typeof csv !== "string") return res.status(400).json({ error: "csv required" });

  const chatId = String(auth.user.id);
  const safeFilename = (filename || `w52-contacts-${new Date().toISOString().slice(0, 10)}.csv`)
    .replace(/[^a-zA-Z0-9._\-а-яёА-ЯЁ']/g, "_")
    .slice(0, 128);

  // Build multipart/form-data manually using FormData
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("caption", `📊 Контакты W·52 · ${new Date().toLocaleDateString("ru-RU")}`);
  form.append("parse_mode", "HTML");

  const csvWithBom = "﻿" + csv;
  const blob = new Blob([csvWithBom], { type: "text/csv;charset=utf-8;" });
  form.append("document", blob, safeFilename);

  try {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendDocument`, {
      method: "POST",
      body: form,
    });

    if (!r.ok) {
      const err = await r.text();
      console.error("sendDocument failed:", r.status, err);
      return res.status(502).json({ error: "Failed to send", detail: err });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("send-csv error:", e);
    return res.status(500).json({ error: "Internal error" });
  }
}
