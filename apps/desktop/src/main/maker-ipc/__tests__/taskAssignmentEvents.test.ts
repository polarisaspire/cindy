import { expect, it, vi } from 'vitest';
import type { SessionActivitySnapshot } from '@cindy/maker-shared/session-activity';
import { createTaskAssignmentEvents, type AssignmentEventPorts, assignmentSnapshot } from '../taskAssignmentEvents.js';
import type { TaskAssignment } from '../taskAssignments.js';

// Production event consumer: missing V2 notification link; creator/store tests cannot verify
// state transitions, late release or repeat delivery. Unit, injected ports, no real sleeps.
const event: SessionActivitySnapshot = { sessionId: 'task', phase: 'completed', startedAtMs: 20,
  lastActivityAtMs: 40, currentActionSummary: null, attention: true, workflow: null,
  turnGeneration: 1, gracefulStopState: 'none', source: 'live', recordStatus: 'active' };
function fixture() {
  let row: TaskAssignment = { botId: 'one', revision: 'rev', updatedAt: 10, notifications: true, delivered: [] };
  const ports: AssignmentEventPorts = {
    read: async () => row, eligible: async () => 'partner-chat', assertCurrent: () => {},
    send: vi.fn(async input => { await input.validate(); return true; }),
    acknowledge: async (_id, revision, key) => { if (row.revision === revision) row.delivered.push(key); },
  };
  return { ports, process: createTaskAssignmentEvents(ports), set: (value: Partial<TaskAssignment>) => { row = { ...row, ...value }; } };
}
it('sends to the actual responsible chat once per phase and survives a consumer restart', async () => {
  const f = fixture();
  await Promise.all([f.process(event), f.process(event)]);
  await createTaskAssignmentEvents(f.ports)(event);
  expect(f.ports.send).toHaveBeenCalledTimes(1);
  expect(f.ports.send).toHaveBeenCalledWith(expect.objectContaining({ recipient: 'partner-chat', sessionId: 'task' }));
  await f.process({ ...event, phase: 'error' });
  expect(f.ports.send).toHaveBeenCalledTimes(2);
});
it.each([
  { phase: 'running' }, { phase: 'idle' }, { recordStatus: 'archived' },
  { gracefulStopState: 'requested' }, { lastActivityAtMs: 5 },
] as Partial<SessionActivitySnapshot>[])('does not notify inactive, stopped or pre-assignment activity: %j', async patch => {
  const f = fixture(); await f.process({ ...event, ...patch }); expect(f.ports.send).not.toHaveBeenCalled();
});
it('checks release/transfer again immediately before delivery', async () => {
  const f = fixture();
  f.ports.send = vi.fn(async input => { f.set({ revision: 'new-owner' }); await input.validate(); return true; });
  await expect(f.process(event)).rejects.toThrow('ASSIGNMENT_REVOKED');
});
it('retries uncertain delivery with the same id and only acknowledges success', async () => {
  const f = fixture(); const ids: string[] = [];
  f.ports.send = async input => { ids.push(input.clientId); return ids.length > 1; };
  await expect(f.process(event)).rejects.toThrow('NOTIFICATION_NOT_ACCEPTED');
  await f.process(event); await f.process(event);
  expect(ids).toHaveLength(2); expect(ids[0]).toBe(ids[1]);
});
it('delivers a new handoff once, but does not send an extra message to the caller already accepting it', async () => {
  const f = fixture();
  const row = (await f.ports.read('task'))!;
  await f.process(assignmentSnapshot('task', row), 'partner-chat');
  await createTaskAssignmentEvents(f.ports)(assignmentSnapshot('task', row));
  expect(f.ports.send).not.toHaveBeenCalled();
  f.set({ revision: 'transfer', delivered: [] });
  await f.process(assignmentSnapshot('task', (await f.ports.read('task'))!), 'coordinator-chat');
  expect(f.ports.send).toHaveBeenCalledTimes(1);
});
it('respects notification pause, missing targets and account invalidation', async () => {
  const f = fixture(); f.set({ notifications: false }); await f.process(event);
  f.set({ notifications: true }); f.ports.eligible = async () => null; await f.process(event);
  expect(f.ports.send).not.toHaveBeenCalled();
  f.ports.assertCurrent = () => { throw new Error('OWNER_CHANGED'); };
  await expect(f.process(event)).rejects.toThrow('OWNER_CHANGED');
});
