import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, Mic, Pause, Sparkles, Check, Loader2, AlertCircle, Volume2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { mockContacts } from "../utils/mockData";
import { allContacts, updateStoredContact } from "../utils/contactStore";

const SYSTEM_PROMPT = `You are a networking assistant for affiliate marketing industry.
Extract key information from a meeting note.
Return ONLY valid JSON, no markdown, no explanation:
{
  "summary": "string (1-2 sentences in Russian describing the person)",
  "tags": ["string array (3-7 tags from: iGaming, Nutra, Finance, Crypto, Dating, E-commerce, Media Buyer, Affiliate Manager, Advertiser, Recruiter, Founder, Team Lead, LATAM, Tier-1, Europe, CIS, Asia, Payments, AI, SaaS, Hiring, Gambling)"],
  "followUpDays": "number (3, 5, 7, or 14)"
}`;

interface AIResult {
  summary: string;
  tags: string[];
  followUpDays: number;
}

async function analyzeNote(text: string): Promise<AIResult> {
  const response = await fetch("/api/anthropic/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
    }),
  });

  if (!response.ok) throw new Error(`API ${response.status}`);
  const data = await response.json();
  const raw = (data.content?.[0]?.text ?? "{}").replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(raw) as AIResult;
}

export function AddNote() {
  const [searchParams] = useSearchParams();
  const contactId = searchParams.get("contact") || "";
  const navigate = useNavigate();

  // Look up contact in both stored and mock contacts
  const contact = allContacts(mockContacts).find((c) => c.id === contactId) ?? null;

  const [textNote, setTextNote] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [step, setStep] = useState<"input" | "processing" | "done" | "done_no_ai">("input");
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    let t: ReturnType<typeof setInterval>;
    if (isRecording) t = setInterval(() => setRecordingSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isRecording]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const startRecording = () => { setIsRecording(true); setRecordingSecs(0); };
  const stopRecording  = () => { setIsRecording(false); setAudioBlob(new Blob([], { type: "audio/wav" })); };

  // Always go to ContactDetail after we're done here
  const goToContact = () => {
    if (contactId) {
      navigate(`/contact/${contactId}`, { replace: true });
    } else {
      navigate("/contacts", { replace: true });
    }
  };

  const handleSave = async () => {
    if (!textNote.trim() && !audioBlob) return;
    setStep("processing");
    setAiError(null);

    const noteText = textNote.trim() || "Голосовая заметка";

    // Always save the note first, regardless of AI outcome
    if (contactId) {
      const existing = allContacts(mockContacts).find((c) => c.id === contactId);
      const prev = existing?.note ? `${existing.note}\n\n` : "";
      updateStoredContact(contactId, { note: `${prev}${noteText}` });
    }

    try {
      const result = await analyzeNote(noteText);

      // Enrich with AI data
      if (contactId) {
        const dueDate = new Date(Date.now() + (result.followUpDays ?? 7) * 86400_000)
          .toISOString().split("T")[0];
        updateStoredContact(contactId, {
          aiSummary: result.summary,
          followUpDate: dueDate,
          user: {
            ...(allContacts(mockContacts).find((c) => c.id === contactId)?.user as any),
            tags: result.tags ?? [],
          },
        });
      }

      setAiResult(result);
      setStep("done");
      setTimeout(goToContact, 2500);
    } catch {
      // AI failed — note is already saved, just go to contact
      setAiError("ai_failed");
      setStep("done_no_ai");
    }
  };

  // ── Saved without AI ───────────────────────────────────────
  if (step === "done_no_ai") {
    setTimeout(goToContact, 2000);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 22 }}
          className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
          style={{ background: "#34C759", boxShadow: "0 12px 40px rgba(52,199,89,0.35)" }}
        >
          <Check className="w-12 h-12 text-white" />
        </motion.div>
        <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#0a1628", marginBottom: "6px" }}>Заметка сохранена</h2>
        <p style={{ fontSize: "14px", color: "#8E8E93" }}>AI временно недоступен — заметка сохранена без обработки</p>
      </div>
    );
  }

  // ── Processing state ────────────────────────────────────────
  if (step === "processing") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
          style={{ background: "linear-gradient(135deg, #5AC8FA, #007AFF)", boxShadow: "0 12px 40px rgba(0,122,255,0.4)" }}
        >
          <Sparkles className="w-12 h-12 text-white" />
        </motion.div>
        <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#0a1628", marginBottom: "8px" }}>
          AI обрабатывает заметку
        </h2>
        <p style={{ fontSize: "15px", color: "#8E8E93", marginBottom: "20px" }}>Создаю summary и извлекаю теги…</p>
        <div className="flex items-center gap-2" style={{ color: "#8E8E93", fontSize: "13px" }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          claude-sonnet-4 думает…
        </div>
      </div>
    );
  }

  // ── Done state ──────────────────────────────────────────────
  if (step === "done" && aiResult) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 22 }}
          className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
          style={{ background: "#34C759", boxShadow: "0 12px 40px rgba(52,199,89,0.35)" }}
        >
          <Check className="w-12 h-12 text-white" />
        </motion.div>

        <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#0a1628", marginBottom: "6px" }}>Заметка сохранена!</h2>
        <p style={{ fontSize: "14px", color: "#8E8E93", marginBottom: "24px" }}>
          Follow-up через {aiResult.followUpDays} дн.
        </p>

        <div className="glass-card p-5 w-full max-w-sm text-left mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4" style={{ color: "#007AFF" }} />
            <p style={{ fontWeight: 600, fontSize: "13px", color: "#8E8E93", textTransform: "uppercase", letterSpacing: "0.4px" }}>
              AI Summary
            </p>
          </div>
          <p style={{ fontSize: "14px", color: "#3c3c43", lineHeight: 1.55 }}>{aiResult.summary}</p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center mb-6 max-w-sm">
          {aiResult.tags.map((tag) => (
            <span key={tag} className="ios-tag">{tag}</span>
          ))}
        </div>

        <p style={{ fontSize: "13px", color: "#C7C7CC" }}>Перехожу к карточке контакта…</p>
      </div>
    );
  }

  // ── Input state ─────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-14 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={goToContact} style={{ color: "#007AFF" }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0a1628", letterSpacing: "-0.3px" }}>
              Заметка
            </h1>
            {contact && (
              <p style={{ fontSize: "13px", color: "#8E8E93" }}>{contact.user.name}</p>
            )}
          </div>
        </div>
        {/* Skip button */}
        <button
          onClick={goToContact}
          style={{ fontSize: "16px", color: "#007AFF", fontWeight: 500 }}
        >
          Пропустить
        </button>
      </div>

      <div className="px-4 space-y-4">
        {/* API error */}
        <AnimatePresence>
          {aiError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass-card p-4 flex items-start gap-3"
              style={{ borderColor: "rgba(255,59,48,0.2)" }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#FF3B30" }} />
              <div>
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#FF3B30" }}>AI недоступен</p>
                <p style={{ fontSize: "12px", color: "#8E8E93", marginTop: "2px" }}>
                  Заметка всё равно сохранится — AI summary создать не удалось
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Voice recording */}
        <div className="glass-card p-5">
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#8E8E93", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "16px" }}>
            Голосовая заметка
          </p>

          {!audioBlob ? (
            <div className="flex flex-col items-center">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className="w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-all active:scale-95"
                style={isRecording
                  ? { background: "#FF3B30", boxShadow: "0 8px 28px rgba(255,59,48,0.4)" }
                  : { background: "linear-gradient(135deg, #5AC8FA, #007AFF)", boxShadow: "0 8px 28px rgba(0,122,255,0.35)" }}
              >
                {isRecording
                  ? <Pause className="w-10 h-10 text-white" />
                  : <Mic className="w-10 h-10 text-white" />}
              </button>
              {isRecording ? (
                <div className="flex items-center gap-2">
                  <motion.div
                    className="w-2 h-2 rounded-full"
                    style={{ background: "#FF3B30" }}
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <span style={{ fontSize: "18px", fontWeight: 700, color: "#FF3B30" }}>{fmt(recordingSecs)}</span>
                </div>
              ) : (
                <p style={{ fontSize: "14px", color: "#8E8E93" }}>Нажмите для записи</p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(0,122,255,0.06)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,122,255,0.12)" }}>
                  <Volume2 className="w-4 h-4" style={{ color: "#007AFF" }} />
                </div>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "#0a1628" }}>Аудио заметка</p>
                  <p style={{ fontSize: "12px", color: "#8E8E93" }}>{fmt(recordingSecs)}</p>
                </div>
              </div>
              <button
                onClick={() => { setAudioBlob(null); setRecordingSecs(0); }}
                className="p-2 rounded-full"
                style={{ background: "rgba(0,0,0,0.05)" }}
              >
                <X className="w-4 h-4" style={{ color: "#8E8E93" }} />
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.08)" }} />
          <span style={{ fontSize: "13px", color: "#8E8E93" }}>или</span>
          <div className="flex-1 h-px" style={{ background: "rgba(0,0,0,0.08)" }} />
        </div>

        {/* Text note */}
        <div className="glass-card p-5">
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#8E8E93", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
            Текстовая заметка
          </p>
          <textarea
            value={textNote}
            onChange={(e) => setTextNote(e.target.value)}
            placeholder="О чём говорили, что договорились, ключевые темы…"
            rows={5}
            className="w-full px-4 py-3 text-sm resize-none"
          />
          {textNote.trim().length > 0 && (
            <div className="flex items-start gap-2 mt-3 p-3 rounded-xl" style={{ background: "rgba(0,122,255,0.05)" }}>
              <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#007AFF" }} />
              <p style={{ fontSize: "12px", color: "#007AFF" }}>
                Claude AI создаст summary, извлечёт теги и определит срок follow-up
              </p>
            </div>
          )}
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!textNote.trim() && !audioBlob}
          className="w-full flex items-center justify-center gap-2 rounded-[14px] text-white font-semibold transition-all active:scale-97 disabled:opacity-40"
          style={{
            background: "linear-gradient(180deg, #3AA3FF 0%, #007AFF 50%, #0063D1 100%)",
            height: "50px", fontSize: "17px",
            boxShadow: "0 4px 20px rgba(0,122,255,0.45), inset 0 1px 0 rgba(255,255,255,0.28)",
          }}
        >
          <Sparkles className="w-5 h-5" />
          Сохранить и создать AI summary
        </button>

        <div className="glass-card p-4">
          <p style={{ fontWeight: 600, fontSize: "13px", color: "#0a1628", marginBottom: "8px" }}>Советы</p>
          <ul className="space-y-1.5">
            {[
              "Записывайте сразу после встречи, пока всё помните",
              "Упомяните ключевые темы и договорённости",
              "AI автоматически создаст summary и извлечёт важные детали",
            ].map((tip) => (
              <li key={tip} className="flex gap-2" style={{ fontSize: "13px", color: "#8E8E93" }}>
                <span style={{ color: "#007AFF" }}>·</span> {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
