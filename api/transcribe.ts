import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyInitData, getInitData } from "./_lib/auth.js";

const HF_TOKEN = process.env.HUGGINGFACE_TOKEN || "";

/**
 * POST /api/transcribe
 * Accepts raw audio bytes (any format MediaRecorder outputs: webm/ogg/mp4)
 * and returns { text: string } via HuggingFace Whisper.
 * Auth: Telegram initData header.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const initData = getInitData(req);
  const auth = verifyInitData(initData);
  if (!auth.ok || !auth.user) return res.status(401).json({ error: "Unauthorized" });

  if (!HF_TOKEN) return res.status(503).json({ error: "Transcription not configured" });

  // req.body is a Buffer when Content-Type is audio/* or application/octet-stream
  const audioData: Buffer =
    Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(req.body);

  if (!audioData.length) return res.status(400).json({ error: "Empty audio" });

  try {
    const hf = await fetch(
      "https://api-inference.huggingface.co/models/openai/whisper-large-v2",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/octet-stream",
          "x-wait-for-model": "true",
        },
        body: new Uint8Array(audioData),
      }
    );

    if (!hf.ok) {
      const errText = await hf.text();
      console.error("HF transcribe failed:", hf.status, errText);
      return res.status(502).json({ error: "Transcription failed", detail: errText });
    }

    const data = await hf.json();
    const text = typeof data?.text === "string" ? data.text.trim() : "";
    return res.status(200).json({ ok: true, text });
  } catch (e) {
    console.error("transcribe error:", e);
    return res.status(500).json({ error: "Internal error" });
  }
}
