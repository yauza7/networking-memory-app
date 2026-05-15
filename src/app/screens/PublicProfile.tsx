import { useParams, useNavigate, useSearchParams } from "react-router";
import { useMemo, useState } from "react";
import type { User, Connection } from "../utils/mockData";
import {
  MessageCircle, UserPlus, Building2, Globe, Mail, ExternalLink, ArrowLeft, Sparkles, Check,
} from "lucide-react";
import { motion } from "motion/react";
import { addStoredContact, loadStoredContacts } from "../utils/contactStore";
import { loadCurrentUser } from "../utils/userStore";

const LINK_LABELS: Record<string, string> = {
  telegram: "Telegram", linkedin: "LinkedIn", instagram: "Instagram",
  email: "Email", website: "Сайт",
};

function getLinkIcon(type: string) {
  switch (type) {
    case "email": return <Mail className="w-4 h-4" />;
    case "website": return <Globe className="w-4 h-4" />;
    default: return <ExternalLink className="w-4 h-4" />;
  }
}

const sanitizeStr = (v: unknown, max = 200): string =>
  typeof v === "string" ? v.replace(/[<>]/g, "").slice(0, max) : "";

const sanitizeUsername = (v: unknown): string => {
  if (typeof v !== "string") return "";
  const m = v.replace(/^@/, "").match(/^[a-zA-Z0-9_]{1,32}$/);
  return m ? m[0] : "";
};

