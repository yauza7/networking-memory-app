/**
 * W·52 — Новый контакт (AddContact)
 * Moody. Поддерживает: ручной ввод, QR с decoded profile, и username-only.
 */
import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion } from "motion/react";
import { addStoredContact } from "../utils/contactStore";
import { fetchPublicProfile } from "../utils/profileApi";
import type { Connection, User } from "../utils/mockData";
import {
  Atmosphere,
  Avatar,
  Hero,
  RoundBtn,
  IvoryBtn,
  SectionLabel,
  cardStyle,
} from "../components/brand/Brand";

const PRESET_EVENTS = [
  "MAC'26", "GGate Conf'26", "BROCONF-7", "AffHub'26", "Telegram",
];

const TAG_GROUPS = [
  {
    label: "Команда",
    tags: ["Buying", "Платёжки", "Разработка", "Партнёрская сеть", "Прилы", "Аккаунты", "Трекеры", "HR", "PR", "Дизайн", "Конференции"],
  },
  {
    label: "Трафик",
    tags: ["FB", "UAC", "PPC", "SEO", "ASO", "TikTok Ads", "Influence", "Схемы", "Email", "SMS", "УБТ"],
  },
  {
    label: "Вертикали",
    tags: ["Нутра", "Gambling", "Betting", "Adult", "Финансы", "Crypto"],
  },
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "var(--deep)",
  border: "1px solid var(--line-soft)",
  borderRadius: 12,
  color: "var(--ivory)",
  fontFamily: "var(--sans)",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

export function AddContact() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const username    = (searchParams.get("username") || "").replace(/^@/, "").slice(0, 32);
  const dParam      = searchParams.get("d") || "";
  const eventParam  = (searchParams.get("event") || "").slice(0, 80);
  const fromVoice   = searchParams.get("from") === "voice";

  // Pending voice note passed via sessionStorage from VoiceNote screen
  const pendingVoiceNote = useMemo(() => {
    if (!fromVoice) return "";
    try { return sessionStorage.getItem("pendingVoiceNote") || ""; } catch { return ""; }
  }, [fromVoice]);

  const decodedProfile = useMemo(() => dParam ? decodeProfilePayload(dParam) : null, [dParam]);

  const PRESET_EVENTS_SET = new Set(PRESET_EVENTS);
  const [event, setEvent]             = useState(eventParam && PRESET_EVENTS_SET.has(eventParam) ? eventParam : (eventParam ? "Другое" : ""));
  const [eventCustom, setEventCustom] = useState(eventParam && !PRESET_EVENTS_SET.has(eventParam) ? eventParam : "");

  const [manualName, setManualName]         = useState("");
  const [manualUsername, setManualUsername] = useState(username);
  const [manualCompany, setManualCompany]   = useState("");
  const [manualWebsite, setManualWebsite]   = useState("");

  // Server-fetched profile: used when no `d=` param OR when decode produced no name.
  const [serverProfile, setServerProfile] = useState<Partial<User> | null>(null);

  useEffect(() => {
    // Fetch from server if: no `d=` param, OR `d=` decoded but has no name (encoding issue)
    const needsServerFetch = username && (!dParam || !decodedProfile?.name);
    if (!needsServerFetch) return;
    let cancelled = false;
    fetchPublicProfile(username).then((p) => {
      if (cancelled || !p) return;
      setServerProfile(p);
      // Pre-fill manual fields so the user sees the real name/company right away.
      if (p.name)    setManualName(p.name);
      if (p.company) setManualCompany(p.company);
    });
    return () => { cancelled = true; };
  }, [username, dParam, decodedProfile?.name]);

  const [selectedTags, setSelectedTags] = useState<string[]>(
    decodedProfile?.tags ?? []
  );
  const toggleTag = (tag: string) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const effectiveEvent = event === "Другое" ? eventCustom : event;

  // A profile is "resolved" either from the QR `d=` param or from a server fetch.
  const resolvedProfile = decodedProfile ?? (serverProfile?.name ? serverProfile : null);
  // Show manual form when there's no resolved profile with a name.
  const showManualForm = !resolvedProfile?.name;

  const canSave = resolvedProfile?.name
    ? true
    : !!manualName.trim() && !!manualUsername.trim();

  const handleSave = () => {
    const contactId = `c-${Date.now()}`;
    const cleanManualUsername = manualUsername.replace(/^@/, "").slice(0, 32);

    const links: { type: string; url: string }[] = [];
    if (resolvedProfile?.links) links.push(...resolvedProfile.links);
    else if (cleanManualUsername) links.push({ type: "telegram", url: `https://t.me/${cleanManualUsername}` });
    else if (username) links.push({ type: "telegram", url: `https://t.me/${username}` });
    if (manualWebsite.trim()) {
      const url = manualWebsite.trim().startsWith("http")
        ? manualWebsite.trim()
        : `https://${manualWebsite.trim()}`;
      links.push({ type: "website", url });
    }

    const user: User = resolvedProfile ? {
      id:         `u-${Date.now()}`,
      name:       resolvedProfile.name     || manualName.trim() || username || "Новый контакт",
      username:   resolvedProfile.username || username || undefined,
      role:       resolvedProfile.role     || "",
      company:    resolvedProfile.company  || "",
      companyUrl: (resolvedProfile as any).companyUrl || undefined,
      photo:      resolvedProfile.photo    || undefined,
      tags:       selectedTags.length ? selectedTags : (resolvedProfile.tags || []),
      bio:        resolvedProfile.bio      || undefined,
      links,
    } : {
      id:         `u-${Date.now()}`,
      name:       manualName.trim() || "Новый контакт",
      username:   cleanManualUsername || undefined,
      role:       "",
      company:    manualCompany.trim() || "",
      companyUrl: manualWebsite.trim() || undefined,
      tags:       selectedTags,
      links,
    };

    const newContact: Connection = {
      id: contactId,
      user,
      metAt:        new Date().toISOString(),
      event:        effectiveEvent || undefined,
      followUpSent: false,
      note:         pendingVoiceNote ? `🎙️ ${pendingVoiceNote}` : undefined,
    };

    addStoredContact(newContact);
    // Clean up the pending voice note
    try { if (pendingVoiceNote) sessionStorage.removeItem("pendingVoiceNote"); } catch {}
    // If came from voice → go straight to contact card (note already saved)
    if (fromVoice && pendingVoiceNote) {
      navigate(`/contact/${contactId}`, { replace: true });
    } else {
      navigate(`/add-note?contact=${contactId}`, { replace: true });
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--ivory)",
        position: "relative",
        paddingBottom: 120,
      }}
    >
      <Atmosphere intensity={0.3} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Top */}
        <div style={{ padding: "56px 18px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <RoundBtn onClick={() => navigate(-1)}>
            <svg width="10" height="14" viewBox="0 0 10 14">
              <path d="M8 1L2 7l6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </RoundBtn>
        </div>

        <div style={{ padding: "16px 22px 0" }}>
          <Hero size={32}>Новый контакт</Hero>
        </div>

        {/* Profile preview (from Echo QR `d=` param or server fetch for TG QR) */}
        {resolvedProfile && (
          <div style={{ padding: "22px 16px 0" }}>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ ...cardStyle, padding: 18 }}
            >
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <Avatar
                  name={resolvedProfile.name || username || "?"}
                  photo={resolvedProfile.photo}
                  username={resolvedProfile.username || username}
                  size={56}
                  ring
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Hero size={20}>{resolvedProfile.name || username}</Hero>
                  {(resolvedProfile.role || resolvedProfile.company) && (
                    <div className="text-muted-w" style={{ fontSize: 13, marginTop: 2, fontFamily: "var(--sans)" }}>
                      {[resolvedProfile.role, resolvedProfile.company].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  {(resolvedProfile.username || username) && (
                    <div className="font-mono" style={{ fontSize: 11, color: "var(--signal-dim)", marginTop: 3, letterSpacing: "0.04em" }}>
                      @{resolvedProfile.username || username}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Manual fields (also shown for Telegram-only scans so the user can enter the real name) */}
        {showManualForm && (
          <div style={{ padding: "22px 16px 0" }}>
            <div style={{ ...cardStyle, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="eyebrow" style={{ display: "block", marginBottom: 8 }}>
                  Имя *
                </label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value.slice(0, 80))}
                  placeholder="Иван Иванов"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="eyebrow" style={{ display: "block", marginBottom: 8 }}>
                  Telegram *
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--signal-dim)",
                      fontFamily: "var(--sans)",
                      fontSize: 14,
                      pointerEvents: "none",
                    }}
                  >
                    @
                  </span>
                  <input
                    type="text"
                    value={manualUsername}
                    onChange={(e) => setManualUsername(e.target.value.replace(/^@/, "").slice(0, 32))}
                    placeholder="username"
                    style={{ ...inputStyle, paddingLeft: 28 }}
                  />
                </div>
              </div>
              <div>
                <label className="eyebrow" style={{ display: "block", marginBottom: 8 }}>
                  Компания
                </label>
                <input
                  type="text"
                  value={manualCompany}
                  onChange={(e) => setManualCompany(e.target.value.slice(0, 80))}
                  placeholder="Название компании"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="eyebrow" style={{ display: "block", marginBottom: 8 }}>
                  Сайт компании
                </label>
                <input
                  type="text"
                  value={manualWebsite}
                  onChange={(e) => setManualWebsite(e.target.value.slice(0, 200))}
                  placeholder="example.com"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        )}


        {/* Event picker */}
        <div style={{ marginTop: 22 }}>
          <SectionLabel>Где познакомились?</SectionLabel>
          <div style={{ padding: "0 22px", display: "flex", flexWrap: "wrap", gap: 6 }}>
            {PRESET_EVENTS.map((ev) => (
              <button
                key={ev}
                onClick={() => setEvent((cur) => cur === ev ? "" : ev)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 100,
                  background: event === ev ? "var(--ivory)" : "transparent",
                  color: event === ev ? "var(--abyss)" : "var(--muted-fg)",
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  border: "1px solid " + (event === ev ? "var(--ivory)" : "var(--line-soft)"),
                  cursor: "pointer",
                }}
              >
                {ev}
              </button>
            ))}
            <button
              onClick={() => setEvent((cur) => cur === "Другое" ? "" : "Другое")}
              style={{
                padding: "6px 12px",
                borderRadius: 100,
                background: event === "Другое" ? "var(--ivory)" : "transparent",
                color: event === "Другое" ? "var(--abyss)" : "var(--muted-fg)",
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                border: "1px solid " + (event === "Другое" ? "var(--ivory)" : "var(--line-soft)"),
                cursor: "pointer",
              }}
            >
              Другое
            </button>
          </div>
          {event === "Другое" && (
            <div style={{ padding: "10px 22px 0" }}>
              <input
                type="text"
                value={eventCustom}
                onChange={(e) => setEventCustom(e.target.value)}
                placeholder="Название события"
                style={inputStyle}
              />
            </div>
          )}
        </div>

        {/* Tag picker — grouped */}
        <div style={{ marginTop: 22 }}>
          <SectionLabel>Теги</SectionLabel>
          <div style={{ padding: "0 22px", display: "flex", flexDirection: "column", gap: 14 }}>
            {TAG_GROUPS.map((group) => (
              <div key={group.label}>
                <div className="eyebrow" style={{ marginBottom: 6, color: "var(--signal-dim)" }}>
                  {group.label}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {group.tags.map((tag) => {
                    const on = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        style={{
                          padding: "5px 10px",
                          borderRadius: 100,
                          background: on
                            ? "oklch(0.86 0.13 195 / 0.18)"
                            : "transparent",
                          color: on ? "var(--signal)" : "var(--muted-fg)",
                          border: `1px solid ${on ? "var(--signal-dim)" : "var(--line-soft)"}`,
                          fontFamily: "var(--mono)",
                          fontSize: 11,
                          letterSpacing: "0.04em",
                          cursor: "pointer",
                        }}
                      >
                        {on ? "✓ " : ""}{tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed CTA */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "16px 22px max(16px, env(safe-area-inset-bottom))",
          background: "linear-gradient(180deg, transparent, var(--bg) 35%)",
          zIndex: 10,
        }}
      >
        <IvoryBtn h={52} onClick={handleSave} disabled={!canSave}>
          Сохранить контакт
        </IvoryBtn>
      </div>
    </div>
  );
}
