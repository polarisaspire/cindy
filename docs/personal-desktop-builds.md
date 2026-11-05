# 自用 Windows / Linux 安装包

入口：`.github/workflows/personal-desktop.yml`，Actions 中名为 **Personal desktop packages**。

## 分支与首次启用

1. 将已审阅的自用修改通过 PR 合入自己 fork 的 `main`，自动触发 `client-ci` 测试；普通个人改动不因此发布客户端。上游正式版及维护者自己的 PR 由下面的统一维护流程处理，普通 main push 不直接发布。
2. 在自己的 fork 打开 Actions，若尚未启用 Actions，先启用。
3. 将 `.github/workflows/personal-desktop.yml` 与 `.github/workflows/sync-personal-upstream.yml` 通过 PR 放入自己 fork 的默认分支，注册手动与受控请求入口。直连修复、自用更新源码、发布脚本和工作流统一放在自己的 `main`；日常构建和发布不再依赖历史修复分支。手动运行时选择 `main`。
4. 维护者已授权每日同步上游正式 Release，检查并合入自己提交到本 fork main 的非 draft PR，完成后发布 Windows / Linux 自用构建。需要额外手动发布个人改动时，手动运行 **Personal desktop packages**，选择 `main` 并取消勾选默认开启的 `validate_only`。等两平台打包及 Debian 12 安装验证成功后，才会发布。只想验证安装包时保留勾选，完成后在该次运行的 Artifacts 下载候选包。

构建矩阵为 Windows x64 `Setup.exe` 和 Linux x64 `.deb`；目前固定 `global`。bp-holder 安装前先核对 `uname -m` 与系统发行版，arm64 不能安装 x64 包。

Linux 的依赖安装、原生模块重编译和打包均在 `node:22-bookworm`（Debian 12 / glibc 2.36）容器内执行，Ubuntu 仅承载容器。不能直接在 Ubuntu 24.04 编译后宣称支持 Debian 12：`better-sqlite3` 等模块会继承构建机的较新系统库要求。Windows 构建环境不变。

两平台打包完成后，独立 job 将最终 `.deb` 装进全新的 `node:22-bookworm-slim`，扫描安装目录内全部 ELF 的 glibc 需求（上限 2.36），并复用 packaged smoke 在隔离的临时数据目录启动真实应用、运行 SQLite migration 和读取数据库表。验证环境不安装编译工具，也不复用构建目录或旧版原生模块；任一安装、库检查或启动失败都会阻止发布。此门禁验证 Debian 12 x64，不代表已经覆盖所有 Linux 发行版。

产物目录为 `apps/desktop/release/artifacts/global/<version>/<platform>-x64/`，包括 `build-info.json`、`SOURCE.txt`、`SHA256SUMS.txt`。`SOURCE.txt` 记录源码 SHA 和该次 Actions 链接。Artifact 保留 14 天。

构建 job 只有读取权限。正式发布先核验同一源码 SHA 的完整 `client-ci` 成功，再等两平台的测试、类型检查、packaged smoke 和 Debian 12 安装检查全部成功；独立发布 job 才获得本 fork 的 `contents: write`，创建 `v<version>` Release。先上传并验证全部资产、完成旧版兼容入口，再发布为非 prerelease 并设为 Latest；不上传官方更新源。安装包未签名，不需要官方签名凭证。实际分发状态以 GitHub run 与 Release 为准，不能把本地测试通过当成已发布。

新版通过 GitHub `releases/latest/download/manifest-<platformKey>.json` 检查更新，下载指向对应的 `v1.0.x` 标签。Release 正文和应用内 `release-notes.json` 使用同一份中文说明；`release-notes-index.json` 包含已发布的版本日志索引。应用内日志只读自己 fork 的版本资产，不再向官方 CDN 请求自用版本号。

自用功能改动同步维护 `docs/personal-release-notes.json` 中的中文条目（稳定 `id`、`title`、`text`），发布时对比上一版源码，只纳入新增或修改的条目。发布 checkout 必须使用完整历史；官方正式 Release 的提交必须是本版祖先、且不是上一版祖先，才会汇入其「更新说明」中文正文并保留来源链接；已包含的旧日志、未合入版本和 prerelease 不混入。首次无历史发布只引用最新已合入的上游基线，避免倾倒全部旧日志。无法读取完整历史、上游目录或选中版本的中文说明时停止发布，不把英文 PR 标题当成中文日志，也不猜测未发布的上游改动。尚无中文功能说明的源码维护构建明确标为「维护更新」，保留源码对比入口。

