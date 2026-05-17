/**
 * /voice-note?id=X — экран голосовой заметки из бота.
 * Показывает расшифровку, позволяет сохранить к существующему контакту
 * или создать новый (переход на AddContact с предзаполненной заметкой).
 */
import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Search, Check, Loader2, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { mockContacts } from "../utils/mockData";
import { allContacts, loadStoredContacts, saveStoredContacts } from "../utils/contactStore";
import {
  Atmosphere,
  Avatar,
  RoundBtn,
  IvoryBtn,
  AISparkle,
  Hero,
  cardStyle,
} from "../components/brand/Brand";

function getInitData(): string | null {
  try {
    const tg = (window as any).Telegram?.WebApp;
    return typeof tg?.initData === "string" && tg.initData ? tg.initData : null;
  } catch {
    return null;
  }
}

export function VoiceNote() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const voiceId = searchParams.get("id") || "";

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    if (!voiceId) {
      setError("Не указан идентификатор записи");
      setLoading(false);
      return;
    }
    const initData = getInitData();
    if (!initData) {
      setError("Открой эту страницу из Telegram");
      setLoading(false);
      return;
    }
    fetch(`/api/voice/${encodeURIComponent(voiceId)}`, {
      headers: { "X-Telegram-Init-Data": initData },
    })
      .then(async (r) => {
        if (!r.ok) {
          if (r.status === 404) throw new Error("Запись не найдена или истекла (хранится 24 часа)");
          throw new Error(`Ошибка ${r.status}`);
        }
        const data = await r.json();
        setText(typeof data.text === "string" ? data.text : "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [voiceId]);

  const contacts = useMemo(() => allContacts(mockContacts), []);

  const filteredContacts = useMemo(() => {
    if (!query.trim()) return contacts;
    const q = query.toLowerCase();
    return contacts.filter(
      (c) =>
        c.user.name.toLowerCase().includes(q) ||
        c.user.username?.toLowerCase().includes(q) ||
        c.user.role?.toLowerCase().includes(q) ||
        c.user.company?.toLowerCase().includes(q)
    );
  }, [contacts, query]);

  const saveToContact = (contactId: string) => {
    if (!text.trim() || savedId) return;
    try {
      const stored = loadStoredContacts();
      const idx = stored.findIndex((c) => c.id === contactId);
      if (idx >= 0) {
        const c = stored[idx];
        const prev = c.note ? `${c.note}\n\n` : "";
        stored[idx] = { ...c, note: `${prev}🎙️ ${text.trim()}` };
        saveStoredContacts(stored);
      } else {
        const mock = contacts.find((c) => c.id === contactId);
        if (mock) saveStoredContacts([{ ...mock, note: `🎙️ ${text.trim()}` }, ...stored]);
      }
      setSavedId(contactId);
      setTimeout(() => navigate(`/contact/${contactId}`, { replace: true }), 600);
    } catch (e) {
      console.error(e);
    }
  };

  const handleNewContact = () => {
    // Pass note via sessionStorage so AddContact can pick it up
    try { sessionStorage.setItem("pendingVoiceNote", text.trim()); } catch {}
    navigate("/add-contact?from=voice");
  };

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--bg)", color: "var(--ivory)",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", position: "relative",
      }}>
        <Atmosphere intensity={0.25} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--signal)" }} />
          <p className="font-mono" style={{ fontSize: 11, color: "var(--muted-fg)", letterSpacing: "0.18em" }}>
            ЗАГРУЖАЮ…
          </p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--bg)", color: "var(--ivory)",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "0 24px", gap: 16,
        textAlign: "center", position: "relative",
      }}>
        <Atmosphere intensity={0.25} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <Hero size={22}>Не получилось</Hero>
          <p style={{ fontSize: 14, color: "var(--muted-fg)", lineHeight: 1.5, maxWidth: 280, fontFamily: "var(--sans)" }}>
            {error}
          </p>
          <IvoryBtn h={48} onClick={() => navigate("/", { replace: true })}>
            На главную
          </IvoryBtn>
        </div>
      </div>
    );
  }

  // ── Main ─────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)", color: "var(--ivory)",
      position: "relative", paddingBottom: 48,
    }}>
      <Atmosphere intensity={0.25} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Top bar */}
        <div style={{ padding: "56px 18px 0", display: "flex", alignItems: "center", gap: 12 }}>
          <RoundBtn onClick={() => navigate(-1)}>
            <svg width="10" height="14" viewBox="0 0 10 14">
              <path d="M8 1L2 7l6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </RoundBtn>
          <div>
            <Hero size={22}>Голосовая заметка</Hero>
            <p style={{ fontSize: 12, color: "var(--muted-fg)", fontFamily: "var(--sans)", marginTop: 2 }}>
              Выберите контакт или создайте новый
            </p>
          </div>
        </div>

        <div style={{ padding: "20px 16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Transcription card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ ...cardStyle, padding: 18 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <AISparkle size={12} />
              <span className="eyebrow" style={{ color: "var(--signal)" }}>
                РАСШИФРОВКА (МОЖНО ОТРЕДАКТИРОВАТЬ)
              </span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 2000))}
              rows={5}
              style={{
                width: "100%",
                background: "var(--bg)",
                border: "1px solid var(--line-soft)",
                borderRadius: 12,
                padding: "12px 14px",
                color: "var(--ivory)",
                fontFamily: "var(--sans)",
                fontSize: 14.5,
                lineHeight: 1.55,
                resize: "none",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <p className="font-mono" style={{ fontSize: 10, color: "var(--faint)", marginTop: 6, letterSpacing: "0.08em" }}>
              {text.length}/2000
            </p>
          </motion.div>

          {/* New contact button */}
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            onClick={handleNewContact}
            disabled={!text.trim()}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              height: 48, borderRadius: 14,
              background: "transparent",
              border: "1px solid var(--signal-dim)",
              color: "var(--signal)",
              fontFamily: "var(--sans)", fontWeight: 600, fontSize: 14,
              cursor: text.trim() ? "pointer" : "default",
              opacity: text.trim() ? 1 : 0.4,
            }}
          >
            <UserPlus className="w-4 h-4" />
            Создать новый контакт
          </motion.button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: "var(--line-soft)" }} />
            <span className="font-mono" style={{ fontSize: 10, color: "var(--faint)", letterSpacing: "0.18em" }}>
              ИЛИ К СУЩЕСТВУЮЩЕМУ
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--line-soft)" }} />
          </div>

          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search className="w-4 h-4" style={{
              position: "absolute", left: 13, top: "50%",
              transform: "translateY(-50%)", color: "var(--muted-fg)", pointerEvents: "none",
            }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск контакта…"
              style={{
                width: "100%",
                padding: "11px 14px 11px 38px",
                background: "var(--deep)",
                border: "1px solid var(--line-soft)",
                borderRadius: 12,
                color: "var(--ivory)",
                fontFamily: "var(--sans)",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Contacts list */}
          <AnimatePresence mode="popLayout">
            {filteredContacts.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ ...cardStyle, padding: 24, textAlign: "center" }}
              >
                <p style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--muted-fg)" }}>
                  Контакты не найдены
                </p>
              </motion.div>
            ) : (
              filteredContacts.slice(0, 30).map((c, i) => (
                <motion.button
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * Math.min(i, 8) }}
                  onClick={() => saveToContact(c.id)}
                  disabled={!!savedId || !text.trim()}
                  style={{
                    width: "100%",
                    ...cardStyle,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    textAlign: "left",
                    cursor: savedId || !text.trim() ? "default" : "pointer",
                    opacity: savedId && savedId !== c.id ? 0.4 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  <Avatar name={c.user.name} photo={c.user.photo} username={c.user.username} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "var(--sans)", fontWeight: 600, fontSize: 14, color: "var(--ivory)", margin: 0 }}>
                      {c.user.name}
                    </p>
                    {(c.user.role || c.user.company) && (
                      <p style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--muted-fg)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {[c.user.role, c.user.company].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  {savedId === c.id ? (
                    <Check className="w-5 h-5 flex-shrink-0" style={{ color: "var(--signal)" }} />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: "var(--signal-dim)" }}>
                      <path d="M2 14V11.5L10.5 3l2.5 2.5L4.5 14H2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                      <path d="M8.5 5l2.5 2.5" stroke="currentColor" strokeWidth="1.4"/>
                    </svg>
                  )}
                </motion.button>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
