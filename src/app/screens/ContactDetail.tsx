import { useParams, useNavigate, Link } from "react-router";
import { mockContacts } from "../utils/mockData";
import { allContacts } from "../utils/contactStore";
import { loadCurrentUser } from "../utils/userStore";
import { loadTasks, saveTasks } from "../utils/taskStore";
import {
  ArrowLeft, MessageCircle, Calendar, Mic, Send, Sparkles,
  Square, CheckSquare, Plus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { useState } from "react";
import { motion } from "motion/react";

export function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const contact = allContacts(mockContacts).find((c) => c.id === id);
  const currentUser = loadCurrentUser();

  const [tasks, setTasks] = useState(() =>
    loadTasks().filter((t) => t.contactId === id)
  );

  const toggleTask = (taskId: string) => {
    const allTasks = loadTasks();
    const updated = allTasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
    saveTasks(updated);
    setTasks(updated.filter((t) => t.contactId === id));
  };

  if (!contact) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: "#8E8E93" }}>Контакт не найден</p>
      </div>
    );
  }

  const handleSendFollowUp = () => {
    if (!contact.user.username) return;
    const message = `Привет ${contact.user.name.split(" ")[0]}!\n\nЯ ${currentUser.name}, ${currentUser.role} из ${currentUser.company}. Было приятно познакомиться на ${contact.event}!${contact.aiSummary ? `\n\nПомню, ты ${contact.aiSummary.toLowerCase()}.` : ""}${currentUser.bio ? `\n\nЯ ${currentUser.bio.toLowerCase()}` : ""}\n\nДавай продолжим общение!`;
    window.open(`https://t.me/${contact.user.username}?text=${encodeURIComponent(message)}`);
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Back */}
      <div className="flex items-center gap-2 px-4 pt-14 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 font-medium transition-colors"
          style={{ color: "#007AFF", fontSize: "17px" }}
        >
          <ArrowLeft className="w-5 h-5" />
          Назад
        </button>
      </div>

      {/* Hero — photo + name */}
      <motion.div
        className="flex flex-col items-center px-5 pb-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {contact.user.photo ? (
          <img
            src={contact.user.photo}
            alt={contact.user.name}
            className="w-24 h-24 rounded-full object-cover avatar-ocean mb-4"
          />
        ) : (
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold avatar-ocean mb-4"
            style={{ background: "linear-gradient(135deg, #5AC8FA, #007AFF)" }}
          >
            {contact.user.name[0]}
          </div>
        )}

        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0a1628", letterSpacing: "-0.3px", textAlign: "center" }}>
          {contact.user.name}
        </h1>
        <p style={{ fontSize: "15px", color: "#8E8E93", marginTop: "4px", textAlign: "center" }}>
          {contact.user.role}{contact.user.company && ` · ${contact.user.company}`}
        </p>
        {contact.user.username && (
          <p style={{ fontSize: "14px", color: "#007AFF", marginTop: "2px" }}>@{contact.user.username}</p>
        )}

        {/* Tags */}
        {contact.user.tags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 mt-3">
            {contact.user.tags.map((tag, i) => (
              <span key={i} className="ios-tag">{tag}</span>
            ))}
          </div>
        )}

        {/* Single action */}
        {contact.user.username && (
          <button
            onClick={() => window.open(`https://t.me/${contact.user.username}`)}
            className="mt-5 flex items-center justify-center gap-2 rounded-[14px] text-white font-semibold transition-all active:scale-97"
            style={{
              background: "#007AFF",
              height: "50px",
              fontSize: "17px",
              width: "100%",
              maxWidth: "300px",
              boxShadow: "0 4px 15px rgba(0,122,255,0.3)",
            }}
          >
            <MessageCircle className="w-5 h-5" />
            Написать в Telegram
          </button>
        )}
      </motion.div>

      <div className="px-4 space-y-3">
        {/* Meeting context */}
        <div className="glass-card p-5">
          <p className="uppercase mb-3" style={{ fontSize: "11px", fontWeight: 600, color: "#8E8E93", letterSpacing: "0.5px" }}>
            Контекст встречи
          </p>
          <div className="flex items-center gap-2 mb-2" style={{ fontSize: "14px", color: "#3c3c43" }}>
            <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: "#8E8E93" }} />
            <span>
              Встретились {formatDistanceToNow(new Date(contact.metAt), { addSuffix: true, locale: ru })}
            </span>
          </div>
          {contact.event && (
            <span
              className="inline-block px-3 py-1.5 rounded-xl mt-1"
              style={{ background: "rgba(0,122,255,0.08)", color: "#007AFF", fontSize: "13px", fontWeight: 500 }}
            >
              {contact.event}
            </span>
          )}
        </div>

        {/* AI Summary */}
        {contact.aiSummary && (
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4" style={{ color: "#007AFF" }} />
              <p className="uppercase" style={{ fontSize: "11px", fontWeight: 600, color: "#8E8E93", letterSpacing: "0.5px" }}>
                AI-резюме
              </p>
            </div>
            <p style={{ fontSize: "14px", color: "#3c3c43", lineHeight: 1.5 }}>{contact.aiSummary}</p>
          </div>
        )}

        {/* Tasks */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="uppercase" style={{ fontSize: "11px", fontWeight: 600, color: "#8E8E93", letterSpacing: "0.5px" }}>
              Задачи
            </p>
            <Link to="/tasks" className="flex items-center gap-1 text-sm font-medium" style={{ color: "#007AFF" }}>
              <Plus className="w-4 h-4" />
              Добавить
            </Link>
          </div>
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <p style={{ fontSize: "14px", color: "#8E8E93", textAlign: "center", paddingTop: "8px", paddingBottom: "4px" }}>
                Нет задач по этому контакту
              </p>
            ) : tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 py-2"
                style={{ opacity: task.completed ? 0.5 : 1 }}
              >
                <button onClick={() => toggleTask(task.id)} className="mt-0.5 flex-shrink-0">
                  {task.completed ? (
                    <CheckSquare className="w-5 h-5" style={{ color: "#34C759" }} />
                  ) : (
                    <Square className="w-5 h-5" style={{ color: "#8E8E93" }} />
                  )}
                </button>
                <div>
                  <p style={{ fontSize: "14px", color: "#0a1628", textDecoration: task.completed ? "line-through" : "none" }}>
                    {task.text}
                  </p>
                  <p style={{ fontSize: "12px", color: "#8E8E93", marginTop: "2px" }}>
                    До {new Date(task.dueDate).toLocaleDateString("ru-RU")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="uppercase" style={{ fontSize: "11px", fontWeight: 600, color: "#8E8E93", letterSpacing: "0.5px" }}>
              Заметки
            </p>
            <Link
              to={`/add-note?contact=${contact.id}`}
              className="flex items-center gap-1 text-sm font-medium"
              style={{ color: "#007AFF" }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI-заметка
            </Link>
          </div>
          {contact.note ? (
            <div>
              <p style={{ fontSize: "14px", color: "#3c3c43", lineHeight: 1.6, marginBottom: "12px" }}>{contact.note}</p>
              <Link
                to={`/add-note?contact=${contact.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
                style={{ background: "rgba(0,122,255,0.08)", color: "#007AFF", border: "0.5px solid rgba(0,122,255,0.15)" }}
              >
                <Plus className="w-3.5 h-3.5" />
                Дополнить заметку
              </Link>
            </div>
          ) : (
            <div className="text-center py-4">
              <p style={{ fontSize: "14px", color: "#8E8E93", marginBottom: "12px" }}>Нет заметок о встрече</p>
              <Link
                to={`/add-note?contact=${contact.id}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-white text-sm font-semibold transition-all active:scale-95"
                style={{ background: "#007AFF", boxShadow: "0 4px 12px rgba(0,122,255,0.25)" }}
              >
                <Mic className="w-4 h-4" />
                Записать заметку
              </Link>
            </div>
          )}
        </div>

        {/* Smart follow-up */}
        {!contact.followUpSent && (
          <div className="glass-card p-5" style={{ borderColor: "rgba(52,199,89,0.2)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4" style={{ color: "#34C759" }} />
              <p className="uppercase" style={{ fontSize: "11px", fontWeight: 600, color: "#8E8E93", letterSpacing: "0.5px" }}>
                Умное сообщение
              </p>
            </div>
            <p style={{ fontSize: "13px", color: "#3c3c43", lineHeight: 1.6, marginBottom: "14px", whiteSpace: "pre-line" }}>
              {`Привет ${contact.user.name.split(" ")[0]}!\n\nЯ ${currentUser.name}, ${currentUser.role} из ${currentUser.company}. Было приятно познакомиться на ${contact.event}!`}
              {contact.aiSummary ? `\n\nПомню, ты ${contact.aiSummary.toLowerCase()}.` : ""}
              {currentUser.bio ? `\n\nЯ ${currentUser.bio.toLowerCase()}` : ""}
              {"\n\nДавай продолжим общение!"}
            </p>
            <button
              onClick={handleSendFollowUp}
              disabled={!contact.user.username}
              className="w-full flex items-center justify-center gap-2 rounded-[14px] text-white font-semibold transition-all active:scale-97 disabled:opacity-50"
              style={{ background: "#34C759", height: "46px", fontSize: "15px", boxShadow: "0 4px 12px rgba(52,199,89,0.3)" }}
            >
              <Send className="w-4 h-4" />
              Отправить в Telegram
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
