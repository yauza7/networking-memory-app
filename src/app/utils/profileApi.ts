/**
 * Self-layer client: pushes the local profile to Redis on save and fetches
 * other users' public profiles by username. Best-effort — never throws,
 * silently no-ops outside Telegram (no initData → no server identity).
 */
import type { User } from "./mockData";

function getInitData(): string | null {
  try {
    const tg = (window as any).Telegram?.WebApp;
    return typeof tg?.initData === "string" && tg.initData ? tg.initData : null;
  } catch {
    return null;
  }
}

export interface PushProfileInput {
  username?: string;
  name?: string;
  role?: string;
  company?: string;
  companyUrl?: string;
  bio?: string;
  tags?: string[];
  public?: boolean;
}

/** Mirror the user's self-layer to the server. Fire-and-forget. */
export async function pushOwnProfile(input: PushProfileInput): Promise<void> {
  const initData = getInitData();
  if (!initData || !input.username) return;
  try {
    await fetch("/api/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": initData,
      },
      body: JSON.stringify(input),
    });
  } catch {
    // Best-effort
  }
}

/** Fetch a public profile by username. Returns null if not found / unreachable. */
export async function fetchPublicProfile(username: string): Promise<User | null> {
  const clean = username.replace(/^@/, "").trim();
  if (!clean) return null;
  try {
    const r = await fetch(`/api/profile?username=${encodeURIComponent(clean)}`);
    if (!r.ok) return null;
    const data = await r.json();
    if (!data || !data.username) return null;
    return {
      id: data.id || `u-${data.username}`,
      name: data.name || data.username,
      username: data.username,
      role: data.role || "",
      company: data.company || "",
      companyUrl: data.companyUrl || "",
      bio: data.bio || "",
      photo: data.photo || "",
      tags: Array.isArray(data.tags) ? data.tags : [],
      links: Array.isArray(data.links) ? data.links : [],
    } as User;
  } catch {
    return null;
  }
}
