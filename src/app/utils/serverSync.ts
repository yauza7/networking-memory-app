/**
 * Mirrors tasks to the backend so the cron job can push bot reminders.
 * Best-effort: never throws, silently no-ops if outside Telegram.
 */
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

export async function pushTask(task: ServerTask): Promise<void> {
  await apiCall("/api/tasks", { method: "POST", body: task });
}

export async function patchTask(id: string, patch: { completed?: boolean }): Promise<void> {
  await apiCall(`/api/tasks/${encodeURIComponent(id)}`, { method: "PATCH", body: patch });
}

export async function deleteTask(id: string): Promise<void> {
  await apiCall(`/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
}
