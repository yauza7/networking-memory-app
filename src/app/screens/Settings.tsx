import { useNavigate } from "react-router";
import {
  ArrowLeft, Bell, Shield, Download, Info,
  LogOut, Globe, ChevronRight, Trash2, UserCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { mockContacts } from "../utils/mockData";
import { loadCurrentUser } from "../utils/userStore";

function downloadCSV() {
  const user = loadCurrentUser();
  const rows = [
    ["Имя", "Должность", "Компания", "Telegram", "Познакомились", "Теги", "Дата"],
    ...mockContacts.map((c) => [
      c.user.name,
      c.user.role,
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
    window.location.href = "/";
  }
}

export function Settings() {
  const navigate = useNavigate();
  const user = loadCurrentUser();

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-4">
        <button onClick={() => navigate(-1)} style={{ color: "#007AFF" }}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#0a1628", letterSpacing: "-0.4px" }}>
          Настройки
        </h1>
      </div>

      <div className="px-4 space-y-4">
        {/* Profile preview */}
        <motion.div
          className="glass-card p-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-center gap-3">
            {user.photo ? (
              <img src={user.photo} alt={user.name} className="w-14 h-14 rounded-full object-cover avatar-ocean" />
            ) : (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold avatar-ocean"
                style={{ background: "linear-gradient(135deg, #5AC8FA, #007AFF)" }}
              >
                {user.name[0]}
              </div>
            )}
            <div className="flex-1">
              <p style={{ fontWeight: 700, fontSize: "16px", color: "#0a1628" }}>{user.name}</p>
              <p style={{ fontSize: "13px", color: "#8E8E93" }}>{user.role}</p>
              {user.username && (
                <p style={{ fontSize: "13px", color: "#007AFF" }}>@{user.username}</p>
              )}
            </div>
            <button
              onClick={() => navigate("/edit-profile")}
              className="px-3 py-1.5 rounded-full text-sm font-medium"
              style={{ background: "rgba(0,122,255,0.1)", color: "#007AFF" }}
            >
              Изменить
            </button>
          </div>
        </motion.div>

        {/* Notifications */}
        <SectionCard title="Уведомления" delay={0.1}>
          <SettingsRow icon={<Bell className="w-4 h-4" />} iconBg="rgba(0,122,255,0.1)" iconColor="#007AFF" label="Push-уведомления" subtitle="Follow-up напоминания">
            <div className="w-11 h-6 rounded-full relative flex-shrink-0" style={{ background: "#34C759" }}>
              <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm" />
            </div>
          </SettingsRow>
        </SectionCard>

        {/* Privacy */}
        <SectionCard title="Приватность" delay={0.15}>
          <SettingsRow icon={<Shield className="w-4 h-4" />} iconBg="rgba(52,199,89,0.1)" iconColor="#34C759" label="Кто видит профиль" subtitle="Все по ссылке">
            <ChevronRight className="w-4 h-4" style={{ color: "#C7C7CC" }} />
          </SettingsRow>
          <SettingsRow icon={<Globe className="w-4 h-4" />} iconBg="rgba(0,122,255,0.1)" iconColor="#007AFF" label="Язык" subtitle="Русский" last>
            <ChevronRight className="w-4 h-4" style={{ color: "#C7C7CC" }} />
          </SettingsRow>
        </SectionCard>

        {/* Data */}
        <SectionCard title="Данные" delay={0.2}>
          <SettingsRow
            icon={<Download className="w-4 h-4" />}
            iconBg="rgba(255,149,0,0.1)"
            iconColor="#FF9500"
            label="Экспорт контактов"
            subtitle={`${mockContacts.length} контактов → CSV`}
            onTap={downloadCSV}
          >
            <ChevronRight className="w-4 h-4" style={{ color: "#C7C7CC" }} />
          </SettingsRow>
          <SettingsRow
            icon={<UserCircle className="w-4 h-4" />}
            iconBg="rgba(0,122,255,0.1)"
            iconColor="#007AFF"
            label="Профиль"
            subtitle="Редактировать данные визитки"
            onTap={() => navigate("/edit-profile")}
            last
          >
            <ChevronRight className="w-4 h-4" style={{ color: "#C7C7CC" }} />
          </SettingsRow>
        </SectionCard>

        {/* About */}
        <SectionCard title="О приложении" delay={0.25}>
          <SettingsRow icon={<Info className="w-4 h-4" />} iconBg="rgba(0,0,0,0.06)" iconColor="#8E8E93" label="W·52" subtitle="Версия 1.0 · w52-app.vercel.app" last>
            <span style={{ fontSize: "13px", color: "#C7C7CC" }}>v1.0</span>
          </SettingsRow>
        </SectionCard>

        {/* Danger zone */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={clearData}
          className="w-full glass-card p-4 flex items-center gap-3 transition-all active:scale-[0.99]"
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,59,48,0.1)" }}>
            <Trash2 className="w-4 h-4" style={{ color: "#FF3B30" }} />
          </div>
          <div className="text-left flex-1">
            <p style={{ fontWeight: 600, fontSize: "14px", color: "#FF3B30" }}>Сбросить данные</p>
            <p style={{ fontSize: "12px", color: "#8E8E93" }}>Удалить профиль и все настройки</p>
          </div>
        </motion.button>

        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          onClick={() => {
            localStorage.removeItem("w52_profile");
            window.location.href = "/setup";
          }}
          className="w-full glass-card p-4 flex items-center gap-3 transition-all active:scale-[0.99]"
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,59,48,0.08)" }}>
            <LogOut className="w-4 h-4" style={{ color: "#FF3B30" }} />
          </div>
          <div className="text-left">
            <p style={{ fontWeight: 600, fontSize: "14px", color: "#FF3B30" }}>Сменить аккаунт</p>
            <p style={{ fontSize: "12px", color: "#8E8E93" }}>Вернуться к экрану регистрации</p>
          </div>
        </motion.button>
      </div>
    </div>
  );
}

function SectionCard({ title, children, delay }: { title: string; children: React.ReactNode; delay: number }) {
  return (
    <motion.div
      className="glass-card overflow-hidden"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <p style={{
        fontSize: "13px", fontWeight: 600, color: "#8E8E93",
        textTransform: "uppercase", letterSpacing: "0.5px",
        padding: "12px 16px 8px",
      }}>
        {title}
      </p>
      {children}
    </motion.div>
  );
}

function SettingsRow({
  icon, iconBg, iconColor, label, subtitle, children, onTap, last,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  subtitle?: string;
  children?: React.ReactNode;
  onTap?: () => void;
  last?: boolean;
}) {
  return (
    <button
      onClick={onTap}
      disabled={!onTap && !children}
      className="w-full flex items-center gap-3 px-4 py-3 transition-all active:bg-black/5 text-left"
      style={!last ? { borderBottom: "0.5px solid rgba(0,0,0,0.06)" } : {}}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <p style={{ fontWeight: 500, fontSize: "14px", color: "#0a1628" }}>{label}</p>
        {subtitle && <p style={{ fontSize: "12px", color: "#8E8E93", marginTop: "1px" }}>{subtitle}</p>}
      </div>
      {children}
    </button>
  );
}
