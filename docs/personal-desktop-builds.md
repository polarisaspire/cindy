# 自用 Windows / Linux 安装包

入口：`.github/workflows/personal-desktop.yml`，Actions 中名为 **Personal desktop packages**。

## 首次构建

1. 将已审阅的修复提交推送到自己 fork 的 `fix/direct-link-stability` 分支，即自动触发构建，无需先合入默认分支或等待官方仓库合并。
2. 在自己的 fork 打开 Actions，若尚未启用 Actions，先启用并重新推送后续修复提交。
3. 合入自己 fork 的默认分支后，也可以选择 **Personal desktop packages → Run workflow**，选择要构建的分支并运行。GitHub 网页上的手动运行入口要求 workflow 已存在于默认分支。
4. 等待 Windows、Linux 两个 job 分别完成，在该次运行的 Artifacts 下载对应压缩包。

构建矩阵为 Windows x64 `Setup.exe` 和 Linux x64 `.deb`；目前固定 `global`。bp-holder 安装前先核对 `uname -m` 与系统发行版，arm64 不能安装 x64 包。

产物目录还包括 `build-info.json`、`SOURCE.txt`、`SHA256SUMS.txt`。`SOURCE.txt` 记录源码 SHA 和该次 Actions 链接。Artifact 保留 14 天。

本 workflow 仅对指定修复分支推送或手动触发，只有仓库读取权限，不创建 release，不上传官方更新源，也不部署到电脑或服务器。不需要签名密钥或官方发布凭证。首次实际打包结果以 GitHub job 为准。

## 使用前

包使用 `--no-sign` 且不指定正式版本，沿用仓库的版本无关构建（`0.0.0`），不参加官方热更新。之后需要更新自用补丁时，再手动构建和安装。

版本无关不等于用户数据隔离：安装包使用既有 Cindy 应用身份，正式替换前先保留现用安装包并备份用户数据；不要假定数据库可随安装包任意降级。需要隔离实测时，先遵循 [Desktop 开发入口](dev-rules/desktop-development.md) 运行开发版。

Windows 解压后可用 PowerShell `Get-FileHash -Algorithm SHA256 <安装包路径>`，Linux 可在解压目录运行 `sha256sum -c SHA256SUMS.txt`，与清单核对。

## 网络修复验收

先让公司 Windows 和 bp-holder 都使用同一修复提交；另一端仍是旧版时可能维持其原有瞬断策略。中转服务沿用原部署，直连信令格式没有变化。

保持当前网络规则，先比较远程调用完成情况、日志中的 `ack-timeout`、直连关闭/重建频率及另一台控制端是否受影响。再单独改变 Clash/防火墙规则，记录相同指标，避免同时改变多项条件。

本次修复还过滤收发 SDP 中的 `198.18.0.0/15` 候选（含 IPv4-mapped IPv6 和关联地址），保留正常 LAN、VPN、mDNS 与 IPv6 候选。支持 `getSelectedCandidatePair()` 的浏览器在通道接管业务、路径变化和收发时检查实际地址对，发现该网段即关闭直连并复用中转回退，避免仅过滤 SDP 后仍选中虚拟地址。

较旧的 WebView 若缺少上述地址对 API，只执行 SDP 过滤和现有可靠层兜底。即使有该 API，浏览器仍可能把地址隐藏为空或 mDNS 名称，代码只能拒绝实际暴露出的虚拟地址，不能宣称所有隐藏地址已排除。建议 Windows 与 Linux 都更新。代码层排除规则不等同于已经证明现场故障的唯一根因；单测、浏览器 RTC smoke、自建中转互通与两台实机网络验收分别记录。
