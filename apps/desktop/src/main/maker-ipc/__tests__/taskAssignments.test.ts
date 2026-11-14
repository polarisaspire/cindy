import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { assignTask, assignedSessionIds, readTaskAssignments, acknowledgeTaskEvent, importTaskAssignments } from '../taskAssignments.js';

// Real persistence entry: V2 discarded explicit takeover relationships. Existing creator tests do
// not cover an account-wide single assignee, CAS transfers or event dedup across restarts. Tier: unit.
let root: string;
beforeEach(async () => { root = await fs.mkdtemp(path.join(os.tmpdir(), 'cindy-assignments-')); });
afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });
const guard = () => {};
it('imports legacy relationships without enabling notifications or resurrecting releases', async () => {
  const candidates = [{ sessionId: 'old', botId: 'one', updatedAt: 10 }, { sessionId: 'old', botId: 'two', updatedAt: 20 }];
  await importTaskAssignments(root, candidates, guard);
  expect((await readTaskAssignments(root)).old).toMatchObject({ botId: 'two', notifications: false });
  await assignTask(root, 'old', null, false, guard);
  await importTaskAssignments(root, candidates, guard);
  expect((await readTaskAssignments(root)).old.botId).toBeNull();
});
it('persists assignment and release separately from creation marks', async () => {
  const first = await assignTask(root, 'task', 'one', true, guard);
  expect((await readTaskAssignments(root)).task).toEqual(first);
  expect(assignedSessionIds('one', [], await readTaskAssignments(root))).toEqual(['task']);
  await assignTask(root, 'task', null, false, guard, first.revision);
  expect(assignedSessionIds('one', ['task'], await readTaskAssignments(root))).toEqual([]);
});
it('is idempotent and rejects stale transfers instead of losing the latest owner', async () => {
  const first = await assignTask(root, 'task', 'one', true, guard);
  expect(await assignTask(root, 'task', 'one', true, guard)).toEqual(first);
  const second = await assignTask(root, 'task', 'two', true, guard, first.revision);
  await expect(assignTask(root, 'task', 'three', true, guard, first.revision)).rejects.toThrow('ASSIGNMENT_CHANGED');
  expect((await readTaskAssignments(root)).task).toEqual(second);
  expect(assignedSessionIds('one', ['task'], await readTaskAssignments(root))).toEqual([]);
});
it('keeps delivered event keys across reload and ignores acknowledgement for a former owner', async () => {
  const first = await assignTask(root, 'task', 'one', true, guard);
  await acknowledgeTaskEvent(root, 'task', first.revision, 'event', guard);
  expect((await readTaskAssignments(root)).task.delivered).toEqual(['event']);
  await acknowledgeTaskEvent(root, 'task', first.revision, 'assigned:handoff', guard);
  for (let i = 0; i < 35; i++) await acknowledgeTaskEvent(root, 'task', first.revision, 'state-' + i, guard);
  expect((await readTaskAssignments(root)).task.delivered).toHaveLength(32);
  expect((await readTaskAssignments(root)).task.delivered).toContain('assigned:handoff');
  await assignTask(root, 'task', 'two', true, guard, first.revision);
  await acknowledgeTaskEvent(root, 'task', first.revision, 'late', guard);
  expect((await readTaskAssignments(root)).task.delivered).toEqual([]);
});
it('does not overwrite corrupt data or commit after the owner guard fails', async () => {
  const file = path.join(root, 'task-assignments.v1.json');
  await fs.writeFile(file, 'corrupt');
  await expect(assignTask(root, 'task', 'one', true, guard)).rejects.toThrow();
  expect(await fs.readFile(file, 'utf8')).toBe('corrupt');
  await fs.rm(file);
  let checks = 0;
  await expect(assignTask(root, 'task', 'one', true, () => { if (++checks >= 3) throw new Error('OWNER_CHANGED'); })).rejects.toThrow('OWNER_CHANGED');
  expect(await readTaskAssignments(root)).toEqual({});
});
