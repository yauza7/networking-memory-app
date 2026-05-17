/**
 * W·52 — Заметка (AddNote)
 * Moody. Sonar-pinging record button (cyan), text area as serif italic,
 * cyan "Создать AI-сводку" CTA. All voice/AI logic preserved.
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Mic, Square, Check, Loader2, Volume2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { mockContacts } from "../utils/mockData";
import { allContacts, updateStoredContact } from "../utils/contactStore";
import {
  Atmosphere,
  RoundBtn,
  SignalBtn,
  AISparkle,
  Hero,
  cardStyle,
} from "../components/brand/Brand";

const SYSTEM_PROMPT = `Ты — AI-ассистент для нетворкинга в индустрии арбитража трафика и партнёрского маркетинга.

Контекст индустрии: люди здесь занимаются закупкой платного трафика (Facebook Ads, UAC, TikTok, PPC), продвижением офферов по вертикалям (нутра, гемблинг, беттинг, крипто, финансы, дейтинг), работают с партнёрскими сетями (CPA-сети), создают прилы (мобильные приложения), занимаются клоакингом, управляют командами медиабаеров. Основные конференции: MAC, GGate, BROCONF, AffHub. Типичные роли: медиабаер, аффилиат-менеджер, тимлид, CEO арбитражной команды, владелец CPA-сети, разработчик трекеров/прил, HR в арб-команде.

Твоя задача: извлечь ключевую информацию из заметки о встрече.
Верни ТОЛЬКО валидный JSON, без markdown, без пояснений:
{
  "summary": "строка (1-2 предложения на русском — кто этот человек и о чём договорились/говорили)",
  "tags": ["массив строк (3-7 тегов из: Buying, Платёжки, Разработка, Партнёрская сеть, Прилы, Аккаунты, Трекеры, HR, PR, Дизайн, FB, UAC, PPC, SEO, ASO, TikTok Ads, Influence, Email, SMS, УБТ, Нутра, Gambling, Betting, Adult, Финансы, Crypto, Founder, Team Lead, Hiring)"],
  "followUpDays": число (3, 5, 7 или 14 — в зависимости от срочности договорённостей)
}`;

interface AIResult {
  summary: string;
  tags: string[];
  followUpDays: number;
}

async function analyzeNote(text: string, existingSummary?: string): Promise<AIResult> {
  const userContent = existingSummary
    ? `Существующая информация о человеке: ${existingSummary}\n\nНовая заметка о встрече: ${text}`
    : text;

  const response = await fetch("/api/anthropic/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  if (!response.ok) throw new Error(`API ${response.status}`);
  const data = await response.json();
  const raw = (data.content?.[0]?.text ?? "{}")
    .replace(/```json\n?|\n?```/g, "")
    .trim();
  return JSON.parse(raw) as AIResult;
}

/** Strip the live-transcript marker that SpeechRecognition injects into the textarea */
function cleanVoiceMarker(text: string): string {
  return text.replace(/\[…голосом\]\s*/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function getInitData(): string | null {
  try {
    const tg = (window as any).Telegram?.WebApp;
    return typeof tg?.initData === "string" && tg.initData ? tg.initData : null;
  } catch {
    return null;
  }
}

async function transcribeBlob(blob: Blob): Promise<string | null> {
  const initData = getInitData();
  if (!initData) return null;
  try {
    const r = await fetch("/api/transcribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Telegram-Init-Data": initData,
      },
      body: blob,
    });
    if (!r.ok) return null;
    const data = await r.json();
    return typeof data.text === "string" ? data.text : null;
  } catch {
    return null;
  }
}

/**
 * Module-level audio stream — persists across component remounts within the
 * same SPA session so the browser only asks for mic permission once.
 */
let _sharedStream: MediaStream | null = null;

