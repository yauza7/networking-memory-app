import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, X } from "lucide-react";
import { motion } from "motion/react";
import { loadCurrentUser, saveCurrentUser } from "../utils/userStore";

const PRESET_TAGS = [
  "Арбитраж", "Партнёрки", "Партнёрские сети", "Платёжки",
  "Аккаунты", "Агентские", "AI/Tech", "Media Buying",
  "Crypto", "iGaming", "Нутра", "E-commerce", "Legal",
];

export function EditProfile() {
  const navigate = useNavigate();
  const user = loadCurrentUser();

  const tgLink = user.links.find((l) => l.type === "telegram");
  const igLink = user.links.find((l) => l.type === "instagram");
  const liLink = user.links.find((l) => l.type === "linkedin");

  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username || tgLink?.url.replace("https://t.me/", "") || "");
  const [role, setRole] = useState(user.role);
  const [company, setCompany] = useState(user.company || "");
  const [companyUrl, setCompanyUrl] = useState(user.companyUrl || "");
  const [bio, setBio] = useState(user.bio || "");
  const [tags, setTags] = useState<string[]>(user.tags || []);
  const [instagram, setInstagram] = useState(igLink?.url.replace("https://instagram.com/", "") || "");
  const [linkedin, setLinkedin] = useState(liLink?.url.replace("https://linkedin.com/in/", "") || "");
  const [newTag, setNewTag] = useState("");

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
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
    if (username.trim()) links.push({ type: "telegram", url: `https://t.me/${username.trim()}` });
    if (instagram.trim()) links.push({ type: "instagram", url: `https://instagram.com/${instagram.trim()}` });
    if (linkedin.trim()) links.push({ type: "linkedin", url: `https://linkedin.com/in/${linkedin.trim()}` });
    // preserve other links (email, website)
    user.links.filter((l) => !["telegram", "instagram", "linkedin"].includes(l.type)).forEach((l) => links.push(l));

    saveCurrentUser({ name, username: username.trim(), role, company, companyUrl, bio, tags, links });
    navigate(-1);
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-14 pb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} style={{ color: "#007AFF" }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#0a1628", letterSpacing: "-0.4px" }}>
            Редактировать
          </h1>
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-full font-semibold text-white transition-all active:scale-95"
          style={{ background: "#007AFF", fontSize: "15px" }}
        >
          Сохранить
        </button>
      </div>

      <div className="px-4 space-y-4">
        {/* Basic */}
        <motion.div className="glass-card p-5 space-y-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <SectionLabel>Основное</SectionLabel>
          <Field label="Имя и фамилия">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ваше имя" className="w-full px-4 py-3 text-sm" />
          </Field>
          <Field label="Telegram *">
            <div className="relative">
              <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#8E8E93" }}>@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.replace("@", ""))}
                placeholder="username"
                className="w-full py-3 text-sm"
                style={{ paddingLeft: "28px", paddingRight: "16px" }}
              />
            </div>
          </Field>
          <Field label="Должность">
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Media Buyer" className="w-full px-4 py-3 text-sm" />
          </Field>
          <Field label="Компания">
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Название компании" className="w-full px-4 py-3 text-sm" />
          </Field>
          <Field label="Сайт компании">
            <input value={companyUrl} onChange={(e) => setCompanyUrl(e.target.value)} placeholder="https://company.com" className="w-full px-4 py-3 text-sm" />
          </Field>
          <Field label="О себе">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Расскажите о себе и своей специализации"
              rows={3}
              className="w-full px-4 py-3 text-sm resize-none"
            />
          </Field>
        </motion.div>

        {/* Social links */}
        <motion.div className="glass-card p-5 space-y-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <SectionLabel>Соцсети</SectionLabel>
          <Field label="Instagram">
            <div className="relative">
              <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#8E8E93" }}>@</span>
              <input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value.replace("@", ""))}
                placeholder="username"
                className="w-full py-3 text-sm"
                style={{ paddingLeft: "28px", paddingRight: "16px" }}
              />
            </div>
          </Field>
          <Field label="LinkedIn">
            <input
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="linkedin.com/in/username"
              className="w-full px-4 py-3 text-sm"
            />
          </Field>
        </motion.div>

        {/* Tags */}
        <motion.div className="glass-card p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <SectionLabel>Ниши и специализация</SectionLabel>
          <div className="flex flex-wrap gap-2 mt-3 mb-3">
            {PRESET_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className="px-3 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95"
                style={
                  tags.includes(tag)
                    ? { background: "#007AFF", color: "white", boxShadow: "0 2px 8px rgba(0,122,255,0.3)" }
                    : { background: "rgba(0,0,0,0.06)", color: "#3c3c43" }
                }
              >
                {tag}
              </button>
            ))}
          </div>
          {/* Custom tags */}
          {tags.filter((t) => !PRESET_TAGS.includes(t)).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.filter((t) => !PRESET_TAGS.includes(t)).map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{ background: "rgba(0,122,255,0.1)", color: "#007AFF" }}
                >
                  {tag}
                  <button onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomTag()}
              placeholder="Свой тег"
              className="flex-1 px-4 py-2.5 text-sm"
            />
            <button
              onClick={addCustomTag}
              disabled={!newTag.trim()}
              className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
              style={{ background: "#007AFF" }}
            >
              +
            </button>
          </div>
        </motion.div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="w-full rounded-[14px] text-white font-semibold transition-all active:scale-97"
          style={{
            background: "linear-gradient(180deg, #3AA3FF 0%, #007AFF 50%, #0063D1 100%)",
            height: "50px", fontSize: "17px",
            boxShadow: "0 4px 20px rgba(0,122,255,0.45), inset 0 1px 0 rgba(255,255,255,0.28)",
          }}
        >
          Сохранить изменения
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: "12px", fontWeight: 600, color: "#8E8E93", display: "block", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "13px", fontWeight: 600, color: "#8E8E93", textTransform: "uppercase", letterSpacing: "0.5px" }}>
      {children}
    </p>
  );
}
