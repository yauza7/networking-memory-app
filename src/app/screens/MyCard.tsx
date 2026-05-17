/**
 * W·52 — Профиль (My Card)
 * Moody: photo + name (serif) + role/company, ivory QR на тёмном фоне,
 * links карточками, ivory primary "Показать QR", ghost "Скопировать ссылку".
 */
import { loadCurrentUser, getProfileUrl, getQRValue } from "../utils/userStore";
import {
  ExternalLink,
  Settings,
  Edit,
  Mail,
  Globe,
  QrCode,
  X,
  Copy,
  Check,
  Send,
  MessageCircle,
} from "lucide-react";
import { Link } from "react-router";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "motion/react";
import {
  Atmosphere,
  Avatar,
  RoundBtn,
  IvoryBtn,
  GhostBtn,
  Hero,
  SectionLabel,
  cardStyle,
} from "../components/brand/Brand";

const linkMeta: Record<
  string,
  { label: string; icon: React.ReactNode }
> = {
  telegram: { label: "Telegram", icon: <Send className="w-3.5 h-3.5" /> },
  instagram: {
    label: "Instagram",
    icon: <MessageCircle className="w-3.5 h-3.5" />,
  },
  linkedin: { label: "LinkedIn", icon: <ExternalLink className="w-3.5 h-3.5" /> },
  email: { label: "Email", icon: <Mail className="w-3.5 h-3.5" /> },
  website: { label: "Сайт", icon: <Globe className="w-3.5 h-3.5" /> },
};

export function MyCard() {
  const [showQRModal, setShowQRModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const currentUser = loadCurrentUser();
  const profileUrl = getProfileUrl(currentUser.username);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const handleShare = () => {
    const tg = (window as any).Telegram?.WebApp;
    // Inside Telegram: use inline query — bot sends web_app button, opens inside Mini App
    if (tg?.switchInlineQuery) {
      try {
        tg.switchInlineQuery("", ["users", "groups", "channels"]);
        return;
      } catch {}
    }
    // Outside Telegram fallback
    if (navigator.share) {
      navigator.share({ title: `${currentUser.name} — ${currentUser.role}`, url: profileUrl }).catch(() => {});
    } else {
      handleCopyLink();
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
      <Atmosphere intensity={0.35} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Top: title + actions */}
        <div
          style={{
            padding: "60px 22px 0",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <Hero size={36}>Профиль</Hero>
          <div style={{ display: "flex", gap: 8 }}>
            <Link to="/edit-profile" style={{ textDecoration: "none" }}>
              <RoundBtn>
                <Edit className="w-4 h-4" />
              </RoundBtn>
            </Link>
            <Link to="/settings" style={{ textDecoration: "none" }}>
              <RoundBtn>
                <Settings className="w-4 h-4" />
              </RoundBtn>
            </Link>
          </div>
        </div>

        {/* Hero — photo + name */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "26px 22px 0",
          }}
        >
          <Avatar
            name={currentUser.name}
            photo={currentUser.photo}
            username={currentUser.username}
            size={108}
            ring
          />
          <Hero size={28} style={{ marginTop: 18, textAlign: "center" }}>
            {currentUser.name}
          </Hero>
          {(currentUser.role || currentUser.company) && (
            <div
              className="text-muted-w"
              style={{
                fontSize: 14,
                marginTop: 6,
                textAlign: "center",
                fontFamily: "var(--sans)",
              }}
            >
              {currentUser.role}
              {currentUser.company && (
                <>
                  {" · "}
                  {currentUser.companyUrl ? (
                    <a
                      href={currentUser.companyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "inherit", textDecoration: "underline", textDecorationColor: "var(--line)" }}
                      onClick={(e) => {
                        e.preventDefault();
                        const tg = (window as any).Telegram?.WebApp;
                        if (tg?.openLink) tg.openLink(currentUser.companyUrl!);
                        else window.open(currentUser.companyUrl, "_blank");
                      }}
                    >
                      {currentUser.company}
                    </a>
                  ) : (
                    currentUser.company
                  )}
                </>
              )}
            </div>
          )}
          {currentUser.username && (
            <div
              className="font-mono"
              style={{
                fontSize: 12,
                marginTop: 4,
                color: "var(--signal-dim)",
                letterSpacing: "0.04em",
              }}
            >
              @{currentUser.username}
            </div>
          )}
        </motion.div>

        {/* Bio */}
        {currentUser.bio && (
          <div style={{ padding: "20px 16px 0" }}>
            <div style={cardStyle}>
              <p
                className="font-serif"
                style={{
                  fontSize: 15,
                  lineHeight: 1.55,
                  margin: 0,
                  color: "var(--warm)",
                }}
              >
                {currentUser.bio}
              </p>
            </div>
          </div>
        )}

        {/* Tags */}
        {currentUser.tags.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <SectionLabel>Ниши</SectionLabel>
            <div
              style={{
                padding: "0 22px",
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              {currentUser.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: "5px 11px",
                    borderRadius: 100,
                    background: "oklch(0.86 0.13 195 / 0.10)",
                    border: "1px solid oklch(0.62 0.105 195 / 0.30)",
                    color: "var(--signal)",
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    letterSpacing: "0.04em",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        {currentUser.links.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <SectionLabel>Контакты</SectionLabel>
            <div
              style={{
                padding: "0 16px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {currentUser.links.map((link, i) => {
                const meta = linkMeta[link.type] || {
                  label: link.type,
                  icon: <ExternalLink className="w-3.5 h-3.5" />,
                };
                return (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      ...cardStyle,
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      textDecoration: "none",
                      color: "var(--ivory)",
                    }}
                  >
                    <span style={{ color: "var(--signal)" }}>{meta.icon}</span>
                    <span
                      style={{
                        fontFamily: "var(--sans)",
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      {meta.label}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Primary CTAs */}
        <div
          style={{
            padding: "26px 22px 0",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <IvoryBtn onClick={() => setShowQRModal(true)}>
            <QrCode className="w-4 h-4" />
            Показать QR-код
          </IvoryBtn>
          <GhostBtn onClick={handleShare} h={50}>
            {linkCopied ? (
              <>
                <Check className="w-4 h-4" style={{ color: "var(--signal)" }} />
                Скопировано!
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Поделиться профилем
              </>
            )}
          </GhostBtn>
        </div>
      </div>

      {/* QR Modal */}
      <AnimatePresence>
        {showQRModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(16px)",
            }}
            onClick={() => setShowQRModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                ...cardStyle,
                background: "var(--surface)",
                padding: 24,
                width: "100%",
                maxWidth: 340,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 20,
                }}
              >
                <div>
                  <span className="eyebrow" style={{ color: "var(--signal)" }}>
                    МОЙ QR-КОД
                  </span>
                  <Hero size={22} style={{ marginTop: 4 }}>
                    {currentUser.name.split(" ")[0]}
                  </Hero>
                </div>
                <RoundBtn onClick={() => setShowQRModal(false)} size={36}>
                  <X className="w-4 h-4" />
                </RoundBtn>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    borderRadius: 20,
                    padding: 14,
                    background: "var(--ivory)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
                  }}
                >
                  <QRCodeSVG
                    value={getQRValue(currentUser)}
                    size={200}
                    level="H"
                    fgColor="oklch(0.13 0.025 240)"
                    bgColor="oklch(0.965 0.012 80)"
                  />
                </div>
              </div>

              <IvoryBtn h={48} onClick={handleCopyLink}>
                {linkCopied ? (
                  <>
                    <Check className="w-4 h-4" /> Скопировано!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Скопировать ссылку
                  </>
                )}
              </IvoryBtn>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
