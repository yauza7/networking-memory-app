import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Check, ArrowRight, Sparkles, UserCheck, MessageSquarePlus, MessageCircle, Users, Calendar } from "lucide-react";
import { mockContacts, currentUser } from "../utils/mockData";
import { sendNotification } from "../utils/telegramBot";
import { createSystemTasks, type Task } from "../utils/taskStore";
import { saveCurrentUser, loadCurrentUser } from "../utils/userStore";
import { motion } from "motion/react";

const PRESET_TAGS = [
  "Арбитраж", "Партнёрки", "Партнёрские сети", "Платёжки", "Платёжный сервис",
  "Аккаунты", "Агентские", "Трафик",
  "iGaming", "Нутра", "Крипто", "E-commerce", "Dating",
  "LATAM", "TIER-1", "EU", "ASIA",
  "Media Buyer", "Affiliate", "CPA",
  "Facebook Ads", "Google Ads", "TikTok",
  "AI/Tech", "SaaS", "Legal", "Compliance", "Team Lead", "Developer",
];

const PRESET_EVENTS = [
  "МАС 2026", "Партнёркин", "WebMoney Forum", "AWA Bangkok", "Affiliate World Dubai",
];

const TASK_TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  message: {
    icon: <MessageCircle className="w-4 h-4" />,
    color: "#007AFF",
    bg: "rgba(0,122,255,0.1)",
    label: "Написать",
  },
  transfer: {
    icon: <Users className="w-4 h-4" />,
    color: "#FF9500",
    bg: "rgba(255,149,0,0.1)",
    label: "Передать контакт",
  },
};

