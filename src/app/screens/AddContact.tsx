import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, Check, UserCircle, User as UserIcon } from "lucide-react";
import { motion } from "motion/react";
import { addStoredContact } from "../utils/contactStore";
import type { Connection, User } from "../utils/mockData";

const PRESET_EVENTS = [
  "МАС 2026", "Партнёркин", "WebMoney Forum", "AWA Bangkok", "Affiliate World Dubai",
];

const PRESET_TAGS = [
  "iGaming", "Нутра", "Финансы", "Крипто", "E-commerce",
  "Арбитраж", "Партнёрки", "Платёжки", "Media Buyer", "Affiliate Manager",
  "SaaS", "AI", "Legal", "Аккаунты", "Агентство",
];

/** Decode the base64 profile payload from the QR URL `d` param */
function decodeProfilePayload(d: string): Partial<User> | null {
  try {
    const json = decodeURIComponent(escape(atob(d)));
    const p = JSON.parse(json);
    return {
      name:     p.n  || "",
      role:     p.r  || "",
      company:  p.c  || "",
      tags:     Array.isArray(p.t) ? p.t : [],
      photo:    p.p  || undefined,
      username: p.un || undefined,
      bio:      p.b  || undefined,
      links:    p.un ? [{ type: "telegram", url: `https://t.me/${p.un}` }] : [],
    };
  } catch {
    return null;
  }
}

