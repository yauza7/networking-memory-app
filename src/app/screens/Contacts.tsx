import { mockContacts } from "../utils/mockData";
import { allContacts } from "../utils/contactStore";
import { Link, useSearchParams } from "react-router";
import { Search, MessageCircle, Download, Sparkles, UserPlus, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { useState } from "react";
import { motion } from "motion/react";

const CATEGORIES = ["Все", "Платёжки", "Партнёрские сети", "Арбитраж", "Аккаунты", "Агентские", "AI/Tech", "Legal", "Follow-up нужен"];

export function Contacts() {
  const [searchParams] = useSearchParams();
  const pendingFilter = searchParams.get("filter") === "pending";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(pendingFilter ? "Follow-up нужен" : "Все");
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const contacts = allContacts(mockContacts);
  const namedEvents = Array.from(new Set(contacts.map((c) => c.event).filter((e) => e && e !== "other"))) as string[];
  const hasOther = contacts.some((c) => !c.event || c.event === "other");
  const events = hasOther ? [...namedEvents, "Другие"] : namedEvents;

  const [csvSending, setCsvSending] = useState(false);
  const [csvStatus, setCsvStatus] = useState<"idle" | "sent" | "error">("idle");

  const buildCSV = (rows_: typeof filteredContacts) => {
    const headers = ["Имя", "Должность", "Компания", "Telegram", "Email", "Событие", "Дата", "Теги", "Заметка"];
    const rows = rows_.map((contact) => [
      contact.user.name, contact.user.role, contact.user.company || "",
      contact.user.username ? `@${contact.user.username}` : "",
      contact.user.links?.find((l) => l.type === "email")?.url || "",
      contact.event || "", new Date(contact.metAt).toLocaleDateString("ru-RU"),
      contact.user.tags?.join("; ") || "", contact.note || "",
    ]);
    return [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  };

  const exportToCSV = async () => {
    const csv = buildCSV(filteredContacts);
    const activeFilter = selectedEvent || (selectedCategory !== "Все" ? selectedCategory : null);
    const label = activeFilter ? activeFilter.replace(/[^a-zA-Z0-9а-яёА-ЯЁ]/g, "_") : "все";
    const filename = `w52-${label}-${new Date().toISOString().slice(0, 10)}.csv`;

    const tg = (window as any).Telegram?.WebApp;
    const initData = tg?.initData;

    if (initData) {
      setCsvSending(true);
      setCsvStatus("idle");
      try {
        const r = await fetch("/api/send-csv", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Telegram-Init-Data": initData },
          body: JSON.stringify({ csv, filename }),
        });
        if (r.ok) {
          setCsvStatus("sent");
          setTimeout(() => setCsvStatus("idle"), 3000);
          setCsvSending(false);
          return;
        }
      } catch {}
      setCsvStatus("error");
      setCsvSending(false);
    }

    // Fallback: browser download
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  let filteredContacts = contacts;
  if (searchQuery) {
    filteredContacts = filteredContacts.filter((c) =>
      c.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.user.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.user.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.user.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }
  if (selectedCategory !== "Все") {
    if (selectedCategory === "Follow-up нужен") {
      filteredContacts = filteredContacts.filter((c) => !c.lastContact && new Date(c.metAt) < new Date(Date.now() - 2 * 24 * 60 * 60 * 1000));
    } else if (selectedCategory === "Платёжки") {
      filteredContacts = filteredContacts.filter((c) => c.user.tags.some((t) => ["Payments", "Payment Solutions", "FinTech", "Crypto", "Платёжки", "Платёжный сервис"].some(k => t.toLowerCase().includes(k.toLowerCase()))));
    } else if (selectedCategory === "Партнёрские сети") {
      filteredContacts = filteredContacts.filter((c) => c.user.tags.some((t) => ["Affiliate", "CPA", "Партнёрки", "Партнёрские сети"].some(k => t.toLowerCase().includes(k.toLowerCase()))));
    } else if (selectedCategory === "Арбитраж") {
      filteredContacts = filteredContacts.filter((c) => c.user.tags.some((t) => ["Traffic Arbitrage", "Media Buyer", "Арбитраж", "Facebook Ads", "Google Ads", "TikTok"].some(k => t.toLowerCase().includes(k.toLowerCase()))));
    } else if (selectedCategory === "Аккаунты") {
      filteredContacts = filteredContacts.filter((c) => c.user.tags.some((t) => ["Аккаунты", "Accounts", "Facebook Accounts"].some(k => t.toLowerCase().includes(k.toLowerCase()))));
    } else if (selectedCategory === "Агентские") {
      filteredContacts = filteredContacts.filter((c) => c.user.tags.some((t) => ["Агентские", "Agency", "Агентство"].some(k => t.toLowerCase().includes(k.toLowerCase()))));
    } else if (selectedCategory === "Legal") {
      filteredContacts = filteredContacts.filter((c) => c.user.tags.some((t) => ["Legal", "Compliance"].includes(t)));
    } else if (selectedCategory === "AI/Tech") {
      filteredContacts = filteredContacts.filter((c) => c.user.tags.some((t) => ["AI", "Optimization", "Developer"].includes(t)));
    }
  }
  if (selectedEvent) {
    if (selectedEvent === "Другие") {
      filteredContacts = filteredContacts.filter((c) => !c.event || c.event === "other");
    } else {
      filteredContacts = filteredContacts.filter((c) => c.event === selectedEvent);
    }
  }

  const groupedByEvent = filteredContacts.reduce((acc, contact) => {
    const event = (!contact.event || contact.event === "other") ? "Другие" : contact.event;
    if (!acc[event]) acc[event] = [];
    acc[event].push(contact);
    return acc;
  }, {} as Record<string, typeof contacts>);

  let contactIndex = 0;

  return (
    <div className="min-h-screen pb-20">
      {/* Title */}
      <div className="flex items-center justify-between px-5 pt-14 pb-3">
        <h1 style={{ fontSize: "34px", fontWeight: 700, color: "#0a1628", letterSpacing: "-0.5px", lineHeight: 1 }}>
          Контакты
        </h1>
        <div className="flex items-center gap-2">
          <Link
            to="/add-contact"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors active:scale-95"
            style={{ background: "rgba(0,122,255,0.08)", border: "0.5px solid rgba(0,122,255,0.15)", color: "#007AFF" }}
          >
            <UserPlus className="w-4 h-4" />
            Добавить
          </Link>
          <button
            onClick={exportToCSV}
            disabled={csvSending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors active:scale-95 disabled:opacity-60"
            style={{
              background: csvStatus === "sent" ? "rgba(52,199,89,0.1)" : csvStatus === "error" ? "rgba(255,59,48,0.08)" : "rgba(0,122,255,0.08)",
              border: `0.5px solid ${csvStatus === "sent" ? "rgba(52,199,89,0.2)" : csvStatus === "error" ? "rgba(255,59,48,0.15)" : "rgba(0,122,255,0.15)"}`,
              color: csvStatus === "sent" ? "#34C759" : csvStatus === "error" ? "#FF3B30" : "#007AFF",
            }}
          >
            {csvSending ? <Download className="w-4 h-4 animate-bounce" /> : csvStatus === "sent" ? <Send className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            {csvStatus === "sent" ? "Отправлено!" : csvStatus === "error" ? "Ошибка" : "CSV"}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#8E8E93" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по имени, компании, тегам…"
            className="w-full pl-9 pr-4 py-2.5 text-sm"
            style={{ borderRadius: "12px" }}
          />
        </div>
      </div>

      {/* Event pills */}
      {events.length > 0 && (
        <div className="px-4 mb-2 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSelectedEvent(null)}
            className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
            style={selectedEvent === null
              ? { background: "#007AFF", color: "#fff" }
              : { background: "rgba(0,0,0,0.05)", color: "#3c3c43" }}
          >
            Все
          </button>
          {events.map((event) => (
            <button
              key={event}
              onClick={() => setSelectedEvent(event)}
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={selectedEvent === event
                ? { background: "#007AFF", color: "#fff" }
                : { background: "rgba(0,0,0,0.05)", color: "#3c3c43" }}
            >
              {event}
            </button>
          ))}
        </div>
      )}

      {/* Category pills */}
      <div className="px-4 mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
            style={selectedCategory === cat
              ? { background: "#007AFF", color: "#fff" }
              : { background: "rgba(0,0,0,0.05)", color: "#3c3c43" }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="px-4 space-y-5">
        {Object.entries(groupedByEvent).map(([event, contacts]) => (
          <div key={event}>
            <p className="uppercase mb-2 px-1" style={{ fontSize: "11px", fontWeight: 600, color: "#8E8E93", letterSpacing: "0.5px" }}>
              {event}
            </p>
            <div className="space-y-2">
              {contacts.map((contact) => {
                const idx = contactIndex++;
                return (
                  <motion.div
                    key={contact.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * idx, duration: 0.3 }}
                  >
                    <Link to={`/contact/${contact.id}`} className="glass-card flex items-start gap-3 p-4 block">
                      <motion.div
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 3 + (idx % 3) * 0.6, repeat: Infinity, delay: idx * 0.25, ease: "easeInOut" }}
                        className="flex-shrink-0"
                      >
                        {contact.user.photo ? (
                          <img src={contact.user.photo} alt={contact.user.name} className="w-12 h-12 rounded-full object-cover avatar-ocean" />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold avatar-ocean"
                            style={{ background: "linear-gradient(135deg, #5AC8FA, #007AFF)", fontSize: "17px" }}
                          >
                            {contact.user.name[0]}
                          </div>
                        )}
                      </motion.div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-0.5">
                          <div className="flex-1">
                            <p style={{ fontWeight: 600, fontSize: "14px", color: "#0a1628" }}>{contact.user.name}</p>
                            <p style={{ fontSize: "12px", color: "#8E8E93" }}>
                              {contact.user.role}{contact.user.company && ` · ${contact.user.company}`}
                            </p>
                          </div>
                          {contact.user.username && (
                            <button
                              onClick={(e) => { e.preventDefault(); window.open(`https://t.me/${contact.user.username}`); }}
                              className="p-2 rounded-xl transition-colors active:scale-95"
                              style={{ background: "rgba(0,122,255,0.08)" }}
                            >
                              <MessageCircle className="w-4 h-4" style={{ color: "#007AFF" }} />
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1 my-1.5">
                          {contact.user.tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="ios-tag">{tag}</span>
                          ))}
                          {contact.user.tags.length > 3 && (
                            <span style={{ fontSize: "12px", color: "#8E8E93" }}>+{contact.user.tags.length - 3}</span>
                          )}
                        </div>

                        {contact.aiSummary && (
                          <div className="flex items-start gap-1.5 p-2 rounded-xl" style={{ background: "rgba(0,122,255,0.05)" }}>
                            <Sparkles className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "#007AFF" }} />
                            <p style={{ fontSize: "12px", color: "#007AFF" }} className="line-clamp-2">{contact.aiSummary}</p>
                          </div>
                        )}

                        <p style={{ fontSize: "12px", color: "#8E8E93", marginTop: "4px" }}>
                          {formatDistanceToNow(new Date(contact.metAt), { addSuffix: true, locale: ru })}
                          {contact.lastContact && <span className="ml-2">· <span style={{ color: "#34C759" }}>● активный</span></span>}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {filteredContacts.length === 0 && (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(0,122,255,0.08)" }}>
            <Search className="w-10 h-10" style={{ color: "#8E8E93" }} />
          </div>
          <p style={{ fontWeight: 600, color: "#0a1628", marginBottom: "8px" }}>Нет контактов</p>
          <p style={{ fontSize: "14px", color: "#8E8E93" }}>Отсканируйте QR-код, чтобы добавить первый контакт</p>
        </div>
      )}
    </div>
  );
}
