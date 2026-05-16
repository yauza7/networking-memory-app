/**
 * W·52 — Задачи (Tasks)
 * Moody. Coord eyebrow, serif title, mono filter chips, active vs completed sections,
 * cyan-accent "НАПИСАТЬ" button on tasks tied to a Telegram username.
 */
import { useState } from "react";
import { Link } from "react-router";
import {
  MessageCircle,
  Users,
  Phone,
  MapPin,
  Send,
  X,
} from "lucide-react";
import { mockContacts } from "../utils/mockData";
import { allContacts } from "../utils/contactStore";
import {
  loadTasks,
  addTask as addTaskStore,
  updateTaskCompleted,
  type Task as StoredTask,
} from "../utils/taskStore";
import { motion, AnimatePresence } from "motion/react";
import {
  Atmosphere,
  Avatar,
  Chip,
  RoundBtn,
  IvoryBtn,
  GhostBtn,
  Hero,
  cardStyle,
} from "../components/brand/Brand";

type Task = StoredTask;

const TASK_BADGE: Record<
  string,
  { label: string; icon: React.ReactNode }
> = {
  message: { label: "Написать", icon: <MessageCircle className="w-3 h-3" /> },
  transfer: { label: "Передать", icon: <Users className="w-3 h-3" /> },
  call: { label: "Позвонить", icon: <Phone className="w-3 h-3" /> },
  meet: { label: "Встреча", icon: <MapPin className="w-3 h-3" /> },
  send_materials: { label: "Материалы", icon: <Send className="w-3 h-3" /> },
};

