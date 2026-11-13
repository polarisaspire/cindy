/** Host boundary regression: the caller, account and local model must survive asynchronous
 * reads before an ordinary project automation is written. No real profiles, network or DB. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import { FOLLOW_UP_CONFIG_ID } from '../teammateFollowUp.js';

const h = vi.hoisted(() => ({
  owner: 'owner',
  authorized: true,
  rows: [] as any[],
  caller: vi.fn(),
  profile: vi.fn(),
  chain: vi.fn(),
  guard: vi.fn(),
  upsert: vi.fn(),
}));
vi.mock('../../appSessionState.js', () => ({
  activeOwnerScopeKey: () => h.owner,
  ownerScopedUserDataPath: () => '/test-owner',
  isAppSessionBoundaryPending: () => false,
}));
vi.mock('../../localDb/ipc/bots.js', () => ({ readBotSettingsProfile: h.profile }));
vi.mock('../../maker-host/bot-model-chain-settings-store.js', () => ({
  readEffectiveBotModelChain: h.chain,
}));
vi.mock('../botProfileFolder.js', () => ({
  botProfileDir: (root: string, id: string) => path.join(root, id),
}));
vi.mock('../botTaskCreation.js', () => ({ resolveTeammateMainCaller: h.caller }));
vi.mock('../taskActionAuthorization.js', () => ({
  hasTaskActionAuthorization: () => h.authorized,
  assertTaskActionCurrent: h.guard,
}));
vi.mock('../../scheduler-host/index.desktop.js', () => ({
  getScheduler: () => ({ list: async () => h.rows }),
  getProjectAutomationLoader: () => ({ upsertSchedule: h.upsert }),
}));
import { runTeammateFollowUpTool } from '../teammateFollowUp.desktop.js';

beforeEach(() => {
  vi.clearAllMocks();
  h.owner = 'owner';
  h.authorized = true;
  h.rows = [];
  h.caller.mockResolvedValue({ ok: true, botId: 'actual-bot' });
  h.profile.mockResolvedValue({ canonicalSessionId: 'actual-main', capabilities: {} });
  h.chain.mockResolvedValue([{ harness: 'codex', model: 'chosen', providerId: 'chosen-provider' }]);
  h.guard.mockResolvedValue(undefined);
  h.upsert.mockImplementation(async (workingDir: string, config: any) => {
    h.rows.push({
      ...config,
      id: 'persisted',
      source: 'project',
      status: 'active',
      projectConfigId: config.id,
      workingDir,
    });
  });
});
describe('teammate follow-up host binding', () => {
  it('binds model, project and reports to the real caller, then verifies the saved schedule', async () => {
    expect(
      await runTeammateFollowUpTool({ callerSessionId: 'caller', enabled: true }),
    ).toMatchObject({ ok: true, enabled: true, schedule_id: 'persisted', scope: 'local' });
    expect(h.caller).toHaveBeenCalledWith('caller');
    expect(h.upsert).toHaveBeenCalledExactlyOnceWith(
      path.join('/test-owner', 'actual-bot', 'workspace'),
      expect.objectContaining({
        id: FOLLOW_UP_CONFIG_ID,
        model: 'chosen',
        providerId: 'chosen-provider',
        prompt: expect.stringContaining('actual-main'),
      }),
      { keepUnreadable: true },
    );
  });
  it('permits a read but refuses a write without task action authority', async () => {
    h.authorized = false;
    expect(await runTeammateFollowUpTool({ callerSessionId: 'caller' })).toMatchObject({
      ok: true,
      enabled: false,
    });
    expect(
      await runTeammateFollowUpTool({ callerSessionId: 'caller', enabled: true }),
    ).toMatchObject({ ok: false, errorCode: 'TASK_ACTION_AUTHORIZATION_REQUIRED' });
    expect(h.upsert).not.toHaveBeenCalled();
  });
  it('refuses an ordinary task caller and a model that runs on another computer', async () => {
    h.caller.mockResolvedValueOnce({
      ok: false,
      errorCode: 'NOT_TEAMMATE',
      message: 'not teammate',
    });
    expect(
      await runTeammateFollowUpTool({ callerSessionId: 'ordinary', enabled: true }),
    ).toMatchObject({ ok: false, errorCode: 'NOT_TEAMMATE' });
    h.chain.mockResolvedValue([
      { harness: 'codex', model: 'remote', agentDeviceId: 'other-computer' },
    ]);
    expect(
      await runTeammateFollowUpTool({ callerSessionId: 'caller', enabled: true }),
    ).toMatchObject({ ok: false, errorCode: 'LOCAL_MODEL_REQUIRED' });
    expect(h.upsert).not.toHaveBeenCalled();
  });
  it('rejects an account switch while reading the model before any persistence', async () => {
    h.chain.mockImplementationOnce(async () => {
      h.owner = 'different-owner';
      return [{ harness: 'codex', model: 'chosen' }];
    });
    expect(
      await runTeammateFollowUpTool({ callerSessionId: 'caller', enabled: true }),
    ).toMatchObject({ ok: false });
    expect(h.upsert).not.toHaveBeenCalled();
  });
  it('rejects a revoked action and a changed teammate identity before persistence', async () => {
    h.guard.mockRejectedValueOnce(new Error('revoked'));
    expect(
      await runTeammateFollowUpTool({ callerSessionId: 'caller', enabled: true }),
    ).toMatchObject({ ok: false });
    h.caller
      .mockResolvedValueOnce({ ok: true, botId: 'actual-bot' })
      .mockResolvedValueOnce({ ok: true, botId: 'different-bot' });
    expect(
      await runTeammateFollowUpTool({ callerSessionId: 'caller', enabled: true }),
    ).toMatchObject({ ok: false });
    expect(h.upsert).not.toHaveBeenCalled();
  });
});
