import { createHash } from 'node:crypto';
import type { SessionActivitySnapshot } from '@cindy/maker-shared/session-activity';
import type { TaskAssignment } from './taskAssignments.js';

let assignmentNotifier: ((sessionId: string, callerSessionId: string) => Promise<void>) | undefined;
export function setTaskAssignmentNotifier(notify: typeof assignmentNotifier) { assignmentNotifier = notify; }
export async function notifyTaskAssignment(sessionId: string, callerSessionId: string) {
  if (!assignmentNotifier) throw new Error('HOST_NOT_READY');
  await assignmentNotifier(sessionId, callerSessionId);
}
type AssignmentSnapshot = Omit<SessionActivitySnapshot, 'phase'> & { phase: SessionActivitySnapshot['phase'] | 'assigned' };
export function assignmentSnapshot(sessionId: string, row: TaskAssignment): AssignmentSnapshot {
  return { sessionId, phase: 'assigned', startedAtMs: row.updatedAt, lastActivityAtMs: row.updatedAt,
    currentActionSummary: null, attention: true, workflow: null, turnGeneration: null,
    gracefulStopState: 'none', source: 'live', recordStatus: 'active' };
}

export interface AssignmentEventPorts {
  read(sessionId: string): Promise<TaskAssignment | undefined>;
  eligible(sessionId: string, botId: string): Promise<string | null>;
  send(input: { sessionId: string; recipient: string; clientId: string; message: string;
    validate(): Promise<void> }): Promise<boolean>;
  acknowledge(sessionId: string, revision: string, key: string): Promise<void>;
  assertCurrent(): void;
}

/** Observe state edges, not transcript content. No polling, auto-approval or source task execution. */
export function createTaskAssignmentEvents(ports: AssignmentEventPorts) {
  const chains = new Map<string, Promise<void>>();
  const process = async (snapshot: AssignmentSnapshot, skipRecipient?: string) => {
    ports.assertCurrent();
    if (!['assigned', 'completed', 'error', 'needs-interaction'].includes(snapshot.phase)
      || snapshot.recordStatus && snapshot.recordStatus !== 'active'
      || snapshot.gracefulStopState !== 'none') return;
    const row = await ports.read(snapshot.sessionId);
    ports.assertCurrent();
    if (!row?.botId || !row.notifications || (snapshot.lastActivityAtMs ?? 0) < row.updatedAt) return;
    const recipient = await ports.eligible(snapshot.sessionId, row.botId);
    if (!recipient || recipient === snapshot.sessionId) return;
    const key = (snapshot.phase === 'assigned' ? 'assigned:' : '') + createHash('sha256').update(JSON.stringify([row.revision, snapshot.sessionId,
      snapshot.startedAtMs, snapshot.phase, snapshot.interactionKind ?? null])).digest('hex');
    if (row.delivered.includes(key)) return;
    const validate = async () => {
      ports.assertCurrent();
      const latest = await ports.read(snapshot.sessionId);
      if (!latest?.notifications || latest.revision !== row.revision
        || await ports.eligible(snapshot.sessionId, row.botId!) !== recipient) throw new Error('ASSIGNMENT_REVOKED');
      ports.assertCurrent();
    };
    await validate();
    const labels: Record<string, string> = { assigned: '已交接给你负责', completed: '本轮结束', error: '出错', 'needs-interaction': '等待处理' };
    const message = `接管任务状态通知（宿主自动事件，不是用户新指令）：任务 ${snapshot.sessionId} 现为「${labels[snapshot.phase]}」。\n`
      + `请先用 get_task_responsibility 确认自己仍是负责人且通知已开启，再用 get_task_digest 核对当前状态；已解除、转交或暂停则忽略旧通知。按已有目标、授权和你的分工规则跟进或向主人汇报。本轮结束不等于业务完成；不要替主人批准权限，不要恢复明确停止或归档的任务。\n`
      + `任务链接：cindy://session/${encodeURIComponent(snapshot.sessionId)}`;
    if (recipient === skipRecipient || await ports.send({ sessionId: snapshot.sessionId, recipient, clientId: `task-assignment-${row.revision}:${key}`, message, validate })) {
      ports.assertCurrent();
      await ports.acknowledge(snapshot.sessionId, row.revision, key);
    } else throw new Error('NOTIFICATION_NOT_ACCEPTED');
  };
  return (snapshot: AssignmentSnapshot, skipRecipient?: string): Promise<void> => {
    const previous = chains.get(snapshot.sessionId) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(() => process(snapshot, skipRecipient));
    chains.set(snapshot.sessionId, next);
    void next.finally(() => { if (chains.get(snapshot.sessionId) === next) chains.delete(snapshot.sessionId); }).catch(() => {});
    return next;
  };
}