已发布的 1.0.6 固定读取 `personal-latest`，且只接受 `personal-<数字>` 下载路径，因此不能删除或改名这两个标签。发布脚本将新安装包按新文件名追加到旧数值标签的 Release（不覆盖旧安装包），再更新 `personal-latest` 的兼容清单；入口显示为 **1.0.6 旧版更新兼容入口**，保留 prerelease，新的 `v1.0.x` 才是 Latest。旧客户端通过兼容清单升级，新客户端不再依赖它。新 fork 没有旧入口时不会额外创建兼容 Release。兼容上传失败时保留旧指针、正式版本停在 draft；重跑复用已发布版本的原始清单和原始归档，摘要不匹配即停止。

## 后续自动同步与发布

每日维护由一个控制器统一执行。仓库不再保留独立 cron，也不在普通 main push 时发布，避免上游刚合入、个人 PR 尚未审完就提前出包。`client-ci` 仍按既有 main push / PR 入口运行。

### 第一阶段：同步正式版，只验证不发布

控制器查询官方 `makecindy/cindy` 的非 draft、非 prerelease 正式 `v主.次.补丁` Release。需要同步时，将当前 main 的完整 SHA 记为 `<base>`，在本 fork 创建一次性分支 `automation/upstream-sync/<上游tag>/<base>`，目标必须为 `<base>`。已存在同名请求时读取原 Actions run，不重复创建或强推。GitHub 的 `create` 事件捕获这个显式分支创建请求并触发 **Sync personal Cindy from upstream**，也可在 main 手动 dispatch 此暂存工作流。

工作流通过实际 tag 提交（支持 annotated tag）解析来源并核对 fetch 后的 SHA，不使用 target_commitish 或官方 main 开发快照。请求源码必须仍在 main 历史中，正常重跑可保留此前已经合入的结果。新正式版本按顺序以带 DCO 的普通 merge 合入 main，不 reset、不强推、不丢弃 fork 修改；冲突 abort，不推送失败结果。既有未完成 Release draft 会阻止 main 继续前进，先由控制器处理恢复或报告决定点。

暂存只等待最终源码的完整 `client-ci`，**任何路径都不会请求安装包或发布 Release**。无新正式版时直接结束。旧版已发布源码作为祖先基线，避免重复处理已包含版本；CI 同时使用只读 `inspect` 入口核验真实 Release/tag 关系。实现与测试见 `scripts/sync-personal-upstream.mjs`、`scripts/__tests__/sync-personal-upstream.test.mjs`。

上游修改 `.github/workflows/` 时沿用 `PERSONAL_SYNC_TOKEN`，仅授权本 fork 的 **Contents、Workflows: Read and write**。用户在 GitHub 填写凭证，不写进源码或产物。PAT 仅供 checkout/push，CI 与发布仍用 job token；未配置且出现 workflow 改动则在 push 前停止。

### 第二阶段：检查维护者自己的 fork PR

控制器只处理作者为本 fork 维护者、目标为 `polarisaspire/cindy:main` 的 PR，不操作提交到官方仓库的 PR。逐个阅读最终 diff、讨论和审核结果，核对相关规则与 CI；draft、冲突、未解决的反对意见、必须等待的审批或不安全改动不自动合入。检查通过后使用预期 head SHA 合并，若 head/base 改变则重新检查。代码检查不等于替维护者提交 GitHub APPROVE 审核；需要明确审批时报告给维护者。

上游与所有本轮可合入 PR 处理结束后，读取最终 main SHA 并等待该 SHA 的完整 `client-ci` 成功。仍有阻塞项时说明原因与处理结果；未经本轮检查的后续源码不能混入发版。安装包构建只验证待发布源码，不替代代码审查或 PR 合并判断。

### 第三阶段：明确请求最终源码发布

仅在第二阶段结束后，控制器在本 fork 创建 `automation/personal-release/<完整final-SHA>` 分支，目标必须正是当前 main 的 `<final-SHA>`。这是一次性、绑定源码的“本轮检查完成”信号，不是普通 main push。无实际待发布客户端变更、仅部署本维护配置时不创建请求，也不为已包含的上游版本重复发版。

该分支的 `create` 事件触发 **Personal desktop packages**，不是后续 push。只接受 branch 类型及对应请求前缀，其他分支或 tag 的创建不会运行构建，也不共享受控发布的并发组。plan job 验证分支名中的 SHA、事件源码、当前 main、完整 `client-ci` 以及最新官方正式版的祖先关系；同一源码已发布则直接跳过。个人 PR 即使基于已经发布过的上游版本，也可按新的最终源码发版。plan、构建和发布均显式 checkout 固定事件 SHA；Artifact、build-info、SOURCE、清单及标签统一使用它。发布前再次核对 main 与 CI；main 变化或检查失败就停止，控制器必须重新检查最终源码，再提交新的请求。

工作流只构建 Windows x64 和 Linux x64，保留全部测试、packaged smoke、干净 Debian 12 安装、SHA256 与双平台一致性门禁。两平台全部通过后才更新 fork Release 与既有兼容清单，不自动安装或重启客户端。

### 并发、恢复与结果确认

