import { loadCurrentUser, getProfileUrl, getQRValue } from "../utils/userStore";
import { ExternalLink, Share2, Settings, Edit, Building2, Mail, Globe, QrCode, X, Copy, Check } from "lucide-react";
import { Link } from "react-router";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "motion/react";

const getLinkLabel = (type: string) =>
  ({ linkedin: "LinkedIn", telegram: "Telegram", instagram: "Instagram", email: "Email", website: "Сайт" }[type] || type);

const getSocialIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "email": return <Mail className="w-4 h-4" />;
    case "website": return <Globe className="w-4 h-4" />;
    default: return <ExternalLink className="w-4 h-4" />;
  }
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
    if (navigator.share) {
      navigator.share({ title: `${currentUser.name} - ${currentUser.role}`, url: profileUrl }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Title */}
      <div className="flex items-center justify-between px-5 pt-14 pb-4">
        <h1 style={{ fontSize: "34px", fontWeight: 700, color: "#0a1628", letterSpacing: "-0.5px", lineHeight: 1 }}>
          Профиль
        </h1>
        <div className="flex gap-2">
          <Link to="/edit-profile" className="p-2.5 rounded-full" style={{ background: "rgba(0,0,0,0.05)" }}>
            <Edit className="w-4 h-4" style={{ color: "#3c3c43" }} />
          </Link>
          <Link to="/settings" className="p-2.5 rounded-full" style={{ background: "rgba(0,0,0,0.05)" }}>
            <Settings className="w-4 h-4" style={{ color: "#3c3c43" }} />
          </Link>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {/* Profile Card */}
        <motion.div
          className="glass-card p-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0">
              {currentUser.photo ? (
                <img src={currentUser.photo} alt={currentUser.name} className="w-[72px] h-[72px] rounded-full object-cover avatar-ocean" />
              ) : (
                <div
                  className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-white text-2xl font-bold avatar-ocean"
                  style={{ background: "linear-gradient(135deg, #5AC8FA, #007AFF)" }}
                >
                  {currentUser.name[0]}
                </div>
              )}
            </div>
            <div className="flex-1">
              <p style={{ fontWeight: 700, fontSize: "18px", color: "#0a1628" }}>{currentUser.name}</p>
              <p style={{ fontSize: "14px", color: "#8E8E93", marginTop: "2px" }}>{currentUser.role}</p>
              {currentUser.companyUrl ? (
                <a href={currentUser.companyUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 mt-1 text-sm" style={{ color: "#007AFF" }}>
                  <Building2 className="w-3 h-3" />{currentUser.company}
                </a>
              ) : (
                <p className="flex items-center gap-1 mt-1 text-sm" style={{ color: "#8E8E93" }}>
                  <Building2 className="w-3 h-3" />{currentUser.company}
                </p>
              )}
              {currentUser.username && (
                <p style={{ fontSize: "13px", color: "#007AFF", marginTop: "2px" }}>@{currentUser.username}</p>
              )}
            </div>
          </div>

          {currentUser.bio && (
            <p className="text-sm mb-4 p-3 rounded-xl leading-relaxed" style={{ background: "rgba(0,122,255,0.05)", color: "#3c3c43" }}>
              {currentUser.bio}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5">
            {currentUser.tags.map((tag, i) => (
              <span key={i} className="ios-tag">{tag}</span>
            ))}
          </div>
        </motion.div>

        {/* Links */}
        {currentUser.links.length > 0 && (
          <motion.div
            className="glass-card p-5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <p style={{ fontWeight: 600, fontSize: "13px", color: "#8E8E93", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px" }}>
              Контакты и соцсети
            </p>
            <div className="grid grid-cols-2 gap-2">
              {currentUser.links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 px-3 py-3 rounded-xl transition-all active:scale-97"
                  style={{ background: "rgba(0,0,0,0.04)", border: "0.5px solid rgba(0,0,0,0.06)", color: "#0a1628" }}
                >
                  <span style={{ color: "#007AFF" }}>{getSocialIcon(link.type)}</span>
                  <span style={{ fontSize: "14px", fontWeight: 500 }}>{getLinkLabel(link.type)}</span>
                </a>
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          className="space-y-2.5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <button
            onClick={() => setShowQRModal(true)}
            className="w-full flex items-center justify-center gap-2 rounded-[14px] font-semibold text-white transition-all active:scale-97"
            style={{ background: "linear-gradient(180deg, #3AA3FF 0%, #007AFF 50%, #0063D1 100%)", height: "50px", fontSize: "17px", boxShadow: "0 4px 20px rgba(0,122,255,0.45), inset 0 1px 0 rgba(255,255,255,0.28)" }}
          >
            <QrCode className="w-5 h-5" />
            Показать QR-код
          </button>
          <button
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 rounded-[14px] font-semibold transition-all active:scale-97"
            style={{
              background: "rgba(255,255,255,0.72)",
              backdropFilter: "blur(20px)",
              border: "0.5px solid rgba(0,0,0,0.1)",
              color: "#007AFF",
              height: "50px",
              fontSize: "17px",
            }}
          >
            <Share2 className="w-5 h-5" />
            Поделиться ссылкой
          </button>
        </motion.div>
      </div>

      {/* QR Modal */}
      <AnimatePresence>
        {showQRModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(16px)" }}
            onClick={() => setShowQRModal(false)}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="glass-card p-7 max-w-[340px] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p style={{ fontWeight: 700, fontSize: "20px", color: "#0a1628" }}>Мой QR-код</p>
                  <p style={{ fontSize: "14px", color: "#8E8E93", marginTop: "2px" }}>Покажи для обмена</p>
                </div>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="p-2 rounded-full"
                  style={{ background: "rgba(0,0,0,0.06)" }}
                >
                  <X className="w-5 h-5" style={{ color: "#3c3c43" }} />
                </button>
              </div>

              <div className="flex flex-col items-center mb-5">
                <div
                  className="mb-4 overflow-hidden"
                  style={{ borderRadius: 20, padding: 12, background: "white", boxShadow: "0 4px 20px rgba(0,80,180,0.10)" }}
                >
                  <QRCodeSVG value={getQRValue(currentUser)} size={200} level="H" fgColor="#007AFF" bgColor="white" />
                </div>
                <p style={{ fontWeight: 700, fontSize: "18px", color: "#0a1628" }}>{currentUser.name}</p>
                {currentUser.username && (
                  <p style={{ fontSize: "14px", color: "#8E8E93" }}>@{currentUser.username}</p>
                )}
              </div>

              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 rounded-[14px] font-semibold text-white transition-all active:scale-97"
                style={{
                  background: linkCopied ? "#34C759" : "#007AFF",
                  height: "50px",
                  fontSize: "17px",
                  boxShadow: `0 4px 15px ${linkCopied ? "rgba(52,199,89,0.3)" : "rgba(0,122,255,0.3)"}`,
                }}
              >
                {linkCopied ? <><Check className="w-5 h-5" /> Скопировано!</> : <><Copy className="w-5 h-5" /> Скопировать ссылку</>}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
