import type { User } from "./mockData";

const KEY = "w52_profile";
const APP_URL = "https://w52-app.vercel.app";

const defaultUser: User = {
  id: "user1",
  name: "Алексей Смирнов",
  username: "alexsmirnov",
  role: "Media Buyer",
  company: "Digital Arbitrage Co",
  photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
  bio: "Специализируюсь на трафике для iGaming и Nutra офферов в LATAM.",
  tags: ["iGaming", "Нутра", "LATAM", "Арбитраж"],
  links: [
    { type: "telegram", url: "https://t.me/alexsmirnov" },
    { type: "instagram", url: "https://instagram.com/alexsmirnov" },
    { type: "email", url: "mailto:alex@digitalarbitrage.co" },
    { type: "website", url: "https://alexsmirnov.pro" },
  ],
};

export function loadCurrentUser(): User {
  try {
    // 1. Try Telegram WebApp user first
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user) {
      const tgUser = tg.initDataUnsafe.user;
      const stored = getStoredProfile();
      return stored ?? {
        ...defaultUser,
        id: String(tgUser.id),
        name: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") || defaultUser.name,
        username: tgUser.username || defaultUser.username,
        photo: tgUser.photo_url || defaultUser.photo,
      };
    }
    // 2. Stored profile from onboarding
    const stored = getStoredProfile();
    if (stored) return stored;
  } catch {}
  return defaultUser;
}

function getStoredProfile(): User | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function saveCurrentUser(partial: Partial<User>) {
  const current = loadCurrentUser();
  const updated = { ...current, ...partial };
  localStorage.setItem(KEY, JSON.stringify(updated));
  return updated;
}

export function getProfileUrl(username?: string) {
  return `${APP_URL}/u/${username || "me"}`;
}

/** Encode full profile into QR so the recipient can auto-fill the contact card */
export function getQRValue(usernameOrUser?: string | User): string {
  // Legacy: called with just a username string
  if (typeof usernameOrUser === "string" || usernameOrUser === undefined) {
    const username = usernameOrUser || "me";
    return `${APP_URL}/u/${username}?ref=qr`;
  }
  // Called with full User object — encode profile
  const u = usernameOrUser;
  try {
    const payload = {
      n: u.name,
      r: u.role,
      c: u.company,
      t: u.tags?.slice(0, 8) ?? [],
      p: u.photo || "",
      un: u.username || "",
      b: u.bio || "",
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    return `${APP_URL}/u/${u.username || "me"}?ref=qr&d=${encoded}`;
  } catch {
    return `${APP_URL}/u/${u.username || "me"}?ref=qr`;
  }
}

export { APP_URL };