export function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scannedFrom = searchParams.get("from");
  const saveContactUsername = searchParams.get("saveContact");

  // If profile already exists, skip profile-creation steps — go straight to saving the contact
  const profileExists = !!localStorage.getItem("w52_profile");
  const [step, setStep] = useState(profileExists ? 3 : 1); // 3 = summary/confirmation step

  const savedContact = saveContactUsername
    ? mockContacts.find((c) => c.user.username === saveContactUsername) ?? null
    : null;

  const [formData, setFormData] = useState({
    name: "", role: "", company: "", username: "",
    selectedTags: [] as string[],
    event: "",
    eventCustom: "",
  });

  const [autoTasks, setAutoTasks] = useState<Task[]>([]);

  const toggleTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter((t) => t !== tag)
        : [...prev.selectedTags, tag],
    }));
  };

  const effectiveEvent = formData.event === "Другое" ? formData.eventCustom : formData.event;

  const handleComplete = () => {
    // Save user profile only if they filled it in (not pre-existing)
    if (formData.name) {
      saveCurrentUser({
        name: formData.name,
        role: formData.role,
        company: formData.company,
        username: formData.username || undefined,
        tags: formData.selectedTags,
      });
    }
    // If profile already existed, use stored data for the display name
    const activeUser = profileExists ? loadCurrentUser() : null;
    const displayName = formData.name || activeUser?.name || currentUser.name;

    if (saveContactUsername) {
      const contactId = savedContact?.id ?? "c1";
      const contactName = savedContact?.user.name ?? `@${saveContactUsername}`;
      const tasks = createSystemTasks(contactId, contactName, effectiveEvent || undefined);
      setAutoTasks(tasks);
      setStep(4);
      sendNotification({
        type: "mutual_exchange",
        recipientUsername: saveContactUsername,
        contactName: formData.name || currentUser.name,
        eventName: savedContact?.event,
      });
    } else {
      navigate("/contacts");
    }
  };

  const canProceed = () => {
    if (step === 1) return formData.name && formData.role && formData.company && formData.username;
    if (step === 2) return formData.selectedTags.length > 0;
    return true;
  };

  // Step 4 — success
  if (step === 4) {
    const contactName = savedContact?.user.name ?? `@${saveContactUsername}`;
    const contactId = savedContact?.id ?? "c1";

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-sm w-full space-y-5">
          <motion.div
            className="relative mx-auto w-24 h-24"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 350, damping: 20 }}
          >
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #3AA3FF, #007AFF)", boxShadow: "0 8px 30px rgba(0,122,255,0.4)" }}
            >
              <UserCheck className="w-12 h-12 text-white" />
            </div>
            <div
              className="absolute -top-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "#34C759", border: "2px solid white" }}
            >
              <Check className="w-4 h-4 text-white" />
            </div>
          </motion.div>

          <div>
            <h2 style={{ fontSize: "28px", fontWeight: 700, color: "#0a1628", letterSpacing: "-0.4px" }}>
              Контакт сохранён!
            </h2>
            <p style={{ fontSize: "15px", color: "#8E8E93", marginTop: "8px" }}>
              Вы сохранили{" "}
              <span style={{ color: "#007AFF", fontWeight: 600 }}>{contactName}</span>.
              {effectiveEvent && (
                <> Встреча: <span style={{ color: "#0a1628", fontWeight: 500 }}>{effectiveEvent}</span></>
              )}
            </p>
          </div>

          {savedContact && (
            <div className="glass-card p-4 text-left">
              <div className="flex items-center gap-3 mb-3">
                {savedContact.user.photo ? (
                  <img src={savedContact.user.photo} alt={savedContact.user.name} className="w-12 h-12 rounded-full object-cover avatar-ocean" />
                ) : (
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold avatar-ocean"
                    style={{ background: "linear-gradient(135deg, #5AC8FA, #007AFF)", fontSize: "16px" }}
                  >
                    {savedContact.user.name[0]}
                  </div>
                )}
                <div>
                  <p style={{ fontWeight: 600, color: "#0a1628" }}>{savedContact.user.name}</p>
                  <p style={{ fontSize: "13px", color: "#8E8E93" }}>
                    {savedContact.user.role} · {savedContact.user.company}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {savedContact.user.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="ios-tag">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Auto-created tasks */}
          {autoTasks.length > 0 && (
            <motion.div
              className="glass-card p-4 text-left"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ borderColor: "rgba(0,122,255,0.12)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4" style={{ color: "#007AFF" }} />
                <p style={{ fontWeight: 600, fontSize: "14px", color: "#0a1628" }}>Задачи созданы автоматически</p>
              </div>
              <div className="space-y-2">
                {autoTasks.map((task) => {
                  const cfg = TASK_TYPE_CONFIG[task.type] ?? TASK_TYPE_CONFIG.message;
                  const dueDate = new Date(task.dueDate).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl"
                      style={{ background: "rgba(0,0,0,0.03)", border: "0.5px solid rgba(0,0,0,0.06)" }}
                    >
                      <div className="p-1.5 rounded-lg" style={{ background: cfg.bg }}>
                        <span style={{ color: cfg.color }}>{cfg.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: "13px", fontWeight: 500, color: "#0a1628" }}>{task.text}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" style={{ color: "#8E8E93" }} />
                          <span style={{ fontSize: "11px", color: "#8E8E93" }}>{dueDate}</span>
                        </div>
                      </div>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: cfg.bg, color: cfg.color }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          <div className="space-y-2.5">
            <button
              onClick={() => navigate(`/add-note?contact=${contactId}`)}
              className="w-full flex items-center justify-center gap-2 rounded-[14px] text-white font-semibold transition-all active:scale-97"
              style={{
                background: "linear-gradient(180deg, #3AA3FF 0%, #007AFF 50%, #0063D1 100%)",
                height: "50px", fontSize: "17px",
                boxShadow: "0 4px 20px rgba(0,122,255,0.45), inset 0 1px 0 rgba(255,255,255,0.28)",
              }}
            >
              <MessageSquarePlus className="w-5 h-5" />
              Добавить заметку
            </button>
            <button
              onClick={() => navigate("/contacts")}
              className="w-full rounded-[14px] font-semibold transition-all active:scale-97"
              style={{
                background: "rgba(255,255,255,0.72)",
                border: "0.5px solid rgba(0,0,0,0.1)",
                color: "#007AFF", height: "50px", fontSize: "17px",
              }}
            >
              К контактам
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress bar — only show when building profile from scratch */}
      {!profileExists && (
        <div className="px-5 pt-14 pb-5">
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#8E8E93" }}>Сохранение контакта</p>
            <p style={{ fontSize: "13px", color: "#8E8E93" }}>Шаг {step} из 3</p>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.08)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "#007AFF" }}
              animate={{ width: `${(step / 3) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-32">
        {/* Context banner */}
        {saveContactUsername && step === 1 && (
          <div className="glass-card p-4 mb-5" style={{ borderColor: "rgba(0,122,255,0.2)" }}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: "#007AFF" }} />
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#007AFF" }}>Взаимный обмен визитками</span>
            </div>
            <p style={{ fontSize: "13px", color: "#8E8E93", lineHeight: 1.5 }}>
              Создайте профиль, чтобы сохранить контакт{" "}
              {savedContact
                ? <strong style={{ color: "#0a1628" }}>{savedContact.user.name}</strong>
                : <strong style={{ color: "#0a1628" }}>@{saveContactUsername}</strong>}
              {" "}и поделиться своей визиткой
            </p>
          </div>
        )}

        {scannedFrom && step === 1 && (
          <div className="glass-card p-4 mb-5" style={{ borderColor: "rgba(52,199,89,0.2)" }}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: "#34C759" }} />
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#34C759" }}>QR-код распознан</span>
            </div>
            <p style={{ fontSize: "13px", color: "#8E8E93" }}>
              Создайте профиль, чтобы сохранить контакт @{scannedFrom}
            </p>
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#0a1628", marginBottom: "6px" }}>Основная информация</h2>
              <p style={{ fontSize: "15px", color: "#8E8E93" }}>Расскажите о себе — займёт минуту</p>
            </div>

            {[
              { label: "Имя и Фамилия", key: "name", placeholder: "Алексей Смирнов" },
              { label: "Должность", key: "role", placeholder: "Media Buyer" },
              { label: "Компания", key: "company", placeholder: "Digital Arbitrage Co" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "#8E8E93", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  {label}
                </label>
                <input
                  type="text"
                  value={formData[key as keyof typeof formData] as string}
                  onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full px-4 py-3 text-sm"
                />
              </div>
            ))}

            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#8E8E93", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                Telegram
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#8E8E93" }}>@</span>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="alexsmirnov"
                  className="w-full pl-8 pr-4 py-3 text-sm"
                />
              </div>
            </div>

            {/* Event picker */}
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#8E8E93", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                Где познакомились? <span style={{ fontWeight: 400, textTransform: "none" }}>(опционально)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_EVENTS.map((ev) => (
                  <button
                    key={ev}
                    onClick={() => setFormData({ ...formData, event: formData.event === ev ? "" : ev })}
                    className="px-3 py-2 rounded-full text-sm font-medium transition-all active:scale-95"
                    style={formData.event === ev
                      ? { background: "#007AFF", color: "#fff", boxShadow: "0 2px 8px rgba(0,122,255,0.3)" }
                      : { background: "rgba(0,0,0,0.05)", color: "#3c3c43" }}
                  >
                    {formData.event === ev && <Check className="w-3.5 h-3.5 inline mr-1" />}
                    {ev}
                  </button>
                ))}
                <button
                  onClick={() => setFormData({ ...formData, event: formData.event === "Другое" ? "" : "Другое" })}
                  className="px-3 py-2 rounded-full text-sm font-medium transition-all active:scale-95"
                  style={formData.event === "Другое"
                    ? { background: "#8E8E93", color: "#fff" }
                    : { background: "rgba(0,0,0,0.05)", color: "#3c3c43" }}
                >
                  Другое
                </button>
              </div>
              {formData.event === "Другое" && (
                <motion.input
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  type="text"
                  value={formData.eventCustom}
                  onChange={(e) => setFormData({ ...formData, eventCustom: e.target.value })}
                  placeholder="Например: Конференция DevDays 2026"
                  className="w-full px-4 py-3 text-sm mt-3"
                />
              )}
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#0a1628", marginBottom: "6px" }}>Ваши интересы</h2>
              <p style={{ fontSize: "15px", color: "#8E8E93" }}>Помогут людям быстро понять вашу специализацию</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_TAGS.map((tag) => {
                const selected = formData.selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className="px-3 py-2 rounded-full text-sm font-medium transition-all active:scale-95"
                    style={selected
                      ? { background: "#007AFF", color: "#fff", boxShadow: "0 2px 8px rgba(0,122,255,0.3)" }
                      : { background: "rgba(0,0,0,0.05)", color: "#3c3c43" }}
                  >
                    {selected && <Check className="w-3.5 h-3.5 inline mr-1" />}
                    {tag}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: "13px", color: "#8E8E93" }}>Выбрано: {formData.selectedTags.length}</p>
          </div>
        )}

        {/* Step 3 — either profile review (new user) or event picker (existing user) */}
        {step === 3 && profileExists && (
          <div className="space-y-5 pt-14">
            <div>
              <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#0a1628", marginBottom: "6px" }}>
                Сохранить контакт
              </h2>
              <p style={{ fontSize: "15px", color: "#8E8E93" }}>
                {scannedFrom || saveContactUsername
                  ? `Где познакомились с @${scannedFrom || saveContactUsername}?`
                  : "Укажите контекст встречи (необязательно)"}
              </p>
            </div>
            {/* Event picker */}
            <div className="flex flex-wrap gap-2">
              {PRESET_EVENTS.map((ev) => (
                <button
                  key={ev}
                  onClick={() => setFormData({ ...formData, event: formData.event === ev ? "" : ev })}
                  className="px-3 py-2 rounded-full text-sm font-medium transition-all active:scale-95"
                  style={formData.event === ev
                    ? { background: "#007AFF", color: "#fff", boxShadow: "0 2px 8px rgba(0,122,255,0.3)" }
                    : { background: "rgba(0,0,0,0.05)", color: "#3c3c43" }}
                >
                  {formData.event === ev && <Check className="w-3.5 h-3.5 inline mr-1" />}
                  {ev}
                </button>
              ))}
              <button
                onClick={() => setFormData({ ...formData, event: formData.event === "Другое" ? "" : "Другое" })}
                className="px-3 py-2 rounded-full text-sm font-medium transition-all active:scale-95"
                style={formData.event === "Другое"
                  ? { background: "#8E8E93", color: "#fff" }
                  : { background: "rgba(0,0,0,0.05)", color: "#3c3c43" }}
              >
                Другое
              </button>
            </div>
            {formData.event === "Другое" && (
              <motion.input
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                type="text"
                value={formData.eventCustom}
                onChange={(e) => setFormData({ ...formData, eventCustom: e.target.value })}
                placeholder="Например: Конференция DevDays 2026"
                className="w-full px-4 py-3 text-sm"
              />
            )}
          </div>
        )}

        {step === 3 && !profileExists && (
          <div className="space-y-5 text-center">
            <motion.div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
              style={{ background: "#34C759", boxShadow: "0 8px 24px rgba(52,199,89,0.35)" }}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 22 }}
            >
              <Check className="w-10 h-10 text-white" />
            </motion.div>
            <div>
              <h2 style={{ fontSize: "28px", fontWeight: 700, color: "#0a1628" }}>Готово!</h2>
              <p style={{ fontSize: "15px", color: "#8E8E93", marginTop: "6px" }}>Ваш профиль создан</p>
            </div>
            <div className="glass-card p-5 text-left">
              <p style={{ fontWeight: 600, color: "#0a1628", marginBottom: "12px" }}>Ваш профиль:</p>
              <p style={{ fontWeight: 700, fontSize: "18px", color: "#0a1628" }}>{formData.name}</p>
              <p style={{ fontSize: "14px", color: "#8E8E93", marginTop: "2px", marginBottom: "4px" }}>
                {formData.role} · {formData.company}
              </p>
              {effectiveEvent && (
                <p style={{ fontSize: "13px", color: "#007AFF", marginBottom: "10px" }}>📍 {effectiveEvent}</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {formData.selectedTags.map((tag) => (
                  <span key={tag} className="ios-tag">{tag}</span>
                ))}
              </div>
            </div>
            {(scannedFrom || saveContactUsername) && (
              <div className="glass-card p-4" style={{ borderColor: "rgba(0,122,255,0.15)" }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles className="w-4 h-4" style={{ color: "#007AFF" }} />
                  <span style={{ fontWeight: 600, color: "#0a1628" }}>Взаимный обмен</span>
                </div>
                <p style={{ fontSize: "13px", color: "#8E8E93" }}>
                  Контакт сохранён в ваш список, а ваша визитка отправлена им
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-4"
        style={{ background: "rgba(249,249,251,0.85)", backdropFilter: "blur(20px)", borderTop: "0.5px solid rgba(0,0,0,0.08)" }}
      >
        <div className="max-w-lg mx-auto flex gap-2.5">
          {step > 1 && step < 3 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-5 rounded-[14px] font-semibold transition-all active:scale-97"
              style={{
                background: "rgba(255,255,255,0.72)",
                border: "0.5px solid rgba(0,0,0,0.1)",
                color: "#007AFF", height: "50px", fontSize: "17px",
              }}
            >
              Назад
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex-1 flex items-center justify-center gap-2 rounded-[14px] text-white font-semibold transition-all active:scale-97 disabled:opacity-40"
              style={{
                background: "linear-gradient(180deg, #3AA3FF 0%, #007AFF 50%, #0063D1 100%)",
                height: "50px", fontSize: "17px",
                boxShadow: "0 4px 20px rgba(0,122,255,0.45), inset 0 1px 0 rgba(255,255,255,0.28)",
              }}
            >
              {step === 2 ? "Завершить" : "Далее"}
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="flex-1 flex items-center justify-center gap-2 rounded-[14px] text-white font-semibold transition-all active:scale-97"
              style={{
                background: "linear-gradient(180deg, #3AA3FF 0%, #007AFF 50%, #0063D1 100%)",
                height: "50px", fontSize: "17px",
                boxShadow: "0 4px 20px rgba(0,122,255,0.45), inset 0 1px 0 rgba(255,255,255,0.28)",
              }}
            >
              {saveContactUsername ? "Сохранить контакт" : "К контактам"}
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
