import { errorPayload } from "./_payload.js";

/** V1 names can remain in a teammate's saved conversation after the V2 upgrade.
 * These are diagnostics only: never turn a responsibility change into a message.
 */
export function retiredWorkbenchResult(name: string) {
  let guidance: string;
  switch (name) {
    case "get_workbench":
      guidance =
        "用 list_tools 查询 history 类目的 list_sessions，读取当前可访问的任务。";
      break;
    case "read_workbench_task":
      guidance =
        "用 list_tools 查询 get_task_digest 或 get_chat_history，读取指定任务。";
      break;
    case "continue_workbench_task":
      guidance =
        "需要继续已有任务时，先查询 handoff 类目的 send_to_session，并按用户授权指定 target_session_id 和消息。";
      break;
    case "set_workbench_task_responsibility":
      guidance =
        "当前宿主未接通逐任务接管服务。查询 set_task_responsibility 检查新版入口；仅发送消息或全局巡查这些操作不会变更任务负责人。";
      break;
    default:
      return undefined;
  }
  return errorPayload(
    "TOOL_REMOVED",
    "当前宿主没有注册此兼容入口。请按可发现的新工具继续，不要通过放宽权限处理。" +
      guidance,
    { tool: name, retryable: false },
  );
}
