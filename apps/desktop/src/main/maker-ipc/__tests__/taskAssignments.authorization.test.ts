import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

// Unit: real Desktop admission -> assignment adapter -> isolated file store.
// PR #12's ordinary user task was allowed without the context the new write needs.
// The existing adapter suite mocks that context, while the authorization suite
// never executes an ordinary assignment. This separate fixture keeps both real.
// Minimum: an ordinary owner turn assigning an active local task to a valid bot.
// Linux Node 24 standalone: 6.44s wall (172ms tests; shared setup/collection dominates).
const h = vi.hoisted(() => ({
  root: '', owner: 'owner', key: 'input-1', permissionCurrent: true,
  db: undefined as unknown, notify: vi.fn(),
}));
vi.mock('../../localDb/client/current.js', () => ({
  getDbClient: () => h.db,
  tryGetDbClient: () => h.db,
}));
vi.mock('../../appSessionState.js', () => ({
  activeOwnerScopeKey: () => h.owner,
  ownerScopedUserDataPath: () => h.root,
  isAppSessionBoundaryPending: () => false,
}));
vi.mock('../botTaskResponsibility.js', () => ({ readTaskResponsibilities: async () => ({}) }));
vi.mock('../botTaskCreation.js', () => ({
  resolveTeammateMainCaller: async () => ({ ok: false, errorCode: 'NOT_A_BOT_SESSION' }),
}));
vi.mock('../botLinkedProjectStore.js', () => ({ broadcastBotLinkedProjectsChanged: vi.fn() }));
vi.mock('../botRemoteResourceInvalidation.js', () => ({ broadcastBotRemoteResourceChanged: vi.fn() }));
vi.mock('../taskAssignmentEvents.js', () => ({ notifyTaskAssignment: h.notify }));

import { botSessionLinks } from '../../localDb/schema.js';
import { createDesktopTaskActionAuthorizer } from '../taskActionHost.js';
import { bindTaskActionInput } from '../taskActionAuthorization.js';
import { runTaskAssignmentTool } from '../taskAssignments.desktop.js';
import { assignTask, readTaskAssignments } from '../taskAssignments.js';
import { withToolCallAuthority } from '../../../../../../packages/lizi-mcps/src/tool-call-authority.js';
import type { AgentInputQueuedMessage } from '../../../shared/agentInputQueue.js';

beforeEach(async () => {
  h.root = await fs.mkdtemp(path.join(os.tmpdir(), 'task-assignment-authority-'));
  h.owner = 'owner'; h.key = 'input-1'; h.permissionCurrent = true;
  h.notify.mockReset(); h.notify.mockResolvedValue(undefined);
  const caller = { source: 'desktop', status: 'active', botId: null, role: null,
    botStatus: null, archivedAt: null, clearedAt: null };
  h.db = { drizzle: { select: (fields: Record<string, unknown>) => {
    let table: unknown;
    const rows = () => {
      if ('clearedAt' in fields) return [{ ...caller }];
      if ('title' in fields) return [{ id: 'task', title: 'Task', status: 'active',
        source: 'desktop', remoteHostId: null, orcaRole: null }];
      return table === botSessionLinks ? [{ sessionId: 'bot-main' }] : [];
    };
    const query = {
      from: (value: unknown) => { table = value; return query; },
      leftJoin: () => query, innerJoin: () => query, where: () => query,
      limit: async () => rows(),
      then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows()).then(resolve),
    };
    return query;
  } } };
});
afterEach(async () => { await fs.rm(h.root, { recursive: true, force: true }); });

function fixture(permissionMode = 'bypassPermissions', automatic = false) {
  const confirm = vi.fn(async () => true);
  const authorize = createDesktopTaskActionAuthorizer({
    input: () => ({ key: h.key, ownerInput: !automatic, automatic, boundary: h.owner,
      permission: automatic ? undefined : {
        permissionMode, planModeEnabled: false, isCurrent: () => h.permissionCurrent,
      } }),
    getSession: () => undefined,
    confirm,
  });
  return { authorize, confirm };
}
const request = { callerSessionId: 'ordinary', sessionId: 'task', botId: 'bot', responsible: true };
const call = { sessionId: 'ordinary', server: 'cindy_helper' as const,
  tool: 'set_task_responsibility', args: { session_id: 'task', bot_id: 'bot', responsible: true } };

it.each(['bypassPermissions', 'auto', 'ask', 'default', 'acceptEdits'])(
  'persists an ordinary %s task assignment without a second permission prompt', async mode => {
    const { authorize, confirm } = fixture(mode);
    expect(await withToolCallAuthority(authorize, call, () => runTaskAssignmentTool(request)))
      .toMatchObject({ ok: true, saved: true, notification_pending: false,
        assignments: [{ session_id: 'task', bot_id: 'bot' }] });
    expect((await readTaskAssignments(h.root)).task.botId).toBe('bot');
    expect(h.notify).toHaveBeenCalledWith('task', 'ordinary');
    expect(confirm).not.toHaveBeenCalled();
  },
);

it.each(['transfer', 'release'] as const)('allows an ordinary task to %s an existing relation', async action => {
  const old = await assignTask(h.root, 'task', 'previous', true, () => {});
  const { authorize } = fixture();
  const params = { ...request, responsible: action !== 'release', expectedRevision: old.revision };
  expect(await withToolCallAuthority(authorize, { ...call, args: params }, () => runTaskAssignmentTool(params)))
    .toMatchObject({ ok: true, saved: true });
  expect((await readTaskAssignments(h.root)).task.botId).toBe(action === 'release' ? null : 'bot');
});

it.each(['input', 'permission', 'account'] as const)('rejects an ordinary assignment after %s revocation', async change => {
  const { authorize } = fixture();
  const decision = await authorize(call);
  if (!decision.ok || !decision.run) throw new Error('Missing ordinary assignment admission');
  if (change === 'input') h.key = 'input-2';
  if (change === 'permission') h.permissionCurrent = false;
  if (change === 'account') h.db = {};
  await expect(decision.run(() => runTaskAssignmentTool(request))).rejects.toThrow('AUTHORIZATION_EXPIRED');
  expect(await readTaskAssignments(h.root)).toEqual({});
  expect(h.notify).not.toHaveBeenCalled();
});

it('does not grant an automatic task authority without its live permission flow', async () => {
  const { authorize, confirm } = fixture('auto', true);
  expect(await withToolCallAuthority(authorize, call, () => runTaskAssignmentTool(request)))
    .toMatchObject({ isError: true });
  expect(await readTaskAssignments(h.root)).toEqual({});
  expect(confirm).not.toHaveBeenCalled();
});

it('keeps other ordinary writes free of live authorization markers in durable queues', async () => {
  const { authorize } = fixture();
  const queued = { clientId: 'ordinary-message', text: 'Continue' } as AgentInputQueuedMessage;
  await withToolCallAuthority(authorize, { ...call, tool: 'send_to_session' }, async () => {
    bindTaskActionInput('target', queued);
  });
  expect(queued.taskActionRequiresAuthorization).toBeUndefined();
});
