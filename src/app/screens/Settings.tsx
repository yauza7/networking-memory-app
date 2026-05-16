/**
 * W·52 — Настройки (Settings)
 * Moody. Без секции «Приватность», все строки кликабельны.
 * Светлая тема — заглушка «скоро».
 */
import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Bell,
  Download,
  Info,
  LogOut,
  ChevronRight,
  Trash2,
  UserCircle,
  FileText,
  Sun,
  Shield,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import { loadStoredContacts } from "../utils/contactStore";
import { loadCurrentUser } from "../utils/userStore";
import { loadTheme, saveTheme, type Theme } from "../utils/themeStore";
import {
  Atmosphere,
  Avatar,
  Hero,
  RoundBtn,
  cardStyle,
} from "../components/brand/Brand";

function downloadCSV() {
  const contacts = loadStoredContacts();
  const rows = [
    ["Имя", "Компания", "Telegram", "Познакомились", "Теги", "Дата"],
    ...contacts.map((c) => [
      c.user.name,
      c.user.company || "",
      c.user.username ? `@${c.user.username}` : "",
      c.event || "",
      (c.user.tags || []).join("; "),
      new Date(c.metAt).toLocaleDateString("ru-RU"),
    ]),
  ];

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `w52-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function clearData() {
  if (confirm("Сбросить все данные? Это действие нельзя отменить.")) {
    localStorage.removeItem("w52_profile");
    localStorage.removeItem("w52_tasks");
    localStorage.removeItem("w52_followup_sent");
    localStorage.removeItem("w52_notifications_read");
    localStorage.removeItem("w52_contacts");
    window.location.href = "/";
  }
}

export function Settings() {
  const navigate = useNavigate();
  const user = loadCurrentUser();
  const contactCount = loadStoredContacts().length;

  const [pushEnabled, setPushEnabled] = useState(true);
  const [theme, setTheme] = useState<Theme>(() => loadTheme());
  const toggleThemeRow = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    saveTheme(next);
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
      <Atmosphere intensity={0.3} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Top */}
        <div style={{ padding: "56px 18px 0" }}>
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
        </div>

        <div style={{ padding: "16px 22px 0" }}>
          <Hero size={32}>Настройки</Hero>
        </div>

        {/* Profile preview */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{ padding: "22px 16px 0" }}
        >
          <button
            onClick={() => navigate("/edit-profile")}
            style={{
              ...cardStyle,
              padding: "14px 16px",
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "var(--surface)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <Avatar
              name={user.name}
              photo={user.photo}
              username={user.username}
              size={48}
              ring={false}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--sans)",
                  fontWeight: 500,
                  fontSize: 15,
                  color: "var(--ivory)",
                }}
              >
                {user.name}
              </div>
              <div
                className="text-muted-w"
                style={{ fontSize: 12, marginTop: 2 }}
              >
                {user.role}
                {user.username && ` · @${user.username}`}
              </div>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: "var(--faint)" }} />
          </button>
        </motion.div>

        {/* Preferences */}
        <Section title="Параметры" delay={0.1}>
          <Row
            icon={<Bell className="w-4 h-4" />}
            iconBg="oklch(0.86 0.13 195 / 0.18)"
            iconColor="var(--signal)"
            label="Push-уведомления"
            sublabel="Follow-up напоминания"
            onTap={() => setPushEnabled((v) => !v)}
          >
            <Toggle on={pushEnabled} />
          </Row>
          <Row
            icon={<Sun className="w-4 h-4" />}
            iconBg="oklch(0.80 0.110 65 / 0.18)"
            iconColor="var(--amber)"
            label="Светлая тема"
            sublabel={theme === "light" ? "Включена" : "Тёмная по умолчанию"}
            onTap={toggleThemeRow}
            last
          >
            <Toggle on={theme === "light"} />
          </Row>
        </Section>

        {/* Data */}
        <Section title="Данные" delay={0.15}>
          <Row
            icon={<Download className="w-4 h-4" />}
            iconBg="oklch(0.80 0.110 65 / 0.18)"
            iconColor="var(--amber)"
            label="Экспорт контактов"
            sublabel={`${contactCount} → CSV`}
            onTap={downloadCSV}
          >
            <ChevronRight className="w-4 h-4" style={{ color: "var(--faint)" }} />
          </Row>
          <Row
            icon={<UserCircle className="w-4 h-4" />}
            iconBg="oklch(0.86 0.13 195 / 0.18)"
            iconColor="var(--signal)"
            label="Редактировать профиль"
            sublabel="Данные визитки"
            onTap={() => navigate("/edit-profile")}
          >
            <ChevronRight className="w-4 h-4" style={{ color: "var(--faint)" }} />
          </Row>
          <Row
            icon={<Sparkles className="w-4 h-4" />}
            iconBg="oklch(0.86 0.13 195 / 0.18)"
            iconColor="var(--signal)"
            label="Пройти тур заново"
            sublabel="Все фишки за минуту"
            onTap={() => {
              localStorage.removeItem("w52_tour_completed");
              window.location.href = "/tour";
            }}
            last
          >
            <ChevronRight className="w-4 h-4" style={{ color: "var(--faint)" }} />
          </Row>
        </Section>

        {/* About */}
        <Section title="О приложении" delay={0.2}>
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "0.5px solid var(--line-soft)",
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: "oklch(0.86 0.13 195 / 0.14)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Info className="w-3.5 h-3.5" style={{ color: "var(--signal)" }} />
              </div>
              <div>
                <p
                  style={{
                    fontFamily: "var(--sans)",
                    fontWeight: 500,
                    fontSize: 13.5,
                    color: "var(--ivory)",
                    margin: 0,
                  }}
                >
                  Что такое Echo?
                </p>
                <p
                  style={{
                    fontFamily: "var(--sans)",
                    fontSize: 12.5,
                    color: "var(--muted-fg)",
                    lineHeight: 1.5,
                    marginTop: 4,
                  }}
                >
                  Где-то в океане плавает кит, который поёт на 52 герцах —
                  частоте, которую не слышит никто из его сородичей. Echo
                  помогает не пропадать с радара: сканируй QR, записывай
                  голосом контекст и оставайся на связи. Every signal finds
                  its receiver.
                </p>
              </div>
            </div>
          </div>
          <Row
            icon={<Shield className="w-4 h-4" />}
            iconBg="oklch(0.80 0.110 65 / 0.14)"
            iconColor="var(--amber)"
            label="Политика конфиденциальности"
            onTap={() => window.open("https://w52-app.vercel.app/privacy.html")}
          >
            <ChevronRight className="w-4 h-4" style={{ color: "var(--faint)" }} />
          </Row>
          <Row
            icon={<FileText className="w-4 h-4" />}
            iconBg="oklch(0.86 0.13 195 / 0.14)"
            iconColor="var(--signal)"
            label="Условия использования"
            onTap={() => window.open("https://w52-app.vercel.app/terms.html")}
            last
          >
            <ChevronRight className="w-4 h-4" style={{ color: "var(--faint)" }} />
          </Row>
        </Section>

        {/* Danger */}
        <div style={{ padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={() => {
              localStorage.removeItem("w52_profile");
              window.location.href = "/setup";
            }}
            style={{
              ...cardStyle,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "var(--surface)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 11,
                background: "oklch(0.68 0.19 25 / 0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LogOut className="w-4 h-4" style={{ color: "var(--danger)" }} />
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div
                style={{
                  fontFamily: "var(--sans)",
                  fontWeight: 500,
                  fontSize: 14,
                  color: "var(--danger)",
                }}
              >
                Сменить аккаунт
              </div>
              <div className="text-muted-w" style={{ fontSize: 12, marginTop: 2 }}>
                Вернуться к регистрации
              </div>
            </div>
          </button>
          <button
            onClick={clearData}
            style={{
              ...cardStyle,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "var(--surface)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 11,
                background: "oklch(0.68 0.19 25 / 0.10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Trash2 className="w-4 h-4" style={{ color: "var(--danger)" }} />
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div
                style={{
                  fontFamily: "var(--sans)",
                  fontWeight: 500,
                  fontSize: 14,
                  color: "var(--danger)",
                }}
              >
                Сбросить данные
              </div>
              <div className="text-muted-w" style={{ fontSize: 12, marginTop: 2 }}>
                Удалить профиль и контакты
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  delay,
}: {
  title: string;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      style={{ padding: "20px 16px 0" }}
    >
      <p
        className="eyebrow"
        style={{
          padding: "0 6px 10px",
          color: "var(--signal-dim)",
        }}
      >
        {title}
      </p>
      <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
        {children}
      </div>
    </motion.div>
  );
}

function Row({
  icon,
  iconBg,
  iconColor,
  label,
  sublabel,
  children,
  onTap,
  last,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  sublabel?: string;
  children?: React.ReactNode;
  onTap?: () => void;
  last?: boolean;
}) {
  return (
    <button
      onClick={onTap}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        background: "transparent",
        border: "none",
        borderBottom: last ? "none" : "0.5px solid var(--line-soft)",
        textAlign: "left",
        cursor: onTap ? "pointer" : "default",
        color: "var(--ivory)",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: iconBg,
          color: iconColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--sans)",
            fontWeight: 500,
            fontSize: 14,
            color: "var(--ivory)",
          }}
        >
          {label}
        </div>
        {sublabel && (
          <div
            className="text-muted-w"
            style={{ fontSize: 12, marginTop: 2 }}
          >
            {sublabel}
          </div>
        )}
      </div>
      {children}
    </button>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <div
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        background: on ? "var(--signal)" : "var(--line)",
        position: "relative",
        transition: "background 0.18s ease",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left: on ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: on ? "var(--abyss)" : "var(--ivory)",
          transition: "left 0.18s ease",
        }}
      />
    </div>
  );
}
