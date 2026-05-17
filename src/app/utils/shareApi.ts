/**
 * Share-link client. Mirrors api/share.ts.
 */
import type { Connection, SharedFrom, User } from "./mockData";

function getInitData(): string | null {
  try {
    const tg = (window as any).Telegram?.WebApp;
    return typeof tg?.initData === "string" && tg.initData ? tg.initData : null;
  } catch {
    return null;
  }
}

export interface SharePayload {
  fromUsername: string;
  fromName: string;
  contactRef: {
    username?: string;
    name?: string;
    role?: string;
    company?: string;
    photo?: string;
    tags?: string[];
    bio?: string;
  };
  sharedTags: string[];
  sharedNote: string;
  sharedAt: string;
}

/** Create a share-link from one of my contacts. Returns the token or null. */
export async function createShare(contact: Connection, sharedNote: string): Promise<string | null> {
  const initData = getInitData();
  if (!initData) return null;
  const body = {
    contactRef: {
      username: contact.user.username,
      name: contact.user.name,
      role: contact.user.role,
      company: contact.user.company,
      photo: contact.user.photo,
      bio: contact.user.bio,
      tags: contact.user.tags,
    },
    sharedTags: contact.user.tags || [],
    sharedNote: sharedNote || contact.aiSummary || contact.note || "",
  };
  try {
    const r = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Telegram-Init-Data": initData },
      body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data?.token || null;
  } catch {
    return null;
  }
}

/** Public preview by token — no auth required. */
export async function fetchSharePreview(token: string): Promise<SharePayload | null> {
  try {
    const r = await fetch(`/api/share?token=${encodeURIComponent(token)}`);
    if (!r.ok) return null;
    const data = await r.json();
    if (!data?.contactRef) return null;
    return data as SharePayload;
  } catch {
    return null;
  }
}

/**
 * Claim a share into the caller's memory. Builds a Connection object with
 * sharedFrom populated. Requires Telegram auth.
 */
export async function claimShare(token: string): Promise<Connection | null> {
  const initData = getInitData();
  if (!initData) return null;
  try {
    const r = await fetch(`/api/share?token=${encodeURIComponent(token)}&claim=1`, {
      method: "POST",
      headers: { "X-Telegram-Init-Data": initData },
    });
    if (!r.ok) return null;
    const data = await r.json();
    const p = data?.payload as SharePayload | undefined;
    if (!p?.contactRef) return null;

    const username = p.contactRef.username;
    const user: User = {
      id: `u-${username || Date.now()}`,
      name: p.contactRef.name || username || "Контакт",
      username,
      role: p.contactRef.role || "",
      company: p.contactRef.company || "",
      photo: p.contactRef.photo || "",
      bio: p.contactRef.bio || "",
      tags: p.contactRef.tags || [],
      links: username ? [{ type: "telegram", url: `https://t.me/${username}` }] : [],
    };
    const sharedFrom: SharedFrom = {
      fromUsername: p.fromUsername,
      fromName: p.fromName,
      sharedTags: p.sharedTags || [],
      sharedNote: p.sharedNote || "",
      sharedAt: p.sharedAt,
    };
    return {
      id: username ? `c-${username}` : `c-${Date.now()}`,
      user,
      metAt: new Date().toISOString(),
      followUpSent: false,
      sharedFrom: [sharedFrom],
    };
  } catch {
    return null;
  }
}
