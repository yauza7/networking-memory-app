import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, CheckSquare, Square, Plus, Calendar, X, MessageCircle, Users, Phone, MapPin, Send } from "lucide-react";
import { mockContacts } from "../utils/mockData";
import { loadTasks, saveTasks, DEFAULT_SEED_TASKS, type Task as StoredTask } from "../utils/taskStore";
import { motion, AnimatePresence } from "motion/react";

type Task = StoredTask;
const seedTasks = DEFAULT_SEED_TASKS; // alias for backward compat in saveTasks filter

const SYSTEM_BADGE: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  message:       { label: "Написать",   color: "#007AFF", bg: "rgba(0,122,255,0.08)",   icon: <MessageCircle className="w-3 h-3" /> },
  transfer:      { label: "Передать",   color: "#FF9500", bg: "rgba(255,149,0,0.08)",   icon: <Users className="w-3 h-3" /> },
  call:          { label: "Позвонить",  color: "#34C759", bg: "rgba(52,199,89,0.08)",   icon: <Phone className="w-3 h-3" /> },
  meet:          { label: "Встреча",    color: "#AF52DE", bg: "rgba(175,82,222,0.08)",  icon: <MapPin className="w-3 h-3" /> },
  send_materials:{ label: "Материалы", color: "#FF3B30", bg: "rgba(255,59,48,0.08)",   icon: <Send className="w-3 h-3" /> },
};

