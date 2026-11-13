import type { Schedule } from '@cindy/maker-scheduler';
import type { ProjectScheduleConfig } from '../scheduler-host/project-automation-loader.js';

export const FOLLOW_UP_CONFIG_ID = 'teammate-local-task-follow-up';
export const FOLLOW_UP_INTERVAL_MINUTES = 10;

/** An ordinary project automation; no second scheduler, task watcher or private permission mode. */
export function followUpConfig(
  canonicalSessionId: string,
  model: Partial<ProjectScheduleConfig>,
): ProjectScheduleConfig {
  return {
    ...model,
    id: FOLLOW_UP_CONFIG_ID,
    name: '本机任务自动跟进',
    cronExpr: '*/10 * * * *',
    timezone: 'UTC',
    recurring: true,
    persistentSession: true,
    useWorktree: false,
    silentWhenIdle: true,
    notify: { desktop: false, feishu: false, wecomGroup: false },
    prompt: [
      '你负责跟进本机当前账号的全部普通 Cindy 任务。这是一次巡查，在当前自动化任务内完成，不另建巡查任务。',
      '先发现 cindy_helper 的 history 和 handoff 工具。用 list_sessions(device="local") 分页查找未归档任务；不能把第一页当成全部。',
      '排除本次巡查自身、source=bot 的伙伴对话、source=scheduler 的自动化执行任务和 Orca worker，防止相互唤醒。不要查询其他电脑。',
      '先看任务状态，按需用 get_task_digest 查看出错、等待、撞额度、久无进展和新完成的任务；摘要不够再读相关历史。',
      '先核对用户最新目标、停止要求、输入队列以及自己上次的跟进记录。正在正常工作、已排队、已完成或明确停止的任务不要重复发消息。',
      '只有在用户已有目标和授权内，才用 send_to_session 给需要继续处理的原任务发明确指令；不改变目标，不替用户批准权限、回答必须本人决定的问题，不重复已完成的外部操作。',
      '额度不足不要反复唤醒或自行换付费来源。无法判断是否应继续时，报告阻塞原因。投递结果未知先查历史和队列，不盲目重发。',
      `需要主人处理或有值得报告的新结果时，用 send_to_session 发到伙伴主对话 ${JSON.stringify(canonicalSessionId)}，附任务链接和简短结论；不发群消息或外部通知。`,
      '保留本轮已处理任务、最后状态、已发送消息与已报告问题的简短检查点；相同状态不重复提醒。本轮没有新进展或问题时，只回复 NO_REPLY。',
    ].join('\n'),
  };
}

export interface FollowUpServiceDeps {
  list(): Promise<Schedule[]>;
  owns(schedule: Schedule): boolean;
  create(): Promise<void>;
  pause(id: string): Promise<unknown>;
  resume(id: string): Promise<unknown>;
  assertCurrent(): Promise<void>;
}

/** Caller serializes changes account-wide; each mutation is guarded again after asynchronous reads. */
export async function configureFollowUp(deps: FollowUpServiceDeps, enabled?: boolean) {
  await deps.assertCurrent();
  let schedules = await deps.list();
  await deps.assertCurrent();
  const isFollowUp = (s: Schedule) =>
    s.source === 'project' && s.projectConfigId === FOLLOW_UP_CONFIG_ID;
  let current = schedules.find((s) => isFollowUp(s) && deps.owns(s));
  if (enabled === true) {
    if (schedules.some((s) => isFollowUp(s) && !deps.owns(s) && s.status === 'active')) {
      return {
        ok: false as const,
        errorCode: 'FOLLOW_UP_ALREADY_ENABLED',
        message: '另一位伙伴的本机任务跟进自动化已开启。请先暂停它，再切换负责伙伴。',
      };
    }
    if (!current) await deps.create();
    else if (current.status === 'paused') await deps.resume(current.id);
    else if (current.status !== 'active')
      return {
        ok: false as const,
        errorCode: 'FOLLOW_UP_EXPIRED',
        message: '这条跟进自动化已过期，请在自动化页面检查配置。',
      };
  } else if (enabled === false && current?.status === 'active') await deps.pause(current.id);
  await deps.assertCurrent();
  schedules = await deps.list();
  await deps.assertCurrent();
  current = schedules.find((s) => isFollowUp(s) && deps.owns(s));
  if (enabled !== undefined && (current?.status === 'active') !== enabled) {
    return {
      ok: false as const,
      errorCode: 'FOLLOW_UP_STATE_CHANGED',
      message: '跟进状态与请求不一致，请读取当前状态后再决定；不要重复创建。',
    };
  }
  return {
    ok: true as const,
    enabled: current?.status === 'active',
    schedule_id: current?.id ?? null,
    interval_minutes: current?.intervalMs
      ? current.intervalMs / 60_000
      : !current || current.cronExpr === '*/10 * * * *'
        ? FOLLOW_UP_INTERVAL_MINUTES
        : null,
    cron_expr: current?.cronExpr ?? '*/10 * * * *',
    scope: 'local' as const,
  };
}
