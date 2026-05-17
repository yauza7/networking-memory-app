/**
 * Mirrors tasks + contacts (observer-layer) to the backend.
 * Best-effort: never throws, silently no-ops if outside Telegram.
 */
import type { Connection } from "./mockData";

function getInitData(): string | null {
  try {
    const tg = (window as any).Telegram?.WebApp;
    return typeof tg?.initData === "string" && tg.initData ? tg.initData : null;
  } catch {
    return null;
  }
}

async function apiCall(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<{ ok: boolean; data?: any }> {
  const initData = getInitData();
  if (!initData) return { ok: false };
  try {
    const r = await fetch(path, {
      method: options.method || "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": initData,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!r.ok) return { ok: false };
    const data = await r.json().catch(() => ({}));
    return { ok: true, data };
  } catch {
    return { ok: false };
  }
}

let registered = false;
export async function ensureRegistered(): Promise<void> {
  if (registered) return;
  const r = await apiCall("/api/register", { method: "POST" });
  if (r.ok) registered = true;
}

export interface ServerTask {
  id: string;
  contactId: string;
  contactName: string;
  contactUsername?: string;
  text: string;
  dueDate: string;
  completed?: boolean;
}

export async function pushTask(task: ServerTask): Promise<{ ok: boolean }> {
  const r = await apiCall("/api/tasks", { method: "POST", body: task });
  return { ok: r.ok };
}

export async function patchTask(id: string, patch: { completed?: boolean }): Promise<{ ok: boolean }> {
  const r = await apiCall(`/api/tasks?id=${encodeURIComponent(id)}`, { method: "PATCH", body: patch });
  return { ok: r.ok };
}

export async function deleteTask(id: string): Promise<{ ok: boolean }> {
  const r = await apiCall(`/api/tasks?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  return { ok: r.ok };
}

export async function pullTasks(): Promise<ServerTask[]> {
  const r = await apiCall("/api/tasks", { method: "GET" });
  if (!r.ok || !r.data) return [];
  return Array.isArray(r.data.tasks) ? r.data.tasks : [];
}

// ─── Contacts (observer-layer) ──────────────────────────────────────────────

export interface ContactsSyncResult {
  ok: boolean;
  items: (Connection & { deleted?: boolean })[];
  now: number;
}

/** Push a single contact upsert. Body is the full Connection. Returns ok flag for outbox. */
export async function pushContact(c: Connection): Promise<{ ok: boolean }> {
  const r = await apiCall("/api/contacts", { method: "POST", body: c });
  return { ok: r.ok };
}

/** Partial update — merges server-side. */
export async function patchContact(id: string, patch: Partial<Connection>): Promise<{ ok: boolean }> {
  const r = await apiCall(`/api/contacts?id=${encodeURIComponent(id)}`, { method: "PATCH", body: patch });
  return { ok: r.ok };
}

/** Server-side tombstone so other devices remove it next sync. */
export async function deleteContact(id: string): Promise<{ ok: boolean }> {
  const r = await apiCall(`/api/contacts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  return { ok: r.ok };
}

/** Pull contacts updated after `since` (ms). Returns items (incl. tombstones) and a new cursor. */
export async function pullContacts(since: number): Promise<ContactsSyncResult> {
  const r = await apiCall(`/api/contacts?since=${since}`, { method: "GET" });
  if (!r.ok || !r.data) return { ok: false, items: [], now: since };
  return {
    ok: true,
    items: Array.isArray(r.data.items) ? r.data.items : [],
    now: typeof r.data.now === "number" ? r.data.now : Date.now(),
  };
}