function TaskCard({
  task,
  onToggle,
}: {
  task: Task;
  onToggle: (id: string) => void;
}) {
  const contact = allContacts(mockContacts).find((c) => c.id === task.contactId);
  const overdue =
    !task.completed && task.dueDate && new Date(task.dueDate) < new Date();
  const dueStr = task.dueDate
    ? overdue
      ? `${Math.floor(
          (Date.now() - new Date(task.dueDate).getTime()) / 86400000
        )} ДН. ПРОСРОЧЕНО`
      : `ДО ${new Date(task.dueDate)
          .toLocaleDateString("ru-RU", { day: "numeric", month: "long" })
          .toUpperCase()}`
    : "";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: task.completed ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, x: 30, transition: { duration: 0.22 } }}
      style={{ ...cardStyle, padding: "14px 14px" }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <button
          onClick={() => onToggle(task.id)}
          style={{
            width: 22,
            height: 22,
            borderRadius: 7,
            border: `1.6px solid ${
              task.completed
                ? "var(--signal)"
                : overdue
                ? "var(--amber)"
                : "var(--line)"
            }`,
            background: task.completed ? "var(--signal)" : "transparent",
            flexShrink: 0,
            marginTop: 1,
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link
            to={`/contact/${task.contactId}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            {contact && (
              <Avatar
                name={contact.user.name}
                photo={contact.user.photo}
                size={20}
                ring={false}
              />
            )}
            <span
              className="font-mono"
              style={{
                fontSize: 10.5,
                color: "var(--signal-dim)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {task.contactUsername ? `@${task.contactUsername}` : task.contactName}
            </span>
          </Link>
          <div
            style={{
              fontFamily: "var(--sans)",
              fontSize: 15,
              marginTop: 6,
              lineHeight: 1.35,
              textDecoration: task.completed ? "line-through" : "none",
            }}
          >
            {task.text}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 10,
              flexWrap: "wrap",
            }}
          >
            {dueStr && (
              <span
                className="font-mono"
                style={{
                  fontSize: 10,
                  color: overdue ? "var(--amber)" : "var(--faint)",
                  letterSpacing: "0.14em",
                }}
              >
                {dueStr}
              </span>
            )}
            {task.type !== "manual" && TASK_BADGE[task.type] && (
              <span
                className="font-mono"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 10,
                  color: "var(--muted-fg)",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  padding: "3px 8px",
                  borderRadius: 100,
                  background: "var(--surface)",
                  border: "1px solid var(--line-soft)",
                }}
              >
                {TASK_BADGE[task.type].icon}
                {TASK_BADGE[task.type].label}
              </span>
            )}
            {!task.completed && task.contactUsername && (
              <button
                onClick={() =>
                  window.open(`https://t.me/${task.contactUsername}`)
                }
                style={{
                  height: 26,
                  padding: "0 11px",
                  borderRadius: 100,
                  background: "transparent",
                  color: "var(--ivory)",
                  border: "1px solid var(--line-soft)",
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  cursor: "pointer",
                }}
              >
                <MessageCircle className="w-2.5 h-2.5" />
                TG
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function Tasks() {
  const [filter, setFilter] = useState<"active" | "completed">("active");
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedType, setSelectedType] = useState<Task["type"]>("manual");
  const [customTypeText, setCustomTypeText] = useState("");

  const toggleTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const nextCompleted = !task.completed;
    updateTaskCompleted(taskId, nextCompleted);
    setTasks(loadTasks());
    if (task.type === "message" && task.contactId) {
      try {
        const sent: string[] = JSON.parse(
          localStorage.getItem("w52_followup_sent") || "[]"
        );
        if (nextCompleted) {
          if (!sent.includes(task.contactId))
            localStorage.setItem(
              "w52_followup_sent",
              JSON.stringify([...sent, task.contactId])
            );
        } else {
          localStorage.setItem(
            "w52_followup_sent",
            JSON.stringify(sent.filter((id) => id !== task.contactId))
          );
        }
      } catch {}
    }
  };

  const addTask = () => {
    if (!newTaskText.trim() || !dueDate) return;
    const selectedContact = selectedContactId
      ? allContacts(mockContacts).find((c) => c.id === selectedContactId)
      : null;
    const taskType = selectedType === "manual" && customTypeText.trim()
      ? ("manual" as Task["type"])
      : selectedType;
    const newTask: Task = {
      id: `task-${Date.now()}`,
      contactId: selectedContact?.id || "",
      contactName: selectedContact?.user.name || "",
      contactUsername: selectedContact?.user.username,
      text: newTaskText.trim(),
      completed: false,
      dueDate,
      type: taskType,
      ...(selectedType === "manual" && customTypeText.trim()
        ? { customLabel: customTypeText.trim() }
        : {}),
    };
    addTaskStore(newTask);
    setTasks(loadTasks());
    setNewTaskText("");
    setSelectedContactId("");
    setDueDate("");
    setSelectedType("manual");
    setCustomTypeText("");
    setShowAddModal(false);
  };

  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  const visibleActive = filter === "active" ? activeTasks : [];
  const visibleCompleted = filter === "completed" ? completedTasks : [];

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
      <Atmosphere intensity={0.25} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            padding: "60px 22px 0",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <Hero size={36}>Задачи</Hero>
          <RoundBtn ivory onClick={() => setShowAddModal(true)} size={40}>
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path
                d="M8 2v12M2 8h12"
                stroke="var(--abyss)"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </RoundBtn>
        </div>

        <div
          style={{ display: "flex", gap: 6, padding: "18px 22px 0" }}
          className="scrollbar-hide"
        >
          <Chip
            label={`АКТИВНЫЕ · ${activeTasks.length}`}
            active={filter === "active"}
            onClick={() => setFilter("active")}
          />
          <Chip
            label={`ГОТОВО · ${completedTasks.length}`}
            active={filter === "completed"}
            onClick={() => setFilter("completed")}
          />
        </div>

        {(visibleActive.length > 0 || visibleCompleted.length > 0) && (
          <div
            style={{
              padding: "16px 16px 0",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <AnimatePresence initial={false}>
              {visibleActive.map((task) => (
                <TaskCard key={task.id} task={task} onToggle={toggleTask} />
              ))}
              {visibleCompleted.map((task) => (
                <TaskCard key={task.id} task={task} onToggle={toggleTask} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {tasks.length === 0 && (
          <div
            style={{
              padding: "80px 22px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Hero size={22}>Нет задач</Hero>
            <p
              className="font-serif it text-muted-w"
              style={{ fontSize: 14, lineHeight: 1.5, maxWidth: 280 }}
            >
              Они создаются автоматически при добавлении контакта или вручную.
            </p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              padding: 16,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(16px)",
            }}
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                ...cardStyle,
                background: "var(--surface)",
                padding: 22,
                width: "100%",
                maxWidth: 520,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 18,
                }}
              >
                <Hero size={22}>Новая задача</Hero>
                <RoundBtn onClick={() => setShowAddModal(false)} size={32}>
                  <X className="w-3.5 h-3.5" />
                </RoundBtn>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {/* TYPE */}
                <div>
                  <label className="eyebrow" style={{ display: "block", marginBottom: 8 }}>
                    ТИП
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {(
                      [
                        ...Object.entries(TASK_BADGE),
                        ["manual", { label: "Своя", icon: null }],
                        ["none", { label: "Без тега", icon: null }],
                      ] as [Task["type"], { label: string; icon: React.ReactNode }][]
                    ).map(([type, cfg]) => (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "6px 12px",
                          borderRadius: 100,
                          background: selectedType === type ? "var(--ivory)" : "transparent",
                          color: selectedType === type ? "var(--abyss)" : "var(--muted-fg)",
                          fontFamily: "var(--mono)",
                          fontSize: 11,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          border: "1px solid " + (selectedType === type ? "var(--ivory)" : "var(--line-soft)"),
                          cursor: "pointer",
                        }}
                      >
                        {cfg.icon}
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                  {selectedType === "manual" && (
                    <input
                      value={customTypeText}
                      onChange={(e) => setCustomTypeText(e.target.value)}
                      placeholder="Название типа…"
                      style={{
                        marginTop: 8,
                        width: "100%",
                        padding: "10px 14px",
                        background: "var(--deep)",
                        border: "1px solid var(--line-soft)",
                        borderRadius: 12,
                        color: "var(--ivory)",
                        fontFamily: "var(--sans)",
                        fontSize: 14,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  )}
                </div>

                {/* CONTACT (optional) */}
                <div>
                  <label className="eyebrow" style={{ display: "block", marginBottom: 8 }}>
                    КОНТАКТ
                  </label>
                  <select
                    value={selectedContactId}
                    onChange={(e) => setSelectedContactId(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      background: "var(--deep)",
                      border: "1px solid var(--line-soft)",
                      borderRadius: 12,
                      color: "var(--ivory)",
                      fontFamily: "var(--sans)",
                      fontSize: 14,
                    }}
                  >
                    <option value="">Без контакта</option>
                    {allContacts(mockContacts).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.user.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* TASK TEXT */}
                <div>
                  <label className="eyebrow" style={{ display: "block", marginBottom: 8 }}>
                    ЗАДАЧА
                  </label>
                  <textarea
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="Отправить коммерческое предложение"
                    rows={2}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      background: "var(--deep)",
                      border: "1px solid var(--line-soft)",
                      borderRadius: 12,
                      color: "var(--ivory)",
                      fontFamily: "var(--sans)",
                      fontSize: 14,
                      resize: "none",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* DUE DATE */}
                <div>
                  <label className="eyebrow" style={{ display: "block", marginBottom: 8 }}>
                    СРОК
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      background: "var(--deep)",
                      border: "1px solid var(--line-soft)",
                      borderRadius: 12,
                      color: "var(--ivory)",
                      fontFamily: "var(--sans)",
                      fontSize: 14,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
                <IvoryBtn
                  h={48}
                  onClick={addTask}
                  disabled={!newTaskText.trim() || !dueDate}
                >
                  Создать
                </IvoryBtn>
                <GhostBtn h={48} full={false} onClick={() => setShowAddModal(false)}>
                  Отмена
                </GhostBtn>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
