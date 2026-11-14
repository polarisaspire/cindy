import { z } from 'zod';
import type { XdtHelperToolRegistry } from '../lizi_xdtHelperToolRegistry.js';
import type { LiziMcpSessionContext } from '../types.js';
import { errorPayload, okPayload } from './_payload.js';

export type TaskAssignmentCallback = (params: {
  callerSessionId: string; sessionId?: string; botId?: string; responsible?: boolean;
  notifications?: boolean; expectedRevision?: string | null; ownOnly?: boolean;
}) => Promise<{ ok: boolean; [key: string]: unknown }>;

export function registerTaskAssignmentTools(registry: XdtHelperToolRegistry,
  context: () => LiziMcpSessionContext, execute: TaskAssignmentCallback) {
  const run = async (args: Omit<Parameters<TaskAssignmentCallback>[0], 'callerSessionId'>) => {
    const callerSessionId = context().sessionId;
    if (!callerSessionId) return errorPayload('NO_SESSION', '需要当前任务上下文。');
    const result = await execute({ ...args, callerSessionId });
    return result.ok ? okPayload(result) : errorPayload(String(result.errorCode), String(result.message));
  };
  registry.register({ name: 'get_task_responsibility', category: 'handoff',
    description: '查询本机任务实际接管关系、负责伙伴、状态通知开关及 revision。不传 session_id 列出已登记关系。只读，不启动任务。',
    inputShape: { session_id: z.string().min(1).max(256).optional() },
    handler: ({ session_id }) => run({ sessionId: session_id }) });
  registry.register({ name: 'set_task_responsibility', category: 'handoff',
    description: '将本机已有普通任务交给指定伙伴负责，或解除/转交接管。负责关系原子保存，默认通知接手伙伴，并通知后续的完成、出错和等待状态，不立即启动原任务；不授予批准权限或恢复停止任务的授权。notification_pending=true 表示关系已保存但交接通知待重试。bot_id 取 list_agents，省略为当前伙伴。转交另一伙伴时先查询，再带 expected_revision；notifications=false 可暂停该关系通知。旧全局巡查独立控制，登记不会恢复它。',
    inputShape: { session_id: z.string().min(1).max(256), bot_id: z.string().min(1).optional(),
      responsible: z.boolean(), notifications: z.boolean().optional(), expected_revision: z.string().nullable().optional() },
    handler: ({ session_id, bot_id, responsible, notifications, expected_revision }) =>
      run({ sessionId: session_id, botId: bot_id, responsible, notifications, expectedRevision: expected_revision }) });
  registry.register({ name: 'set_workbench_task_responsibility', category: 'bots',
    description: '兼容旧伙伴接管入口：保存当前伙伴对本机 session_id 的负责关系并开启后续状态通知。responsible=false 解除。真实身份来自当前伙伴任务；不创建、不续跑原任务。转交其他负责人使用 set_task_responsibility。',
    inputShape: { session_id: z.string().min(1).max(256), responsible: z.boolean() },
    handler: ({ session_id, responsible }) => run({ sessionId: session_id, responsible, ownOnly: true }) });
  registry.register({ name: 'get_workbench', category: 'bots', inputShape: {},
    description: '兼容旧工作台：列出当前伙伴已登记负责的本机任务及通知开关；详情使用 get_task_digest，历史使用 get_chat_history。',
    handler: () => run({ ownOnly: true }) });
  registry.register({ name: 'read_workbench_task', category: 'bots',
    description: '兼容旧入口：读取指定本机任务的真实摘要。负责关系使用 get_task_responsibility。',
    inputShape: { session_id: z.string().min(1).max(256) },
    handler: ({ session_id }) => registry.call('get_task_digest', { session_id }) });
  registry.register({ name: 'continue_workbench_task', category: 'bots',
    description: '兼容旧入口：按已有授权向原任务发送明确消息，经过普通任务的发送及权限流程。不会登记接管关系；不可擅自恢复已停止或归档的任务。',
    inputShape: { session_id: z.string().min(1).max(256), message: z.string().min(1) },
    handler: ({ session_id, message }) => registry.call('send_to_session', { target_session_id: session_id, message }) });
}