const sanitizePhoto = (v: unknown): string | undefined => {
  if (typeof v !== "string" || v.length > 500) return undefined;
  if (v.startsWith("/api/user-photo?")) return v;
  try {
    const u = new URL(v);
    return u.protocol === "https:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
};

/** Decode the QR `d` payload (base64-encoded JSON) into a User-like object */
function decodeProfileFromD(d: string, fallbackUsername: string): User | null {
  try {
    if (d.length > 4000) return null;
    const json = decodeURIComponent(escape(atob(d)));
    if (json.length > 8000) return null;
    const p = JSON.parse(json);
    if (!p || typeof p !== "object") return null;

    const username = sanitizeUsername(p.un) || sanitizeUsername(fallbackUsername);
    const tags = Array.isArray(p.t)
      ? p.t.map((t: unknown) => sanitizeStr(t, 40)).filter(Boolean).slice(0, 20)
      : [];

    return {
      id: `u-${username || Date.now()}`,
      name: sanitizeStr(p.n, 80) || username || "Контакт",
      role: sanitizeStr(p.r, 80),
      company: sanitizeStr(p.c, 80),
      photo: sanitizePhoto(p.p),
      username: username || undefined,
      bio: sanitizeStr(p.b, 500),
      tags,
      links: username ? [{ type: "telegram", url: `https://t.me/${username}` }] : [],
    } as User;
  } catch {
    return null;
  }
}

export function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);

  const currentUser = loadCurrentUser();
  const isOwn = currentUser.username === username;

  const user: User | null = useMemo(() => {
    if (isOwn) return currentUser;
    const d = searchParams.get("d");
    if (d) {
      const decoded = decodeProfileFromD(d, username || "");
      if (decoded) return decoded;
    }
    // Look up in stored contacts as a last resort
    const stored = loadStoredContacts().find((c) => c.user.username === username);
    return stored?.user ?? null;
  }, [searchParams, username, isOwn, currentUser]);

  const handleSaveContact = () => {
    if (!user || saved || isOwn) return;
    const contactId = `c-${Date.now()}`;
    const contact: Connection = {
      id: contactId,
      user,
      metAt: new Date().toISOString(),
      followUpSent: false,
    };
    addStoredContact(contact);
    setSaved(true);
    navigate(`/contact/${contactId}`, { replace: true });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(0,122,255,0.08)" }}>
          <UserPlus className="w-10 h-10" style={{ color: "#8E8E93" }} />
        </div>
        <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#0a1628", marginBottom: "8px" }}>Профиль не найден</h2>
        <p style={{ fontSize: "14px", color: "#8E8E93", textAlign: "center", marginBottom: "24px" }}>
          Пользователь @{username} не существует или ссылка некорректна
        </p>
        <button
          onClick={() => navigate("/", { replace: true })}
          className="flex items-center gap-2 px-6 rounded-[14px] font-semibold transition-all active:scale-97"
          style={{
            background: "rgba(255,255,255,0.72)",
            border: "0.5px solid rgba(0,0,0,0.1)",
            color: "#007AFF",
            height: "50px",
            fontSize: "17px",
          }}
        >
          <ArrowLeft className="w-5 h-5" />
          На главную
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Back */}
      <div className="flex items-center justify-between px-4 pt-14 pb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 font-medium" style={{ color: "#007AFF", fontSize: "17px" }}>
          <ArrowLeft className="w-5 h-5" />
          Назад
        </button>
      </div>

      {/* Hero */}
      <motion.div
        className="flex flex-col items-center px-5 pb-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {user.photo ? (
          <img
            src={user.photo}
            alt={user.name}
            className="w-24 h-24 rounded-full object-cover avatar-ocean mb-4"
          />
        ) : (
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold avatar-ocean mb-4"
            style={{ background: "linear-gradient(135deg, #5AC8FA, #007AFF)" }}
          >
            {user.name[0]}
          </div>
        )}
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0a1628", textAlign: "center" }}>{user.name}</h1>
        {user.username && <p style={{ fontSize: "14px", color: "#007AFF", marginTop: "2px" }}>@{user.username}</p>}
        {user.role && <p style={{ fontSize: "15px", color: "#8E8E93", marginTop: "4px", textAlign: "center" }}>{user.role}</p>}
        {user.company && (
          <div className="flex items-center gap-1 mt-1" style={{ color: "#8E8E93", fontSize: "13px" }}>
            <Building2 className="w-3 h-3" />
            {user.companyUrl
              ? <a href={user.companyUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#007AFF" }}>{user.company}</a>
              : <span>{user.company}</span>}
          </div>
        )}
      </motion.div>

      <div className="px-4 space-y-3">
        {(user.tags?.length > 0 || user.bio || user.links?.length > 0) && (
          <motion.div
            className="glass-card overflow-hidden"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            {user.tags?.length > 0 && (
              <div className="p-5" style={{ borderBottom: (user.bio || user.links?.length) ? "0.5px solid rgba(0,0,0,0.06)" : "none" }}>
                <div className="flex flex-wrap gap-1.5">
                  {user.tags.map((tag) => <span key={tag} className="ios-tag">{tag}</span>)}
                </div>
              </div>
            )}
            {user.bio && (
              <div className="p-5" style={{ borderBottom: user.links?.length ? "0.5px solid rgba(0,0,0,0.06)" : "none" }}>
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#007AFF" }} />
                  <p style={{ fontSize: "14px", color: "#3c3c43", lineHeight: 1.5 }}>{user.bio}</p>
                </div>
              </div>
            )}
            {user.links?.length > 0 && (
              <div className="p-5">
                <div className="grid grid-cols-2 gap-2">
                  {user.links.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-3 py-3 rounded-xl transition-all active:scale-97"
                      style={{ background: "rgba(0,0,0,0.04)", border: "0.5px solid rgba(0,0,0,0.06)", color: "#0a1628" }}
                    >
                      <span style={{ color: "#007AFF" }}>{getLinkIcon(link.type)}</span>
                      <span style={{ fontSize: "14px", fontWeight: 500 }}>{LINK_LABELS[link.type] || link.type}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          className="space-y-2.5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.4 }}
        >
          {user.username && (
            <a
              href={`https://t.me/${user.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-[14px] text-white font-semibold transition-all active:scale-97"
              style={{ background: "#007AFF", height: "50px", fontSize: "17px", boxShadow: "0 4px 15px rgba(0,122,255,0.3)" }}
            >
              <MessageCircle className="w-5 h-5" />
              Написать в Telegram
            </a>
          )}
          {!isOwn && (
            <button
              onClick={handleSaveContact}
              disabled={saved}
              className="flex items-center justify-center gap-2 w-full rounded-[14px] font-semibold transition-all active:scale-97 disabled:opacity-60"
              style={{
                background: saved ? "rgba(52,199,89,0.15)" : "rgba(255,255,255,0.72)",
                border: "0.5px solid rgba(0,0,0,0.1)",
                color: saved ? "#34C759" : "#007AFF",
                height: "50px",
                fontSize: "17px",
              }}
            >
              {saved ? <><Check className="w-5 h-5" /> Сохранено</> : <><UserPlus className="w-5 h-5" /> Сохранить контакт</>}
            </button>
          )}
        </motion.div>

        <p style={{ textAlign: "center", color: "#C7C7CC", fontSize: "12px", paddingTop: "4px" }}>
          Профиль создан в W·52
        </p>
      </div>
    </div>
  );
}
