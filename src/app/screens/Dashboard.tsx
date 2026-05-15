import { useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import {
  Bell, ArrowRight, Sparkles, MessageCircle, Clock,
  QrCode, CheckSquare, Copy, Check,
} from "lucide-react";
import { mockContacts } from "../utils/mockData";
import { allContacts } from "../utils/contactStore";
import { loadCurrentUser, getQRValue, getProfileUrl } from "../utils/userStore";
import { loadTasks } from "../utils/taskStore";
import { unreadCount } from "../utils/notificationStore";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";

export function Dashboard() {
  const [linkCopied, setLinkCopied] = useState(false);
  const currentUser = loadCurrentUser();

  const contacts = allContacts(mockContacts);

  // Merge static followUpSent with tasks completed in Tasks screen
  const completedFollowUpIds = new Set<string>(
    JSON.parse(localStorage.getItem("w52_followup_sent") || "[]")
  );
  const pendingFollowUps = contacts.filter(
    (c) =>
      !c.followUpSent &&
      !completedFollowUpIds.has(c.id) &&
      new Date(c.metAt) < new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  );
  const recentContacts = [...contacts]
    .sort((a, b) => new Date(b.metAt).getTime() - new Date(a.metAt).getTime())
    .slice(0, 3);

  const weekCount = mockContacts.filter(
    (c) => new Date(c.metAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length;
  const followUpCount = mockContacts.filter((c) => c.followUpSent).length;

  const profileUrl = getProfileUrl(currentUser.username);

  // Live task count from localStorage
  const allTasks = loadTasks();
  const activeTasks = allTasks.filter((t) => !t.completed);

  // Notification unread count from real notification store
  const unreadNotifications = unreadCount();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Title row */}
      <div className="flex items-start justify-between px-5 pt-14 pb-2">
        <div>
          <h1
            style={{
              fontSize: "34px", fontWeight: 700, color: "#0a1628",
              letterSpacing: "-0.5px", lineHeight: 1.1,
            }}
          >
            W·52
          </h1>
          <p style={{ fontSize: "15px", color: "#8E8E93", marginTop: "3px" }}>
            Привет, {currentUser.name.split(" ")[0]}!
          </p>
        </div>
        <Link
          to="/notifications"
          className="relative mt-1"
          style={{
            padding: "8px", borderRadius: "50%",
            background: "rgba(255,255,255,0.72)",
            border: "0.5px solid rgba(0,0,0,0.08)",
          }}
        >
          <Bell className="w-5 h-5" style={{ color: "#0a1628" }} />
          {unreadNotifications > 0 && (
            <span
              className="absolute -top-1 -right-1 w-5 h-5 text-white flex items-center justify-center rounded-full font-bold"
              style={{ background: "#FF3B30", fontSize: "11px" }}
            >
              {unreadNotifications}
            </span>
          )}
        </Link>
      </div>

      {/* QR Card */}
      <div className="px-4 mb-4">
        <motion.div
          className="glass-card overflow-hidden"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <div className="px-5 pt-4 pb-3">
            <p style={{ fontWeight: 600, color: "#0a1628", fontSize: "15px" }}>Мой QR-код</p>
            <p style={{ fontSize: "13px", color: "#8E8E93", marginTop: "2px" }}>
              Покажите для обмена визитками
            </p>
          </div>
          <div className="flex items-center justify-center py-5 mx-4 mb-3">
            <div
              className="overflow-hidden"
              style={{ borderRadius: 20, padding: 12, background: "white", boxShadow: "0 4px 20px rgba(0,80,180,0.10)" }}
            >
              <QRCodeSVG
                value={getQRValue(currentUser)}
                size={180}
                level="H"
                fgColor="#007AFF"
                bgColor="white"
              />
            </div>
          </div>
          <div className="px-4 pb-4 grid grid-cols-2 gap-2.5">
            <button
              onClick={handleCopyLink}
              className="py-3 rounded-[14px] text-sm font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-97"
              style={{
                background: "rgba(0,122,255,0.08)",
                border: "0.5px solid rgba(0,122,255,0.15)",
                color: "#007AFF",
              }}
            >
              {linkCopied
                ? <><Check className="w-4 h-4" /> Скопировано</>
                : <><Copy className="w-4 h-4" /> Ссылка</>}
            </button>
            <Link
              to="/my-card"
              className="flex items-center justify-center gap-2 py-3 rounded-[14px] text-sm font-semibold text-white transition-all active:scale-97"
              style={{
                background: "linear-gradient(180deg, #3AA3FF 0%, #007AFF 50%, #0063D1 100%)",
                boxShadow: "0 4px 16px rgba(0,122,255,0.45), inset 0 1px 0 rgba(255,255,255,0.28)",
              }}
            >
              Профиль <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 mb-4 grid grid-cols-2 gap-3">
        {[
          { to: "/tasks", Icon: CheckSquare, title: "Задачи", sub: `${activeTasks.length} активных` },
          { to: "/scan", Icon: QrCode, title: "Скан", sub: "Добавить контакт" },
        ].map(({ to, Icon, title, sub }, i) => (
          <motion.div
            key={to}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
          >
            <Link to={to} className="glass-card flex items-center gap-3 p-4">
              <div className="p-2.5 rounded-xl" style={{ background: "rgba(0,122,255,0.1)" }}>
                <Icon className="w-5 h-5" style={{ color: "#007AFF" }} />
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: "14px", color: "#0a1628" }}>{title}</p>
                <p style={{ fontSize: "12px", color: "#8E8E93" }}>{sub}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Follow-up Alerts */}
      {pendingFollowUps.length > 0 && (
        <motion.div
          className="px-4 mb-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="glass-card p-4" style={{ borderColor: "rgba(255,59,48,0.18)" }}>
            <Link to="/tasks" className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl" style={{ background: "rgba(255,59,48,0.1)" }}>
                <Clock className="w-4 h-4" style={{ color: "#FF3B30" }} />
              </div>
              <div className="flex-1">
                <p style={{ fontWeight: 600, fontSize: "14px", color: "#0a1628" }}>Нужно написать</p>
                <p style={{ fontSize: "12px", color: "#8E8E93", marginTop: "1px" }}>
                  {pendingFollowUps.length} {pendingFollowUps.length === 1 ? "контакт ждёт" : "контакта ждут"}
                </p>
              </div>
              <ArrowRight className="w-4 h-4" style={{ color: "#8E8E93" }} />
            </Link>
            <div className="space-y-2">
              {pendingFollowUps.slice(0, 2).map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.55)", border: "0.5px solid rgba(255,59,48,0.08)" }}
                >
                  <Link to={`/contact/${contact.id}`} className="flex-1">
                    <p style={{ fontWeight: 500, fontSize: "14px", color: "#0a1628" }}>{contact.user.name}</p>
                    <p style={{ fontSize: "12px", color: "#8E8E93" }}>
                      {contact.user.role} · {formatDistanceToNow(new Date(contact.metAt), { addSuffix: true, locale: ru })}
                    </p>
                  </Link>
                  {contact.user.username && (
                    <a
                      href={`https://t.me/${contact.user.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl text-white transition-all active:scale-95"
                      style={{ background: "#007AFF" }}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Recent Contacts */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontWeight: 600, fontSize: "17px", color: "#0a1628" }}>Недавние</p>
          <Link to="/contacts" className="flex items-center gap-1 font-medium text-sm" style={{ color: "#007AFF" }}>
            Все <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-2">
          {recentContacts.map((contact, i) => (
            <motion.div
              key={contact.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
            >
              <Link to={`/contact/${contact.id}`} className="glass-card flex items-start gap-3 p-4 block">
                {contact.user.photo ? (
                  <img
                    src={contact.user.photo}
                    alt={contact.user.name}
                    className="w-11 h-11 rounded-full object-cover flex-shrink-0 avatar-ocean"
                  />
                ) : (
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 avatar-ocean"
                    style={{ background: "linear-gradient(135deg, #5AC8FA, #007AFF)", fontSize: "16px" }}
                  >
                    {contact.user.name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-0.5">
                    <p style={{ fontWeight: 600, fontSize: "14px", color: "#0a1628" }}>{contact.user.name}</p>
                    <span style={{ fontSize: "12px", color: "#8E8E93" }}>
                      {formatDistanceToNow(new Date(contact.metAt), { locale: ru })}
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#8E8E93", marginBottom: "6px" }}>{contact.user.role}</p>
                  {contact.aiSummary && (
                    <div className="flex items-start gap-1.5 p-2 rounded-xl" style={{ background: "rgba(0,122,255,0.06)" }}>
                      <Sparkles className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "#007AFF" }} />
                      <p style={{ fontSize: "12px", color: "#007AFF" }} className="line-clamp-2">
                        {contact.aiSummary}
                      </p>
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

    </div>
  );
}