export function AddNote() {
  const [searchParams] = useSearchParams();
  const contactId = searchParams.get("contact") || "";
  const navigate = useNavigate();
  const contact = allContacts(mockContacts).find((c) => c.id === contactId) ?? null;

  const [textNote, setTextNote] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [step, setStep] = useState<
    "input" | "processing" | "done" | "done_no_ai"
  >("input");
  const [aiResult, setAiResult] = useState<AIResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const liveTranscriptRef = useRef<string>("");

  useEffect(() => {
    let t: ReturnType<typeof setInterval>;
    if (isRecording) t = setInterval(() => setRecordingSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isRecording]);

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const startRecording = async () => {
    setMicError(null);

    // ── 1. Browser-native live transcription (works offline, no backend) ──
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SR) {
      try {
        const recog = new SR();
        recog.lang = "ru-RU";
        recog.continuous = true;
        recog.interimResults = true;
        liveTranscriptRef.current = "";
        let finalText = "";
        recog.onresult = (e: any) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const t = e.results[i][0].transcript;
            if (e.results[i].isFinal) finalText += t + " ";
            else interim += t;
          }
          liveTranscriptRef.current = (finalText + interim).trim();
          // Mirror into the textarea live
          setTextNote((prev) => {
            // strip any previous live-transcript suffix
            const marker = "\n\n[…голосом] ";
            const idx = prev.indexOf(marker);
            const base = idx >= 0 ? prev.slice(0, idx) : prev;
            return liveTranscriptRef.current
              ? base + marker + liveTranscriptRef.current
              : base;
          });
        };
        recog.onerror = () => {};
        recog.onend = () => {
          // finalize: replace the live-transcript marker with a clean append
          if (liveTranscriptRef.current) {
            setTextNote((prev) => {
              const marker = "\n\n[…голосом] ";
              const idx = prev.indexOf(marker);
              const base = idx >= 0 ? prev.slice(0, idx).trim() : prev.trim();
              const tail = liveTranscriptRef.current.trim();
              return base ? `${base}\n\n${tail}` : tail;
            });
          }
        };
        recognitionRef.current = recog;
        recog.start();
      } catch {
        recognitionRef.current = null;
      }
    }

    try {
      // Reuse the module-level stream so the browser never re-prompts within a session.
      const tracksLive = _sharedStream?.getTracks().some((t) => t.readyState === "live");
      if (!_sharedStream || !tracksLive) {
        _sharedStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      const stream = _sharedStream;
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        setAudioBlob(blob);
        setIsRecording(false);
        const initData = getInitData();
        // Use server Whisper only as a fallback when the browser's live
        // SpeechRecognition produced nothing — avoids double transcription.
        if (initData && !liveTranscriptRef.current.trim()) {
          setIsTranscribing(true);
          const text = await transcribeBlob(blob);
          setIsTranscribing(false);
          if (text)
            setTextNote((prev) => (prev ? `${prev}\n\n${text}` : text));
        }
      };
      mr.start(1000);
      setIsRecording(true);
      setRecordingSecs(0);
      setAudioBlob(null);
    } catch (e: any) {
      if (e?.name === "NotAllowedError")
        setMicError("Нет доступа к микрофону. Разрешите в настройках браузера.");
      else setMicError("Не удалось открыть микрофон.");
    }
  };

  const stopRecording = () => {
    try {
      recognitionRef.current?.stop();
    } catch {}
    mediaRecorderRef.current?.stop();
  };

  const goToContact = () => {
    if (contactId) navigate(`/contact/${contactId}`, { replace: true });
    else navigate("/contacts", { replace: true });
  };

  const handleSave = async () => {
    if (!textNote.trim() && !audioBlob) return;
    setStep("processing");
    // Strip the live SpeechRecognition marker before saving
    const noteText = cleanVoiceMarker(textNote);
    if (!noteText) {
      setStep("done_no_ai");
      return;
    }
    const current = contactId
      ? allContacts(mockContacts).find((c) => c.id === contactId)
      : null;
    if (contactId) {
      const prev = current?.note ? `${current.note}\n\n` : "";
      updateStoredContact(contactId, { note: `${prev}${noteText}` });
    }
    try {
      const result = await analyzeNote(noteText, current?.aiSummary);
      if (contactId) {
        const dueDate = new Date(
          Date.now() + (result.followUpDays ?? 7) * 86400_000
        )
          .toISOString()
          .split("T")[0];
        // Merge new tags with existing ones (deduplicate)
        const existingTags = current?.user?.tags ?? [];
        const mergedTags = Array.from(new Set([...existingTags, ...(result.tags ?? [])]));
        updateStoredContact(contactId, {
          aiSummary: result.summary,
          followUpDate: dueDate,
          user: { ...(current?.user as any), tags: mergedTags },
        });
      }
      setAiResult(result);
      setStep("done");
      setTimeout(goToContact, 2500);
    } catch {
      setStep("done_no_ai");
    }
  };

  // ── Status screens ───────────────────────────────────────
  if (step === "done_no_ai") {
    setTimeout(goToContact, 2000);
    return (
      <StatusScreen
        icon={<Check className="w-10 h-10" style={{ color: "var(--abyss)" }} />}
        iconBg="var(--signal)"
        title="Заметка сохранена"
        subtitle="AI временно недоступен — заметка сохранена без обработки"
      />
    );
  }

  if (step === "processing") {
    return (
      <StatusScreen
        icon={
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <AISparkle size={40} />
          </motion.div>
        }
        iconBg="oklch(0.86 0.13 195 / 0.18)"
        iconBorder="1px solid var(--signal-dim)"
        title="AI обрабатывает заметку"
        subtitle="Создаю summary, извлекаю теги, определяю срок follow-up"
        footer={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--faint)",
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            обработка
          </div>
        }
      />
    );
  }

  if (step === "done" && aiResult) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          color: "var(--ivory)",
          padding: "0 22px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          position: "relative",
        }}
      >
        <Atmosphere intensity={0.5} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 360 }}>
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "var(--signal)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 22px",
              boxShadow: "0 12px 40px oklch(0.86 0.13 195 / 0.35)",
            }}
          >
            <Check className="w-10 h-10" style={{ color: "var(--abyss)" }} />
          </motion.div>
          <Hero size={28}>Заметка сохранена</Hero>
          <p
            className="font-serif it text-muted-w"
            style={{ fontSize: 15, marginTop: 8 }}
          >
            Follow-up через {aiResult.followUpDays} дн.
          </p>

          <div style={{ ...cardStyle, marginTop: 22, textAlign: "left" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <AISparkle size={11} />
              <span className="eyebrow" style={{ color: "var(--signal)" }}>
                AI · SUMMARY
              </span>
            </div>
            <p
              className="font-serif"
              style={{ fontSize: 15, lineHeight: 1.5, margin: 0 }}
            >
              {aiResult.summary}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              justifyContent: "center",
              marginTop: 18,
            }}
          >
            {aiResult.tags.map((tag) => (
              <span key={tag} className="ios-tag">
                {tag}
              </span>
            ))}
          </div>

          <p
            className="font-mono"
            style={{
              fontSize: 10,
              color: "var(--faint)",
              marginTop: 22,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            Открываю карточку контакта…
          </p>
        </div>
      </div>
    );
  }

  // ── Main input ─────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--ivory)",
        position: "relative",
        paddingBottom: 40,
      }}
    >
      <Atmosphere intensity={0.3} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Top bar */}
        <div
          style={{
            padding: "56px 18px 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <RoundBtn onClick={goToContact}>
            <svg width="10" height="14" viewBox="0 0 10 14">
              <path
                d="M8 1L2 7l6 6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </RoundBtn>
          <span
            className="font-mono"
            style={{
              fontSize: 11,
              color: "var(--muted-fg)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            ЗАПИСЬ{contact && ` · ${contact.user.name.split(" ")[0]}`}
          </span>
          <button
            onClick={goToContact}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted-fg)",
              fontSize: 13,
              fontFamily: "var(--sans)",
              cursor: "pointer",
            }}
          >
            Пропустить
          </button>
        </div>

        {/* Hero question */}
        <div style={{ textAlign: "center", padding: "24px 28px 0" }}>
          <Hero size={32}>
            Что сохранить
            <br />
            <span className="it text-muted-w">из встречи?</span>
          </Hero>
        </div>

        {/* Voice card */}
        <div style={{ padding: "32px 16px 0" }}>
          <div
            style={{
              ...cardStyle,
              padding: "24px 18px 26px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span className="eyebrow" style={{ alignSelf: "flex-start" }}>
              ГОЛОСОМ
            </span>
            <AnimatePresence mode="wait">
              {isTranscribing ? (
                <motion.div
                  key="transcribing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "20px 0",
                  }}
                >
                  <Loader2
                    className="w-7 h-7 animate-spin"
                    style={{ color: "var(--signal)", marginBottom: 12 }}
                  />
                  <p
                    className="font-serif it text-muted-w"
                    style={{ fontSize: 14 }}
                  >
                    Расшифровываю запись…
                  </p>
                </motion.div>
              ) : audioBlob ? (
                <motion.div
                  key="recorded"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginTop: 14,
                    width: "100%",
                    background: "var(--surface)",
                    border: "1px solid var(--line-soft)",
                    borderRadius: 14,
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: "oklch(0.86 0.13 195 / 0.18)",
                          border: "1px solid var(--signal-dim)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Volume2 className="w-4 h-4" style={{ color: "var(--signal)" }} />
                      </div>
                      <div>
                        <p style={{ fontFamily: "var(--sans)", fontSize: 14, margin: 0 }}>
                          Записано {fmt(recordingSecs)}
                        </p>
                        <p
                          className="font-mono"
                          style={{
                            fontSize: 10,
                            color: textNote.trim() ? "var(--signal-dim)" : "var(--faint)",
                            letterSpacing: "0.10em",
                            marginTop: 4,
                            textTransform: "uppercase",
                          }}
                        >
                          {textNote.trim()
                            ? "Текст расшифрован ↓"
                            : getInitData()
                            ? "Без распознавания"
                            : "Текст вручную"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setAudioBlob(null);
                        setRecordingSecs(0);
                      }}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "transparent",
                        border: "1px solid var(--line-soft)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <X className="w-3.5 h-3.5" style={{ color: "var(--muted-fg)" }} />
                    </button>
                  </div>
                  {textNote.trim() && (
                    <div
                      style={{
                        background: "var(--deep)",
                        border: "1px solid var(--line-soft)",
                        borderRadius: 10,
                        padding: "10px 12px",
                        fontFamily: "var(--sans)",
                        fontSize: 13.5,
                        lineHeight: 1.5,
                        color: "var(--warm)",
                        maxHeight: 140,
                        overflowY: "auto",
                      }}
                    >
                      {textNote}
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    marginTop: 14,
                  }}
                >
                  <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {/* sonar pings */}
                    {isRecording ? (
                      <>
                        <motion.div
                          style={{
                            position: "absolute",
                            width: 84,
                            height: 84,
                            borderRadius: "50%",
                            border: "1px solid var(--signal)",
                            pointerEvents: "none",
                          }}
                          animate={{ scale: [1, 1.5], opacity: [0.45, 0] }}
                          transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
                        />
                        <motion.div
                          style={{
                            position: "absolute",
                            width: 84,
                            height: 84,
                            borderRadius: "50%",
                            border: "1px solid var(--signal)",
                            pointerEvents: "none",
                          }}
                          animate={{ scale: [1, 1.5], opacity: [0.45, 0] }}
                          transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut", delay: 1.2 }}
                        />
                      </>
                    ) : (
                      <>
                        <motion.div
                          style={{
                            position: "absolute",
                            width: 84,
                            height: 84,
                            borderRadius: "50%",
                            border: "1px solid var(--signal-dim)",
                            pointerEvents: "none",
                          }}
                          animate={{ scale: [1, 1.4], opacity: [0.30, 0] }}
                          transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
                        />
                        <motion.div
                          style={{
                            position: "absolute",
                            width: 84,
                            height: 84,
                            borderRadius: "50%",
                            border: "1px solid var(--signal-dim)",
                            pointerEvents: "none",
                          }}
                          animate={{ scale: [1, 1.4], opacity: [0.30, 0] }}
                          transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut", delay: 1.4 }}
                        />
                      </>
                    )}
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      style={{
                        position: "relative",
                        zIndex: 2,
                        width: 84,
                        height: 84,
                        borderRadius: "50%",
                        background: isRecording
                          ? "var(--danger)"
                          : "var(--signal)",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: isRecording
                          ? "0 0 28px oklch(0.68 0.19 25 / 0.55)"
                          : "0 0 28px oklch(0.86 0.13 195 / 0.55)",
                      }}
                    >
                      {isRecording ? (
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 4,
                            background: "var(--ivory)",
                          }}
                        />
                      ) : (
                        <Mic
                          className="w-9 h-9"
                          style={{ color: "var(--abyss)" }}
                        />
                      )}
                    </button>
                  </div>
                  <div
                    className="font-mono"
                    style={{
                      marginTop: 16,
                      fontSize: 12,
                      color: isRecording ? "var(--signal)" : "var(--muted-fg)",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                    }}
                  >
                    {isRecording
                      ? `REC · ${fmt(recordingSecs)}`
                      : getInitData()
                      ? "Tap · авто-расшифровка"
                      : "Tap · запись"}
                  </div>
                  {micError && (
                    <p
                      className="font-serif it"
                      style={{
                        fontSize: 13,
                        color: "var(--amber)",
                        marginTop: 12,
                        textAlign: "center",
                      }}
                    >
                      {micError}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "20px 22px 0",
          }}
        >
          <div style={{ flex: 1, height: 1, background: "var(--line-soft)" }} />
          <span
            className="font-mono"
            style={{
              fontSize: 10,
              color: "var(--faint)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            ИЛИ
          </span>
          <div style={{ flex: 1, height: 1, background: "var(--line-soft)" }} />
        </div>

        {/* Text */}
        <div style={{ padding: "16px 16px 0" }}>
          <div style={cardStyle}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              ТЕКСТОМ
            </div>
            <textarea
              value={textNote}
              onChange={(e) => setTextNote(e.target.value)}
              placeholder="О чём говорили, что договорились…"
              rows={5}
              style={{
                width: "100%",
                background: "var(--bg)",
                borderRadius: 12,
                padding: "14px 16px",
                minHeight: 100,
                fontSize: 15,
                color: "var(--ivory)",
                lineHeight: 1.5,
                border: "1px solid var(--line-soft)",
                fontFamily: textNote ? "var(--sans)" : "var(--serif)",
                fontStyle: textNote ? "normal" : "italic",
                resize: "none",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: "24px 22px 0" }}>
          <SignalBtn
            h={50}
            onClick={handleSave}
            disabled={(!textNote.trim() && !audioBlob) || isTranscribing}
          >
            <AISparkle size={14} color="var(--abyss)" />
            Создать AI-сводку
          </SignalBtn>
        </div>
      </div>
    </div>
  );
}

function StatusScreen({
  icon,
  iconBg,
  iconBorder,
  title,
  subtitle,
  footer,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconBorder?: string;
  title: string;
  subtitle: string;
  footer?: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--ivory)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 32px",
        textAlign: "center",
        position: "relative",
      }}
    >
      <Atmosphere intensity={0.45} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: iconBg,
            border: iconBorder,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 22px",
          }}
        >
          {icon}
        </div>
        <Hero size={26}>{title}</Hero>
        <p
          className="font-serif it text-muted-w"
          style={{
            fontSize: 15,
            marginTop: 10,
            lineHeight: 1.55,
            maxWidth: 280,
            marginInline: "auto",
          }}
        >
          {subtitle}
        </p>
        {footer && <div style={{ marginTop: 24 }}>{footer}</div>}
      </div>
    </div>
  );
}