安装包工作流仍全程串行，版本按已发布正式版单调递增 `1.0.<patch>`（上限 65535）；失败和验证不占号。请求分支以源码 SHA 命名，重复请求读取同一个 run。构建或上传中断时，先核对原 run/source 与 draft，再重跑原 run，保持版本号。已创建 draft 的同 run、同源码恢复使用 draft 记录的上游身份，即使期间出现更高正式版，也先完成此前已检查的批次，下一轮再同步新版本；上游 tag 身份改变或 main 已变仍停止。完整重跑可刷新过期候选 Artifact，绝不覆盖已发布 Release 资产。旧 run 不能回退新更新指针，恢复仍使用原始已发布清单和归档。若 main 已变化而 draft 固定旧源码，停止并报告，不绕过源码门禁或静默改占用版本。

上游暂存最长等待约 75 分钟，安装包各 job 保留原 timeout；超时不是完成。控制器必须读取最终 run、Release、实际 tag SHA、双平台资产和更新清单，再报告发布成功。GitHub Actions 日志/摘要是机器失败信号，不代表聊天通知已发送；通知由统一控制器在确认结果后发出。

main 上仍保留显式手动发布入口：取消默认开启的 `validate_only`，也必须通过同源码完整 CI。候选分支保留 `validate_only` 时只上传 Artifact，绝不改变安装中的版本或更新指针。一次性请求分支不可改指向或强推复用；保留它们便于追踪原运行，不自动清理用户分支。

## 使用前

新包使用 `--no-sign --version <version>`，构建时将 `CINDY_FORK_UPDATE_REPOSITORY=polarisaspire/cindy` 编进 main bundle。首次需手动安装一次新包；此前下载的 `0.0.0` 历史包不具备此功能，不能靠设置让它接入新源。

该显式自用分发不依赖官方私有 `config/log-upload.json`，日志上传目标强制留空；即使本地有官方配置也不会继承。普通有版本的官方包仍要求该配置，版本无关包仍沿用原有缺省行为。Fork 不以假日志目标绕过校验，也不携带官方日志接收配置。

安装后复用应用内检查、下载、摘要校验和确认安装流程，只接收自己 fork 的 GitHub Release 应用清单。自用源不可用时保留现有程序，不回落官方应用源。无论旧设置是否启用空闲更新，自用构建都等待用户确认，不在启动或空闲时自动重启；设置及 Agent 读取到的有效自动安装值为关闭。Windows 管理员授权、Linux 系统安装授权仍遵循现有更新器规则，不保证无人值守安装。

应用更新源与 Claude Code / Codex / Pi / ripgrep 的官方引擎清单、下载缓存和监听分开；普通未注入该构建配置的 Cindy 保持原更新行为。更新源固定于构建，不能用运行时环境变量重定向已经安装的包。现有官方待装补丁不会被自用包复用，避免共用数据目录时串源。

自用分发不等于用户数据隔离：安装包使用既有 Cindy 应用身份，正式替换前先保留现用安装包并备份用户数据；不要假定数据库可随安装包任意降级。需要隔离实测时，先遵循 [Desktop 开发入口](dev-rules/desktop-development.md) 运行开发版。回退以保留的旧安装包与数据备份为依据，不让自动更新器执行版本降级。

Windows 解压后可用 PowerShell `Get-FileHash -Algorithm SHA256 <安装包路径>`，Linux 可在解压目录运行 `sha256sum -c SHA256SUMS.txt`，与清单核对。

## 网络修复验收

先让公司 Windows 和 bp-holder 都使用同一修复提交；另一端仍是旧版时可能维持其原有瞬断策略。中转服务沿用原部署，直连信令格式没有变化。

保持当前网络规则，先比较远程调用完成情况、日志中的 `ack-timeout`、直连关闭/重建频率及另一台控制端是否受影响。再单独改变 Clash/防火墙规则，记录相同指标，避免同时改变多项条件。

本次修复还过滤收发 SDP 中的 `198.18.0.0/15` 候选（含 IPv4-mapped IPv6 和关联地址），保留正常 LAN、VPN、mDNS 与 IPv6 候选。支持 `getSelectedCandidatePair()` 的浏览器在通道接管业务、路径变化和收发时检查实际地址对，发现该网段即关闭直连并复用中转回退，避免仅过滤 SDP 后仍选中虚拟地址。

较旧的 WebView 若缺少上述地址对 API，只执行 SDP 过滤和现有可靠层兜底。即使有该 API，浏览器仍可能把地址隐藏为空或 mDNS 名称，代码只能拒绝实际暴露出的虚拟地址，不能宣称所有隐藏地址已排除。建议 Windows 与 Linux 都更新。代码层排除规则不等同于已经证明现场故障的唯一根因；单测、浏览器 RTC smoke、自建中转互通与两台实机网络验收分别记录。

