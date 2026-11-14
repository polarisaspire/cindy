import { describe, expect, it, vi } from 'vitest';
import type { Schedule } from '@cindy/maker-scheduler';
import { configureFollowUp, followUpConfig, FOLLOW_UP_CONFIG_ID } from '../teammateFollowUp.js';

// Unit: production automation controller with in-memory scheduler ports, no timers or real profile.
// V2 removed global follow-up. Verify persistent effects, not source strings: creation, idempotent
// resume, pause, another teammate already monitoring, and revoked authority before a write.
const schedule = (overrides: Partial<Schedule> = {}) =>
  ({
    id: 'follow',
    source: 'project',
    projectConfigId: FOLLOW_UP_CONFIG_ID,
    workingDir: '/teammate',
    status: 'active',
    cronExpr: '*/10 * * * *',
    ...overrides,
  }) as Schedule;
function fixture(initial: Schedule[] = []) {
  let rows = initial;
  const deps = {
    list: vi.fn(async () => rows),
    owns: (s: Schedule) => s.workingDir === '/teammate',
    assertCurrent: vi.fn(async () => {}),
    create: vi.fn(async () => {
      rows = [...rows, schedule()];
    }),
    pause: vi.fn(async (id: string) => {
      rows = rows.map((s) => (s.id === id ? { ...s, status: 'paused' as const } : s));
    }),
    resume: vi.fn(async (id: string) => {
      rows = rows.map((s) => (s.id === id ? { ...s, status: 'active' as const } : s));
    }),
  };
  return deps;
}
describe('teammate project follow-up', () => {
  it('reads without creating, then enables once and pauses the same automation', async () => {
    const f = fixture();
    expect(await configureFollowUp(f)).toMatchObject({
      enabled: false,
      schedule_id: null,
      scope: 'local',
    });
    expect(f.create).not.toHaveBeenCalled();
    expect(await configureFollowUp(f, true)).toMatchObject({
      enabled: true,
      schedule_id: 'follow',
      interval_minutes: 10,
    });
    await configureFollowUp(f, true);
    expect(f.create).toHaveBeenCalledTimes(1);
    expect(await configureFollowUp(f, false)).toMatchObject({
      enabled: false,
      schedule_id: 'follow',
    });
    expect(f.pause).toHaveBeenCalledExactlyOnceWith('follow');
  });
  it('resumes without replacing user edits or inventing a ten minute interval', async () => {
    const f = fixture([
      schedule({ status: 'paused', cronExpr: '0 * * * *', prompt: 'owner edit' }),
    ]);
    expect(await configureFollowUp(f, true)).toMatchObject({
      enabled: true,
      interval_minutes: null,
      cron_expr: '0 * * * *',
    });
    expect(f.resume).toHaveBeenCalledExactlyOnceWith('follow');
    expect(f.create).not.toHaveBeenCalled();
    expect((await f.list())[0].prompt).toBe('owner edit');
  });
  it('does not start a competing monitor or pause another teammate', async () => {
    const f = fixture([schedule({ workingDir: '/other' })]);
    expect(await configureFollowUp(f, true)).toMatchObject({
      ok: false,
      errorCode: 'FOLLOW_UP_ALREADY_ENABLED',
    });
    expect(await configureFollowUp(f, false)).toMatchObject({ enabled: false, schedule_id: null });
    expect(f.create).not.toHaveBeenCalled();
    expect(f.pause).not.toHaveBeenCalled();
  });
  it('stops before a write if authority is revoked during the read', async () => {
    const f = fixture();
    f.assertCurrent.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('changed'));
    await expect(configureFollowUp(f, true)).rejects.toThrow('changed');
    expect(f.create).not.toHaveBeenCalled();
  });
  it('reports a failed persistence receipt instead of claiming enable succeeded', async () => {
    const f = fixture();
    f.create.mockImplementation(async () => {});
    expect(await configureFollowUp(f, true)).toMatchObject({
      ok: false,
      errorCode: 'FOLLOW_UP_STATE_CHANGED',
    });
  });
  it('creates an ordinary recurring project config with external notifications disabled', () => {
    expect(followUpConfig('canonical', { agentKind: 'codex', model: 'model' })).toMatchObject({
      id: FOLLOW_UP_CONFIG_ID,
      agentKind: 'codex',
      model: 'model',
      recurring: true,
      persistentSession: true,
      useWorktree: false,
      notify: { desktop: false, feishu: false, wecomGroup: false },
    });
  });
});
