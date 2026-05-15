import type { Connection } from "./mockData";
import { addTask } from "./taskStore";
import type { Task } from "./taskStore";
import { addNotification } from "./notificationStore";

const KEY = "w52_contacts";

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

  const in3d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const task: Task = {
    id: `sys-msg-${Date.now()}`,
    contactId: contact.id,
    contactName: contact.user.name,
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
