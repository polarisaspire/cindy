import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { withCrossProcessLock } from '../device-link/crossProcessLock.js';

export interface TaskAssignment {
  botId: string | null;
  revision: string;
  updatedAt: number;
  notifications: boolean;
  /** Durable event keys; retries use the same queue client id. No conversation content is stored. */
  delivered: string[];
}
export type TaskAssignments = Record<string, TaskAssignment>;
const filename = (root: string) => path.join(root, 'task-assignments.v1.json');

/** Import only durable, explicit V1 follows; do not infer assignment from chat or creation.
 * Existing V2 overrides/tombstones always win. Import never enables notifications. */
export async function importTaskAssignments(root: string, candidates: Array<{ sessionId: string; botId: string; updatedAt: number }>, guard: () => void) {
  if (!candidates.length) return;
  const existing = await readTaskAssignments(root);
  if (candidates.every(c => Object.hasOwn(existing, c.sessionId))) return;
  await changeAssignments(root, guard, tasks => {
    const sorted = [...candidates].sort((a, b) => b.updatedAt - a.updatedAt || a.botId.localeCompare(b.botId));
    for (const c of sorted) {
      if (Object.hasOwn(tasks, c.sessionId) || !c.sessionId || c.sessionId.includes('::')) continue;
      tasks[c.sessionId] = { botId: c.botId, updatedAt: c.updatedAt, notifications: false, delivered: [],
        revision: createHash('sha256').update(JSON.stringify(c)).digest('hex') };
    }
  });
}

export async function readTaskAssignments(root: string): Promise<TaskAssignments> {
  try {
    const file = filename(root);
    if ((await fs.stat(file)).size > 4 * 1024 * 1024) throw new Error('ASSIGNMENTS_TOO_LARGE');
    const data = JSON.parse(await fs.readFile(file, 'utf8'));
    if (data?.version !== 1 || !data.tasks || typeof data.tasks !== 'object' || Array.isArray(data.tasks))
      throw new Error('ASSIGNMENTS_INVALID');
    const entries = Object.entries(data.tasks);
    if (entries.length > 10000 || entries.some(([id, raw]) => {
      const v = raw as TaskAssignment;
      return !id || id.length > 256 || !v || (v.botId !== null && (typeof v.botId !== 'string' || !v.botId || v.botId.length > 256))
        || typeof v.revision !== 'string' || !v.revision || v.revision.length > 128 || !Number.isFinite(v.updatedAt)
        || typeof v.notifications !== 'boolean' || !Array.isArray(v.delivered)
        || v.delivered.length > 32 || v.delivered.some(k => typeof k !== 'string' || k.length > 128);
    })) throw new Error('ASSIGNMENTS_INVALID');
    return Object.assign(Object.create(null), Object.fromEntries(entries)) as TaskAssignments;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return Object.create(null) as TaskAssignments;
    throw error;
  }
}

async function changeAssignments<T>(root: string, guard: () => void, change: (tasks: TaskAssignments) => T): Promise<T> {
  const file = filename(root);
  guard();
  await fs.mkdir(root, { recursive: true });
  return withCrossProcessLock(file + '.lock', { label: 'task-assignments' }, async lock => {
    if (!lock.held) throw new Error('ASSIGNMENTS_BUSY');
    guard();
    const tasks = await readTaskAssignments(root);
    const result = change(tasks);
    if (Object.keys(tasks).length > 10000) throw new Error('ASSIGNMENTS_FULL');
    const encoded = JSON.stringify({ version: 1, tasks }) + '\n';
    if (Buffer.byteLength(encoded, 'utf8') > 4 * 1024 * 1024) throw new Error('ASSIGNMENTS_TOO_LARGE');
    const temp = file + '.' + randomUUID() + '.tmp';
    try {
      await fs.writeFile(temp, encoded, { mode: 0o600 });
      guard();
      await fs.rename(temp, file);
    } finally { await fs.rm(temp, { force: true }).catch(() => {}); }
    guard();
    return result;
  });
}

/** One atomic account-level relation per task. Null is an explicit release, never a fallback. */
export async function assignTask(root: string, sessionId: string, botId: string | null,
  notifications: boolean, guard: () => void, expectedRevision?: string | null): Promise<TaskAssignment> {
  if (!sessionId || sessionId.length > 256 || sessionId.includes('::')) throw new Error('LOCAL_TASK_REQUIRED');
  return changeAssignments(root, guard, tasks => {
    const old = tasks[sessionId];
    if (expectedRevision !== undefined && (old?.revision ?? null) !== expectedRevision)
      throw new Error('ASSIGNMENT_CHANGED');
    if (old?.botId === botId && old.notifications === notifications) return old;
    return tasks[sessionId] = {
      botId, notifications: botId !== null && notifications, revision: randomUUID(), updatedAt: Date.now(), delivered: [],
    };
  });
}

export async function acknowledgeTaskEvent(root: string, sessionId: string, revision: string, key: string, guard: () => void) {
  return changeAssignments(root, guard, tasks => {
    const row = tasks[sessionId];
    if (!row || row.revision !== revision || row.delivered.includes(key)) return;
    const keys = [...row.delivered, key];
    const handoff = keys.find(k => k.startsWith('assigned:'));
    row.delivered = [...(handoff ? [handoff] : []), ...keys.filter(k => !k.startsWith('assigned:')).slice(handoff ? -31 : -32)];
  });
}

/** An explicit relation overrides old creator/follower marks, including a release tombstone. */
export function assignedSessionIds(botId: string, legacy: string[], assignments: TaskAssignments): string[] {
  const ids = new Set(legacy.filter(id => !Object.hasOwn(assignments, id)));
  for (const [id, row] of Object.entries(assignments)) if (row.botId === botId) ids.add(id);
  return [...ids].sort();
}
