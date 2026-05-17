import type { VercelRequest, VercelResponse } from "@vercel/node";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";
const GROQ_KEY = process.env.GROQ_API_KEY || "";

/**
 * POST /api/anthropic/v1/messages
 *
 * Tries Anthropic first. If the account has no credits (402/401/529),
 * falls back to Groq (llama-3.3-70b-versatile) using the same system/user
 * prompt, and returns an Anthropic-shaped response so the client doesn't
 * need to change.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const parsed = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  // ── 1. Try Anthropic ──────────────────────────────────────────────────────
  if (ANTHROPIC_KEY) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(parsed),
      });

      if (r.ok) {
        const text = await r.text();
        res.status(200);
        res.setHeader("content-type", "application/json");
        return res.send(text);
      }
      const errBody = await r.text();
      console.warn("Anthropic error:", r.status, errBody.slice(0, 200), "— falling back to Groq");
    } catch (e) {
      console.error("Anthropic error:", e);
    }
  }

  // ── 2. Fallback: Groq (OpenAI-compatible, llama-3.3-70b) ─────────────────
  if (!GROQ_KEY) return res.status(503).json({ error: "No AI provider configured" });

  try {
    // Convert Anthropic message format → OpenAI chat format
    const messages: { role: string; content: string }[] = [];
    if (parsed.system) messages.push({ role: "system", content: parsed.system });
    for (const m of parsed.messages ?? []) {
      messages.push({
        role: m.role,
        content: typeof m.content === "string" ? m.content : m.content?.[0]?.text ?? "",
      });
    }

    const gr = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: parsed.max_tokens ?? 1024,
        messages,
      }),
    });

    if (!gr.ok) {
      const err = await gr.text();
      console.error("Groq fallback failed:", gr.status, err);
      return res.status(502).json({ error: "AI provider error" });
    }

    const groqData = await gr.json();
    const text = groqData.choices?.[0]?.message?.content ?? "";

    // Wrap in Anthropic-shaped envelope so AddNote.tsx doesn't need changes
    return res.status(200).json({
      id: groqData.id ?? "groq-fallback",
      type: "message",
      role: "assistant",
      content: [{ type: "text", text }],
      model: "groq/llama-3.3-70b-versatile",
      stop_reason: "end_turn",
      usage: { input_tokens: 0, output_tokens: 0 },
    });
  } catch (e) {
    console.error("Groq fallback error:", e);
    return res.status(502).json({ error: "AI provider error" });
  }
}
