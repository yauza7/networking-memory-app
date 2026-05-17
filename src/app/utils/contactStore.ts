import type { Connection, SharedFrom, User } from "./mockData";
import { fetchPublicProfile } from "./profileApi";
import { addTask } from "./taskStore";
import type { Task } from "./taskStore";
import { addNotification } from "./notificationStore";
import { pushContact, patchContact, deleteContact, pullContacts } from "./serverSync";
import { enqueue as enqueueOutbox } from "./outboxStore";

const ECHO_FOUNDER_USERNAME = "pes2va";
const ECHO_FOUNDER_ID = "echo-founder";

const KEY = "w52_contacts";
const SYNC_CURSOR_KEY = "w52_contacts_sync_cursor";
export const CONTACTS_CHANGED_EVENT = "w52:contacts-changed";

function emitChanged() {
  try { window.dispatchEvent(new Event(CONTACTS_CHANGED_EVENT)); } catch {}
}

export function loadStoredContacts(): Connection[] {
  try {
    const contacts: Connection[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    // Fix any legacy contacts whose name was accidentally saved as "@username"
    return contacts.map((c) => {
      if (c.user.name && c.user.username && c.user.name === `@${c.user.username}`) {
        return { ...c, user: { ...c.user, name: c.user.username } };
      }
      return c;
    });
  } catch {
    return [];
  }
}

export function saveStoredContacts(contacts: Connection[]) {
  localStorage.setItem(KEY, JSON.stringify(contacts));
  emitChanged();
}

export function removeStoredContact(id: string) {
  saveStoredContacts(loadStoredContacts().filter((c) => c.id !== id));
  void deleteContact(id).then((r) => {
    if (!r.ok) enqueueOutbox({ kind: "delete", contactId: id });
  });
}

export function updateStoredContact(id: string, updates: Partial<Connection>) {
  const contacts = loadStoredContacts();
  const idx = contacts.findIndex((c) => c.id === id);
  if (idx === -1) return;
  contacts[idx] = { ...contacts[idx], ...updates };
  saveStoredContacts(contacts);
  void patchContact(id, updates).then((r) => {
    if (!r.ok) enqueueOutbox({ kind: "patch", contactId: id, body: updates });
  });
}

export function addStoredContact(contact: Connection) {
  const existing = loadStoredContacts();
  // deduplicate by username or id
  const deduped = existing.filter(
    (c) =>
      c.id !== contact.id &&
      !(contact.user.username && c.user.username === contact.user.username)
  );
  saveStoredContacts([contact, ...deduped]);
  void pushContact(contact).then((r) => {
    if (!r.ok) enqueueOutbox({ kind: "push", body: contact });
  });

  const in3d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const task: Task = {
    id: `sys-msg-${Date.now()}`,
    contactId: contact.id,
    contactName: contact.user.name,
    contactUsername: contact.user.username,
    text: `Написать ${contact.user.name}`,
    completed: false,
    dueDate: in3d.toISOString().split("T")[0],
    type: "message",
    event: contact.event,
  };
  addTask(task);

  addNotification({
    type: "contact_added",
    title: "Новый контакт",
    message: `${contact.user.name} добавлен(а) в ваши контакты`,
    contactName: contact.user.name,
    contactId: contact.id,
  });
}

/**
 * Append a sharedFrom entry to an existing observer (or create the array).
 * Dedupes by fromUsername+sharedAt so re-claiming the same link is a no-op.
 * Triggers a server-side patch like any other observer mutation.
 */
export function mergeSharedFromInto(contactId: string, entry: SharedFrom) {
  const contacts = loadStoredContacts();
  const idx = contacts.findIndex((c) => c.id === contactId);
  if (idx === -1) return;
  const existing = contacts[idx].sharedFrom || [];
  const exists = existing.some(
    (s) => s.fromUsername === entry.fromUsername && s.sharedAt === entry.sharedAt
  );
  if (exists) return;
  const sharedFrom = [...existing, entry];
  contacts[idx] = { ...contacts[idx], sharedFrom };
  saveStoredContacts(contacts);
  void patchContact(contactId, { sharedFrom }).then((r) => {
    if (!r.ok) enqueueOutbox({ kind: "patch", contactId, body: { sharedFrom } });
  });
}

/**
 * Background refresh of the self-layer for a contact that's linked to a
 * registered Echo user. Updates only fields the contact-owner controls
 * (name, role, company, photo, bio) — never overwrites tags, since those
 * are observer-curated in this app.
 *
 * Time-based throttle: skip if the same username was fetched within the last
 * 60 s. This lets profile edits propagate to friends within one minute while
 * still avoiding redundant network calls when navigating between screens.
 */
const REFRESH_TTL_MS = 60_000;
const lastRefreshed = new Map<string, number>();

export async function refreshContactSelf(contact: Connection): Promise<boolean> {
  const username = contact.user.username;
  if (!username) return false;
  const key = username.toLowerCase();
  const last = lastRefreshed.get(key) ?? 0;
  if (Date.now() - last < REFRESH_TTL_MS) return false;
  lastRefreshed.set(key, Date.now());

  const fresh = await fetchPublicProfile(username);
  if (!fresh) return false;

  const cur = contact.user;
  const diff: Partial<User> = {};
  if (fresh.name && fresh.name !== cur.name) diff.name = fresh.name;
  if (fresh.role && fresh.role !== cur.role) diff.role = fresh.role;
  if (fresh.company && fresh.company !== cur.company) diff.company = fresh.company;
  if (fresh.photo && fresh.photo !== cur.photo) diff.photo = fresh.photo;
  if (fresh.bio && fresh.bio !== cur.bio) diff.bio = fresh.bio;
  if (fresh.companyUrl && fresh.companyUrl !== cur.companyUrl) diff.companyUrl = fresh.companyUrl;

  if (Object.keys(diff).length === 0) return false;

  const merged: User = { ...cur, ...diff };
  updateStoredContact(contact.id, { user: merged });
  return true;
}

/** All contacts: stored (real) + mock (demo), deduped by id and username */
export function allContacts(mockContacts: Connection[]): Connection[] {
  const stored = loadStoredContacts();
  const storedIds = new Set(stored.map((c) => c.id));
  const storedUsernames = new Set(stored.map((c) => c.user.username).filter(Boolean));
  const mocks = mockContacts.filter(
    (c) => !storedIds.has(c.id) && !storedUsernames.has(c.user.username)
  );
  return [...stored, ...mocks];
}

// ─── Server sync ────────────────────────────────────────────────────────────

function getSyncCursor(): number {
  try {
    return parseInt(localStorage.getItem(SYNC_CURSOR_KEY) || "0", 10) || 0;
  } catch {
    return 0;
  }
}

function setSyncCursor(ms: number) {
  try { localStorage.setItem(SYNC_CURSOR_KEY, String(ms)); } catch {}
}

/**
 * Silently ensures the Echo founder (pes2va) is present in every user's
 * contacts. No task, no notification — just a quiet seed/refresh.
 * Safe to call on every startup: deduplicates by username, skips if the
 * current user IS pes2va.
 */
export async function seedEchoContact(): Promise<void> {
  // Don't add ourselves
  try {
    const raw = localStorage.getItem("w52_profile");
    if (raw) {
      const me = JSON.parse(raw) as { username?: string };
      if (me.username?.toLowerCase() === ECHO_FOUNDER_USERNAME) return;
    }
  } catch {}

  const profile = await fetchPublicProfile(ECHO_FOUNDER_USERNAME);
  if (!profile) return;

  const contacts = loadStoredContacts();
  const existing = contacts.find(
    (c) =>
      c.user.username?.toLowerCase() === ECHO_FOUNDER_USERNAME ||
      c.id === ECHO_FOUNDER_ID
  );

  if (existing) {
    // Refresh name/role/company/bio/photo silently if anything changed
    const cur = existing.user;
    const diff: Partial<User> = {};
    if (profile.name && profile.name !== cur.name) diff.name = profile.name;
    if (profile.role !== undefined && profile.role !== cur.role) diff.role = profile.role;
    if (profile.company !== undefined && profile.company !== cur.company) diff.company = profile.company;
    if (profile.bio !== undefined && profile.bio !== cur.bio) diff.bio = profile.bio;
    if (profile.photo !== undefined && profile.photo !== cur.photo) diff.photo = profile.photo;
    if (profile.companyUrl !== undefined && profile.companyUrl !== cur.companyUrl) diff.companyUrl = profile.companyUrl;
    if (Object.keys(diff).length > 0) {
      updateStoredContact(existing.id, { user: { ...cur, ...diff } });
    }
    return;
  }

  // Add silently — no follow-up task, no notification
  const contact: Connection = {
    id: ECHO_FOUNDER_ID,
    user: { ...profile, username: ECHO_FOUNDER_USERNAME },
    metAt: new Date().toISOString().split("T")[0],
    event: "Echo",
  };
  saveStoredContacts([contact, ...contacts]);
  void pushContact(contact); // best-effort server sync
}

/**
 * Pull observer dirty-set from the server and merge into local cache.
 * Tombstones (deleted:true) remove the contact locally.
 * Returns true if any change applied (so the UI can refresh).
 */
export async function syncContactsFromServer(): Promise<boolean> {
  const since = getSyncCursor();
  const { ok, items, now } = await pullContacts(since);
  if (!ok) return false;
  if (items.length === 0) {
    setSyncCursor(now);
    return false;
  }

  const local = loadStoredContacts();
  const byId = new Map(local.map((c) => [c.id, c]));
  for (const item of items) {
    if (!item || !item.id) continue;
    if ((item as any).deleted) {
      byId.delete(item.id);
    } else {
      byId.set(item.id, item as Connection);
    }
  }
  const merged = Array.from(byId.values());
  saveStoredContacts(merged);
  setSyncCursor(now);
  return true;
}