export function AddContact() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const username    = (searchParams.get("username") || "").replace(/^@/, "").slice(0, 32);
  const dParam      = searchParams.get("d") || "";
  const noteParam   = (searchParams.get("note") || "").slice(0, 500);
  const eventParam  = (searchParams.get("event") || "").slice(0, 80);

  // Decode full profile from QR payload (only present for W52-registered users)
  const decodedProfile = useMemo(() => dParam ? decodeProfilePayload(dParam) : null, [dParam]);

  const isManual = !decodedProfile && !username;

  const PRESET_EVENTS_SET = new Set(PRESET_EVENTS);
  const [event, setEvent]             = useState(eventParam && PRESET_EVENTS_SET.has(eventParam) ? eventParam : (eventParam ? "Другое" : ""));
  const [eventCustom, setEventCustom] = useState(eventParam && !PRESET_EVENTS_SET.has(eventParam) ? eventParam : "");
  const [note, setNote]               = useState(noteParam);
  const [manualName, setManualName]   = useState("");
  const [manualUsername, setManualUsername] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>(
    decodedProfile?.tags ?? []
  );
  const toggleTag = (tag: string) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const effectiveEvent = event === "Другое" ? eventCustom : event;

  const handleSave = () => {
    const contactId = `c-${Date.now()}`;

    const cleanManualUsername = manualUsername.replace(/^@/, "").slice(0, 32);

    const user: User = decodedProfile ? {
      id:       `u-${Date.now()}`,
      name:     decodedProfile.name    || username || "Новый контакт",
      username: decodedProfile.username || username || undefined,
      role:     decodedProfile.role    || "",
      company:  decodedProfile.company || "",
      photo:    decodedProfile.photo   || undefined,
      tags:     selectedTags.length ? selectedTags : (decodedProfile.tags || []),
      bio:      decodedProfile.bio     || undefined,
      links:    decodedProfile.links   || (username ? [{ type: "telegram", url: `https://t.me/${username}` }] : []),
    } : isManual ? {
      id:       `u-${Date.now()}`,
      name:     manualName.trim() || cleanManualUsername || "Новый контакт",
      username: cleanManualUsername || undefined,
      role:     "",
      company:  "",
      tags:     selectedTags,
      links:    cleanManualUsername ? [{ type: "telegram", url: `https://t.me/${cleanManualUsername}` }] : [],
    } : {
      id:       `u-${Date.now()}`,
      name:     username || "Новый контакт",
      username: username || undefined,
      role:     "",
      company:  "",
      tags:     [],
      links:    username ? [{ type: "telegram", url: `https://t.me/${username}` }] : [],
    };

    const newContact: Connection = {
      id: contactId,
      user,
      metAt:        new Date().toISOString(),
      event:        effectiveEvent || undefined,
      note:         note.trim() || undefined,
      followUpSent: false,
    };

    addStoredContact(newContact);

    // If a note was already provided (e.g., from bot /add), go straight to the contact card.
    // Otherwise, prompt for a voice/text note as before.
    if (note.trim()) {
      navigate(`/contact/${contactId}`, { replace: true });
    } else {
      navigate(`/add-note?contact=${contactId}`, { replace: true });
    }
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-5">
        <button onClick={() => navigate(-1)} style={{ color: "#007AFF" }}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 style={{ fontSize: "26px", fontWeight: 700, color: "#0a1628", letterSpacing: "-0.4px" }}>
          Новый контакт
        </h1>
      </div>

      <div className="px-4 space-y-4">

        {/* Manual entry form — shown when opening /add-contact directly (no QR data) */}
        {isManual && (
          <motion.div
            className="glass-card p-5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #5AC8FA, #007AFF)" }}
              >
                <UserIcon className="w-6 h-6 text-white" />
              </div>
              <p style={{ fontWeight: 600, fontSize: "16px", color: "#0a1628" }}>Новый контакт</p>
            </div>
            <div className="space-y-3">
              <div>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#8E8E93", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                  Имя *
                </p>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value.slice(0, 80))}
                  placeholder="Имя Фамилия"
                  className="w-full px-4 py-3 text-sm"
                  style={{ borderRadius: "12px" }}
                />
              </div>
              <div>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#8E8E93", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                  Telegram (необязательно)
                </p>
                <input
                  type="text"
                  value={manualUsername}
                  onChange={(e) => setManualUsername(e.target.value.slice(0, 33))}
                  placeholder="@username"
                  className="w-full px-4 py-3 text-sm"
                  style={{ borderRadius: "12px" }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Profile card — decoded from W52 QR */}
        {decodedProfile ? (
          <motion.div
            className="glass-card p-5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div className="flex items-center gap-4">
              {decodedProfile.photo ? (
                <img
                  src={decodedProfile.photo}
                  alt={decodedProfile.name}
                  className="w-16 h-16 rounded-full object-cover flex-shrink-0 avatar-ocean"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 avatar-ocean"
                  style={{ background: "linear-gradient(135deg, #5AC8FA, #007AFF)" }}
                >
                  {decodedProfile.name ? decodedProfile.name[0].toUpperCase() : <UserCircle className="w-8 h-8" />}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p style={{ fontWeight: 700, fontSize: "18px", color: "#0a1628" }}>
                  {decodedProfile.name || username}
                </p>
                {(decodedProfile.role || decodedProfile.company) && (
                  <p style={{ fontSize: "14px", color: "#8E8E93", marginTop: "2px" }}>
                    {[decodedProfile.role, decodedProfile.company].filter(Boolean).join(" · ")}
                  </p>
                )}
                {(decodedProfile.username || username) && (
                  <p style={{ fontSize: "13px", color: "#007AFF", marginTop: "2px" }}>
                    @{decodedProfile.username || username}
                  </p>
                )}
              </div>
            </div>

            {decodedProfile.bio && (
              <p className="mt-3 text-sm leading-relaxed p-3 rounded-xl"
                style={{ background: "rgba(0,122,255,0.05)", color: "#3c3c43" }}>
                {decodedProfile.bio}
              </p>
            )}

            {decodedProfile.tags && decodedProfile.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {decodedProfile.tags.map((tag, i) => (
                  <span key={i} className="ios-tag">{tag}</span>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          /* Username-only: just show who we're adding */
          username ? (
            <motion.div
              className="glass-card p-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 avatar-ocean"
                  style={{ background: "linear-gradient(135deg, #5AC8FA, #007AFF)" }}
                >
                  {username[0]?.toUpperCase()}
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: "16px", color: "#0a1628" }}>{username}</p>
                  <p style={{ fontSize: "13px", color: "#007AFF" }}>@{username}</p>
                </div>
              </div>
            </motion.div>
          ) : null
        )}

        {/* Event picker */}
        <motion.div
          className="glass-card p-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#8E8E93", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Где познакомились?
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {PRESET_EVENTS.map((ev) => (
              <button
                key={ev}
                onClick={() => setEvent((cur) => cur === ev ? "" : ev)}
                className="px-3 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95"
                style={event === ev
                  ? { background: "#007AFF", color: "#fff", boxShadow: "0 2px 8px rgba(0,122,255,0.3)" }
                  : { background: "rgba(0,0,0,0.06)", color: "#3c3c43" }}
              >
                {event === ev && <Check className="w-3.5 h-3.5 inline mr-1" />}
                {ev}
              </button>
            ))}
            <button
              onClick={() => setEvent((cur) => cur === "Другое" ? "" : "Другое")}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95"
              style={event === "Другое"
                ? { background: "#8E8E93", color: "#fff" }
                : { background: "rgba(0,0,0,0.06)", color: "#3c3c43" }}
            >
              Другое
            </button>
          </div>
          {event === "Другое" && (
            <motion.input
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              value={eventCustom}
              onChange={(e) => setEventCustom(e.target.value)}
              placeholder="Название конференции или события"
              className="w-full px-4 py-3 text-sm mt-3"
            />
          )}
        </motion.div>

        {/* Tag picker */}
        <motion.div
          className="glass-card p-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.11 }}
        >
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#8E8E93", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Теги (сфера деятельности)
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {PRESET_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className="px-3 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95"
                style={selectedTags.includes(tag)
                  ? { background: "#007AFF", color: "#fff", boxShadow: "0 2px 8px rgba(0,122,255,0.3)" }
                  : { background: "rgba(0,0,0,0.06)", color: "#3c3c43" }}
              >
                {selectedTags.includes(tag) && <Check className="w-3.5 h-3.5 inline mr-1" />}
                {tag}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Note (pre-fillable from bot's /add command) */}
        <motion.div
          className="glass-card p-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#8E8E93", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Заметка о встрече
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            placeholder="О чём говорили, что договорились…"
            rows={3}
            className="w-full px-4 py-3 text-sm resize-none mt-3"
          />
          <p style={{ fontSize: "12px", color: "#8E8E93", marginTop: "6px" }}>
            {note.length}/500
          </p>
        </motion.div>

        <motion.p
          className="text-center px-2"
          style={{ fontSize: "13px", color: "#8E8E93" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          {note.trim()
            ? "Заметка сохранится с контактом"
            : "После сохранения вы сможете записать голосовую заметку"}
        </motion.p>
      </div>

      {/* Fixed CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))]"
        style={{ background: "rgba(238,246,255,0.92)", backdropFilter: "blur(20px)", borderTop: "0.5px solid rgba(0,0,0,0.06)" }}
      >
        <button
          onClick={handleSave}
          disabled={isManual && !manualName.trim() && !manualUsername.trim()}
          className="w-full flex items-center justify-center gap-2 rounded-[14px] text-white font-semibold transition-all active:scale-97 disabled:opacity-50"
          style={{
            background: "linear-gradient(180deg, #3AA3FF 0%, #007AFF 50%, #0063D1 100%)",
            height: "50px", fontSize: "17px",
            boxShadow: "0 4px 20px rgba(0,122,255,0.45), inset 0 1px 0 rgba(255,255,255,0.28)",
          }}
        >
          Сохранить контакт
        </button>
      </div>
    </div>
  );
}
