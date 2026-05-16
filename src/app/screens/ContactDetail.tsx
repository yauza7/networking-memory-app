/**
 * W·52 — Карточка контакта
 * Чистый top без "СВЯЗЬ·АКТИВНА" и без "Поделиться визиткой".
 * Фото берётся из user.photo, фоллбэк — userpic Telegram по username, иначе инициалы.
 * Добавлен inline-редактор тегов (быстрое добавление / удаление).
 * Контекст встречи (дата + событие) теперь в компактной мета-плашке под именем.
 */
import { useParams, useNavigate, Link } from "react-router";
import { mockContacts } from "../utils/mockData";
import { allContacts, removeStoredContact, updateStoredContact } from "../utils/contactStore";
import { loadCurrentUser } from "../utils/userStore";
import { loadTasks, saveTasks } from "../utils/taskStore";
import { Trash2, Mic, Send, X, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Atmosphere,
  Avatar,
  RoundBtn,
  IvoryBtn,
  SectionLabel,
  AISparkle,
  Hero,
  cardStyle,
} from "../components/brand/Brand";

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

// Tag sort: stable order by group, then by intra-group order
const TAG_ORDER: Record<string, number> = (() => {
  const o: Record<string, number> = {};
  let i = 0;
  TAG_GROUPS.forEach((g) => g.tags.forEach((t) => (o[t] = i++)));
  return o;
})();
function sortTags(tags: string[]): string[] {
  return [...tags].sort((a, b) => {
    const ai = TAG_ORDER[a] ?? 999;
    const bi = TAG_ORDER[b] ?? 999;
    return ai - bi;
  });
}

