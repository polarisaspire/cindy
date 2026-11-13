import type { SessionActivityTransition } from '@cindy/maker-shared/session-activity';
import { activeOwnerScopeKey, isAppSessionBoundaryPending, ownerScopedUserDataPath } from '../appSessionState.js';
import { getCurrentDbClientSnapshot } from '../localDb/client/current.js';
import { readCanonicalSessionActivity } from './sessionActivityProjection.js';
import { readAssignableTask, readAssignmentRecipient, importLegacyTaskAssignments } from './taskAssignments.desktop.js';
import { readTaskAssignments, acknowledgeTaskEvent } from './taskAssignments.js';
import { createTaskAssignmentEvents, type AssignmentEventPorts, assignmentSnapshot, setTaskAssignmentNotifier } from './taskAssignmentEvents.js';
import { setTaskAssignmentInputValidator, runTaskActionRequest } from './taskActionAuthorization.js';

export function startTaskAssignmentEvents(ports: {
  subscribe(listener: (transition: SessionActivityTransition) => void): () => void;
  send(input: Parameters<AssignmentEventPorts['send']>[0] & { assertCurrent(): void }): Promise<boolean>;
  failed(error: unknown): void;
}) {
  // This check also runs for durable queue items restored after restart. No live closure or
  // conversation text can restore a released/reassigned relationship.
  setTaskAssignmentInputValidator(async (target, item) => {
    const snapshot = getCurrentDbClientSnapshot();
    if (!snapshot || isAppSessionBoundaryPending()) throw new Error('HOST_NOT_READY');
    const root = ownerScopedUserDataPath();
    const source = item.origin?.kind === 'session' ? item.origin.senderSessionId : null;
    const revision = item.clientId.slice('task-assignment-'.length).split(':')[0];
    const row = source ? (await readTaskAssignments(root))[source] : undefined;
    if (getCurrentDbClientSnapshot() !== snapshot || isAppSessionBoundaryPending()) throw new Error('HOST_NOT_READY');
    if (!source || !row?.botId || !row.notifications || row.revision !== revision
      || !await readAssignableTask(source) || await readAssignmentRecipient(row.botId) !== target)
      throw new Error('ASSIGNMENT_REVOKED');
    if (getCurrentDbClientSnapshot() !== snapshot || isAppSessionBoundaryPending()) throw new Error('HOST_NOT_READY');
  });
  let epoch: ReturnType<typeof getCurrentDbClientSnapshot>;
  let consume: ReturnType<typeof createTaskAssignmentEvents> | undefined;
  const ensure = () => {
    const snapshot = getCurrentDbClientSnapshot();
    if (!snapshot || isAppSessionBoundaryPending()) return undefined;
    if (snapshot === epoch && consume) return consume;
    epoch = snapshot;
    const owner = activeOwnerScopeKey();
    const root = ownerScopedUserDataPath();
    const assertCurrent = () => {
      if (isAppSessionBoundaryPending() || activeOwnerScopeKey() !== owner || getCurrentDbClientSnapshot() !== snapshot)
        throw new Error('OWNER_SCOPE_CHANGED');
    };
    consume = createTaskAssignmentEvents({
      assertCurrent,
      read: async id => (await readTaskAssignments(root))[id],
      eligible: async (id, botId) => await readAssignableTask(id) ? readAssignmentRecipient(botId) : null,
      send: input => runTaskActionRequest(() => ports.send({ ...input, assertCurrent })),
      acknowledge: (id, revision, key) => acknowledgeTaskEvent(root, id, revision, key, assertCurrent),
    });
    const current = consume;
    // Reconcile only explicitly registered tasks after startup/account restoration, never all tasks.
    void (async () => {
      await importLegacyTaskAssignments(root, assertCurrent);
      const records = await readTaskAssignments(root);
      assertCurrent();
      for (const [id, row] of Object.entries(records)) {
        if (!row.botId || !row.notifications) continue;
        assertCurrent();
        try {
          await current(assignmentSnapshot(id, row));
          await current(await readCanonicalSessionActivity(id));
        } catch (error) { ports.failed(error); }
      }
    })().catch(ports.failed);
    return current;
  };
  const unsubscribe = ports.subscribe(event => {
    const handler = ensure();
    if (handler && event.current) void handler(event.current).catch(ports.failed);
  });
  setTaskAssignmentNotifier(async (sessionId, callerSessionId) => {
    const handler = ensure();
    if (!handler) throw new Error('HOST_NOT_READY');
    const row = (await readTaskAssignments(ownerScopedUserDataPath()))[sessionId];
    if (row?.botId && row.notifications) await handler(assignmentSnapshot(sessionId, row), callerSessionId);
  });
  ensure();
  return unsubscribe;
}
