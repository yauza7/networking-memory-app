/**
 * W·52 — Карточка контакта
 * Чистый top без "СВЯЗЬ·АКТИВНА" и без "Поделиться визиткой".
 * Фото берётся из user.photo, фоллбэк — userpic Telegram по username, иначе инициалы.
 * Добавлен inline-редактор тегов (быстрое добавление / удаление).
 * Контекст встречи (дата + событие) теперь в компактной мета-плашке под именем.
 */
import { useParams, useNavigate, Link } from "react-router";
import { mockContacts } from "../utils/mockData";
import { allContacts, removeStoredContact, updateStoredContact, refreshContactSelf } from "../utils/contactStore";
import { useContactsVersion } from "../utils/useContactsVersion";
import { loadCurrentUser } from "../utils/userStore";
import { loadTasks, saveTasks, addTask } from "../utils/taskStore";
import { Trash2, Mic, Send, X, MessageCircle, Share2, Check } from "lucide-react";
import { createShare } from "../utils/shareApi";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { useEffect, useMemo, useState } from "react";
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
  const contactsVersion = useContactsVersion();
  const contact = useMemo(
    () => allContacts(mockContacts).find((c) => c.id === id),
    [id, contactsVersion]
  );
  const currentUser = loadCurrentUser();

  const [tasks, setTasks] = useState(() =>
    loadTasks().filter((t) => t.contactId === id)
  );
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskDate, setNewTaskDate] = useState(() =>
    new Date(Date.now() + 3 * 86400_000).toISOString().split("T")[0]
  );
  const [tags, setTags] = useState<string[]>(() => contact?.user.tags ?? []);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [customTagText, setCustomTagText] = useState("");
  const [shareState, setShareState] = useState<"idle" | "creating" | "copied">("idle");
  const [aiDraftText, setAiDraftText] = useState<string | null>(null);
  const [aiDraftLoading, setAiDraftLoading] = useState(false);

  // Background-refresh the contact's self-layer (name/role/company/photo/bio)
  // if they're a registered Echo user. Throttled once per username per session.
  useEffect(() => {
    if (!contact || !contact.user.username) return;
    void refreshContactSelf(contact);
  }, [contact?.id, contact?.user.username]);
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
    const msg = aiDraftText ?? buildFallbackDraft();
    window.open(
      `https://t.me/${contact.user.username}?text=${encodeURIComponent(msg)}`
    );
  };

  const buildFallbackDraft = () => {
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
    return lines.join("\n");
  };

  const generateAiDraft = async () => {
    setAiDraftLoading(true);
    try {
      const firstName = contact.user.name.split(" ")[0];
      const senderParts = [currentUser.name, currentUser.role, currentUser.company].filter(Boolean);
      const recipientParts = [contact.user.role, contact.user.company].filter(Boolean);

      const context = [
        `Отправитель: ${senderParts.join(", ") || "не указан"}`,
        currentUser.bio ? `О себе: ${currentUser.bio}` : null,
        `Получатель: ${contact.user.name}${recipientParts.length ? `, ${recipientParts.join(", ")}` : ""}`,
        contact.event ? `Где познакомились: ${contact.event}` : null,
        contact.aiSummary ? `Контекст встречи (AI-сводка): ${contact.aiSummary}` : null,
        contact.note ? `Заметки: ${contact.note}` : null,
        contact.user.tags?.length ? `Теги контакта: ${contact.user.tags.join(", ")}` : null,
      ].filter(Boolean).join("\n");

      const response = await fetch("/api/anthropic/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 400,
          system: `Ты помогаешь нетворкерам в индустрии арбитража трафика и партнёрского маркетинга написать первое follow-up сообщение в Telegram после знакомства.

СТРОГОЕ ПРАВИЛО: используй ТОЛЬКО факты из предоставленного контекста. Никогда не придумывай место знакомства, название конференции, детали разговора или договорённости, если они явно не указаны в данных. Если поле отсутствует — просто не упоминай его.

Напиши короткое живое сообщение — 3-5 предложений. Включи: приветствие по имени, кто пишет (роль/компания отправителя), и предложение продолжить общение. Добавь контекст знакомства и тему разговора ТОЛЬКО если они есть в данных. Тон: дружелюбный, неформальный, по-человечески. Без канцелярита, без "рад знакомству", "надеюсь на сотрудничество". Верни ТОЛЬКО текст сообщения, без кавычек, без пояснений.`,
          messages: [{ role: "user", content: context }],
        }),
      });
      if (!response.ok) throw new Error("API error");
      const data = await response.json();
      const text = (data.content?.[0]?.text ?? "").trim();
      if (text) setAiDraftText(text);
      else setAiDraftText(buildFallbackDraft());
    } catch {
      setAiDraftText(buildFallbackDraft());
    } finally {
      setAiDraftLoading(false);
    }
  };

  const handleShare = async () => {
    if (shareState !== "idle" || !contact) return;
    const tg = (window as any).Telegram?.WebApp;

    // If contact has a username and we're in Telegram — share via inline query
    // so recipient gets a web_app button (opens inside Telegram, not browser)
    if (contact.user.username && tg?.switchInlineQuery) {
      try {
        tg.switchInlineQuery("@" + contact.user.username, ["users", "groups", "channels"]);
        return;
      } catch {}
    }

    // Fallback: create share token → copy/share URL
    setShareState("creating");
    const token = await createShare(contact, contact.aiSummary || contact.note || "");
    if (!token) {
      setShareState("idle");
      alert("Не получилось создать ссылку. Попробуй позже.");
      return;
    }
    const url = `${window.location.origin}/c/${token}`;
    const text = `Знакомься: ${contact.user.name}${contact.user.username ? ` (@${contact.user.username})` : ""}`;
    if (tg?.openTelegramLink) {
      try {
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
        setShareState("copied");
        setTimeout(() => setShareState("idle"), 1800);
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 1800);
    } catch {
      window.prompt("Ссылка для отправки:", url);
      setShareState("idle");
    }
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
              {contact.user.company && (
                <>
                  {" · "}
                  {contact.user.companyUrl ? (
                    <a
                      href={contact.user.companyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "inherit", textDecoration: "underline", textDecorationColor: "var(--line)" }}
                      onClick={(e) => {
                        e.preventDefault();
                        const tg = (window as any).Telegram?.WebApp;
                        if (tg?.openLink) tg.openLink(contact.user.companyUrl!);
                        else window.open(contact.user.companyUrl, "_blank");
                      }}
                    >
                      {contact.user.company}
                    </a>
                  ) : (
                    contact.user.company
                  )}
                </>
              )}
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
          {contact.user.bio && (
            <div style={{ padding: "14px 22px 0" }}>
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.6,
                  margin: 0,
                  color: "var(--warm)",
                  fontFamily: "var(--sans)",
                  textAlign: "center",
                }}
              >
                {contact.user.bio}
              </p>
            </div>
          )}
        </motion.div>

        {/* Primary CTAs */}
        <div style={{ padding: "22px 22px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          {contact.user.username && (
            <IvoryBtn
              h={50}
              onClick={() =>
                window.open(`https://t.me/${contact.user.username}`)
              }
            >
              <MessageCircle className="w-4 h-4" />
              Написать в Telegram
            </IvoryBtn>
          )}
          <button
            onClick={handleShare}
            disabled={shareState === "creating"}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              height: 46, borderRadius: 14,
              background: "transparent",
              border: "1px solid var(--line)",
              color: shareState === "copied" ? "var(--signal)" : "var(--ivory)",
              fontFamily: "var(--sans)", fontWeight: 500, fontSize: 15,
              cursor: shareState === "creating" ? "default" : "pointer",
              opacity: shareState === "creating" ? 0.6 : 1,
              width: "100%",
            }}
          >
            {shareState === "copied" ? (
              <><Check className="w-4 h-4" /> Ссылка скопирована</>
            ) : (
              <><Share2 className="w-4 h-4" /> Поделиться профилем</>
            )}
          </button>
        </div>

        {/* sharedFrom — who passed this contact along */}
        {contact.sharedFrom && contact.sharedFrom.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <SectionLabel>Поделились</SectionLabel>
            <div style={{ padding: "0 22px", display: "flex", flexDirection: "column", gap: 8 }}>
              {contact.sharedFrom.map((s, i) => (
                <div
                  key={`${s.fromUsername}-${s.sharedAt}-${i}`}
                  style={{
                    ...cardStyle,
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ivory)" }}>
                      {s.fromName}
                      {s.fromUsername && (
                        <span className="font-mono" style={{ fontWeight: 400, color: "var(--signal-dim)", marginLeft: 6, fontSize: 11 }}>
                          @{s.fromUsername}
                        </span>
                      )}
                    </span>
                    <span className="font-mono" style={{ fontSize: 10, color: "var(--faint)", letterSpacing: "0.06em" }}>
                      {formatDistanceToNow(new Date(s.sharedAt), { addSuffix: true, locale: ru })}
                    </span>
                  </div>
                  {s.sharedNote && (
                    <p style={{ fontSize: 13, color: "var(--muted-fg)", marginTop: 6, lineHeight: 1.45, fontFamily: "var(--sans)" }}>
                      {s.sharedNote}
                    </p>
                  )}
                  {s.sharedTags.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                      {s.sharedTags.map((t) => (
                        <span
                          key={t}
                          className="font-mono"
                          style={{
                            padding: "2px 8px",
                            borderRadius: 100,
                            border: "1px solid var(--line-soft)",
                            color: "var(--muted-fg)",
                            fontSize: 9.5,
                            letterSpacing: "0.06em",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
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
                background: "var(--card-ai-bg)",
                border: "1px solid var(--card-ai-border)",
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
                style={{ fontSize: 14.5, margin: 0, lineHeight: 1.6, fontFamily: "var(--sans)", color: "var(--ivory)" }}
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
              <button
                onClick={() => { setAddingTask(true); setNewTaskText(""); }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "inherit",
                  fontFamily: "var(--mono)",
                  fontSize: "inherit",
                  letterSpacing: "inherit",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                + ДОБАВИТЬ
              </button>
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

            {/* Inline add-task form */}
            <AnimatePresence>
              {addingTask && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: "hidden", marginTop: 14 }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <input
                      autoFocus
                      type="text"
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setAddingTask(false);
                      }}
                      placeholder="Описание задачи…"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        background: "var(--deep)",
                        border: "1px solid var(--signal-dim)",
                        borderRadius: 12,
                        color: "var(--ivory)",
                        fontFamily: "var(--sans)",
                        fontSize: 14,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="date"
                        value={newTaskDate}
                        onChange={(e) => setNewTaskDate(e.target.value)}
                        style={{
                          flex: 1,
                          padding: "9px 12px",
                          background: "var(--deep)",
                          border: "1px solid var(--line-soft)",
                          borderRadius: 12,
                          color: "var(--ivory)",
                          fontFamily: "var(--sans)",
                          fontSize: 13,
                          outline: "none",
                          colorScheme: "dark",
                        }}
                      />
                      <button
                        onClick={() => {
                          if (!newTaskText.trim()) { setAddingTask(false); return; }
                          const t = {
                            id: `task-${Date.now()}`,
                            contactId: contact.id,
                            contactName: contact.user.name,
                            contactUsername: contact.user.username,
                            text: newTaskText.trim(),
                            completed: false,
                            dueDate: newTaskDate,
                            type: "manual" as const,
                          };
                          addTask(t);
                          setTasks(loadTasks().filter((x) => x.contactId === id));
                          setAddingTask(false);
                          setNewTaskText("");
                          setNewTaskDate(new Date(Date.now() + 3 * 86400_000).toISOString().split("T")[0]);
                        }}
                        style={{
                          height: 42,
                          padding: "0 16px",
                          borderRadius: 12,
                          background: "var(--signal)",
                          color: "var(--abyss)",
                          border: "none",
                          fontFamily: "var(--sans)",
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Добавить
                      </button>
                      <button
                        onClick={() => setAddingTask(false)}
                        style={{
                          height: 42,
                          width: 42,
                          flexShrink: 0,
                          borderRadius: 12,
                          background: "transparent",
                          border: "1px solid var(--line-soft)",
                          color: "var(--muted-fg)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <AISparkle size={11} color="var(--amber)" />
                  <span className="eyebrow" style={{ color: "var(--amber)" }}>
                    AI · ЧЕРНОВИК СООБЩЕНИЯ
                  </span>
                </div>
                <button
                  onClick={generateAiDraft}
                  disabled={aiDraftLoading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 10px",
                    borderRadius: 20,
                    border: "1px solid var(--amber)",
                    background: "transparent",
                    color: "var(--amber)",
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    letterSpacing: "0.06em",
                    cursor: aiDraftLoading ? "default" : "pointer",
                    opacity: aiDraftLoading ? 0.6 : 1,
                  }}
                >
                  {aiDraftLoading ? (
                    <>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                      </svg>
                      ГЕНЕРИРУЮ
                    </>
                  ) : (
                    <>
                      <AISparkle size={9} color="var(--amber)" />
                      {aiDraftText ? "ПЕРЕГЕНЕРИРОВАТЬ" : "СГЕНЕРИРОВАТЬ"}
                    </>
                  )}
                </button>
              </div>

              {aiDraftText ? (
                <textarea
                  value={aiDraftText}
                  onChange={(e) => setAiDraftText(e.target.value)}
                  rows={6}
                  style={{
                    width: "100%",
                    background: "var(--textarea-tinted-bg)",
                    border: "1px solid var(--textarea-tinted-border)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    color: "var(--warm)",
                    fontFamily: "var(--sans)",
                    fontSize: 14.5,
                    lineHeight: 1.55,
                    resize: "none",
                    outline: "none",
                    boxSizing: "border-box",
                    marginBottom: 12,
                  }}
                />
              ) : (
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--muted-fg)",
                    fontFamily: "var(--sans)",
                    lineHeight: 1.5,
                    margin: "0 0 14px",
                    fontStyle: "italic",
                  }}
                >
                  AI напишет персонализированное сообщение на основе заметок и контекста встречи
                </p>
              )}

              <button
                onClick={handleSendFollowUp}
                disabled={!aiDraftText}
                style={{
                  width: "100%",
                  height: 46,
                  borderRadius: 14,
                  background: aiDraftText ? "var(--signal)" : "var(--deep)",
                  color: aiDraftText ? "var(--abyss)" : "var(--muted-fg)",
                  border: "none",
                  fontFamily: "var(--sans)",
                  fontSize: 14,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  cursor: aiDraftText ? "pointer" : "default",
                  boxShadow: aiDraftText ? "0 4px 20px oklch(0.86 0.13 195 / 0.25)" : "none",
                  transition: "background 0.2s, color 0.2s",
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
