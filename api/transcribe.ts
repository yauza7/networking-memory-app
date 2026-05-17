import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyInitData, getInitData } from "./_lib/auth.js";

const HF_TOKEN = process.env.HUGGINGFACE_TOKEN || "";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

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

  // req.body is a Buffer when Content-Type is audio/* or application/octet-stream
  const audioData: Buffer =
    Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(req.body);

  if (!audioData.length) return res.status(400).json({ error: "Empty audio" });

  const audioBuf = new Uint8Array(audioData);

  // 1. Try Groq first — free tier, fast, OpenAI-compatible
  if (GROQ_API_KEY) {
    try {
      const form = new FormData();
      form.append("file", new Blob([audioBuf], { type: "audio/webm" }), "audio.webm");
      form.append("model", "whisper-large-v3-turbo");
      const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
        body: form,
      });
      if (r.ok) {
        const data = await r.json();
        const text = typeof data?.text === "string" ? data.text.trim() : "";
        if (text) return res.status(200).json({ ok: true, text });
      } else {
        console.error("Groq failed:", r.status, await r.text());
      }
    } catch (e) {
      console.error("Groq transcribe error:", e);
    }
  }

  // 2. Fallback: HuggingFace
  if (HF_TOKEN) {
    try {
      const form = new FormData();
      form.append("file", new Blob([audioBuf], { type: "audio/webm" }), "audio.webm");
      form.append("model", "openai/whisper-large-v2");
      const r = await fetch(
        "https://api-inference.huggingface.co/models/openai/whisper-large-v2/v1/audio/transcriptions",
        { method: "POST", headers: { Authorization: `Bearer ${HF_TOKEN}` }, body: form }
      );
      if (r.ok) {
        const data = await r.json();
        const text = typeof data?.text === "string" ? data.text.trim() : "";
        if (text) return res.status(200).json({ ok: true, text });
      } else {
        console.error("HF failed:", r.status, await r.text());
      }
    } catch (e) {
      console.error("HF transcribe error:", e);
    }
  }

  return res.status(502).json({ error: "Transcription failed" });
}
