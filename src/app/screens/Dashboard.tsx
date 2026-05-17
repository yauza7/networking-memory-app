/**
 * W·52 — Главная (Dashboard)
 * Чистый top, без coord-line и значка кита.
 * Hero — конкретное AI-предложение по реальному контакту (follow-up).
 */
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Bell, MessageCircle, Plus, X } from "lucide-react";
import { mockContacts, type Connection } from "../utils/mockData";
import { allContacts, addStoredContact } from "../utils/contactStore";
import { useContactsVersion } from "../utils/useContactsVersion";
import { loadCurrentUser } from "../utils/userStore";
import { loadTasks, updateTaskCompleted } from "../utils/taskStore";
import { unreadCount } from "../utils/notificationStore";
import {
  getActiveSuggestions,
  dismissSuggestion,
  markSuggestionAdded,
  type SuggestedContact,
} from "../utils/suggestedContacts";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Atmosphere,
  Avatar,
  SectionLabel,
  AISparkle,
  Hero,
  cardStyle,
} from "../components/brand/Brand";

export function Dashboard() {
  const currentUser = loadCurrentUser();
  const contactsVersion = useContactsVersion();
  const contacts = useMemo(() => allContacts(mockContacts), [contactsVersion]);
  const [tasksVersion, setTasksVersion] = useState(0);

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

  const allTasks = loadTasks();
  void tasksVersion;
  const activeTasks = allTasks.filter((t) => !t.completed);
  const unreadNotifications = unreadCount();

  const toggleDashTask = (taskId: string, currentlyCompleted: boolean) => {
    updateTaskCompleted(taskId, !currentlyCompleted);
    setTasksVersion((v) => v + 1);
  };

  // ── "Вы можете их знать" suggestions ────────────────────
  const [suggestions, setSuggestions] = useState<SuggestedContact[]>(() => getActiveSuggestions());

  const addSuggestionToContacts = (s: SuggestedContact) => {
    const contactId = `c-${Date.now()}-${s.username}`;
    const newContact: Connection = {
      id: contactId,
      user: {
        id: `u-${Date.now()}`,
        name: s.name,
        username: s.username,
        role: s.role,
        company: s.company,
        tags: s.tags,
        bio: s.description,
        links: [{ type: "telegram", url: `https://t.me/${s.username}` }],
      },
      metAt: new Date().toISOString(),
      event: "Подсказка Echo",
      aiSummary: s.description,
      followUpSent: false,
    };
    addStoredContact(newContact);
    markSuggestionAdded(s.id);
    setSuggestions(getActiveSuggestions());
  };

  const dismissSuggestionCard = (id: string) => {
    dismissSuggestion(id);
    setSuggestions(getActiveSuggestions());
  };

  const firstName = currentUser.name.split(" ")[0] || "друг";

  // ── Pick the most-relevant AI suggestion from real data ────────
  // Priority: oldest pending follow-up > most-recent contact without AI summary
  type Suggestion = {
    contact: (typeof contacts)[number];
    headline: string;
    detail: string;
    cta: string;
  } | null;

  let suggestion: Suggestion = null;
  if (pendingFollowUps.length > 0) {
    const oldest = [...pendingFollowUps].sort(
      (a, b) => new Date(a.metAt).getTime() - new Date(b.metAt).getTime()
    )[0];
    const daysAgo = Math.floor(
      (Date.now() - new Date(oldest.metAt).getTime()) / 86400000
    );
    const fname = oldest.user.name.split(" ")[0];
    suggestion = {
      contact: oldest,
      headline: `Напиши ${fname}`,
      detail: oldest.aiSummary
        ? `${daysAgo} дн. без ответа. Помнишь: ${oldest.aiSummary.toLowerCase()}`
        : `${daysAgo} дн. без ответа. ${
            oldest.event ? `Встреча — ${oldest.event}.` : "Не теряй связь."
          }`,
      cta: oldest.user.username ? "Написать" : "Открыть",
    };
  } else if (recentContacts[0]) {
    const last = recentContacts[0];
    const fname = last.user.name.split(" ")[0];
    suggestion = {
      contact: last,
      headline: `Добавь заметку к ${fname}`,
      detail: last.event
        ? `Свежий контакт с ${last.event}. Запиши, о чём говорили — это самое важное.`
        : `Свежий контакт. Запиши контекст встречи, пока помнишь.`,
      cta: "Заметка",
    };
  }

  const ctaHref = suggestion
    ? suggestion.cta === "Написать" && suggestion.contact.user.username
      ? `https://t.me/${suggestion.contact.user.username}`
      : suggestion.cta === "Заметка"
      ? `/add-note?contact=${suggestion.contact.id}`
      : `/contact/${suggestion.contact.id}`
    : "#";
  const ctaIsExternal = suggestion?.cta === "Написать";

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
        {/* Top bar: greeting + notification bell */}
        <div
          style={{
            padding: "60px 22px 0",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <Hero size={36}>
            Привет,
            <br />
            <span className="it text-muted-w">{firstName}.</span>
          </Hero>

          <Link
            to="/notifications"
            style={{
              position: "relative",
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: "var(--surface)",
              border: "1px solid var(--line-soft)",
              color: "var(--ivory)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <Bell className="w-[18px] h-[18px]" />
            {unreadNotifications > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -3,
                  right: -3,
                  minWidth: 18,
                  height: 18,
                  padding: "0 5px",
                  borderRadius: 9,
                  background: "var(--amber)",
                  color: "var(--abyss)",
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: "var(--mono)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {unreadNotifications}
              </span>
            )}
          </Link>
        </div>

        {/* AI suggestion hero */}
        {suggestion && (
          <div style={{ padding: "20px 16px 0" }}>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              style={{
                ...cardStyle,
                padding: "18px 18px 18px",
                background: "var(--card-hint-bg)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "oklch(0.86 0.13 195 / 0.18)",
                    border: "1px solid var(--signal-dim)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AISparkle size={10} />
                </div>
                <span className="eyebrow" style={{ color: "var(--signal)" }}>
                  AI · ПОДСКАЗКА
                </span>
              </div>

              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <Avatar
                  name={suggestion.contact.user.name}
                  photo={suggestion.contact.user.photo}
                  username={suggestion.contact.user.username}
                  size={56}
                  ring
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Hero size={22}>
                    {suggestion.headline}
                  </Hero>
                  <p
                    style={{
                      fontFamily: "var(--sans)",
                      fontSize: 13.5,
                      lineHeight: 1.5,
                      margin: "8px 0 0",
                      color: "var(--warm)",
                    }}
                  >
                    {suggestion.detail}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                {ctaIsExternal ? (
                  <a
                    href={ctaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={ctaPrimaryStyle}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    {suggestion.cta}
                  </a>
                ) : (
                  <Link to={ctaHref} style={ctaPrimaryStyle}>
                    {suggestion.cta}
                  </Link>
                )}
                <Link
                  to={`/contact/${suggestion.contact.id}`}
                  style={ctaGhostStyle}
                >
                  Открыть карточку
                </Link>
              </div>
            </motion.div>
          </div>
        )}

        {/* Recent */}
        <div style={{ marginTop: 26 }}>
          <SectionLabel
            right={
              <Link to="/contacts" style={{ color: "inherit", textDecoration: "none" }}>
                ВСЕ →
              </Link>
            }
          >
            Недавние
          </SectionLabel>
          <div
            style={{
              padding: "0 16px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {recentContacts.length === 0 ? (
              <div style={{ ...cardStyle, padding: "20px 16px", textAlign: "center" }}>
                <p className="font-serif it text-muted-w" style={{ fontSize: 15, margin: 0 }}>
                  Пока никого. Сканируй QR на встрече.
                </p>
              </div>
            ) : (
              recentContacts.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                >
                  <Link
                    to={`/contact/${c.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div
                      style={{
                        ...cardStyle,
                        padding: "12px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <Avatar name={c.user.name} photo={c.user.photo} username={c.user.username} size={46} ring={false} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: "var(--sans)",
                            fontWeight: 500,
                            fontSize: 16,
                            letterSpacing: "-0.01em",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {c.user.name}
                        </div>
                        {(c.user.role || c.user.company) && (
                          <div
                            className="text-muted-w"
                            style={{
                              fontSize: 12.5,
                              marginTop: 2,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {c.user.role}
                            {c.user.company && ` · ${c.user.company}`}
                          </div>
                        )}
                        {c.user.tags.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                            {c.user.tags.slice(0, 3).map((tag, idx) => (
                              <span
                                key={idx}
                                style={{
                                  padding: "2px 7px",
                                  borderRadius: 100,
                                  background: "oklch(0.86 0.13 195 / 0.10)",
                                  border: "1px solid oklch(0.62 0.105 195 / 0.25)",
                                  color: "var(--signal)",
                                  fontFamily: "var(--mono)",
                                  fontSize: 9.5,
                                  letterSpacing: "0.04em",
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {!c.followUpSent && !completedFollowUpIds.has(c.id) && (
                        <div
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: "var(--amber)",
                          }}
                        />
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* "Вы можете их знать" — Spotify-style suggestions */}
        {suggestions.length > 0 && (
          <div style={{ marginTop: 26 }}>
            <SectionLabel>Вы можете их знать</SectionLabel>
            <div
              className="scrollbar-hide"
              style={{
                display: "flex",
                gap: 12,
                padding: "0 16px",
                overflowX: "auto",
                scrollSnapType: "x mandatory",
                paddingBottom: 4,
              }}
            >
              <AnimatePresence initial={false}>
                {suggestions.map((s) => (
                  <motion.div
                    key={s.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                    style={{
                      ...cardStyle,
                      flex: "0 0 240px",
                      padding: "14px 14px 12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      scrollSnapAlign: "start",
                      position: "relative",
                    }}
                  >
                    {/* Dismiss button */}
                    <button
                      onClick={() => dismissSuggestionCard(s.id)}
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: "transparent",
                        border: "1px solid var(--line-soft)",
                        color: "var(--faint)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        padding: 0,
                      }}
                      aria-label="Скрыть"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>

                    {/* Avatar + name */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar
                        name={s.name}
                        username={s.username}
                        size={42}
                        ring={false}
                      />
                      <div style={{ flex: 1, minWidth: 0, paddingRight: 22 }}>
                        <div
                          style={{
                            fontFamily: "var(--sans)",
                            fontWeight: 500,
                            fontSize: 14,
                            color: "var(--ivory)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {s.name}
                        </div>
                        <div
                          className="font-mono"
                          style={{
                            fontSize: 10,
                            color: "var(--signal-dim)",
                            letterSpacing: "0.04em",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          @{s.username}
                        </div>
                      </div>
                    </div>

                    {/* Role · Company */}
                    <div
                      className="text-muted-w"
                      style={{
                        fontFamily: "var(--sans)",
                        fontSize: 12,
                        lineHeight: 1.3,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {s.role} · {s.company}
                    </div>

                    {/* Description */}
                    <p
                      style={{
                        fontFamily: "var(--sans)",
                        fontSize: 12,
                        lineHeight: 1.4,
                        color: "var(--muted-fg)",
                        margin: 0,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {s.description}
                    </p>

                    {/* Tags */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {s.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          style={{
                            padding: "2px 7px",
                            borderRadius: 100,
                            background: "oklch(0.86 0.13 195 / 0.10)",
                            border: "1px solid oklch(0.62 0.105 195 / 0.25)",
                            color: "var(--signal)",
                            fontFamily: "var(--mono)",
                            fontSize: 9.5,
                            letterSpacing: "0.04em",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Add button */}
                    <button
                      onClick={() => addSuggestionToContacts(s)}
                      style={{
                        marginTop: 4,
                        height: 36,
                        borderRadius: 10,
                        background: "var(--signal)",
                        color: "var(--abyss)",
                        border: "none",
                        fontFamily: "var(--sans)",
                        fontSize: 12,
                        fontWeight: 500,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        cursor: "pointer",
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      В контакты
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Tasks preview */}
        {activeTasks.length > 0 && (
          <div style={{ marginTop: 26 }}>
            <SectionLabel
              right={
                <Link to="/tasks" style={{ color: "inherit", textDecoration: "none" }}>
                  ВСЕ →
                </Link>
              }
            >
              Задачи
            </SectionLabel>
            <div
              style={{
                padding: "0 16px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <AnimatePresence initial={false}>
              {activeTasks.slice(0, 3).map((task) => {
                const overdue = task.dueDate && new Date(task.dueDate) < new Date();
                const due = task.dueDate
                  ? overdue
                    ? "ПРОСРОЧЕНО"
                    : formatDistanceToNow(new Date(task.dueDate), { locale: ru }).toUpperCase()
                  : "БЕЗ СРОКА";
                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 40, transition: { duration: 0.25 } }}
                    style={{
                      ...cardStyle,
                      padding: "12px 14px",
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <button
                      onClick={() => toggleDashTask(task.id, task.completed)}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 7,
                        border: `1.6px solid ${overdue ? "var(--amber)" : "var(--line)"}`,
                        background: "transparent",
                        flexShrink: 0,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                      }}
                      aria-label="Отметить как готово"
                    />
                    <Link
                      to={task.contactId ? `/contact/${task.contactId}` : "/tasks"}
                      style={{ flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}
                    >
                      <div style={{ fontFamily: "var(--sans)", fontSize: 14, lineHeight: 1.3 }}>
                        {task.text}
                      </div>
                    </Link>
                    <span
                      className="font-mono"
                      style={{
                        fontSize: 10,
                        color: overdue ? "var(--amber)" : "var(--faint)",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        flexShrink: 0,
                      }}
                    >
                      {due}
                    </span>
                  </motion.div>
                );
              })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ctaPrimaryStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  height: 38,
  padding: "0 16px",
  borderRadius: 12,
  background: "var(--signal)",
  color: "var(--abyss)",
  fontFamily: "var(--sans)",
  fontSize: 13,
  fontWeight: 500,
  textDecoration: "none",
  boxShadow: "0 4px 18px oklch(0.86 0.13 195 / 0.25)",
};

const ctaGhostStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 38,
  padding: "0 14px",
  borderRadius: 12,
  background: "transparent",
  color: "var(--muted-fg)",
  border: "1px solid var(--line-soft)",
  fontFamily: "var(--sans)",
  fontSize: 13,
  textDecoration: "none",
};

