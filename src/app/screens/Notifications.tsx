/**
 * W·52 — Уведомления (Notifications)
 * Moody. Список карточек с типовой иконкой, цветным акцентом по типу, индикатор unread.
 */
import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { UserPlus, MessageCircle, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { motion } from "motion/react";
import {
  loadNotifications,
  getReadIds,
  saveReadIds,
  type AppNotification,
} from "../utils/notificationStore";
import {
  Atmosphere,
  Hero,
  RoundBtn,
  cardStyle,
} from "../components/brand/Brand";

const TYPE_CONFIG: Record<
  AppNotification["type"],
  { Icon: typeof UserPlus; tint: string; tintDim: string }
> = {
  contact_added: { Icon: UserPlus,      tint: "var(--signal)", tintDim: "oklch(0.86 0.13 195 / 0.18)" },
  message:       { Icon: MessageCircle, tint: "var(--signal)", tintDim: "oklch(0.86 0.13 195 / 0.14)" },
  reminder:      { Icon: Bell,          tint: "var(--amber)",  tintDim: "oklch(0.80 0.110 65 / 0.18)" },
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
        <div
          style={{
            padding: "56px 18px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <RoundBtn onClick={() => navigate(-1)}>
            <svg width="10" height="14" viewBox="0 0 10 14">
              <path d="M8 1L2 7l6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </RoundBtn>
          {unread > 0 && (
            <button
              onClick={markAllAsRead}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--signal)",
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Прочитать все
            </button>
          )}
        </div>

        {/* Title */}
        <div style={{ padding: "16px 22px 0", display: "flex", alignItems: "baseline", gap: 10 }}>
          <Hero size={32}>Уведомления</Hero>
          {unread > 0 && (
            <span
              className="font-mono"
              style={{
                fontSize: 11,
                color: "var(--signal-dim)",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              {unread} новых
            </span>
          )}
        </div>

        {notifications.length > 0 ? (
          <div style={{ padding: "20px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
            {notifications.map((n, i) => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.reminder;
              const Icon = cfg.Icon;
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: n.read ? 0.55 : 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => !n.read && markAsRead(n.id)}
                  style={{
                    ...cardStyle,
                    padding: "14px 16px",
                    cursor: n.read ? "default" : "pointer",
                    border: n.read ? "1px solid var(--line-soft)" : "1px solid var(--signal-dim)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        background: cfg.tintDim,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon className="w-4 h-4" style={{ color: cfg.tint }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                        <p
                          style={{
                            fontFamily: "var(--sans)",
                            fontWeight: 500,
                            fontSize: 14,
                            color: "var(--ivory)",
                            margin: 0,
                          }}
                        >
                          {n.title}
                        </p>
                        {!n.read && (
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: cfg.tint,
                              flexShrink: 0,
                              marginTop: 5,
                            }}
                          />
                        )}
                      </div>
                      <p
                        style={{
                          fontFamily: "var(--sans)",
                          fontSize: 13,
                          color: "var(--muted-fg)",
                          margin: "4px 0 0",
                          lineHeight: 1.45,
                        }}
                      >
                        {n.message}
                      </p>
                      <p
                        className="font-mono"
                        style={{
                          fontSize: 10,
                          color: "var(--faint)",
                          marginTop: 6,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                        }}
                      >
                        {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true, locale: ru })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "80px 30px",
              textAlign: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                background: "oklch(0.86 0.13 195 / 0.10)",
                border: "1px solid var(--signal-dim)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bell className="w-7 h-7" style={{ color: "var(--signal-dim)" }} />
            </div>
            <Hero size={22}>Тихо в эфире</Hero>
            <p
              className="font-serif it text-muted-w"
              style={{ fontSize: 14, lineHeight: 1.5, maxWidth: 260 }}
            >
              Здесь появятся важные обновления — новые контакты, ответы, напоминания.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
