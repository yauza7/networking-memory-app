import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, UserPlus, MessageCircle, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { motion } from "motion/react";
import {
  loadNotifications,
  getReadIds,
  saveReadIds,
  type AppNotification,
} from "../utils/notificationStore";

const TYPE_CONFIG = {
  contact_added: { icon: UserPlus,      bg: "rgba(0,122,255,0.1)", color: "#007AFF" },
  message:       { icon: MessageCircle, bg: "rgba(52,199,89,0.1)", color: "#34C759" },
  reminder:      { icon: Bell,          bg: "rgba(255,149,0,0.1)", color: "#FF9500" },
};

export function Notifications() {
  const navigate = useNavigate();
  const [items] = useState<AppNotification[]>(() => loadNotifications());
  const [readIds, setReadIds] = useState<Set<string>>(() => getReadIds());

  const notifications = items.map((n) => ({ ...n, read: readIds.has(n.id) || n.read }));
  const unread = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      items.forEach((n) => next.add(n.id));
      saveReadIds(next);
      return next;
    });
  }, [items]);

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-14 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            style={{ color: "#007AFF", fontSize: "17px" }}
            className="flex items-center gap-1 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#0a1628", letterSpacing: "-0.4px" }}>
            Уведомления
          </h1>
        </div>
        {unread > 0 && (
          <button onClick={markAllAsRead} className="text-sm font-medium" style={{ color: "#007AFF" }}>
            Прочитать все
          </button>
        )}
      </div>

      {/* List */}
      {notifications.length > 0 ? (
        <div className="px-4 space-y-2.5">
          {notifications.map((n, i) => {
            const cfg = TYPE_CONFIG[n.type];
            const Icon = cfg.icon;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => !n.read && markAsRead(n.id)}
                className="glass-card p-4 cursor-pointer transition-all active:scale-[0.99]"
                style={!n.read ? { borderColor: "rgba(0,122,255,0.2)" } : { opacity: 0.65 }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: cfg.bg }}
                  >
                    <Icon className="w-5 h-5" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p style={{ fontWeight: 600, fontSize: "14px", color: "#0a1628" }}>{n.title}</p>
                      {!n.read && (
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                          style={{ background: "#007AFF" }}
                        />
                      )}
                    </div>
                    <p style={{ fontSize: "13px", color: "#3c3c43", marginBottom: "4px", lineHeight: 1.4 }}>
                      {n.message}
                    </p>
                    <p style={{ fontSize: "12px", color: "#8E8E93" }}>
                      {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true, locale: ru })}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-[55vh] text-center p-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{ background: "rgba(0,122,255,0.08)" }}
          >
            <Bell className="w-10 h-10" style={{ color: "#8E8E93" }} />
          </div>
          <p style={{ fontWeight: 600, color: "#0a1628", marginBottom: "8px" }}>Нет уведомлений</p>
          <p style={{ fontSize: "14px", color: "#8E8E93" }}>Здесь будут появляться важные обновления</p>
        </div>
      )}
    </div>
  );
}