export function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const contact = allContacts(mockContacts).find((c) => c.id === id);
  const currentUser = loadCurrentUser();

  const [tasks, setTasks] = useState(() =>
    loadTasks().filter((t) => t.contactId === id)
  );
  const [tags, setTags] = useState<string[]>(() => contact?.user.tags ?? []);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [customTagText, setCustomTagText] = useState("");
  const [noteEditing, setNoteEditing] = useState(false);
  const [noteText, setNoteText] = useState<string>(() => contact?.note ?? "");

  if (!contact) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
          color: "var(--muted-fg)",
        }}
      >
        <p className="font-serif it">Контакт не найден</p>
      </div>
    );
  }

  const persistTags = (next: string[]) => {
    setTags(next);
    updateStoredContact(contact.id, {
      user: { ...contact.user, tags: next } as any,
    });
  };

  const toggleTag = (tag: string) => {
    persistTags(
      tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]
    );
  };

  const addCustomTag = () => {
    const t = customTagText.trim();
    if (!t || tags.includes(t)) return;
    persistTags([...tags, t]);
    setCustomTagText("");
  };

  const saveNote = () => {
    const trimmed = noteText.trim();
    updateStoredContact(contact!.id, { note: trimmed || undefined });
    setNoteEditing(false);
  };

  const toggleTask = (taskId: string) => {
    const allTasks = loadTasks();
    const updated = allTasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    saveTasks(updated);
    setTasks(updated.filter((t) => t.contactId === id));
  };

  const handleDelete = () => {
    if (!confirm(`Удалить ${contact.user.name} из контактов?`)) return;
    removeStoredContact(contact.id);
    navigate("/contacts", { replace: true });
  };

  const handleSendFollowUp = () => {
    if (!contact.user.username) return;
    const firstName = contact.user.name.split(" ")[0];
    const lines: string[] = [`Привет ${firstName}!`, ""];
    const myIntro = [currentUser.name, currentUser.role, currentUser.company]
      .filter(Boolean)
      .join(", ");
    lines.push(`Я ${myIntro}.`);
    if (contact.event)
      lines.push(`Было приятно познакомиться на ${contact.event}!`);
    if (contact.aiSummary)
      lines.push(`\nПомню, ты ${contact.aiSummary.toLowerCase()}.`);
    if (currentUser.bio) lines.push(`\n${currentUser.bio}`);
    lines.push("\nДавай продолжим общение!");
    const message = lines.join("\n");
    window.open(
      `https://t.me/${contact.user.username}?text=${encodeURIComponent(message)}`
    );
  };

  const metAt = new Date(contact.metAt);
  const metHuman = formatDistanceToNow(metAt, { addSuffix: true, locale: ru });

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
      <Atmosphere intensity={0.35} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Top bar — clean: back + delete only */}
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
              <path
                d="M8 1L2 7l6 6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </RoundBtn>
          <RoundBtn onClick={handleDelete}>
            <Trash2 className="w-4 h-4" style={{ color: "var(--danger)" }} />
          </RoundBtn>
        </div>

        {/* Hero — photo, name, role/company, username */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 14,
            padding: "0 22px",
          }}
        >
          <Avatar
            name={contact.user.name}
            photo={contact.user.photo}
            username={contact.user.username}
            size={108}
            ring
          />
          <Hero size={28} style={{ marginTop: 16, textAlign: "center" }}>
            {contact.user.name}
          </Hero>
          {(contact.user.role || contact.user.company) && (
            <div
              className="text-muted-w"
              style={{
                fontSize: 14,
                marginTop: 6,
                textAlign: "center",
                fontFamily: "var(--sans)",
              }}
            >
              {contact.user.role}
              {contact.user.company && ` · ${contact.user.company}`}
            </div>
          )}
          {contact.user.username && (
            <div
              className="font-mono"
              style={{
                fontSize: 12,
                marginTop: 4,
                color: "var(--signal-dim)",
                letterSpacing: "0.04em",
              }}
            >
              @{contact.user.username}
            </div>
          )}
        </motion.div>

        {/* Primary CTA only — no "Поделиться визиткой" */}
        {contact.user.username && (
          <div style={{ padding: "22px 22px 0" }}>
            <IvoryBtn
              h={50}
              onClick={() =>
                window.open(`https://t.me/${contact.user.username}`)
              }
            >
              <MessageCircle className="w-4 h-4" />
              Написать в Telegram
            </IvoryBtn>
          </div>
        )}

        {/* Tags — editable */}
        <div style={{ marginTop: 22 }}>
          <SectionLabel
            right={
              <button
                onClick={() => setTagPickerOpen((v) => !v)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--signal)",
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {tagPickerOpen ? "ГОТОВО" : "+ РЕДАКТИРОВАТЬ"}
              </button>
            }
          >
            Теги
          </SectionLabel>
          <div style={{ padding: "0 22px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {tags.length === 0 && !tagPickerOpen && (
                <p
                  className="font-serif it text-muted-w"
                  style={{ fontSize: 13, margin: "2px 0 0" }}
                >
                  Нет тегов. Добавь, чтобы потом быстро находить.
                </p>
              )}
              {sortTags(tags).map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    if (tagPickerOpen) toggleTag(tag);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 10px",
                    borderRadius: 100,
                    background: "oklch(0.86 0.13 195 / 0.10)",
                    border: "1px solid oklch(0.62 0.105 195 / 0.30)",
                    color: "var(--signal)",
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    letterSpacing: "0.04em",
                    cursor: tagPickerOpen ? "pointer" : "default",
                  }}
                >
                  {tag}
                  {tagPickerOpen && <X className="w-2.5 h-2.5" />}
                </button>
              ))}
            </div>

            <AnimatePresence>
              {tagPickerOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: "hidden" }}
                >
                  <div
                    className="hairline"
                    style={{ margin: "14px 0", opacity: 0.4 }}
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {/* Custom tag input */}
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        value={customTagText}
                        onChange={(e) => setCustomTagText(e.target.value.slice(0, 30))}
                        onKeyDown={(e) => e.key === "Enter" && addCustomTag()}
                        placeholder="Свой тег…"
                        style={{
                          flex: 1,
                          background: "var(--deep)",
                          border: "1px solid var(--line-soft)",
                          borderRadius: 100,
                          padding: "6px 12px",
                          color: "var(--ivory)",
                          fontFamily: "var(--mono)",
                          fontSize: 11,
                          outline: "none",
                          appearance: "none",
                          WebkitAppearance: "none",
                        }}
                      />
                      <button
                        onClick={addCustomTag}
                        disabled={!customTagText.trim()}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 100,
                          background: customTagText.trim() ? "var(--signal)" : "transparent",
                          color: customTagText.trim() ? "var(--abyss)" : "var(--muted-fg)",
                          border: `1px solid ${customTagText.trim() ? "var(--signal)" : "var(--line-soft)"}`,
                          fontFamily: "var(--mono)",
                          fontSize: 11,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          cursor: customTagText.trim() ? "pointer" : "default",
                        }}
                      >
                        + Добавить
                      </button>
                    </div>
                    {TAG_GROUPS.map((group) => {
                      const available = group.tags.filter((t) => !tags.includes(t));
                      if (available.length === 0) return null;
                      return (
                        <div key={group.label}>
                          <div
                            className="eyebrow"
                            style={{ marginBottom: 6, color: "var(--signal-dim)" }}
                          >
                            {group.label}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {available.map((tag) => (
                              <button
                                key={tag}
                                onClick={() => toggleTag(tag)}
                                style={{
                                  padding: "5px 10px",
                                  borderRadius: 100,
                                  background: "transparent",
                                  color: "var(--muted-fg)",
                                  border: "1px solid var(--line-soft)",
                                  fontFamily: "var(--mono)",
                                  fontSize: 11,
                                  letterSpacing: "0.04em",
                                  cursor: "pointer",
                                }}
                              >
                                + {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* AI summary */}
        {contact.aiSummary && (
          <div style={{ padding: "24px 16px 0" }}>
            <div
              style={{
                ...cardStyle,
                background: "oklch(0.20 0.04 200 / 0.50)",
                border: "1px solid oklch(0.50 0.10 195 / 0.30)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <AISparkle size={11} />
                <span className="eyebrow" style={{ color: "var(--signal)" }}>
                  AI · О ЧЁМ ГОВОРИЛИ
                </span>
              </div>
              <p
                className="font-serif"
                style={{ fontSize: 15.5, margin: 0, lineHeight: 1.5 }}
              >
                {contact.aiSummary}
              </p>
            </div>
          </div>
        )}

        {/* Tasks */}
        <div style={{ marginTop: 22 }}>
          <SectionLabel
            right={
              <Link
                to="/tasks"
                style={{ color: "inherit", textDecoration: "none" }}
              >
                + ДОБАВИТЬ
              </Link>
            }
          >
            Задачи
          </SectionLabel>
          <div
            style={{
              padding: "0 22px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {tasks.length === 0 ? (
              <p
                className="font-serif it text-muted-w"
                style={{ fontSize: 14 }}
              >
                Нет задач по этому контакту
              </p>
            ) : (
              tasks.map((task) => {
                const overdue =
                  task.dueDate && new Date(task.dueDate) < new Date();
                const dueStr = task.dueDate
                  ? `ДО ${new Date(task.dueDate)
                      .toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "long",
                      })
                      .toUpperCase()}`
                  : "";
                return (
                  <div
                    key={task.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      opacity: task.completed ? 0.5 : 1,
                    }}
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        border: `1.5px solid ${
                          task.completed
                            ? "var(--signal)"
                            : overdue
                            ? "var(--amber)"
                            : "var(--line)"
                        }`,
                        background: task.completed
                          ? "var(--signal)"
                          : "transparent",
                        flexShrink: 0,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {task.completed && (
                        <svg width="12" height="12" viewBox="0 0 12 12">
                          <path
                            d="M2.5 6L5 8.5l4.5-5"
                            stroke="var(--abyss)"
                            strokeWidth="1.8"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontFamily: "var(--sans)",
                          fontSize: 15,
                          textDecoration: task.completed
                            ? "line-through"
                            : "none",
                        }}
                      >
                        {task.text}
                      </div>
                      {dueStr && (
                        <div
                          className="font-mono"
                          style={{
                            fontSize: 10,
                            marginTop: 4,
                            color: overdue ? "var(--amber)" : "var(--faint)",
                            letterSpacing: "0.12em",
                          }}
                        >
                          {overdue ? "ПРОСРОЧЕНО · " : ""}
                          {dueStr}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginTop: 24 }}>
          <SectionLabel
            right={
              <button
                onClick={() => {
                  if (noteEditing) saveNote();
                  else setNoteEditing(true);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--signal)",
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {noteEditing ? "ГОТОВО" : noteText ? "+ РЕДАКТИРОВАТЬ" : "+ ДОБАВИТЬ"}
              </button>
            }
          >
            Заметка
          </SectionLabel>
          <div style={{ padding: "0 22px" }}>
            {noteEditing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="О чём говорили, договорённости, контекст…"
                  rows={4}
                  autoFocus
                  style={{
                    width: "100%",
                    background: "var(--deep)",
                    border: "1px solid var(--line-soft)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    color: "var(--ivory)",
                    fontFamily: "var(--sans)",
                    fontSize: 14.5,
                    lineHeight: 1.5,
                    resize: "none",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <Link
                    to={`/add-note?contact=${contact.id}`}
                    style={{
                      flex: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      height: 38,
                      borderRadius: 12,
                      background: "transparent",
                      border: "1px solid var(--signal-dim)",
                      color: "var(--signal)",
                      fontFamily: "var(--sans)",
                      fontSize: 13,
                      fontWeight: 500,
                      textDecoration: "none",
                    }}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    Голосом + AI
                  </Link>
                  <button
                    onClick={saveNote}
                    style={{
                      flex: 1,
                      height: 38,
                      borderRadius: 12,
                      background: "var(--ivory)",
                      color: "var(--abyss)",
                      border: "none",
                      fontFamily: "var(--sans)",
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            ) : noteText ? (
              <div style={{ display: "flex", gap: 14 }}>
                <div
                  style={{
                    width: 3,
                    marginTop: 6,
                    borderRadius: 2,
                    background: "var(--signal-dim)",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontFamily: "var(--sans)",
                      fontSize: 14.5,
                      margin: 0,
                      lineHeight: 1.55,
                      whiteSpace: "pre-line",
                      color: "var(--warm)",
                    }}
                  >
                    {noteText}
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={() => setNoteEditing(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    height: 38,
                    padding: "0 14px",
                    borderRadius: 12,
                    background: "transparent",
                    border: "1px solid var(--line-soft)",
                    color: "var(--ivory)",
                    fontFamily: "var(--sans)",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Текстом
                </button>
                <Link
                  to={`/add-note?contact=${contact.id}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    height: 38,
                    padding: "0 14px",
                    borderRadius: 12,
                    background: "var(--signal)",
                    color: "var(--abyss)",
                    fontFamily: "var(--sans)",
                    fontSize: 13,
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  <Mic className="w-3.5 h-3.5" />
                  Голосом + AI
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Smart follow-up draft */}
        {!contact.followUpSent && contact.user.username && (
          <div style={{ padding: "24px 16px 0" }}>
            <div style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <AISparkle size={11} color="var(--amber)" />
                <span className="eyebrow" style={{ color: "var(--amber)" }}>
                  AI · ЧЕРНОВИК СООБЩЕНИЯ
                </span>
              </div>
              <p
                className="font-serif"
                style={{
                  fontSize: 14.5,
                  margin: "0 0 14px",
                  lineHeight: 1.55,
                  whiteSpace: "pre-line",
                  color: "var(--warm)",
                }}
              >
                {(() => {
                  const firstName = contact.user.name.split(" ")[0];
                  const myIntro = [
                    currentUser.name,
                    currentUser.role,
                    currentUser.company,
                  ]
                    .filter(Boolean)
                    .join(", ");
                  const lines = [`Привет ${firstName}!`, "", `Я ${myIntro}.`];
                  if (contact.event)
                    lines.push(
                      `Было приятно познакомиться на ${contact.event}!`
                    );
                  if (contact.aiSummary)
                    lines.push(
                      `\nПомню, ты ${contact.aiSummary.toLowerCase()}.`
                    );
                  if (currentUser.bio) lines.push(`\n${currentUser.bio}`);
                  lines.push("\nДавай продолжим общение!");
                  return lines.join("\n");
                })()}
              </p>
              <button
                onClick={handleSendFollowUp}
                style={{
                  width: "100%",
                  height: 46,
                  borderRadius: 14,
                  background: "var(--signal)",
                  color: "var(--abyss)",
                  border: "none",
                  fontFamily: "var(--sans)",
                  fontSize: 14,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  cursor: "pointer",
                  boxShadow: "0 4px 20px oklch(0.86 0.13 195 / 0.25)",
                }}
              >
                <Send className="w-4 h-4" />
                Отправить в Telegram
              </button>
            </div>
          </div>
        )}

        {/* Meta footer — event + when met */}
        <div
          style={{
            padding: "26px 22px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            className="font-mono"
            style={{
              fontSize: 10,
              color: "var(--faint)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              textAlign: "center",
            }}
          >
            {contact.event ? `${contact.event} · ` : ""}
            {metHuman}
          </span>
        </div>
      </div>
    </div>
  );
}
