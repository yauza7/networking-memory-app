import { useParams, useNavigate, useSearchParams } from "react-router";
import { useEffect, useMemo, useState } from "react";
import type { User, Connection } from "../utils/mockData";
import { MessageCircle, UserPlus, Globe, Mail, ExternalLink, Check } from "lucide-react";
import { motion } from "motion/react";
import { addStoredContact, loadStoredContacts } from "../utils/contactStore";
import { loadCurrentUser } from "../utils/userStore";
import { fetchPublicProfile } from "../utils/profileApi";
import {
  Atmosphere,
  Avatar,
  Hero,
  IvoryBtn,
  cardStyle,
} from "../components/brand/Brand";

const LINK_LABELS: Record<string, string> = {
  telegram: "Telegram",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  email: "Email",
  website: "Сайт",
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
  const isOwn =
    !!currentUser.username &&
    currentUser.username.toLowerCase() === (username || "").toLowerCase();

  const localUser: User | null = useMemo(() => {
    if (isOwn) return currentUser;
    const d = searchParams.get("d");
    if (d) {
      const decoded = decodeProfileFromD(d, username || "");
      if (decoded) return decoded;
    }
    const stored = loadStoredContacts().find((c) => c.user.username === username);
    return stored?.user ?? null;
  }, [searchParams, username, isOwn, currentUser]);

  // Server fetch when no local data and not own profile.
  const [remoteUser, setRemoteUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(!localUser && !isOwn && !!username);
  useEffect(() => {
    if (isOwn || localUser || !username) return;
    let cancelled = false;
    setLoading(true);
    fetchPublicProfile(username).then((u) => {
      if (cancelled) return;
      setRemoteUser(u);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [username, isOwn, localUser]);

  const user: User | null = localUser ?? remoteUser;

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

  if (!user && loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          color: "var(--ivory)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <Atmosphere intensity={0.25} />
        <p className="font-mono" style={{ position: "relative", zIndex: 1, color: "var(--muted-fg)", fontSize: 11, letterSpacing: "0.18em" }}>
          СИГНАЛ…
        </p>
      </div>
    );
  }

  if (!user) {
    const handleSaveByUsername = () => {
      if (!username) return;
      const contactId = `c-${Date.now()}`;
      const bareContact: Connection = {
        id: contactId,
        user: {
          id: `u-${Date.now()}`,
          name: username,
          username,
          role: "",
          company: "",
          tags: [],
          links: [{ type: "telegram", url: `https://t.me/${username}` }],
        },
        metAt: new Date().toISOString(),
        followUpSent: false,
      };
      addStoredContact(bareContact);
      navigate(`/contact/${contactId}`, { replace: true });
    };

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
          padding: "0 24px",
          gap: 16,
          textAlign: "center",
        }}
      >
        <Atmosphere intensity={0.3} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              border: "1.5px solid var(--line-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <UserPlus style={{ color: "var(--muted-fg)", width: 28, height: 28 }} />
          </div>
          <Hero size={22}>{username ? `@${username}` : "Профиль не найден"}</Hero>
          <p style={{ fontSize: 14, color: "var(--muted-fg)", lineHeight: 1.5, maxWidth: 260, fontFamily: "var(--sans)" }}>
            {username
              ? "Этот пользователь ещё не в Echo — можно добавить по username"
              : "Ссылка некорректна или профиль не существует"}
          </p>
          {username && (
            <IvoryBtn h={48} onClick={handleSaveByUsername}>
              <UserPlus style={{ width: 16, height: 16 }} />
              Добавить @{username}
            </IvoryBtn>
          )}
          <button
            onClick={() => navigate("/", { replace: true })}
            style={{
              background: "transparent",
              border: "1px solid var(--line-soft)",
              color: "var(--muted-fg)",
              borderRadius: 14,
              height: 48,
              padding: "0 24px",
              fontFamily: "var(--sans)",
              fontSize: 15,
              cursor: "pointer",
              width: "100%",
              maxWidth: 320,
            }}
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

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
      <Atmosphere intensity={0.25} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Back */}
        <div style={{ padding: "56px 18px 0" }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "none",
              color: "var(--signal)",
              fontFamily: "var(--sans)",
              fontSize: 15,
              cursor: "pointer",
              padding: 0,
            }}
          >
            <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
              <path d="M8 2L2 8l6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Назад
          </button>
        </div>

        {/* Hero */}
        <motion.div
          style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 22px 20px", textAlign: "center" }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Avatar name={user.name} photo={user.photo} username={user.username} size={80} ring />
          <div style={{ marginTop: 16 }}>
            <Hero size={26}>{user.name}</Hero>
            {user.username && (
              <div className="font-mono" style={{ fontSize: 12, color: "var(--signal-dim)", marginTop: 4, letterSpacing: "0.06em" }}>
                @{user.username}
              </div>
            )}
            {user.role && (
              <p style={{ fontSize: 14, color: "var(--muted-fg)", marginTop: 6, fontFamily: "var(--sans)" }}>
                {user.role}
                {user.company && (
                  <>
                    {" · "}
                    {user.companyUrl ? (
                      <a
                        href={user.companyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "inherit", textDecoration: "underline", textDecorationColor: "var(--line)" }}
                        onClick={(e) => {
                          e.preventDefault();
                          const tg = (window as any).Telegram?.WebApp;
                          if (tg?.openLink) tg.openLink(user.companyUrl!);
                          else window.open(user.companyUrl, "_blank");
                        }}
                      >
                        {user.company}
                      </a>
                    ) : (
                      user.company
                    )}
                  </>
                )}
              </p>
            )}
          </div>
        </motion.div>

        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Info card */}
          {(user.tags?.length > 0 || user.bio || user.links?.length > 0) && (
            <motion.div
              style={{ ...cardStyle, padding: 0, overflow: "hidden" }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.35 }}
            >
              {user.bio && (
                <div
                  style={{
                    padding: "16px 18px",
                    borderBottom: (user.tags?.length > 0 || user.links?.length > 0) ? "1px solid var(--line-soft)" : "none",
                  }}
                >
                  <p style={{ fontSize: 14, color: "var(--ivory)", lineHeight: 1.55, fontFamily: "var(--sans)" }}>{user.bio}</p>
                </div>
              )}
              {user.tags?.length > 0 && (
                <div
                  style={{
                    padding: "14px 18px",
                    borderBottom: user.links?.length ? "1px solid var(--line-soft)" : "none",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  {user.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono"
                      style={{
                        padding: "4px 10px",
                        borderRadius: 100,
                        border: "1px solid var(--signal-dim)",
                        background: "oklch(0.86 0.13 195 / 0.10)",
                        color: "var(--signal)",
                        fontSize: 10,
                        letterSpacing: "0.06em",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {user.links?.length > 0 && (
                <div style={{ padding: "14px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {user.links.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "var(--deep)",
                        border: "1px solid var(--line-soft)",
                        color: "var(--signal)",
                        textDecoration: "none",
                        fontSize: 13,
                        fontFamily: "var(--sans)",
                      }}
                    >
                      {getLinkIcon(link.type)}
                      <span style={{ color: "var(--ivory)", fontSize: 13 }}>{LINK_LABELS[link.type] || link.type}</span>
                    </a>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Actions */}
          <motion.div
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.35 }}
          >
            {user.username && (
              <a
                href={`https://t.me/${user.username}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  height: 52,
                  borderRadius: 14,
                  background: "var(--signal)",
                  color: "var(--abyss)",
                  fontFamily: "var(--sans)",
                  fontWeight: 600,
                  fontSize: 16,
                  textDecoration: "none",
                }}
              >
                <MessageCircle className="w-5 h-5" />
                Написать в Telegram
              </a>
            )}
            {!isOwn && (
              <button
                onClick={handleSaveContact}
                disabled={saved}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  height: 52,
                  borderRadius: 14,
                  background: "transparent",
                  border: `1px solid ${saved ? "var(--signal-dim)" : "var(--line)"}`,
                  color: saved ? "var(--signal)" : "var(--ivory)",
                  fontFamily: "var(--sans)",
                  fontWeight: 500,
                  fontSize: 16,
                  cursor: saved ? "default" : "pointer",
                  opacity: saved ? 0.7 : 1,
                  width: "100%",
                }}
              >
                {saved ? <><Check className="w-5 h-5" /> Сохранено</> : <><UserPlus className="w-5 h-5" /> Сохранить контакт</>}
              </button>
            )}
          </motion.div>

          <p className="font-mono" style={{ textAlign: "center", color: "var(--faint)", fontSize: 11, paddingTop: 4, letterSpacing: "0.08em" }}>
            ECHO · EVERY SIGNAL FINDS ITS RECEIVER
          </p>
        </div>
      </div>
    </div>
  );
}
