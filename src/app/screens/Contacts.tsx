/**
 * W·52 — Контакты
 * Один ряд чипов фильтрации (категории/события показываются динамически).
 * Кликабельная сортировка (дата ↓ / имя ↑). Теги в карточках контактов.
 */
import { mockContacts } from "../utils/mockData";
import { allContacts } from "../utils/contactStore";
import { Link, useSearchParams } from "react-router";
import {
  Search,
  MessageCircle,
  Download,
  Send,
  UserPlus,
  Check,
  ChevronDown,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { useMemo, useState } from "react";
import {
  Atmosphere,
  Avatar,
  Chip,
  Hero,
} from "../components/brand/Brand";

// Flat tag list — individual chips users can swipe through.
const TAG_GROUPS = [
  { label: "Команда", tags: ["Buying", "Платёжки", "Разработка", "Партнёрская сеть", "Прилы", "Аккаунты", "Трекеры", "HR", "PR", "Дизайн", "Конференции"] },
  { label: "Трафик",  tags: ["FB", "UAC", "PPC", "SEO", "ASO", "TikTok Ads", "Influence", "Схемы", "Email", "SMS", "УБТ"] },
  { label: "Вертикали", tags: ["Нутра", "Gambling", "Betting", "Adult", "Финансы", "Crypto"] },
];
const ALL_TAGS = TAG_GROUPS.flatMap((g) => g.tags);
const TAG_ORDER: Record<string, number> = (() => {
  const o: Record<string, number> = {};
  ALL_TAGS.forEach((t, i) => (o[t] = i));
  return o;
})();
function sortTagsByGroup(tags: string[]): string[] {
  return [...tags].sort((a, b) => (TAG_ORDER[a] ?? 999) - (TAG_ORDER[b] ?? 999));
}

type SortKey = "recent" | "name";

export function Contacts() {
  const [searchParams] = useSearchParams();
  const pendingFilter = searchParams.get("filter") === "pending";

  const [searchQuery, setSearchQuery] = useState("");
  // "all" | "follow" | <tag>
  const [activeFilter, setActiveFilter] = useState<string>(
    pendingFilter ? "follow" : "all"
  );
  const [activeEvent, setActiveEvent] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("recent");
  const [csvSending, setCsvSending] = useState(false);
  const [csvStatus, setCsvStatus] = useState<"idle" | "sent" | "error">("idle");

  const contacts = allContacts(mockContacts);

  // Build event chips dynamically from real data
  const events = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach((c) => {
      if (c.event && c.event !== "other") set.add(c.event);
    });
    return Array.from(set);
  }, [contacts]);

  // Apply filters
  const filtered = useMemo(() => {
    let list = contacts;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.user.name.toLowerCase().includes(q) ||
          c.user.company?.toLowerCase().includes(q) ||
          c.user.role.toLowerCase().includes(q) ||
          c.user.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (activeFilter !== "all") {
      // Exact tag match (case-insensitive)
      const tag = activeFilter.toLowerCase();
      list = list.filter((c) =>
        c.user.tags.some((t) => t.toLowerCase() === tag)
      );
    }

    if (activeEvent) {
      list = list.filter((c) => c.event === activeEvent);
    }

    list = [...list];
    if (sort === "recent") {
      list.sort((a, b) => new Date(b.metAt).getTime() - new Date(a.metAt).getTime());
    } else {
      list.sort((a, b) => a.user.name.localeCompare(b.user.name, "ru"));
    }
    return list;
  }, [contacts, searchQuery, activeFilter, activeEvent, sort]);

  const buildCSV = (rows_: typeof filtered) => {
    const headers = [
      "Имя",
      "Компания",
      "Telegram",
      "Событие",
      "Дата",
      "Теги",
      "Заметка",
    ];
    const rows = rows_.map((c) => [
      c.user.name,
      c.user.company || "",
      c.user.username ? `@${c.user.username}` : "",
      c.event || "",
      new Date(c.metAt).toLocaleDateString("ru-RU"),
      c.user.tags?.join("; ") || "",
      c.note || "",
    ]);
    return [headers, ...rows]
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))
      .join("\n");
  };

  const exportToCSV = async () => {
    const csv = buildCSV(filtered);
    const label =
      activeEvent ||
      (activeFilter !== "all" ? activeFilter : "все");
    const cleanLabel = label.replace(/[^a-zA-Z0-9а-яёА-ЯЁ]/g, "_");
    const filename = `w52-${cleanLabel}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    const tg = (window as any).Telegram?.WebApp;
    const initData = tg?.initData;
    if (initData) {
      setCsvSending(true);
      setCsvStatus("idle");
      try {
        const r = await fetch("/api/send-csv", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Telegram-Init-Data": initData,
          },
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
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

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
        {/* Title row */}
        <div
          style={{
            padding: "60px 22px 0",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <Hero size={36}>Контакты</Hero>
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              to="/add-contact"
              style={{
                height: 36,
                padding: "0 14px",
                borderRadius: 100,
                background: "transparent",
                color: "var(--ivory)",
                border: "1px solid var(--line-soft)",
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                gap: 6,
                textDecoration: "none",
              }}
            >
              <UserPlus className="w-3 h-3" />
              ADD
            </Link>
            <button
              onClick={exportToCSV}
              disabled={csvSending}
              style={{
                height: 36,
                padding: "0 14px",
                borderRadius: 100,
                background: "transparent",
                color:
                  csvStatus === "sent"
                    ? "var(--signal)"
                    : csvStatus === "error"
                    ? "var(--amber)"
                    : "var(--ivory)",
                border: `1px solid ${
                  csvStatus === "sent"
                    ? "var(--signal-dim)"
                    : "var(--line-soft)"
                }`,
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                opacity: csvSending ? 0.6 : 1,
              }}
            >
              {csvStatus === "sent" ? (
                <Check className="w-3 h-3" />
              ) : csvStatus === "error" ? (
                <Send className="w-3 h-3" />
              ) : (
                <Download className="w-3 h-3" />
              )}
              {csvStatus === "sent"
                ? "SENT"
                : csvStatus === "error"
                ? "ERR"
                : "CSV"}
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: "16px 22px 0" }}>
          <label
            style={{
              background: "var(--deep)",
              border: "1px solid var(--line-soft)",
              borderRadius: 18,
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "text",
            }}
          >
            <Search
              className="w-3.5 h-3.5"
              style={{ color: "var(--faint)", flexShrink: 0 }}
            />
            <input
              type="text"
              className="bare-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Имя, компания, теги…"
              style={{
                color: "var(--ivory)",
                fontFamily: "var(--sans)",
                fontSize: 15,
                lineHeight: 1.2,
              }}
            />
          </label>
        </div>

        {/* Filters — swipeable, individual tags */}
        {(() => {
          // Collect tags present in user data, sorted by group order
          const present = new Set<string>();
          contacts.forEach((c) => c.user.tags.forEach((t) => present.add(t)));
          const known = ALL_TAGS.filter((t) => present.has(t));
          const custom = sortTagsByGroup(
            [...present].filter((t) => !ALL_TAGS.includes(t))
          );
          const tagChips = [...known, ...custom];
          return (
            <div
              className="scrollbar-hide"
              style={{
                display: "flex",
                gap: 6,
                padding: "14px 22px 0",
                overflowX: "auto",
                scrollSnapType: "x proximity",
              }}
            >
              <Chip
                label="Все"
                active={activeFilter === "all"}
                onClick={() => setActiveFilter("all")}
              />
              {tagChips.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  active={activeFilter === tag}
                  onClick={() => setActiveFilter(tag)}
                />
              ))}
            </div>
          );
        })()}

        {/* Event chips (only if there are real events) */}
        {events.length > 0 && (
          <div
            className="scrollbar-hide"
            style={{
              display: "flex",
              gap: 6,
              padding: "8px 22px 0",
              overflowX: "auto",
            }}
          >
            <Chip
              label="Все события"
              active={activeEvent === null}
              onClick={() => setActiveEvent(null)}
            />
            {events.map((e) => (
              <Chip
                key={e}
                label={e}
                active={activeEvent === e}
                onClick={() => setActiveEvent(activeEvent === e ? null : e)}
              />
            ))}
          </div>
        )}

        {/* Sort + count */}
        <div
          style={{
            padding: "16px 22px 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            className="font-mono"
            style={{
              fontSize: 10,
              color: "var(--faint)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            {filtered.length}{" "}
            {filtered.length === 1
              ? "КОНТАКТ"
              : filtered.length < 5
              ? "КОНТАКТА"
              : "КОНТАКТОВ"}
          </span>
          <button
            onClick={() => setSort(sort === "recent" ? "name" : "recent")}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--ivory)",
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            SORT · {sort === "recent" ? "ДАТА" : "ИМЯ"}
            <ChevronDown className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* List */}
        <div style={{ padding: "16px 22px 0" }}>
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "60px 0",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Search className="w-7 h-7" style={{ color: "var(--faint)" }} />
              <p className="font-serif" style={{ fontSize: 17 }}>
                Никого не нашли
              </p>
              <p
                className="font-serif it text-muted-w"
                style={{ fontSize: 14, lineHeight: 1.5 }}
              >
                Попробуй другой фильтр или отсканируй QR.
              </p>
            </div>
          ) : (
            (() => {
              // Group filtered contacts by event. "Без события" goes last under "Другие".
              const groups = new Map<string, typeof filtered>();
              filtered.forEach((c) => {
                const key = c.event || "Другие";
                const arr = groups.get(key) || [];
                arr.push(c);
                groups.set(key, arr);
              });
              // "Другие" rendered first (most recent or new), like in screenshot.
              const entries = Array.from(groups.entries());
              entries.sort((a, b) => {
                if (a[0] === "Другие") return -1;
                if (b[0] === "Другие") return 1;
                return 0;
              });
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                  {entries.map(([eventName, items]) => (
                    <div key={eventName}>
                      <div
                        className="eyebrow"
                        style={{
                          marginBottom: 10,
                          color: "var(--signal-dim)",
                        }}
                      >
                        {eventName}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {items.map((c) => (
                          <ContactRow key={c.id} contact={c} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}

function ContactRow({ contact: c }: { contact: ReturnType<typeof allContacts>[number] }) {
  const overdue =
    !c.lastContact &&
    new Date(c.metAt) < new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  return (
    <Link
      to={`/contact/${c.id}`}
      style={{
        background: "var(--deep)",
        border: "1px solid var(--line-soft)",
        borderRadius: 16,
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        padding: "14px 14px",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <Avatar
        name={c.user.name}
        photo={c.user.photo}
        username={c.user.username}
        size={46}
        ring={false}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
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
          <span
            className="font-mono"
            style={{
              fontSize: 10,
              color: "var(--faint)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              flexShrink: 0,
            }}
          >
            {formatDistanceToNow(new Date(c.metAt), { locale: ru })}
          </span>
        </div>
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

        {/* tags */}
        {c.user.tags.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              marginTop: 7,
            }}
          >
            {sortTagsByGroup(c.user.tags).slice(0, 3).map((tag, i) => (
              <span
                key={i}
                style={{
                  padding: "2px 8px",
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
            {c.user.tags.length > 3 && (
              <span
                className="font-mono"
                style={{
                  fontSize: 9.5,
                  color: "var(--faint)",
                  letterSpacing: "0.04em",
                  alignSelf: "center",
                }}
              >
                +{c.user.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {c.aiSummary && (
          <p
            style={{
              fontFamily: "var(--sans)",
              fontSize: 12.5,
              color: "var(--muted-fg)",
              lineHeight: 1.4,
              margin: "8px 0 0",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            ✦ {c.aiSummary}
          </p>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 8,
          flexShrink: 0,
          alignSelf: "stretch",
        }}
      >
        {overdue && (
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--amber)",
            }}
          />
        )}
        {c.user.username && (
          <button
            onClick={(e) => {
              e.preventDefault();
              window.open(`https://t.me/${c.user.username}`);
            }}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "oklch(0.86 0.13 195 / 0.12)",
              border: "1px solid var(--signal-dim)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              marginTop: "auto",
            }}
          >
            <MessageCircle
              className="w-3.5 h-3.5"
              style={{ color: "var(--signal)" }}
            />
          </button>
        )}
      </div>
    </Link>
  );
}
