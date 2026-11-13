import { and, eq, isNull } from 'drizzle-orm';
import { getDbClient } from '../localDb/client/current.js';
import { botProfiles, botSessionLinks, sessions } from '../localDb/schema.js';
import { activeOwnerScopeKey, isAppSessionBoundaryPending, ownerScopedUserDataPath } from '../appSessionState.js';
import { assignTask, readTaskAssignments, importTaskAssignments } from './taskAssignments.js';
import { readTaskResponsibilities } from './botTaskResponsibility.js';
import { resolveTeammateMainCaller } from './botTaskCreation.js';
import { assertTaskActionCurrent, captureTaskActionSyncGuard, hasTaskActionAuthorization } from './taskActionAuthorization.js';
import { broadcastBotLinkedProjectsChanged } from './botLinkedProjectStore.js';
import { broadcastBotRemoteResourceChanged } from './botRemoteResourceInvalidation.js';
import { notifyTaskAssignment } from './taskAssignmentEvents.js';

export async function readAssignmentRecipient(botId: string) {
  const [row] = await getDbClient().drizzle.select({ sessionId: botSessionLinks.sessionId })
    .from(botSessionLinks).innerJoin(botProfiles, eq(botProfiles.id, botSessionLinks.botId))
    .innerJoin(sessions, eq(sessions.id, botSessionLinks.sessionId))
    .where(and(eq(botProfiles.id, botId), eq(botProfiles.status, 'active'),
      eq(botSessionLinks.role, 'canonical'), isNull(botSessionLinks.archivedAt),
      eq(sessions.status, 'active'), isNull(sessions.remoteHostId))).limit(1);
  return row?.sessionId ?? null;
}

export async function readAssignableTask(sessionId: string) {
  const [row] = await getDbClient().drizzle.select({ id: sessions.id, title: sessions.title,
    status: sessions.status, source: sessions.source, remoteHostId: sessions.remoteHostId, orcaRole: sessions.orcaRole })
    .from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  if (!row || row.status !== 'active' || row.remoteHostId || row.orcaRole === 'worker'
    || ['bot', 'scheduler', 'shared'].includes(row.source)) return null;
  return row;
}

export interface TaskAssignmentRequest {
  callerSessionId: string;
  sessionId?: string;
  botId?: string;
  responsible?: boolean;
  notifications?: boolean;
  expectedRevision?: string | null;
  ownOnly?: boolean;
}

export async function importLegacyTaskAssignments(root: string, current: () => void) {
  const profiles = await getDbClient().drizzle.select({ id: botProfiles.id }).from(botProfiles);
  current();
  const candidates: Array<{ sessionId: string; botId: string; updatedAt: number }> = [];
  for (const profile of profiles) {
    const records = await readTaskResponsibilities(root, profile.id);
    current();
    for (const [sessionId, entry] of Object.entries(records)) {
      if (entry.responsible && entry.created !== true && !sessionId.includes('::'))
        candidates.push({ sessionId, botId: profile.id, updatedAt: Date.parse(entry.updatedAt) });
    }
  }
  await importTaskAssignments(root, candidates, current);
}

export async function runTaskAssignmentTool(params: TaskAssignmentRequest) {
  const owner = activeOwnerScopeKey();
  const root = ownerScopedUserDataPath();
  const db = getDbClient();
  const current = () => {
    if (isAppSessionBoundaryPending() || activeOwnerScopeKey() !== owner || getDbClient() !== db)
      throw new Error('OWNER_SCOPE_CHANGED');
  };
  try {
    let notificationPending = false;
    current();
    let botId = params.botId;
    if (params.ownOnly || (!botId && params.responsible !== undefined)) {
      const caller = await resolveTeammateMainCaller(params.callerSessionId);
      current();
      if (!caller.ok) return caller;
      botId = caller.botId;
    }
    await importLegacyTaskAssignments(root, current);
    let rows = await readTaskAssignments(root);
    current();
    if (params.responsible !== undefined) {
      if (!params.sessionId || params.sessionId.includes('::')) throw new Error('LOCAL_TASK_REQUIRED');
      if (!hasTaskActionAuthorization(params.callerSessionId)) throw new Error('TASK_ACTION_AUTHORIZATION_REQUIRED');
      await assertTaskActionCurrent();
      const actionGuard = captureTaskActionSyncGuard();
      if (!actionGuard) throw new Error('TASK_ACTION_AUTHORIZATION_REQUIRED');
      if (params.responsible && !await readAssignableTask(params.sessionId)) throw new Error('TASK_NOT_ACTIVE_OR_ORDINARY');
      if (!botId || params.responsible && !await readAssignmentRecipient(botId)) throw new Error('TEAMMATE_UNAVAILABLE');
      const previous = rows[params.sessionId];
      if (previous?.botId && previous.botId !== botId && (params.ownOnly || params.expectedRevision === undefined))
        throw new Error('ASSIGNMENT_CHANGED');
      current();
      await assignTask(root, params.sessionId, params.responsible ? botId : null,
        params.responsible && (params.notifications ?? true), () => { current(); actionGuard(); },
        params.expectedRevision === undefined ? previous?.revision ?? null : params.expectedRevision);
      for (const id of new Set([botId, previous?.botId].filter((id): id is string => !!id))) {
        broadcastBotLinkedProjectsChanged(id);
        broadcastBotRemoteResourceChanged(id);
      }
      rows = await readTaskAssignments(root);
      current();
      if (params.responsible && rows[params.sessionId]?.notifications) {
        try { await notifyTaskAssignment(params.sessionId, params.callerSessionId); }
        catch { notificationPending = true; }
        current();
      }
    }
    const assignments = Object.entries(rows)
      .filter(([id, row]) => (!params.sessionId || id === params.sessionId)
        && (!params.ownOnly || params.responsible !== undefined || row.botId === botId))
      .map(([session_id, row]) => ({ session_id, bot_id: row.botId, responsible: row.botId !== null,
        notifications: row.notifications, revision: row.revision, updated_at: row.updatedAt }));
    return { ok: true as const, scope: 'local', assignments,
      ...(params.responsible !== undefined ? { saved: true, task_started: false, notification_pending: notificationPending } : {}) };
  } catch (error) {
    const code = error instanceof Error && /^[A-Z][A-Z_]{2,80}$/.test(error.message) ? error.message : 'ASSIGNMENT_UNAVAILABLE';
    return { ok: false as const, errorCode: code,
      message: '未能确认接管关系。请先读取当前关系；转交需使用读回的 revision，勿重复创建任务或放宽权限。' };
  }
}
