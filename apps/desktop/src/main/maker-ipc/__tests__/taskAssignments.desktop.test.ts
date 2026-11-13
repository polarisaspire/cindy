import { beforeEach, expect, it, vi } from 'vitest';

// Host adapter regression: a reported takeover must belong to the actual caller/account and an
// active ordinary task. Pure store/MCP tests cannot detect identity or authority wiring errors.
// Unit: injected DB answers, no real profile/database/notification delivery.
const h = vi.hoisted(() => ({ owner: 'owner', authorized: true, responses: [] as unknown[][],
  rows: {} as Record<string, any>, write: vi.fn(), caller: vi.fn(), notify: vi.fn(), handoff: vi.fn(), guard: vi.fn() }));
const db = vi.hoisted(() => ({ drizzle: { select: vi.fn() } }));
vi.mock('../../localDb/client/current.js', () => ({ getDbClient: () => db }));
vi.mock('../../appSessionState.js', () => ({ activeOwnerScopeKey: () => h.owner,
  ownerScopedUserDataPath: () => '/fixture-owner', isAppSessionBoundaryPending: () => false }));
vi.mock('../botTaskCreation.js', () => ({ resolveTeammateMainCaller: h.caller }));
vi.mock('../botTaskResponsibility.js', () => ({ readTaskResponsibilities: async () => ({}) }));
vi.mock('../taskAssignments.js', () => ({ readTaskAssignments: async () => h.rows,
  importTaskAssignments: async () => {}, assignTask: h.write }));
vi.mock('../taskActionAuthorization.js', () => ({ hasTaskActionAuthorization: () => h.authorized,
  assertTaskActionCurrent: async () => {}, captureTaskActionSyncGuard: () => h.guard }));
vi.mock('../botLinkedProjectStore.js', () => ({ broadcastBotLinkedProjectsChanged: h.notify }));
vi.mock('../botRemoteResourceInvalidation.js', () => ({ broadcastBotRemoteResourceChanged: h.notify }));
vi.mock('../taskAssignmentEvents.js', () => ({ notifyTaskAssignment: h.handoff }));
import { runTaskAssignmentTool } from '../taskAssignments.desktop.js';

beforeEach(() => {
  vi.clearAllMocks(); h.owner = 'owner'; h.authorized = true; h.rows = {}; h.responses = [];
  h.caller.mockResolvedValue({ ok: true, botId: 'actual' });
  h.handoff.mockResolvedValue(undefined);
  h.guard.mockImplementation(() => {});
  db.drizzle.select.mockImplementation(() => {
    const result = h.responses.shift() ?? [];
    const query: any = { from: () => query, innerJoin: () => query, where: () => query,
      limit: async () => result, then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve) };
    return query;
  });
  h.write.mockImplementation(async (_root, id, botId, notifications, guard) => {
    guard(); h.rows[id] = { botId, notifications, revision: 'saved', updatedAt: 10, delivered: [] };
  });
});
const request = { callerSessionId: 'caller', sessionId: 'task', responsible: true, ownOnly: true };
const eligible = () => { h.responses = [[], [{ id: 'task', status: 'active', source: 'desktop', remoteHostId: null, orcaRole: null }], [{ sessionId: 'actual-main' }]]; };
it('binds compatibility takeover to the real partner and returns the saved relation without starting tasks', async () => {
  eligible();
  expect(await runTaskAssignmentTool(request)).toMatchObject({ ok: true, saved: true, task_started: false, notification_pending: false,
    assignments: [{ session_id: 'task', bot_id: 'actual', notifications: true, revision: 'saved' }] });
  expect(h.write).toHaveBeenCalledWith('/fixture-owner', 'task', 'actual', true, expect.any(Function), null);
  expect(h.handoff).toHaveBeenCalledWith('task', 'caller');
});
it('reports a pending handoff honestly without rolling back the saved assignment', async () => {
  eligible(); h.handoff.mockRejectedValue(new Error('HOST_NOT_READY'));
  expect(await runTaskAssignmentTool(request)).toMatchObject({ ok: true, saved: true, notification_pending: true,
    assignments: [{ bot_id: 'actual' }] });
});
it('rejects missing authority and a caller that is not a partner', async () => {
  h.authorized = false;
  expect(await runTaskAssignmentTool(request)).toMatchObject({ errorCode: 'TASK_ACTION_AUTHORIZATION_REQUIRED' });
  h.caller.mockResolvedValue({ ok: false, errorCode: 'NOT_A_BOT_SESSION', message: 'not partner' });
  expect(await runTaskAssignmentTool(request)).toMatchObject({ errorCode: 'NOT_A_BOT_SESSION' });
  expect(h.write).not.toHaveBeenCalled();
});
it.each(['archived', 'deleted'])('rejects takeover of %s tasks without restoring them', async status => {
  h.responses = [[], [{ status, source: 'desktop' }]];
  expect(await runTaskAssignmentTool(request)).toMatchObject({ errorCode: 'TASK_NOT_ACTIVE_OR_ORDINARY' });
  expect(h.write).not.toHaveBeenCalled();
});
it('does not steal another partner assignment through the legacy alias', async () => {
  eligible(); h.rows.task = { botId: 'other', revision: 'previous' };
  expect(await runTaskAssignmentTool(request)).toMatchObject({ errorCode: 'ASSIGNMENT_CHANGED' });
  expect(h.write).not.toHaveBeenCalled();
});
it('rejects an account switch before persisting', async () => {
  h.caller.mockImplementation(async () => { h.owner = 'other'; return { ok: true, botId: 'actual' }; });
  expect(await runTaskAssignmentTool(request)).toMatchObject({ errorCode: 'OWNER_SCOPE_CHANGED' });
  expect(h.write).not.toHaveBeenCalled();
});
it('allows releasing a saved relation even after the original task is archived', async () => {
  h.rows.task = { botId: 'actual', revision: 'previous' }; h.responses = [[]];
  expect(await runTaskAssignmentTool({ ...request, responsible: false })).toMatchObject({ ok: true,
    assignments: [{ bot_id: null, notifications: false }] });
});
