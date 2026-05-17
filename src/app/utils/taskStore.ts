import { pushTask, patchTask, deleteTask, pullTasks } from "./serverSync";
import { enqueueTask } from "./outboxStore";

export type TaskType = "manual" | "message" | "transfer" | "call" | "meet" | "send_materials";

export interface Task {
  id: string;
  contactId: string;
  contactName: string;
  contactUsername?: string;
  text: string;
  completed: boolean;
  dueDate: string;
  type: TaskType;
  event?: string;
}

const KEY       = "w52_tasks";
const VER_KEY   = "w52_tasks_ver";
const CURRENT_VER = "2"; // bump this whenever old seeded data must be purged

// IDs of old hardcoded demo tasks that should be wiped on migration
const LEGACY_IDS = new Set(["sys-1", "sys-2", "sys-3", "1", "2", "3", "4", "5"]);

/** One-time migration: remove old seed task IDs from localStorage */
function migrateIfNeeded() {
  if (localStorage.getItem(VER_KEY) === CURRENT_VER) return;
  try {
    const stored: Task[] = JSON.parse(localStorage.getItem(KEY) || "[]");
    const cleaned = stored.filter((t) => !LEGACY_IDS.has(t.id));
    localStorage.setItem(KEY, JSON.stringify(cleaned));
  } catch {}
  localStorage.setItem(VER_KEY, CURRENT_VER);
}

// No seed tasks — tasks are created automatically when contacts are saved
export const DEFAULT_SEED_TASKS: Task[] = [];

/** Load tasks from localStorage (no hardcoded seeds) */
export function loadTasks(): Task[] {
  migrateIfNeeded();
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]) {
  localStorage.setItem(KEY, JSON.stringify(tasks));
}

export async function addTask(task: Task) {
  const stored = loadTasks();
  saveTasks([task, ...stored]);
  const serverTask = {
    id: task.id,
    contactId: task.contactId,
    contactName: task.contactName,
    contactUsername: task.contactUsername,
    text: task.text,
    dueDate: task.dueDate,
    completed: task.completed,
  };
  try {
    const result = await pushTask(serverTask);
    if (!result.ok) {
      enqueueTask({ kind: "task_push", body: serverTask });
    }
  } catch {
    enqueueTask({ kind: "task_push", body: serverTask });
  }
}

export async function updateTaskCompleted(id: string, completed: boolean) {
  const all = loadTasks();
  saveTasks(all.map((t) => (t.id === id ? { ...t, completed } : t)));
  try {
    const result = await patchTask(id, { completed });
    if (!result.ok) {
      enqueueTask({ kind: "task_patch", taskId: id, body: { completed } });
    }
  } catch {
    enqueueTask({ kind: "task_patch", taskId: id, body: { completed } });
  }
}

export async function removeTask(id: string) {
  const all = loadTasks();
  saveTasks(all.filter((t) => t.id !== id));
  try {
    const result = await deleteTask(id);
    if (!result.ok) {
      enqueueTask({ kind: "task_delete", taskId: id });
    }
  } catch {
    enqueueTask({ kind: "task_delete", taskId: id });
  }
}

export async function syncTasksFromServer(): Promise<void> {
  try {
    const serverTasks = await pullTasks();
    const localTasks = loadTasks();
    const localIds = new Set(localTasks.map((t) => t.id));
    const serverIds = new Set(serverTasks.map((t) => t.id));

    // Add server tasks not in localStorage (preserve local completed status)
    let updated = [...localTasks];
    for (const st of serverTasks) {
      if (!localIds.has(st.id)) {
        updated.push({
          id: st.id,
          contactId: st.contactId,
          contactName: st.contactName,
          contactUsername: st.contactUsername,
          text: st.text,
          completed: st.completed ?? false,
          dueDate: st.dueDate,
          type: "manual",
        });
      }
      // If the task is already in localStorage, do NOT overwrite — local is source of truth
    }
    saveTasks(updated);

    // Push local tasks not on server
    for (const lt of localTasks) {
      if (!serverIds.has(lt.id)) {
        const serverTask = {
          id: lt.id,
          contactId: lt.contactId,
          contactName: lt.contactName,
          contactUsername: lt.contactUsername,
          text: lt.text,
          dueDate: lt.dueDate,
          completed: lt.completed,
        };
        try {
          const result = await pushTask(serverTask);
          if (!result.ok) {
            enqueueTask({ kind: "task_push", body: serverTask });
          }
        } catch {
          enqueueTask({ kind: "task_push", body: serverTask });
        }
      }
    }
  } catch {
    // Best-effort — do not throw
  }
}

export function createSystemTasks(
  contactId: string,
  contactName: string,
  event?: string
): Task[] {
  const now  = new Date();
  // "Написать" due in 3 days (user requested 3d instead of 48h)
  const in3d = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const tasks: Task[] = [
    {
      id: `sys-msg-${Date.now()}`,
      contactId,
      contactName,
      text: `Написать ${contactName}`,
      completed: false,
      dueDate: in3d.toISOString().split("T")[0],
      type: "message",
      event,
    },
    {
      id: `sys-transfer-${Date.now() + 1}`,
      contactId,
      contactName,
      text: `Передать контакт ${contactName}`,
      completed: false,
      dueDate: in7d.toISOString().split("T")[0],
      type: "transfer",
      event,
    },
  ];

  tasks.forEach((t) => { addTask(t).catch(() => {}); });
  return tasks;
}
