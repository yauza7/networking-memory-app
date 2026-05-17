/**
 * Outbox: persists contact mutations that fail to send (offline / network error)
 * and retries them on app start, on the next successful flush, or when the
 * browser fires the `online` event.
 *
 * Entries live in localStorage so they survive reloads.
 */
import type { Connection } from "./mockData";
import { pushContact, patchContact, deleteContact, pushTask, patchTask, deleteTask } from "./serverSync";
import type { ServerTask } from "./serverSync";

const KEY = "w52_contacts_outbox";
const TASKS_KEY = "w52_tasks_outbox";
const MAX_ATTEMPTS = 10;

export type ContactOutboxOp =
  | { kind: "push"; body: Connection }
  | { kind: "patch"; contactId: string; body: Partial<Connection> }
  | { kind: "delete"; contactId: string };

export type TaskOutboxOp =
  | { kind: "task_push"; body: ServerTask }
  | { kind: "task_patch"; taskId: string; body: { completed?: boolean } }
  | { kind: "task_delete"; taskId: string };

export type OutboxOp = ContactOutboxOp | TaskOutboxOp;

interface OutboxEntry<T = OutboxOp> {
  uid: string;
  op: T;
  attempts: number;
  queuedAt: number;
}

function read(): OutboxEntry<ContactOutboxOp>[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(entries: OutboxEntry<ContactOutboxOp>[]) {
  try { localStorage.setItem(KEY, JSON.stringify(entries)); } catch {}
}

function readTasks(): OutboxEntry<TaskOutboxOp>[] {
  try {
    return JSON.parse(localStorage.getItem(TASKS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeTasks(entries: OutboxEntry<TaskOutboxOp>[]) {
  try { localStorage.setItem(TASKS_KEY, JSON.stringify(entries)); } catch {}
}

function hasTelegram(): boolean {
  try {
    return !!(window as any).Telegram?.WebApp?.initData;
  } catch {
    return false;
  }
}

export function enqueue(op: ContactOutboxOp): void {
  // Outside Telegram there's no way to authenticate the retry — drop on the floor.
  if (!hasTelegram()) return;
  const entries = read();
  // Collapse consecutive patches on the same contact into one merged patch
  if (op.kind === "patch") {
    const last = entries[entries.length - 1];
    if (last && last.op.kind === "patch" && last.op.contactId === op.contactId) {
      last.op.body = { ...last.op.body, ...op.body };
      write(entries);
      return;
    }
  }
  entries.push({
    uid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    op,
    attempts: 0,
    queuedAt: Date.now(),
  });
  write(entries);
}

export function enqueueTask(op: TaskOutboxOp): void {
  if (!hasTelegram()) return;
  const entries = readTasks();
  // Collapse consecutive patches on the same task into one merged patch
  if (op.kind === "task_patch") {
    const last = entries[entries.length - 1];
    if (last && last.op.kind === "task_patch" && last.op.taskId === op.taskId) {
      last.op.body = { ...last.op.body, ...op.body };
      writeTasks(entries);
      return;
    }
  }
  entries.push({
    uid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    op,
    attempts: 0,
    queuedAt: Date.now(),
  });
  writeTasks(entries);
}

let flushing = false;

/** Attempt to drain the outbox. Returns count of successfully sent entries. */
export async function flushOutbox(): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  let sent = 0;
  try {
    // Flush contacts outbox
    const queue = read();
    if (queue.length > 0) {
      const remaining: OutboxEntry<ContactOutboxOp>[] = [];
      for (const entry of queue) {
        const ok = await tryContactOp(entry.op);
        if (ok) {
          sent++;
        } else {
          const next = { ...entry, attempts: entry.attempts + 1 };
          if (next.attempts < MAX_ATTEMPTS) remaining.push(next);
          // else: give up silently (dropped)
        }
      }
      write(remaining);
    }

    // Flush tasks outbox
    const taskQueue = readTasks();
    if (taskQueue.length > 0) {
      const remaining: OutboxEntry<TaskOutboxOp>[] = [];
      for (const entry of taskQueue) {
        const ok = await tryTaskOp(entry.op);
        if (ok) {
          sent++;
        } else {
          const next = { ...entry, attempts: entry.attempts + 1 };
          if (next.attempts < MAX_ATTEMPTS) remaining.push(next);
        }
      }
      writeTasks(remaining);
    }
  } finally {
    flushing = false;
  }
  return sent;
}

async function tryContactOp(op: ContactOutboxOp): Promise<boolean> {
  try {
    if (op.kind === "push") return (await pushContact(op.body)).ok;
    if (op.kind === "patch") return (await patchContact(op.contactId, op.body)).ok;
    if (op.kind === "delete") return (await deleteContact(op.contactId)).ok;
  } catch {
    return false;
  }
  return false;
}

async function tryTaskOp(op: TaskOutboxOp): Promise<boolean> {
  try {
    if (op.kind === "task_push") return (await pushTask(op.body)).ok;
    if (op.kind === "task_patch") return (await patchTask(op.taskId, op.body)).ok;
    if (op.kind === "task_delete") return (await deleteTask(op.taskId)).ok;
  } catch {
    return false;
  }
  return false;
}

export function outboxSize(): number {
  return read().length + readTasks().length;
}
