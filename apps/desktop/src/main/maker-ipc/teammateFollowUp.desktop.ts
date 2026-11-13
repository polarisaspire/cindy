import path from 'node:path';
import {
  activeOwnerScopeKey,
  isAppSessionBoundaryPending,
  ownerScopedUserDataPath,
} from '../appSessionState.js';
import { readBotSettingsProfile } from '../localDb/ipc/bots.js';
import { readEffectiveBotModelChain } from '../maker-host/bot-model-chain-settings-store.js';
import { botProfileDir } from './botProfileFolder.js';
import { resolveTeammateMainCaller } from './botTaskCreation.js';
import { withBotProfileLocks } from './botProfileLock.js';
import { assertTaskActionCurrent, hasTaskActionAuthorization } from './taskActionAuthorization.js';
import { configureFollowUp, followUpConfig } from './teammateFollowUp.js';
import { routeModelFields } from './botV2Carryover.js';
import { getScheduler, getProjectAutomationLoader } from '../scheduler-host/index.desktop.js';

/** Bind the ordinary scheduler to the actual calling teammate, never a model-supplied identity. */
export async function runTeammateFollowUpTool(params: {
  callerSessionId: string;
  enabled?: boolean;
}) {
  const owner = activeOwnerScopeKey();
  const root = ownerScopedUserDataPath();
  const current = () => {
    if (isAppSessionBoundaryPending() || activeOwnerScopeKey() !== owner)
      throw new Error('OWNER_SCOPE_CHANGED');
  };
  try {
    current();
    const caller = await resolveTeammateMainCaller(params.callerSessionId);
    current();
    if (!caller.ok) return caller;
    if (params.enabled !== undefined && !hasTaskActionAuthorization(params.callerSessionId)) {
      return {
        ok: false as const,
        errorCode: 'TASK_ACTION_AUTHORIZATION_REQUIRED',
        message: '设置自动跟进需要当前任务的操作授权。',
      };
    }
    return await withBotProfileLocks([`follow-up:${owner}`, caller.botId], async () => {
      const assertCurrent = async () => {
        current();
        if (params.enabled !== undefined) await assertTaskActionCurrent();
        const active = await resolveTeammateMainCaller(params.callerSessionId);
        current();
        if (!active.ok || active.botId !== caller.botId) throw new Error('CALLER_CHANGED');
      };
      await assertCurrent();
      const scheduler = getScheduler();
      const loader = getProjectAutomationLoader();
      const workspace = path.join(botProfileDir(root, caller.botId), 'workspace');
      const key = (value: string) =>
        process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value);
      return configureFollowUp(
        {
          assertCurrent,
          list: () => scheduler.list(),
          owns: (s) => !!s.workingDir && key(s.workingDir) === key(workspace),
          pause: (id) => scheduler.pause(id),
          resume: (id) => scheduler.resume(id),
          create: async () => {
            const profile = await readBotSettingsProfile(caller.botId);
            const [route] = await readEffectiveBotModelChain(
              profile.capabilities as unknown as Record<string, unknown>,
            );
            await assertCurrent();
            if (!profile.canonicalSessionId || !route) throw new Error('MODEL_OR_CHAT_UNAVAILABLE');
            // The monitor's tools must run here. Do not silently move monitoring to a provider's computer.
            if (route.agentDeviceId && route.agentDeviceId !== 'local')
              throw new Error('LOCAL_MODEL_REQUIRED');
            const model = routeModelFields({ ...route, agentDeviceId: undefined });
            if (!model) throw new Error('LOCAL_MODEL_REQUIRED');
            await loader.upsertSchedule(
              workspace,
              followUpConfig(profile.canonicalSessionId, model),
              { keepUnreadable: true },
            );
          },
        },
        params.enabled,
      );
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'LOCAL_MODEL_REQUIRED')
      return {
        ok: false as const,
        errorCode: code,
        message: '请先为这位伙伴选择在本机运行的模型，再开启本机任务跟进。',
      };
    return {
      ok: false as const,
      errorCode: 'FOLLOW_UP_UNAVAILABLE',
      message: '未能确认自动跟进设置。请先查询当前状态；不要重复创建或改用其他伙伴。',
    };
  }
}
