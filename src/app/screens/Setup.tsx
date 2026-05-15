import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { saveCurrentUser } from "../utils/userStore";

const PRESET_TAGS = [
  "Арбитраж", "Партнёрки", "Партнёрские сети", "Платёжки",
  "Аккаунты", "Агентские", "AI/Tech", "Media Buying", "Crypto", "iGaming",
];

export function Setup({ onComplete }: { onComplete?: () => void } = {}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    role: "",
    company: "",
    username: "",
    companyUrl: "",
    bio: "",
    tags: [] as string[],
  });

  // Pre-fill from Telegram if available
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    const tgUser = tg?.initDataUnsafe?.user;
    if (tgUser) {
      setForm((f) => ({
        ...f,
        name: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" "),
        username: tgUser.username || "",
      }));
    }
  }, []);

  const toggleTag = (tag: string) => {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));
  };

  const canProceedStep1 = form.name.trim().length > 0 && form.role.trim().length > 0 && form.username.trim().length > 0;

  const handleComplete = () => {
    const clean = (s: string) => s.replace("@", "").trim();
    const links: { type: string; url: string }[] = [];
    if (form.username) links.push({ type: "telegram", url: `https://t.me/${clean(form.username)}` });

    const tg = (window as any).Telegram?.WebApp;
    const tgUser = tg?.initDataUnsafe?.user;

    saveCurrentUser({
      id: tgUser ? String(tgUser.id) : `u_${Date.now()}`,
      name: form.name.trim(),
      role: form.role.trim(),
      company: form.company.trim(),
      username: clean(form.username),
      bio: form.bio.trim(),
      tags: form.tags,
      links,
      photo: tgUser?.photo_url || "",
      companyUrl: form.companyUrl.trim(),
    });

    if (onComplete) {
      onComplete();
    } else {
      navigate("/", { replace: true });
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ padding: "0 16px 40px", background: "linear-gradient(180deg, #DCEEFB 0%, #EEF6FF 45%, #E6F0FF 100%)" }}
    >
      {/* Logo & heading */}
      <div className="pt-16 pb-6 text-center">
        <div
          className="w-20 h-20 rounded-[24px] flex items-center justify-center mx-auto mb-4"
          style={{
            background: "linear-gradient(135deg, #5AC8FA 0%, #007AFF 100%)",
            boxShadow: "0 8px 32px rgba(0,122,255,0.35)",
          }}
        >
          <span style={{ fontSize: "38px", fontWeight: 800, color: "white", letterSpacing: "-2px" }}>W</span>
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#0a1628", letterSpacing: "-0.5px" }}>
          Настройте профиль
        </h1>
        <p style={{ fontSize: "15px", color: "#8E8E93", marginTop: "6px" }}>
          {step === 1 ? "Основная информация" : "Ссылки и интересы"}
        </p>
        {/* Step indicator */}
        <div className="flex gap-2 justify-center mt-4">
          {[1, 2].map((s) => (
            <div
              key={s}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: step === s ? "28px" : "6px",
                background: step === s ? "#007AFF" : "rgba(0,0,0,0.12)",
              }}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="flex-1 space-y-3"
          >
            <Field label="Имя и фамилия *">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Алексей Смирнов"
                className="w-full px-4 py-3 text-base"
              />
            </Field>
            <Field label="Должность *">
              <input
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                placeholder="Media Buyer"
                className="w-full px-4 py-3 text-base"
              />
            </Field>
            <Field label="Компания">
              <input
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                placeholder="Digital Agency"
                className="w-full px-4 py-3 text-base"
              />
            </Field>
            <Field label="Telegram *">
              <div className="relative">
                <span
                  style={{
                    position: "absolute", left: "14px", top: "50%",
                    transform: "translateY(-50%)", color: "#8E8E93", fontSize: "15px",
                  }}
                >
                  @
                </span>
                <input
                  value={form.username.replace("@", "")}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.replace("@", "") }))}
                  placeholder="username"
                  className="w-full py-3 text-base"
                  style={{ paddingLeft: "28px", paddingRight: "16px" }}
                />
              </div>
            </Field>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="flex-1 space-y-3"
          >
            <Field label="Сайт компании">
              <input
                value={form.companyUrl}
                onChange={(e) => setForm((f) => ({ ...f, companyUrl: e.target.value }))}
                placeholder="https://company.com"
                className="w-full px-4 py-3 text-base"
              />
            </Field>
            <Field label="О себе">
              <textarea
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Расскажите о себе и своей специализации"
                rows={3}
                className="w-full px-4 py-3 text-base resize-none"
              />
            </Field>
            <div>
              <label
                style={{
                  fontSize: "13px", fontWeight: 600, color: "#8E8E93",
                  display: "block", marginBottom: "8px",
                  textTransform: "uppercase", letterSpacing: "0.5px",
                }}
              >
                Ниши
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESET_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className="px-3 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95"
                    style={
                      form.tags.includes(tag)
                        ? { background: "#007AFF", color: "white", boxShadow: "0 2px 8px rgba(0,122,255,0.3)" }
                        : { background: "rgba(0,0,0,0.06)", color: "#3c3c43" }
                    }
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="mt-8 space-y-2.5">
        {step === 1 ? (
          <PrimaryButton onClick={() => setStep(2)} disabled={!canProceedStep1}>
            Далее →
          </PrimaryButton>
        ) : (
          <>
            <PrimaryButton onClick={handleComplete}>
              Начать работу
            </PrimaryButton>
            <SecondaryButton onClick={() => setStep(1)}>
              ← Назад
            </SecondaryButton>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        style={{
          fontSize: "13px", fontWeight: 600, color: "#8E8E93",
          display: "block", marginBottom: "6px",
          textTransform: "uppercase", letterSpacing: "0.5px",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function PrimaryButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-[14px] text-white font-semibold transition-all active:scale-97 disabled:opacity-40"
      style={{
        background: "linear-gradient(180deg, #3AA3FF 0%, #007AFF 50%, #0063D1 100%)",
        height: "50px", fontSize: "17px",
        boxShadow: "0 4px 20px rgba(0,122,255,0.45), inset 0 1px 0 rgba(255,255,255,0.28)",
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-[14px] font-semibold transition-all active:scale-97"
      style={{
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(20px)",
        border: "0.5px solid rgba(0,0,0,0.1)",
        color: "#007AFF", height: "50px", fontSize: "17px",
      }}
    >
      {children}
    </button>
  );
}
