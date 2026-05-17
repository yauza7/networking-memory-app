/**
 * W·52 — Setup (Onboarding "Настройте профиль")
 * Moody. Sonar + whale mark, mono eyebrows for fields, ivory CTA.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { saveCurrentUser } from "../utils/userStore";
import { pushOwnProfile } from "../utils/profileApi";
import {
  Atmosphere,
  Sonar,
  W52Mark,
  CoordLine,
  IvoryBtn,
  GhostBtn,
  Hero,
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
      tags: f.tags.includes(tag)
        ? f.tags.filter((t) => t !== tag)
        : [...f.tags, tag],
    }));
  };

  const canProceedStep1 =
    form.name.trim().length > 0 &&
    form.role.trim().length > 0 &&
    form.username.trim().length > 0;

  const handleComplete = () => {
    const clean = (s: string) => s.replace("@", "").trim();
    const links: { type: string; url: string }[] = [];
    if (form.username)
      links.push({
        type: "telegram",
        url: `https://t.me/${clean(form.username)}`,
      });

    const tg = (window as any).Telegram?.WebApp;
    const tgUser = tg?.initDataUnsafe?.user;

    const username = clean(form.username);
    saveCurrentUser({
      id: tgUser ? String(tgUser.id) : `u_${Date.now()}`,
      name: form.name.trim(),
      role: form.role.trim(),
      company: form.company.trim(),
      username,
      bio: form.bio.trim(),
      tags: form.tags,
      links,
      photo: tgUser?.photo_url || "",
      companyUrl: form.companyUrl.trim(),
    });

    void pushOwnProfile({
      username,
      name: form.name.trim(),
      role: form.role.trim(),
      company: form.company.trim(),
      companyUrl: form.companyUrl.trim(),
      bio: form.bio.trim(),
      tags: form.tags,
    });

    if (onComplete) onComplete();
    else navigate("/", { replace: true });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--ivory)",
        position: "relative",
        padding: "0 16px 40px",
      }}
    >
      <Atmosphere intensity={0.35} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ paddingTop: 60 }}>
          <CoordLine left="ECHO · IDENTITY" right={`STEP ${step} / 2`} />
        </div>

        {/* Logo */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 30,
            paddingBottom: 18,
            textAlign: "center",
          }}
        >
          <div style={{ position: "relative", width: 120, height: 90, marginBottom: 14 }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sonar size={110} rings={4} opacity={0.4} />
            </div>
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-50%)",
              }}
            >
              <W52Mark size={56} color="var(--ivory)" />
            </div>
          </div>
          <Hero size={30}>Ваш профиль</Hero>
          <p
            className="font-serif it text-muted-w"
            style={{ fontSize: 15, marginTop: 8, lineHeight: 1.5, maxWidth: 280 }}
          >
            {step === 1
              ? "Это видит тот, кто сканирует ваш QR."
              : "Что вы делаете — пара деталей."}
          </p>

          {/* Step indicator dots */}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 18 }}>
            {[1, 2].map((s) => (
              <div
                key={s}
                style={{
                  height: 4,
                  borderRadius: 2,
                  width: step === s ? 28 : 6,
                  background: step === s ? "var(--signal)" : "var(--line-soft)",
                  transition: "width 0.3s",
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
              style={{ paddingTop: 14, display: "flex", flexDirection: "column", gap: 14 }}
            >
              <Field label="ИМЯ">
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Алексей Смирнов"
                  style={inputStyle}
                />
              </Field>
              <Field label="ДОЛЖНОСТЬ">
                <input
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  placeholder="Media Buyer"
                  style={inputStyle}
                />
              </Field>
              <Field label="КОМПАНИЯ">
                <input
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  placeholder="Digital Agency"
                  style={inputStyle}
                />
              </Field>
              <Field label="TELEGRAM">
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 16,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--faint)",
                      fontFamily: "var(--sans)",
                      fontSize: 15,
                    }}
                  >
                    @
                  </span>
                  <input
                    value={form.username.replace("@", "")}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        username: e.target.value.replace("@", ""),
                      }))
                    }
                    placeholder="username"
                    style={{ ...inputStyle, paddingLeft: 30 }}
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
              style={{ paddingTop: 14, display: "flex", flexDirection: "column", gap: 14 }}
            >
              <Field label="САЙТ КОМПАНИИ">
                <input
                  value={form.companyUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, companyUrl: e.target.value }))
                  }
                  placeholder="https://company.com"
                  style={inputStyle}
                />
              </Field>
              <Field label="О СЕБЕ">
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="Расскажите о специализации"
                  rows={3}
                  style={{ ...inputStyle, resize: "none", padding: "14px 16px" }}
                />
              </Field>
              <div>
                <label className="eyebrow" style={{ marginBottom: 10, display: "block", paddingLeft: 4 }}>
                  ТЕГИ
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {TAG_GROUPS.map((group) => (
                    <div key={group.label}>
                      <div className="eyebrow" style={{ marginBottom: 6, color: "var(--signal-dim)", fontSize: 10 }}>
                        {group.label}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {group.tags.map((tag) => {
                          const active = form.tags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => toggleTag(tag)}
                              style={{
                                padding: "5px 10px",
                                borderRadius: 100,
                                background: active ? "oklch(0.86 0.13 195 / 0.18)" : "transparent",
                                color: active ? "var(--signal)" : "var(--muted-fg)",
                                fontFamily: "var(--mono)",
                                fontSize: 11,
                                letterSpacing: "0.04em",
                                border: `1px solid ${active ? "var(--signal-dim)" : "var(--line-soft)"}`,
                                cursor: "pointer",
                              }}
                            >
                              {active ? "✓ " : ""}{tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 10 }}>
          {step === 1 ? (
            <IvoryBtn onClick={() => setStep(2)} disabled={!canProceedStep1}>
              Далее
              <svg width="14" height="14" viewBox="0 0 14 14">
                <path
                  d="M1 7h12M8 2l5 5-5 5"
                  stroke="var(--abyss)"
                  strokeWidth="1.7"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </IvoryBtn>
          ) : (
            <>
              <IvoryBtn onClick={handleComplete}>Начать работу</IvoryBtn>
              <GhostBtn onClick={() => setStep(1)}>← Назад</GhostBtn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  background: "var(--surface)",
  border: "1px solid var(--line-soft)",
  borderRadius: 14,
  color: "var(--ivory)",
  fontFamily: "var(--sans)",
  fontSize: 16,
  letterSpacing: "-0.005em",
  outline: "none",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="eyebrow"
        style={{ display: "block", marginBottom: 8, paddingLeft: 4 }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
