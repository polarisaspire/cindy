# 自用 Windows / Linux 安装包

入口：`.github/workflows/personal-desktop.yml`，Actions 中名为 **Personal desktop packages**。

## 分支与首次启用

1. 将已审阅的修复提交推送到自己 fork 的 `fix/direct-link-stability` 分支，即自动触发构建，无需先合入默认分支或等待官方仓库合并。
2. 在自己的 fork 打开 Actions，若尚未启用 Actions，先启用并重新推送后续修复提交。
3. 将 `.github/workflows/personal-desktop.yml` 与 `.github/workflows/sync-personal-upstream.yml` 通过 PR 放入自己 fork 的默认分支，注册手动与定时入口。功能源码、发布脚本和打包仍使用 `fix/direct-link-stability`；无需把全部个人补丁合入 main，也无需官方上游合并。
4. 等待 Windows、Linux 两个 job 分别完成，在该次运行的 Artifacts 下载对应压缩包。

构建矩阵为 Windows x64 `Setup.exe` 和 Linux x64 `.deb`；目前固定 `global`。bp-holder 安装前先核对 `uname -m` 与系统发行版，arm64 不能安装 x64 包。

产物目录为 `apps/desktop/release/artifacts/global/1.0.<run_number>/<platform>-x64/`，包括 `build-info.json`、`SOURCE.txt`、`SHA256SUMS.txt`。`SOURCE.txt` 记录源码 SHA 和该次 Actions 链接。Artifact 保留 14 天。

构建 job 只有仓库读取权限。两平台的测试、类型检查与 packaged smoke 都成功后，独立发布 job 才获得本 fork 的 `contents: write`，创建 prerelease `personal-<run_id>` 并最后推进 `personal-latest` 中的两份应用清单；不上传官方更新源。安装包未签名，不需要官方签名凭证。实际分发状态以 GitHub run 与 Release 为准，不能把本地测试通过当成已发布。

## 后续自动同步与发布

默认分支上的 **Sync personal Cindy from upstream** 每日北京时间 04:23（GitHub 可能延迟）及手动触发时，将官方 main 合入修复分支。使用带 DCO 的普通 merge，不强推；发生冲突或检查失败时不发布。没有新源码且该提交已有成功或进行中的构建时不重复打包；上一轮 dispatch 失败可在下次恢复。

上游经常修改 `.github/workflows/`；GitHub 默认 job token 无权推送这类文件。要完整启用无人值守同步，在 fork 的 **Settings → Secrets and variables → Actions** 添加 `PERSONAL_SYNC_TOKEN`，使用仅授权 `polarisaspire/cindy` 的 fine-grained PAT，授予 **Contents、Workflows: Read and write**。值由用户在 GitHub 直接填写，不写进代码、聊天、安装包或更新清单。PAT 仅供 checkout/push；构建 dispatch 和发布仍使用 job token。未配置时普通代码更新可同步，涉及 workflow 则在 push 前停止并提示，不静默丢弃上游文件。

定时与手动 dispatch 入口要求文件位于默认分支；main 的调度 PR 未合并时，此阶段尚未启用。可先从修复分支 push 验证构建和分发。工作流只允许修复分支构建，不能在 main 上误打缺少个人补丁的包。

Release 使用单调递增的 `1.0.<run_number>` 版本，`run_number` 最大 65535；它是自用分发序号，不代表官方版本号。旧 run 重跑不会覆盖更新指针；同一 run 已发布后保留原资产与摘要，允许恢复只上传了一部分或缺失的清单。分发清单含仓库、平台、源码 SHA、大小与 SHA256；任一构建身份或摘要不一致即停止。

## 使用前

新包使用 `--no-sign --version 1.0.<run_number>`，构建时将 `CINDY_FORK_UPDATE_REPOSITORY=polarisaspire/cindy` 编进 main bundle。首次需手动安装一次新包；此前下载的 `0.0.0` 历史包不具备此功能，不能靠设置让它接入新源。

安装后复用应用内检查、下载、摘要校验和确认安装流程，只接收自己 fork 的 GitHub Release 应用清单。自用源不可用时保留现有程序，不回落官方应用源。无论旧设置是否启用空闲更新，自用构建都等待用户确认，不在启动或空闲时自动重启；设置及 Agent 读取到的有效自动安装值为关闭。Windows 管理员授权、Linux 系统安装授权仍遵循现有更新器规则，不保证无人值守安装。

应用更新源与 Claude Code / Codex / Pi / ripgrep 的官方引擎清单、下载缓存和监听分开；普通未注入该构建配置的 Cindy 保持原更新行为。更新源固定于构建，不能用运行时环境变量重定向已经安装的包。现有官方待装补丁不会被自用包复用，避免共用数据目录时串源。

自用分发不等于用户数据隔离：安装包使用既有 Cindy 应用身份，正式替换前先保留现用安装包并备份用户数据；不要假定数据库可随安装包任意降级。需要隔离实测时，先遵循 [Desktop 开发入口](dev-rules/desktop-development.md) 运行开发版。回退以保留的旧安装包与数据备份为依据，不让自动更新器执行版本降级。

Windows 解压后可用 PowerShell `Get-FileHash -Algorithm SHA256 <安装包路径>`，Linux 可在解压目录运行 `sha256sum -c SHA256SUMS.txt`，与清单核对。

## 网络修复验收

先让公司 Windows 和 bp-holder 都使用同一修复提交；另一端仍是旧版时可能维持其原有瞬断策略。中转服务沿用原部署，直连信令格式没有变化。

保持当前网络规则，先比较远程调用完成情况、日志中的 `ack-timeout`、直连关闭/重建频率及另一台控制端是否受影响。再单独改变 Clash/防火墙规则，记录相同指标，避免同时改变多项条件。

本次修复还过滤收发 SDP 中的 `198.18.0.0/15` 候选（含 IPv4-mapped IPv6 和关联地址），保留正常 LAN、VPN、mDNS 与 IPv6 候选。支持 `getSelectedCandidatePair()` 的浏览器在通道接管业务、路径变化和收发时检查实际地址对，发现该网段即关闭直连并复用中转回退，避免仅过滤 SDP 后仍选中虚拟地址。

较旧的 WebView 若缺少上述地址对 API，只执行 SDP 过滤和现有可靠层兜底。即使有该 API，浏览器仍可能把地址隐藏为空或 mDNS 名称，代码只能拒绝实际暴露出的虚拟地址，不能宣称所有隐藏地址已排除。建议 Windows 与 Linux 都更新。代码层排除规则不等同于已经证明现场故障的唯一根因；单测、浏览器 RTC smoke、自建中转互通与两台实机网络验收分别记录。