function TaskCard({ task, i, onToggle }: { task: Task; i: number; onToggle: (id: string) => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: task.completed ? 0.55 : 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95, transition: { duration: 0.22 } }}
      transition={{ delay: i * 0.03, duration: 0.28 }}
      className="glass-card p-4"
    >
      <div className="flex items-start gap-3">
        <button onClick={() => onToggle(task.id)} className="mt-0.5 flex-shrink-0 transition-transform active:scale-90">
          {task.completed
            ? <CheckSquare className="w-5 h-5" style={{ color: "#34C759" }} />
            : <Square className="w-5 h-5" style={{ color: "#8E8E93" }} />}
        </button>
        <div className="flex-1">
          <Link to={`/contact/${task.contactId}`} className="text-sm font-semibold" style={{ color: "#007AFF" }}>
            {task.contactName}
          </Link>
          <p
            style={{
              fontSize: "14px",
              color: task.completed ? "#8E8E93" : "#0a1628",
              marginTop: "2px",
              textDecoration: task.completed ? "line-through" : "none",
            }}
          >
            {task.text}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Calendar className="w-3 h-3" style={{ color: "#8E8E93" }} />
            <span style={{ fontSize: "12px", color: "#8E8E93" }}>
              {new Date(task.dueDate).toLocaleDateString("ru-RU")}
            </span>
            {!task.completed && new Date(task.dueDate) < new Date() && (
              <span style={{ fontSize: "12px", color: "#FF3B30", fontWeight: 600 }}>Просрочено</span>
            )}
            {task.type !== "manual" && SYSTEM_BADGE[task.type] && (
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: SYSTEM_BADGE[task.type].bg, color: SYSTEM_BADGE[task.type].color }}
              >
                {SYSTEM_BADGE[task.type].icon}
                {SYSTEM_BADGE[task.type].label}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function Tasks() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  // loadTasks() already merges localStorage + DEFAULT_SEED_TASKS
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedType, setSelectedType] = useState<Task["type"]>("manual");

  const toggleTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
    setTasks(updated);
    saveTasks(updated);

    // Sync "message" tasks → Dashboard follow-up counter
    if (task?.type === "message" && task.contactId) {
      try {
        const sent: string[] = JSON.parse(localStorage.getItem("w52_followup_sent") || "[]");
        if (!task.completed) {
          // marking done → add contactId to sent list
          if (!sent.includes(task.contactId)) {
            localStorage.setItem("w52_followup_sent", JSON.stringify([...sent, task.contactId]));
          }
        } else {
          // un-checking → remove from sent list
          localStorage.setItem("w52_followup_sent", JSON.stringify(sent.filter((id) => id !== task.contactId)));
        }
      } catch {}
    }
  };

  const addTask = () => {
    if (!newTaskText.trim() || !selectedContactId || !dueDate) return;
    const selectedContact = mockContacts.find((c) => c.id === selectedContactId);
    if (!selectedContact) return;
    const newTask: Task = {
      id: `task-${Date.now()}`,
      contactId: selectedContactId,
      contactName: selectedContact.user.name,
      text: newTaskText.trim(),
      completed: false,
      dueDate,
      type: selectedType,
    };
    const updated = [newTask, ...tasks];
    setTasks(updated);
    saveTasks(updated);
    setNewTaskText(""); setSelectedContactId(""); setDueDate(""); setSelectedType("manual");
    setShowAddModal(false);
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-14 pb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} style={{ color: "#007AFF" }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#0a1628", letterSpacing: "-0.4px" }}>Задачи</h1>
            <p style={{ fontSize: "12px", color: "#8E8E93", marginTop: "1px" }}>
              {activeTasks.length} активных · {completedTasks.length} завершено
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{ background: "#007AFF", boxShadow: "0 4px 12px rgba(0,122,255,0.3)" }}
        >
          <Plus className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Filter pills */}
      <div className="px-4 mb-4 flex gap-2">
        {([["all", `Все (${tasks.length})`], ["active", `Активные (${activeTasks.length})`], ["completed", `Готово (${completedTasks.length})`]] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={filter === val
              ? { background: "#007AFF", color: "#fff" }
              : { background: "rgba(0,0,0,0.05)", color: "#3c3c43" }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Active Tasks */}
      <div className="px-4 space-y-2.5">
        <AnimatePresence initial={false}>
          {filteredTasks.filter((t) => !t.completed).map((task, i) => (
            <TaskCard key={task.id} task={task} i={i} onToggle={toggleTask} />
          ))}
        </AnimatePresence>
      </div>

      {/* Completed Tasks */}
      {filteredTasks.some((t) => t.completed) && filter !== "active" && (
        <div className="px-4 mt-4">
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#8E8E93", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "10px" }}>
            Завершено
          </p>
          <div className="space-y-2.5">
            <AnimatePresence initial={false}>
              {filteredTasks.filter((t) => t.completed).map((task, i) => (
                <TaskCard key={task.id} task={task} i={i} onToggle={toggleTask} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {filteredTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(0,122,255,0.08)" }}>
            <CheckSquare className="w-10 h-10" style={{ color: "#8E8E93" }} />
          </div>
          <p style={{ fontWeight: 600, color: "#0a1628", marginBottom: "8px" }}>Нет задач</p>
          <p style={{ fontSize: "14px", color: "#8E8E93" }}>
            {filter === "completed" ? "Завершённых задач пока нет" : "Добавьте задачу для контакта"}
          </p>
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-4"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(16px)" }}
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="glass-card p-6 w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <p style={{ fontWeight: 700, fontSize: "20px", color: "#0a1628" }}>Новая задача</p>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.06)" }}>
                  <X className="w-4 h-4" style={{ color: "#3c3c43" }} />
                </button>
              </div>

              <div className="space-y-3">
                {/* Task type picker */}
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "#8E8E93", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    Тип
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(SYSTEM_BADGE) as [Task["type"], typeof SYSTEM_BADGE[string]][]).concat([["manual", { label: "Своя", color: "#3c3c43", bg: "rgba(0,0,0,0.06)", icon: null }]]).map(([type, cfg]) => (
                      <button
                        key={type}
                        onClick={() => setSelectedType(type)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                        style={selectedType === type
                          ? { background: cfg.color, color: "#fff", boxShadow: `0 2px 8px ${cfg.color}55` }
                          : { background: cfg.bg, color: cfg.color }}
                      >
                        {cfg.icon}{cfg.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "#8E8E93", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    Контакт
                  </label>
                  <select
                    value={selectedContactId}
                    onChange={(e) => setSelectedContactId(e.target.value)}
                    className="w-full px-4 py-3 text-sm"
                  >
                    <option value="">Выберите контакт</option>
                    {mockContacts.map((c) => (
                      <option key={c.id} value={c.id}>{c.user.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "#8E8E93", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    Задача
                  </label>
                  <textarea
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="Например: Отправить коммерческое предложение"
                    rows={2}
                    className="w-full px-4 py-3 text-sm resize-none"
                  />
                </div>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "#8E8E93", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    Срок
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-3 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 mt-5">
                <button
                  onClick={addTask}
                  disabled={!newTaskText.trim() || !selectedContactId || !dueDate}
                  className="flex-1 rounded-[14px] text-white font-semibold transition-all active:scale-97 disabled:opacity-40"
                  style={{ background: "#007AFF", height: "50px", fontSize: "17px", boxShadow: "0 4px 15px rgba(0,122,255,0.3)" }}
                >
                  Создать
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-5 rounded-[14px] font-semibold transition-all active:scale-97"
                  style={{
                    background: "rgba(255,255,255,0.72)",
                    border: "0.5px solid rgba(0,0,0,0.1)",
                    color: "#007AFF",
                    height: "50px",
                    fontSize: "17px",
                  }}
                >
                  Отмена
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
