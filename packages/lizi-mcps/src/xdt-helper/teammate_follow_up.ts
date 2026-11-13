import { z } from "zod";
import type { XdtHelperToolRegistry } from "../lizi_xdtHelperToolRegistry.js";
import type { LiziMcpSessionContext } from "../types.js";
import { errorPayload, okPayload } from "./_payload.js";

export type TeammateFollowUpCallback = (params: {
  callerSessionId: string;
  enabled?: boolean;
}) => Promise<
  | {
      ok: true;
      enabled: boolean;
      schedule_id: string | null;
      interval_minutes: number | null;
      cron_expr: string;
      scope: "local";
    }
  | { ok: false; errorCode: string; message: string }
>;

export function registerTeammateFollowUpTools(
  registry: XdtHelperToolRegistry,
  getContext: () => LiziMcpSessionContext,
  execute: TeammateFollowUpCallback,
) {
  const run = async (enabled?: boolean) => {
    const callerSessionId = getContext().sessionId;
    if (!callerSessionId)
      return errorPayload(
        "NOT_A_BOT_SESSION",
        "在要负责跟进的伙伴对话里操作。",
      );
    const result = await execute({
      callerSessionId,
      ...(enabled === undefined ? {} : { enabled }),
    });
    return result.ok
      ? okPayload(result)
      : errorPayload(result.errorCode, result.message);
  };
  registry.register({
    name: "get_teammate_follow_up",
    category: "bots",
    inputShape: {},
    description:
      "Read whether you automatically follow all tasks on this computer. This is an ordinary project automation, visible in your Automations settings; not the removed V1 workbench.",
    handler: () => run(),
  });
  registry.register({
    name: "set_teammate_follow_up",
    category: "bots",
    inputShape: { enabled: z.boolean() },
    description:
      "Enable or pause automatic follow-up of all local Cindy tasks when the owner asks you to take over or follow all tasks. Uses your project automation, every 10 minutes, consuming model usage. Pausing can stop its current monitoring run, not the tasks being monitored. Identity comes from this conversation; no botId is accepted. Repeated enable preserves an existing automation and its edits. This does not restore V1 task ownership or grant permission to override stopped tasks or approvals. The owner can pause it in Teammate settings > Automations. No cross-computer monitoring.",
    handler: ({ enabled }) => run(enabled),
  });
}
