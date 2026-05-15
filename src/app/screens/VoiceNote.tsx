import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate, Link } from "react-router";
import { ArrowLeft, Search, Save, Check, Loader2, AlertCircle, UserPlus, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { mockContacts } from "../utils/mockData";
import { allContacts, loadStoredContacts, saveStoredContacts } from "../utils/contactStore";

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
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!voiceId) {
      setError("Не указан идентификатор записи");
      setLoading(false);
      return;
    }
    const initData = getInitData();
    if (!initData) {
      setError("Открой эту страницу из Telegram, чтобы получить расшифровку");
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
        c.user.role.toLowerCase().includes(q) ||
        c.user.company?.toLowerCase().includes(q)
    );
  }, [contacts, query]);

  const saveToContact = (contactId: string) => {
    if (!text.trim() || savingId) return;
    setSavingId(contactId);
    try {
      const stored = loadStoredContacts();
      const existingIndex = stored.findIndex((c) => c.id === contactId);

      if (existingIndex >= 0) {
        // Append to existing stored contact's note
        const c = stored[existingIndex];
        const prev = c.note ? `${c.note}\n\n` : "";
        stored[existingIndex] = { ...c, note: `${prev}🎙️ ${text.trim()}` };
        saveStoredContacts(stored);
      } else {
        // It's a mock contact — clone into stored with the note
        const mock = contacts.find((c) => c.id === contactId);
        if (mock) {
          saveStoredContacts([{ ...mock, note: `🎙️ ${text.trim()}` }, ...stored]);
        }
      }
      navigate(`/contact/${contactId}`, { replace: true });
    } catch (e) {
      console.error(e);
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <Loader2 className="w-10 h-10 animate-spin mb-3" style={{ color: "#007AFF" }} />
        <p style={{ color: "#8E8E93", fontSize: "14px" }}>Загружаю расшифровку…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: "rgba(255,59,48,0.12)" }}>
          <AlertCircle className="w-8 h-8" style={{ color: "#FF3B30" }} />
        </div>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0a1628", marginBottom: 8 }}>Не получилось</h2>
        <p style={{ fontSize: "14px", color: "#8E8E93", maxWidth: 320, marginBottom: 24 }}>{error}</p>
        <button
          onClick={() => navigate("/", { replace: true })}
          className="rounded-[14px] text-white font-semibold px-6"
          style={{ background: "#007AFF", height: 48, fontSize: 16 }}
        >
          На главную
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-4">
        <button onClick={() => navigate(-1)} style={{ color: "#007AFF" }}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0a1628", letterSpacing: "-0.3px" }}>
            Голосовая заметка
          </h1>
          <p style={{ fontSize: "13px", color: "#8E8E93" }}>
            Выберите контакт, к которому сохранить
          </p>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {/* Transcription */}
        <motion.div
          className="glass-card p-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4" style={{ color: "#007AFF" }} />
            <p style={{ fontSize: "12px", fontWeight: 600, color: "#8E8E93", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Расшифровка (можно отредактировать)
            </p>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 2000))}
            rows={6}
            className="w-full px-4 py-3 text-sm resize-none"
            placeholder="Расшифрованный текст появится здесь…"
          />
          <p style={{ fontSize: "12px", color: "#8E8E93", marginTop: "6px" }}>{text.length}/2000</p>
        </motion.div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8E8E93" }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск контакта…"
            className="w-full pl-9 pr-4 py-2.5 text-sm"
            style={{ borderRadius: "12px" }}
          />
        </div>

        {/* Contacts */}
        <div className="space-y-2">
          {filteredContacts.length === 0 ? (
            <div className="glass-card p-6 text-center">
              <UserPlus className="w-10 h-10 mx-auto mb-3" style={{ color: "#8E8E93" }} />
              <p style={{ fontSize: "14px", color: "#0a1628", fontWeight: 600 }}>Нет контактов</p>
              <p style={{ fontSize: "13px", color: "#8E8E93", marginTop: "4px", marginBottom: "12px" }}>
                Сначала отсканируйте QR или добавьте контакт вручную
              </p>
              <Link
                to="/scan"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[14px] text-white text-sm font-semibold"
                style={{ background: "#007AFF" }}
              >
                Сканировать QR
              </Link>
            </div>
          ) : (
            filteredContacts.slice(0, 30).map((c, i) => (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * Math.min(i, 10) }}
                onClick={() => saveToContact(c.id)}
                disabled={!!savingId || !text.trim()}
                className="w-full glass-card flex items-center gap-3 p-3 text-left transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {c.user.photo ? (
                  <img src={c.user.photo} alt={c.user.name} className="w-10 h-10 rounded-full object-cover avatar-ocean flex-shrink-0" />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 avatar-ocean"
                    style={{ background: "linear-gradient(135deg, #5AC8FA, #007AFF)", fontSize: "15px" }}
                  >
                    {c.user.name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p style={{ fontWeight: 600, fontSize: "14px", color: "#0a1628" }}>{c.user.name}</p>
                  <p style={{ fontSize: "12px", color: "#8E8E93" }} className="truncate">
                    {c.user.role}{c.user.company && ` · ${c.user.company}`}
                  </p>
                </div>
                {savingId === c.id ? (
                  <Check className="w-5 h-5 flex-shrink-0" style={{ color: "#34C759" }} />
                ) : (
                  <Save className="w-4 h-4 flex-shrink-0" style={{ color: "#007AFF" }} />
                )}
              </motion.button>
            ))
          )}
        </div>

        {!text.trim() && (
          <p style={{ fontSize: "12px", color: "#FF3B30", textAlign: "center", marginTop: "8px" }}>
            Расшифровка пустая — добавьте текст, чтобы сохранить
          </p>
        )}
      </div>
    </div>
  );
}
