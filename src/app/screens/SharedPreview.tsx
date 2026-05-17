/**
 * /c/:token — landing for someone clicking a friend's share-link.
 * Shows a preview of the contact + sharer attribution, lets you save into
 * your own memory.
 *
 * If the shared contact has a username that's already registered in Echo,
 * we fetch the fresh self-layer to render the most up-to-date profile.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { motion } from "motion/react";
import { Check, UserPlus, MessageCircle } from "lucide-react";
import type { Connection, User, SharedFrom } from "../utils/mockData";
import { fetchSharePreview, claimShare, type SharePayload } from "../utils/shareApi";
import { fetchPublicProfile } from "../utils/profileApi";
import { addStoredContact, loadStoredContacts, mergeSharedFromInto } from "../utils/contactStore";
import {
  Atmosphere,
  Avatar,
  Hero,
  IvoryBtn,
  cardStyle,
} from "../components/brand/Brand";

export function SharedPreview() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [freshName, setFreshName] = useState<string | null>(null);
  const [freshPhoto, setFreshPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Has this person already been saved before?
  const alreadyOwned = useMemo<Connection | null>(() => {
    if (!payload) return null;
    const u = payload.contactRef.username;
    if (!u) return null;
    return loadStoredContacts().find((c) => c.user.username === u) ?? null;
  }, [payload]);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const p = await fetchSharePreview(token);
      if (cancelled) return;
      setPayload(p);
      // Try to enrich with fresh self-layer
      if (p?.contactRef.username) {
        const fresh = await fetchPublicProfile(p.contactRef.username);
        if (!cancelled && fresh) {
          setFreshName(fresh.name);
          if (fresh.photo) setFreshPhoto(fresh.photo);
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleSave = async () => {
    if (!token || saving || saved) return;
    setSaving(true);

    // Try authenticated claim first (works inside Telegram Mini App)
    let contact = await claimShare(token);

    // Fallback: build contact from already-fetched payload so it works in
    // browser too (no initData = no auth, but payload was already loaded publicly)
    if (!contact && payload) {
      const p = payload;
      const username = p.contactRef.username;
      const user: User = {
        id: `u-${username || Date.now()}`,
        name: p.contactRef.name || username || "Контакт",
        username,
        role: p.contactRef.role || "",
        company: p.contactRef.company || "",
        photo: p.contactRef.photo || "",
        bio: p.contactRef.bio || "",
        tags: p.contactRef.tags || [],
        links: username ? [{ type: "telegram", url: `https://t.me/${username}` }] : [],
      };
      const sharedFrom: SharedFrom = {
        fromUsername: p.fromUsername,
        fromName: p.fromName,
        sharedTags: p.sharedTags || [],
        sharedNote: p.sharedNote || "",
        sharedAt: p.sharedAt,
      };
      contact = {
        id: username ? `c-${username}` : `c-${Date.now()}`,
        user,
        metAt: new Date().toISOString(),
        followUpSent: false,
        sharedFrom: [sharedFrom],
      };
    }

    setSaving(false);
    if (!contact) return;

    if (alreadyOwned) {
      // Don't clobber my notes/tasks — just append the new sharedFrom entry.
      const newSharedFrom = contact.sharedFrom?.[0];
      if (newSharedFrom) mergeSharedFromInto(alreadyOwned.id, newSharedFrom);
      setSaved(true);
      setTimeout(() => navigate(`/contact/${alreadyOwned.id}`, { replace: true }), 350);
      return;
    }

    addStoredContact(contact);
    setSaved(true);
    setTimeout(() => navigate(`/contact/${contact.id}`, { replace: true }), 350);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--bg)", color: "var(--ivory)",
        display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
      }}>
        <Atmosphere intensity={0.25} />
        <p className="font-mono" style={{ position: "relative", zIndex: 1, color: "var(--muted-fg)", fontSize: 11, letterSpacing: "0.18em" }}>
          СИГНАЛ…
        </p>
      </div>
    );
  }

  if (!payload) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--bg)", color: "var(--ivory)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "0 24px", gap: 16, textAlign: "center", position: "relative",
      }}>
        <Atmosphere intensity={0.25} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <Hero size={22}>Ссылка устарела</Hero>
          <p style={{ fontSize: 14, color: "var(--muted-fg)", lineHeight: 1.5, maxWidth: 260, fontFamily: "var(--sans)" }}>
            Поделиться действует 30 дней. Попроси друга прислать новую.
          </p>
          <IvoryBtn h={48} onClick={() => navigate("/", { replace: true })}>
            На главную
          </IvoryBtn>
        </div>
      </div>
    );
  }

  const ref = payload.contactRef;
  const displayName = freshName || ref.name || ref.username || "Контакт";
  const displayPhoto = freshPhoto || ref.photo;
  const tags = (ref.tags && ref.tags.length > 0) ? ref.tags : payload.sharedTags;

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)", color: "var(--ivory)",
      position: "relative", paddingBottom: 40,
    }}>
      <Atmosphere intensity={0.25} />
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Sharer attribution */}
        <motion.div
          style={{ padding: "56px 22px 0", textAlign: "center" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <p className="font-mono" style={{ fontSize: 10, color: "var(--signal)", letterSpacing: "0.32em", textTransform: "uppercase" }}>
            Поделил{payload.fromName.endsWith("а") || payload.fromName.endsWith("я") ? "ась" : "ся"}
          </p>
          <p style={{ fontSize: 18, marginTop: 6, fontFamily: "var(--sans)", color: "var(--ivory)" }}>
            {payload.fromName}
            {payload.fromUsername && (
              <span style={{ color: "var(--muted-fg)", marginLeft: 6 }}>
                @{payload.fromUsername}
              </span>
            )}
          </p>
        </motion.div>

        {/* Hero — shared contact */}
        <motion.div
          style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "30px 22px 20px", textAlign: "center" }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.35 }}
        >
          <Avatar name={displayName} photo={displayPhoto} username={ref.username} size={80} ring />
          <div style={{ marginTop: 14 }}>
            <Hero size={26}>{displayName}</Hero>
            {ref.username && (
              <div className="font-mono" style={{ fontSize: 12, color: "var(--signal-dim)", marginTop: 4, letterSpacing: "0.06em" }}>
                @{ref.username}
              </div>
            )}
            {ref.role && (
              <p style={{ fontSize: 14, color: "var(--muted-fg)", marginTop: 6, fontFamily: "var(--sans)" }}>
                {ref.role}{ref.company ? ` · ${ref.company}` : ""}
              </p>
            )}
          </div>
        </motion.div>

        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Sharer's note + tags */}
          {(payload.sharedNote || payload.sharedTags.length > 0 || tags.length > 0) && (
            <motion.div
              style={{ ...cardStyle, padding: 0, overflow: "hidden" }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14, duration: 0.35 }}
            >
              {payload.sharedNote && (
                <div style={{
                  padding: "14px 18px",
                  borderBottom: tags.length > 0 ? "1px solid var(--line-soft)" : "none",
                }}>
                  <div className="eyebrow" style={{ marginBottom: 6 }}>
                    {payload.fromName} отметил{payload.fromName.endsWith("а") || payload.fromName.endsWith("я") ? "а" : ""}
                  </div>
                  <p style={{ fontSize: 14, color: "var(--ivory)", lineHeight: 1.55, fontFamily: "var(--sans)" }}>
                    {payload.sharedNote}
                  </p>
                </div>
              )}
              {tags.length > 0 && (
                <div style={{ padding: "14px 18px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {tags.map((t) => (
                    <span
                      key={t}
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
                      {t}
                    </span>
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
            transition={{ delay: 0.2, duration: 0.35 }}
          >
            <button
              onClick={handleSave}
              disabled={saving || saved}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                height: 52, borderRadius: 14,
                background: saved ? "transparent" : "var(--signal)",
                border: saved ? "1px solid var(--signal-dim)" : "none",
                color: saved ? "var(--signal)" : "var(--abyss)",
                fontFamily: "var(--sans)", fontWeight: 600, fontSize: 16,
                cursor: saving || saved ? "default" : "pointer",
                opacity: saving ? 0.7 : 1, width: "100%",
              }}
            >
              {saved
                ? <><Check className="w-5 h-5" /> {alreadyOwned ? "Добавлено к контакту" : "Сохранено"}</>
                : alreadyOwned
                  ? <><UserPlus className="w-5 h-5" /> Добавить заметку к контакту</>
                  : <><UserPlus className="w-5 h-5" /> Сохранить в мою память</>}
            </button>
            {ref.username && (
              <a
                href={`https://t.me/${ref.username}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  height: 48, borderRadius: 14,
                  background: "transparent", border: "1px solid var(--line)",
                  color: "var(--ivory)", textDecoration: "none",
                  fontFamily: "var(--sans)", fontSize: 15,
                }}
              >
                <MessageCircle className="w-4 h-4" />
                Написать в Telegram
              </a>
            )}
          </motion.div>

          <p className="font-mono" style={{ textAlign: "center", color: "var(--faint)", fontSize: 11, paddingTop: 4, letterSpacing: "0.08em" }}>
            ECHO · NETWORKING MEMORY
          </p>
        </div>
      </div>
    </div>
  );
}
