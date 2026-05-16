/**
 * W·52 — Редактировать профиль (EditProfile)
 * Moody. Группы тегов (Команда / Трафик / Вертикали) + свои теги.
 * @-префикс для Telegram и Instagram юзернеймов.
 */
import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { loadCurrentUser, saveCurrentUser } from "../utils/userStore";
import {
  Atmosphere,
  Hero,
  RoundBtn,
  IvoryBtn,
  SectionLabel,
  cardStyle,
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
const ALL_PRESET = TAG_GROUPS.flatMap((g) => g.tags);

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "var(--deep)",
  border: "1px solid var(--line-soft)",
  borderRadius: 12,
  color: "var(--ivory)",
  fontFamily: "var(--sans)",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  appearance: "none",
  WebkitAppearance: "none" as any,
};

export function EditProfile() {
  const navigate = useNavigate();
  const user = loadCurrentUser();

  const tgLink = user.links.find((l) => l.type === "telegram");
  const igLink = user.links.find((l) => l.type === "instagram");
  const liLink = user.links.find((l) => l.type === "linkedin");

  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(
    user.username || tgLink?.url.replace("https://t.me/", "") || ""
  );
  const [role, setRole] = useState(user.role);
  const [company, setCompany] = useState(user.company || "");
  const [companyUrl, setCompanyUrl] = useState(user.companyUrl || "");
  const [bio, setBio] = useState(user.bio || "");
  const [tags, setTags] = useState<string[]>(user.tags || []);
  const [instagram, setInstagram] = useState(
    igLink?.url.replace("https://instagram.com/", "") || ""
  );
  const [linkedin, setLinkedin] = useState(
    liLink?.url.replace("https://linkedin.com/in/", "") || ""
  );
  const [newTag, setNewTag] = useState("");

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    const t = newTag.trim();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
      setNewTag("");
    }
  };

  const handleSave = () => {
    const links: { type: string; url: string }[] = [];
    if (username.trim())
      links.push({ type: "telegram", url: `https://t.me/${username.trim()}` });
    if (instagram.trim())
      links.push({ type: "instagram", url: `https://instagram.com/${instagram.trim()}` });
    if (linkedin.trim())
      links.push({ type: "linkedin", url: `https://linkedin.com/in/${linkedin.trim()}` });
    // preserve other links (email, website)
    user.links
      .filter((l) => !["telegram", "instagram", "linkedin"].includes(l.type))
      .forEach((l) => links.push(l));

    saveCurrentUser({
      name,
      username: username.trim(),
      role,
      company,
      companyUrl,
      bio,
      tags,
      links,
    });
    navigate(-1);
  };

  const customTags = tags.filter((t) => !ALL_PRESET.includes(t));

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
        <div
          style={{
            padding: "56px 18px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
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
          <button
            onClick={handleSave}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--signal)",
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Сохранить
          </button>
        </div>

        <div style={{ padding: "16px 22px 0" }}>
          <Hero size={32}>Профиль</Hero>
        </div>

        {/* Basic */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{ padding: "22px 16px 0" }}
        >
          <div style={{ ...cardStyle, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionLabelInline>Основное</SectionLabelInline>

            <Field label="Имя и фамилия *">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван Иванов"
                style={inputStyle}
              />
            </Field>

            <Field label="Telegram *">
              <PrefixedInput
                prefix="@"
                value={username}
                onChange={(v) => setUsername(v.replace(/^@/, "").slice(0, 32))}
                placeholder="username"
              />
            </Field>

            <Field label="Должность">
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Media Buyer"
                style={inputStyle}
              />
            </Field>

            <Field label="Компания">
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Название компании"
                style={inputStyle}
              />
            </Field>

            <Field label="Сайт компании">
              <input
                value={companyUrl}
                onChange={(e) => setCompanyUrl(e.target.value)}
                placeholder="example.com"
                style={inputStyle}
              />
            </Field>

            <Field label="О себе">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Расскажи о себе и специализации"
                rows={3}
                style={{ ...inputStyle, resize: "none", lineHeight: 1.5 }}
              />
            </Field>
          </div>
        </motion.div>

        {/* Socials */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ padding: "16px 16px 0" }}
        >
          <div style={{ ...cardStyle, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionLabelInline>Соцсети</SectionLabelInline>

            <Field label="Instagram">
              <PrefixedInput
                prefix="@"
                value={instagram}
                onChange={(v) => setInstagram(v.replace(/^@/, ""))}
                placeholder="username"
              />
            </Field>

            <Field label="LinkedIn">
              <input
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="linkedin.com/in/username"
                style={inputStyle}
              />
            </Field>
          </div>
        </motion.div>

        {/* Tags — grouped */}
        <div style={{ marginTop: 22 }}>
          <SectionLabel>Теги</SectionLabel>
          <div style={{ padding: "0 22px", display: "flex", flexDirection: "column", gap: 14 }}>
            {TAG_GROUPS.map((group) => (
              <div key={group.label}>
                <div className="eyebrow" style={{ marginBottom: 6, color: "var(--signal-dim)" }}>
                  {group.label}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {group.tags.map((tag) => {
                    const on = tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        style={{
                          padding: "5px 10px",
                          borderRadius: 100,
                          background: on ? "oklch(0.86 0.13 195 / 0.18)" : "transparent",
                          color: on ? "var(--signal)" : "var(--muted-fg)",
                          border: `1px solid ${on ? "var(--signal-dim)" : "var(--line-soft)"}`,
                          fontFamily: "var(--mono)",
                          fontSize: 11,
                          letterSpacing: "0.04em",
                          cursor: "pointer",
                        }}
                      >
                        {on ? "✓ " : ""}
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Custom tags */}
            <div>
              <div className="eyebrow" style={{ marginBottom: 6, color: "var(--signal-dim)" }}>
                Свои теги
              </div>
              {customTags.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {customTags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "5px 10px",
                        borderRadius: 100,
                        background: "oklch(0.86 0.13 195 / 0.18)",
                        color: "var(--signal)",
                        border: "1px solid var(--signal-dim)",
                        fontFamily: "var(--mono)",
                        fontSize: 11,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {tag}
                      <button
                        onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--signal)",
                          padding: 0,
                          display: "flex",
                          cursor: "pointer",
                        }}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value.slice(0, 30))}
                  onKeyDown={(e) => e.key === "Enter" && addCustomTag()}
                  placeholder="Свой тег"
                  style={{
                    ...inputStyle,
                    borderRadius: 100,
                    padding: "8px 14px",
                    fontFamily: "var(--mono)",
                    fontSize: 12,
                  }}
                />
                <button
                  onClick={addCustomTag}
                  disabled={!newTag.trim()}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 100,
                    background: newTag.trim() ? "var(--signal)" : "transparent",
                    color: newTag.trim() ? "var(--abyss)" : "var(--muted-fg)",
                    border: `1px solid ${newTag.trim() ? "var(--signal)" : "var(--line-soft)"}`,
                    fontFamily: "var(--mono)",
                    fontSize: 12,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    cursor: newTag.trim() ? "pointer" : "default",
                    whiteSpace: "nowrap",
                  }}
                >
                  + Добавить
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div style={{ padding: "26px 22px 0" }}>
          <IvoryBtn h={52} onClick={handleSave}>
            Сохранить изменения
          </IvoryBtn>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="eyebrow"
        style={{ display: "block", marginBottom: 6 }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function SectionLabelInline({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="eyebrow"
      style={{ margin: 0, color: "var(--signal-dim)" }}
    >
      {children}
    </p>
  );
}

function PrefixedInput({
  prefix,
  value,
  onChange,
  placeholder,
}: {
  prefix: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div style={{ position: "relative" }}>
      <span
        style={{
          position: "absolute",
          left: 14,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--signal-dim)",
          fontFamily: "var(--sans)",
          fontSize: 14,
          pointerEvents: "none",
        }}
      >
        {prefix}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle, paddingLeft: 28 }}
      />
    </div>
  );
}
