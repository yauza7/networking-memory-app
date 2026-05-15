export type NotificationType = "contact_added" | "message" | "reminder";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  contactName?: string;
  contactId?: string;
}

const KEY = "w52_notifications";
const READ_KEY = "w52_notifications_read";

export function loadNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

export function saveNotifications(items: AppNotification[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function addNotification(n: Omit<AppNotification, "id" | "timestamp" | "read">) {
  const all = loadNotifications();
  const item: AppNotification = {
    ...n,
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    read: false,
  };
  saveNotifications([item, ...all].slice(0, 200));
  return item;
}

export function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function saveReadIds(ids: Set<string>) {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}

export function unreadCount(): number {
  const read = getReadIds();
  return loadNotifications().filter((n) => !read.has(n.id)).length;
}
