<!-- 由 pnpm ui:check 生成；pnpm ui:check:publish 把截图发到作者 fork 并换上图片链接 -->
- 截图来源：单页验证 `pnpm ui:check --changed=origin/main --theme all`，Windows · Electron 42.11.12（Chromium 148.0.7778.280，与 Cindy 同一渲染内核）；真实组件与主题，场景数据，不是登录账号下的完整 Cindy
- 版本：`877a41ca4336`
- 结果：1434/1486 个场景通过，82 条警告
- 页面 `agent-relocation`：light / dark · zh-CN · 680×340 / 320×340
  - `default`：Native history resumed on the target computer
  - `fallback`：Explicit summary fallback
  - `narrow`：Summary badge at 320px
  - 未覆盖：Actual device transport, Harness startup and native mobile rendering. Uses fixture history.
  - 场景替换的模块（未验证）：`src/renderer/features/learn/LearnStatusCard`、`src/renderer/features/bots/BotCollaborationCard`
- 页面 `ask-user-question`：light / dark · zh-CN · 800×600 / 320×600 / 800×700 / 320×800
  - `default`：Question with a bare HTML filename and URL
  - `narrow`：Long references at 320 px
  - `dictation-starting`：Answer microphone starting
  - `dictation-listening`：Answer recording with stop action
  - `dictation-processing`：Answer transcription pending at 320 px
  - `dictation-speaker-filtered`：Answer recording explains that the voiceprint filter ignored someone else, at 320 px
  - `unresolved`：Missing and ambiguous references remain plain text
  - `voice-single`：Voice choice instructions with an active listening toolbar
  - `voice-multi`：Spoken multi-selection awaits confirmation in the existing card
  - `voice-narrow`：Voice confirmation and toolbar at 320 px
  - `voice-speaker-filtered`：Call bar explains that the voiceprint filter ignored someone else
  - 未覆盖：Actual microphone/ASR/TTS, task execution, host file contents, browser navigation and remote connectivity
  - 场景替换的模块（未验证）：`src/renderer/voice-input/captureSession`、`src/renderer/voice-input/workletUrl`
- 页面 `attachment-access-error`：light / dark · zh-CN · 560×400 / 320×480
  - `default`：#6530: source permission denial explains how to reattach a readable copy
  - `live`：#6530: live send failure exposes recovery without expanding details
  - `live-narrow`：Live recovery at narrow width
  - `tail`：#6530: tail banner exposes recovery without expanding details
  - `tail-narrow`：Tail recovery at narrow width
  - `narrow`：Recovery text wraps at a narrow message width
  - 未覆盖：macOS WeChat permissions, file I/O and cross-device sending; transport behavior is covered by targeted unit tests
- 页面 `attachment-preview-frame`：light / dark · zh-CN · 1280×800
  - `default`：A zip that cannot be previewed opens in a compact centered panel over the dimmed conversation
  - `markdown`：A Markdown document in the same floating panel
  - `image`：An image in the same floating panel
  - 未覆盖：Native traffic lights and Electron drag regions (geometry only), real file reads, Windows window controls, video/model/Mermaid viewers and Mobile; file stat, document text and image bytes are fixture data
  - 场景替换的模块（未验证）：`src/renderer/features/cc-agent/workdir-browse/DrawioPreview`、`src/renderer/features/cc-agent/workdir-browse/PdfPreview`
- 页面 `automation-settings`：light / dark · zh-CN · 720×1000
  - `default`：All settings loaded
  - `loading`：Browser detection and computer configuration remain pending; other controls stay usable
  - `error`：Backend configuration fails twice, showing localized recovery inside the browser card
  - `my-browser`：My browser selected while login copying is on; the login copy switch stays hidden
  - 未覆盖：Real IPC, browser discovery and device permissions; timeout and stale response behavior is covered by ComputerUseSection.browserHealth.test.tsx
- 页面 `bot-avatar-crop`：light / dark · zh-CN · 720×640
  - `default`：Upload, drag/zoom, confirm, cancel, repeat selection and invalid image
  - 未覆盖：Native chooser and HDR conversion are host substitutes; full app persistence, remote transport and Mobile are not covered
- 页面 `bot-capabilities`：light / dark · zh-CN · 640×1400
  - `default`：All groups with the owner’s real skills and tools; unfold the local skills
  - `system-off`：Todos turned off: the switch and the group count follow
  - `core`：Core skill page with the plain-language summary and the original text
  - `system`：A system skill page explains what turning it off stops
  - `learned`：A learned skill page with its switch, content, edit and delete
  - `empty`：No learned skills yet
  - 未覆盖：Teammate runtime, prompt and tool gating, persistence, remote computers and the phone page; covered by vitest and the isolated Desktop.
- 页面 `bot-follow-up`：light / dark · zh-CN · 580×400
  - `before-chat`：Opening alone never invites; an accepted message reveals the invitation
  - `remote`：Remote chat uses the same invitation with the host-owned scope and choice
  - `default`：One-line invitation after an accepted user message; Start opens the settings confirmation with scope and model allowance before saving
  - `settings-off`：Off by default; explain scope before enabling
  - `settings-on`：An explicit choice is preserved; disabling is immediate
  - 未覆盖：Real message delivery, scheduler execution, account persistence and Mobile. The send action represents an accepted user message.
  - 场景替换的模块（未验证）：`src/renderer/features/bots/botStore`
- 页面 `bot-model-settings`：light / dark · zh-CN · 440×880
  - `default`：Unavailable primary, backup and task model; status belongs to the model
  - `available`：Long available name with reasoning effort; no unavailable status on this model
  - `four-backups`：Four visible backups with unbroken IDs and working reorder/remove controls
  - `inherited`：Task inherits primary, using the same complete-name presentation
  - `global-settings`：Global settings row uses the same wrapped picker
  - `shared-only`：Shared-only Gemini/Terra labels resolve in primary, backup and task triggers
  - `shared-same-id`：Shared labels and effort never fall back to a same-ID local model
  - 未覆盖：Live catalog discovery, remote devices, persistence and model execution; fixture supplies providers and local component state
  - 场景替换的模块（未验证）：`src/renderer/hooks/useModelRouteDevices`
- 页面 `bot-projects`：light / dark · zh-CN · 460×540
  - `default`：Add a second project and remove it without changing the first
  - `empty`：Start with no links; selection and add are separate actions
  - `legacy`：Preserve foreign computer and missing project associations
  - `error`：Recover from an unavailable list without treating it as empty
  - `saving`：Explain the disabled remove action while a save is pending
  - 未覆盖：Account persistence, actual file reads and remote-device transport; local persistence also tested in the full isolated Desktop.
- 页面 `bot-routines`：light / dark · zh-CN · 440×900
  - `default`：Paused, enabled, queued, running; exact hourly and selected-hour schedules; independent follow-up scope
  - `save-error`：Failed pause keeps the enabled switch; retry saves without running
  - `history`：Failure result is readable before expanding run details
  - `session-mode`：Run session choice: persistent context or a new isolated session per trigger
  - 未覆盖：Host persistence, real scheduler execution, plugin events, routine model picker and native Mobile (no routine management entry)
  - 场景替换的模块（未验证）：`src/renderer/features/bots/botStore`、`src/renderer/features/bots/BotTaskModelEditor`
- 页面 `branch-sync`：light / dark · zh-CN · 560×400 / 360×400
  - `default`：Main-task capsule, selected-branch details, remote group and successful fetch
  - `worker`：Compact Worker branch-only capsule
  - `unchecked`：Unchecked main-task worktree excludes remote sources
  - `conflict`：Disabled sync remains focusable and explains overlapping changes
  - `diverged`：Diverged branches keep local source and explain why sync is unavailable
  - `old-host`：Old controlled host has neither refresh button nor remote group
  - 未覆盖：Git processes, device-link transport and native task creation; covered by unit and Git integration tests
- 页面 `chat-fork`：light / dark · zh-CN · 800×480 / 320×520 / 640×520
  - `default`：Task using a shared model: fork from a user message or an assistant reply
  - `ssh`：SSH workspaces still hide the unsupported fork action
  - `companion`：Completed companion replies retain read-aloud and stop in the persistent message footer
  - `companion-narrow`：Reply, read-aloud and more remain accessible below a long reply at 320 px
  - `companion-thread`：2026-10-29: native private reply in a 320px topic retains full width and accessible actions below
  - 未覆盖：Native remote execution, database writes and real speech playback; plugin cards are absent from these messages
  - 场景替换的模块（未验证）：`src/renderer/components/chat/GhostToolCard`
- 页面 `chat-video`：light / dark · zh-CN · 800×600
  - `default`：Inline player retains the original native playback and fullscreen controls
  - `error`：Media errors show an unavailable state and a working Retry action, without claiming the file was deleted
  - `menu-inline`：Local video context menu stays visible and clickable above native fullscreen
  - `menu-lightbox`：Lightbox uses the same fullscreen menu and keeps focus inside the player
  - 未覆盖：Electron fullscreen permission and OS transitions require the full Desktop sandbox; clipboard/folder APIs are fakes and local protocol bytes are supplied by the fixture.
- 页面 `cindy-ai-identity`：light / dark · zh-CN · 1000×760
  - `default`：Personal Cindy AI in provider list and details
  - `xd`：XD Cindy AI in provider list and details
  - `organization`：Long enterprise name with the original Auto model name
  - 未覆盖：Live sign-in, key management, quota reads and actual gateway routing; identity is fixture data
  - 场景替换的模块（未验证）：`src/renderer/hooks/useProviders`、`src/renderer/hooks/useCodexAuth`、`src/renderer/hooks/useApiKey`、`src/renderer/hooks/useModelAccessStatus`、`src/renderer/hooks/useModelAccessCreditUsage`、`src/renderer/hooks/useClaudeAccountUsage`、`src/renderer/hooks/useXdAssetPrimaryAction`、`src/renderer/contexts/AuthContext`
- 页面 `device-picker`：light / dark · zh-CN · 1040×520
  - `default`：This device is current and the row is selected; trigger stays compact
  - `long-name`：Offline remote device with a long name is current; row not selected
  - 未覆盖：Roster loading and unread state sources, device connections, row context menu; the chat header lists computers in 近况 (page teammate-glance)
- 页面 `codex-reset`：light / dark · zh-CN · 700×650
  - `default`：Manual cards with compact automatic rules
  - `embedded`：Collapsed provider card entry
  - `modal`：Rules and nested selects remain clickable above the usage reset dialog
  - 未覆盖：Fixture settings RPC; actual redemption, account authentication, persistence and native mobile runtime are not exercised here
- 页面 `compact-recovery`：light / dark · zh-CN · 560×320 / 320×440
  - `default`：Encrypted compact failure retains Retry and explains the cause
  - `legacy`：Older host error no longer claims the input is oversized
  - `history`：Persisted compact error displays the corrected explanation
  - `legacy-split`：Older host live error with discarded ciphertext details
  - `history-split`：Persisted legacy error with discarded ciphertext details
  - `overflow`：Concrete context overflow retains its own guidance
  - `narrow`：Recovery guidance at 320 px
  - 未覆盖：Live provider compaction and host rollover; recovery behavior is covered by targeted tests
- 页面 `companion-composer`：light / dark · zh-CN · 760×360 / 360×400
  - `late-attachment`：A cache result from the unmounted composer restores its image without replacing fresh text inside the 120ms save window
  - `recommendation`：Recommendation and call coexist; starting a call preserves the suggestion, accepting it restores Send
  - `recommendation-narrow`：Recommendation and call remain usable at narrow width
  - `voice-hold`：Empty composer hints, native mouse selection during hold, and button hold/click release semantics
  - `voice-speaker-filtered`：Recording explains above the composer that the voiceprint filter ignored someone else
  - `default`：Empty/text/attachment action switch, stable target, keyboard send, call return and stop/queue
  - `narrow`：Same companion interactions at narrow width
  - 未覆盖：Microphone/ASR, live companion tasks, real media IO and speech synthesis; host services, delayed image cache, model catalog and dictation hook use scenario data. Windows runtime is not exercised.
  - 场景替换的模块（未验证）：`src/renderer/components/new-chat/PermissionSelector`、`src/renderer/components/new-chat/ExtraDirsButton`、`src/renderer/components/new-chat/NewGoalDialog`、`src/renderer/components/new-chat/SlashCommandPalette`、`src/renderer/components/new-chat/AtMentionPanel`、`src/renderer/hooks/useAgentCapabilities`、`src/renderer/hooks/useAvailableAgents`、`src/renderer/hooks/useConnectedSource`、`src/renderer/hooks/useProviders`、`src/renderer/hooks/useDeviceProviders`、`src/renderer/voice-input/useVoiceInput`
- 页面 `companion-message-actions`：light / dark · zh-CN · 1000×650
  - `default`：No topic: quote/copy always visible, create topic in More
  - `read`：Original topic entry with count/time
  - `unread`：Original topic entry with unread indicator
  - 未覆盖：Live model/server persistence and OS clipboard. The isolated host denies clipboard; a recorder verifies requested text and feedback. Topic panel uses real failed state with sample data; native mobile tested separately.
  - 场景替换的模块（未验证）：`src/renderer/lib/makerChatStore`、`src/renderer/features/cc-agent/CCAgentSessionView`、`src/renderer/components/chat/GhostToolCard`、`src/renderer/hooks/useAgentCapabilities`、`src/renderer/hooks/useAvailableAgents`、`src/renderer/components/new-chat/PermissionSelector`、`src/renderer/components/new-chat/NewGoalDialog`、`src/renderer/components/new-chat/SlashCommandPalette`、`src/renderer/components/new-chat/AtMentionPanel`、`src/renderer/hooks/useDeviceProviders`、`src/renderer/hooks/useConnectedSource`、`src/renderer/hooks/useProviders`、`src/renderer/voice-input/useVoiceInput`
- 页面 `context-capacity`：light / dark · zh-CN · 560×650 / 320×650
  - `default`：One ring opens usage, manual compaction and window choices
  - `high`：Context nearly full
  - `codex`：Native Codex details above window choices
  - `narrow`：Read-only task at 320px
  - `narrow-editable`：Window controls and model settings at 320px
  - `unknown`：Missing route data keeps the ring and usage details
  - 未覆盖：Real model settings, remote writes and compaction. Uses fixture host data.
  - 场景替换的模块（未验证）：`src/renderer/lib/modelDefinitions`
- 页面 `controlled-model-catalog`：light / dark · zh-CN · 780×720
  - `default`：A controls B: choose A, B-only share, then B private source
  - `local`：Local catalog still includes private sources without remote reads
  - `worker`：Worker uses B-only share; creation returns the actual share ID
  - `favorites`：B-only share favorites read and write B without any membership on A
  - 未覆盖：Real device-link transport, main authorization, actual Agent execution and persistence
- 页面 `display-pricing`：light / dark · zh-CN · 800×800 / 800×1600
  - `speech`：Character input per million
  - `image`：Input and output per image
  - `video`：Video category with a resolution tier and discounted range
  - `components`：Charge categories distinguish image tokens from text tokens
  - `mixed-components`：Different categories in one role get per-quote prefixes
  - `unknown-component`：Unknown categories fall back to the original direction
  - `labels`：All published item labels are translated; custom labels are verbatim
  - `compact`：Short quotes stay on separate right-aligned rows
  - `default`：Multiple units, all four roles and supplementary conditions
  - `legacy`：Existing table without summary
  - 未覆盖：Live Gateway responses, account permissions and actual billing; prices are fixture inputs
- 页面 `explicit-file-links`：light / dark · zh-CN · 560×420
  - `default`：Missing authored link remains clickable, explains failure, offers a copy menu and requests a fresh lookup after restoration
  - `remote`：Missing remote link remains clickable without local filesystem access
  - `untrusted`：Content without privileged file access stays inert
  - 未覆盖：Real filesystem, remote transport and OS opening; mobile native rendering.
- 页面 `feishu-connection`：light / dark · zh-CN · 660×620 / 320×760
  - `default`：Timeout explains recovery and exposes reconnect
  - `network`：Network failure has a specific explanation
  - `credentials`：Invalid credentials do not receive network advice
  - `unknown`：Unknown cause stays neutral
  - `conflict`：Device conflict preserves the binding
  - `reconnecting`：Automatic recovery shows progress
  - `connected`：Healthy connection retains a quiet reconnect action
  - `narrow`：Recovery actions wrap at 320px
  - 未覆盖：Live Feishu network, credential writes and model/notification settings; transport recovery has targeted unit tests
  - 场景替换的模块（未验证）：`src/renderer/components/settings/ImDefaultSettingsSection`、`src/renderer/components/settings/FeishuBotNotificationSection`
- 页面 `folder-transfer`：light / dark · zh-CN · 520×320 / 320×360
  - `default`：Packing folder and preparation failure with cancellation
  - `narrow`：Long folder name at narrow width
  - 未覆盖：Actual device transfer and chat sending; covered by chatFolderTransfer and ChatInput unit tests. Windows runtime is not exercised.
- 页面 `forwarded-request`：light / dark · zh-CN · 760×860
  - `default`：Historical private-thread body: paragraphs, lists, code and attribution
  - `task`：Attributed task input uses the same readable projection
  - `fork`：Fork restores the original forwarded envelope in the new draft
  - `rewind`：Rewind restores the original forwarded envelope in the current draft
  - `quote`：Reply snapshots and live quote previews use readable text
  - `search`：Real search results render projected previews and hit snippets
  - `card`：Open a historical private thread from its compact trace
  - 未覆盖：IPC transport, persistence, history reload and native mobile; historical API bodies are supplied by the fixture
  - 场景替换的模块（未验证）：`src/renderer/features/bots/botStore`、`src/renderer/lib/makerChatStore`
- 页面 `group-composer-menu`：light / dark · zh-CN · 680×420
  - `default`：Group + menu with its short description
  - `steps`：Group + menu with a wrapping step-by-step description
  - `custom-font`：An explicitly selected UI font retains precedence over the repaired fallback
  - 未覆盖：Sending, attachment IO/preview, plans, account state and server operations
  - 场景替换的模块（未验证）：`src/renderer/components/new-chat/ComposerAttachments`
- 页面 `group-chat`：light / dark · zh-CN · 1280×800 / 720×700 / 800×600 / 1000×760 / 900×700 / 900×760 / 700×1200 / 1100×760 / 800×800
  - `share-pending`：Pending topic copy appears in the main chat while the host receipt is unresolved
  - `send-status`：Mac send flicker regression: real composer/outbox/timeline, controlled slow receipt; row geometry stays stable and failed sends remain retryable
  - `remote-limits`：#6835: lane-unavailable notices show device and total task limits with recovery advice
  - `work-queued-step-mixed`：#8064 review: queued plan step does not override a running reply
  - `work-queued`：#8047: queued execution is busy without speaking or elapsed work
  - `process-history`：Owned teammate historical process, final reply outside
  - `process-other-owner`：Other members never receive a private process entry
  - `work-thinking`：Actual group work status, scenario data: thinking
  - `work-tools`：Actual group work status, scenario data: command execution
  - `work-reading`：Actual group work status, scenario data: file reading
  - `work-waiting`：Actual group work status, scenario data: needs confirmation
  - `work-waiting-no-start`：#7583: waiting without a card or start time keeps the original task entry and shows no invented elapsed time
  - `work-stopping`：Actual group work status, scenario data: stop requested
  - `work-unknown`：Remote work with no readable task: generic activity, no invented thinking
  - `work-remote`：Authenticated remote target projection, scenario data (not a live device-link run)
  - `work-parallel`：Two concurrent execution rows, separate task entries and one group stop
  - `work-parallel-stopping`：Last execution is stopping while the first still runs: the group stop control remains available
  - `body-answer`：#6550: component body is readable; literal punctuation and surrounding Markdown are retained
  - `default`：Empty group, short controller name, expanded sidebar
  - `long-thread`：40 messages: bottom pin and history position survive notice changes
  - `long-device`：Long controller device name in the notice
  - `multiline`：Eight-line draft pushes the composer up
  - `crowded`：Nine members from three accounts: the header names the group and a member count, not every member
  - `no-sidebar`：Collapsed sidebar layout
  - `bubbles`：Teammate bubbles: quote, corner reaction, thread entry, task card, long text at the width cap; hover shows the toolbar beside the bubble
  - `arrangement`：Single-speaker server group, nobody named: the queue card stands on its own, Aster answered and Nova is speaking next by itself
  - `work-mentioned`：Preserved running work plan in mentioned mode: ordinary text has no implicit worker recipient
  - `arrangement-done`：The same queue once every turn is done: no 继续 row
  - `arrangement-long`：Seven teammates: the first five answered by themselves, the card folds to three turns around Quill, who waits for 继续
  - `division-waiting`：A 分工 you started stopped after step 1: the card footer switch is off and 下一步 · 继续 waits
  - `division-auto`：The same 分工 with 做完一步自动交给下一位 on: Nova started step 2 by itself, no 继续 row
  - `settings`：Single-speaker group settings: reply mode, organizer, project folder and 分工交接 (off) as before; no speaking mode
  - `division`：Single-speaker group: 「+」→ 安排分工 is offered again; tagged, the composer says steps may be written out
  - `thread-unread`：Server read state: unread thread entries (with @you), the in-chat 话题 hint above the composer and its list of this group's Threads
  - `thread-follow`：The Thread panel's 关注 switch, off by default; switched on it reads 已关注
  - `read-receipts`：Bot group 消息已读: my messages end in one check (sent) or two (read) inside the bubble; clicking it lists who has read (names only, never who has not), and a very large group shows only 已读 N/总人数
  - `read-receipts-mask`：Bot group 消息已读 on 面具模式 messages (a teammate replied in my name): still my messages, one or two checks and the read list; the mask avatar beside the bubble never meets the check
  - `read-receipts-fill`：Bot group 消息已读: messages of growing length, so one has a last line just full: the check moves onto a row of its own instead of covering text
  - `read-receipts-thread`：Bot group 消息已读 in the Thread panel: my replies end in a check inside the bubble, level with the last line
  - `bubbles-wrapped`：PR #6549: wrapped reactions keep both toolbars level with their bubbles; server messages with empty mention ids still open unique member cards
  - 未覆盖：Real IPC/network sending (send-status/share-pending control host receipts), round control, real device-link control and revocation, answering pending owner interactions, plans and attachment IO; the bubbles case shows a task snapshot, not a live task; the sidebar renders the real group row for work-state cases and is otherwise an empty frame
  - 场景替换的模块（未验证）：`src/renderer/voice-input/workletUrl`、`src/renderer/features/cc-agent/workdir-browse/FileBodyView`
- 页面 `group-invite`：light / dark · zh-CN · 720×560
  - `default`：New group success, creator avatar, invitation slot and copy action
  - `manual`：Group invitation with close, revoke and copy actions in the footer
  - `loading`：Automatic invitation generation pending
  - `failed`：Invitation generation failure with retry
  - `create`：Private-chat group creation with a focused name and no member picker
  - `name-error`：Required group name and its unclipped error ring
  - 未覆盖：Real accounts, group creation, invitation service, clipboard and route transitions; host replies use example data
- 页面 `group-jump-bottom`：light / dark · zh-CN · 1280×800
  - `short-growth`：A located short chat keeps its reading position and reveals unread navigation when content grows
  - `default`：History navigation temporarily replaces topic hints without changing scroll geometry
  - `with-control`：Navigation replaces both topic and connection bubbles; idle/return restores them unchanged
  - 未覆盖：PDF/Drawio previews, real network, sending and native input; actual group layout and wheel navigation use synthetic host data.
  - 场景替换的模块（未验证）：`src/renderer/voice-input/workletUrl`、`src/renderer/features/cc-agent/workdir-browse/FileBodyView`
- 页面 `group-mask`：light / dark · zh-CN · 1040×800
  - `default`：Personal stand-in: default
  - `paused`：Personal stand-in: paused
  - `scheduled`：Personal stand-in: scheduled
  - `manual`：Personal stand-in: manual
  - `off`：Personal stand-in: off
  - `offline`：Personal stand-in: offline
  - `unbound`：Personal stand-in: unbound
  - `error`：Personal stand-in: error
  - `loading`：Personal stand-in: loading
  - 未覆盖：Server identity, real agent replies, persistence, private digest delivery and cross-device presence. All events are isolated fixture data.
  - 场景替换的模块（未验证）：`src/renderer/voice-input/workletUrl`
- 页面 `group-notifications`：light / dark · zh-CN · 560×900
  - `default`：Ordinary member can choose and save a personal notification preference
  - `mentions`：Mentions-only explanation includes existing work split reminders
  - `none`：Off keeps unread messages
  - `failure`：Rejected write keeps confirmed value and displays a localized error
  - `saving`：Pending write disables repeated edits
  - 未覆盖：Network persistence, native system alerts and mobile rendering; account and stores use fixtures
  - 场景替换的模块（未验证）：`src/renderer/features/bots/botStore`、`src/renderer/features/bots/ChatServerControls`、`src/renderer/features/bots/botGroupStore`、`src/renderer/features/bots/BotRosterView`
- 页面 `group-settings`：light / dark · zh-CN · 1040×860
  - `default`：Owner: 群管理 with 解散, member menus, invite menu with both items
  - `admin`：Admin: 群管理 without 解散, cannot manage the owner
  - `member`：Member: no 群管理, read-only 群介绍, 邀请朋友 locked
  - `member-no-about`：Member of a group without 群介绍: the section is hidden
  - `alone`：Only the owner is left: notice, no 退出群聊
  - `archived`：Archived group seen by its owner
  - `dissolved`：Dissolved group: no invite, no personal sections
  - `many-teammates`：邀请伙伴 with 30 spare teammates: search and scrolling
  - 未覆盖：Server writes (every chatServer.manage call is forbidden), the invite link dialog, AI 代答 (see group-mask), real accounts and mobile rendering
  - 场景替换的模块（未验证）：`src/renderer/features/bots/BotRosterView`
- 页面 `hover-tooltip-window-blur`：light / dark · zh-CN · 900×360
  - `default`：悬停任务行，指针离开 / 窗口失活
  - 未覆盖：真实 gh 状态查询、真实操作系统级窗口切换
- 页面 `im-connection-recovery`：light / dark · zh-CN · 660×850 / 320×850
  - `default`：discord: failure retains binding and exposes retry
  - `discord-narrow`：discord: recovery at 320px
  - `telegram`：telegram: failure retains binding and exposes retry
  - `telegram-narrow`：telegram: recovery at 320px
  - `dingtalk`：dingtalk: failure retains binding and exposes retry
  - `dingtalk-narrow`：dingtalk: recovery at 320px
  - `wecom`：wecom: failure retains binding and exposes retry
  - `wecom-narrow`：wecom: recovery at 320px
  - 未覆盖：Live IM services, credentials and unrelated model/Telegram behavior settings
  - 场景替换的模块（未验证）：`src/renderer/components/settings/ImDefaultSettingsSection`、`src/renderer/components/settings/TelegramRemoteDevices`、`src/renderer/components/settings/TelegramBehaviorSettings`
- 页面 `im-default-model`：light / dark · zh-CN · 660×520 / 320×640
  - `default`：Automatic selection shows the actual model
  - `im-automatic`：Automatic selection shows the actual model
  - `im-fixed`：Explicit choice can return to automatic without resetting permissions
  - `im-unavailable`：No usable provider is explained without inventing a default
  - `im-narrow`：Automatic selection at 320px
  - 未覆盖：Live credentials and model discovery; host supplies a catalog and settings writes
- 页面 `issue6796-preview`：light / dark · zh-CN · 720×1100
  - `default`：Companion mixed and image-only long attachments
  - `boundaries`：Ratio above/equal 3, portrait, landscape and unchanged tool output
  - `shared`：Task and group attachment, including 180px container
  - `replacement`：Replace long image with ordinary portrait after loading
  - 未覆盖：Live sending/storage, remote media transport, native copy/reveal, mobile and Windows
- 页面 `kimi-quota`：light / dark · zh-CN · 560×740 / 320×740
  - `default`：New subscription: only the returned 5-hour quota
  - `legacy`：Legacy subscription: 5-hour and weekly quota
  - `monthly`：Monthly total and coding limits keep their period labels
  - `narrow-monthly`：Monthly limits with the same reset remain distinguishable at 320px
  - `unavailable`：Rejected credentials never display 0% or an API-key-only remedy
  - `stale`：Retained quota is labelled stale; the task chip hides old numbers
  - `empty`：No returned quota windows does not imply unlimited or empty
  - `narrow`：320px settings card and task chip
  - 未覆盖：Live Kimi credentials/API, actual remote transport, native macOS menu bar and full settings/model picker navigation. Synthetic account only.
  - 场景替换的模块（未验证）：`src/renderer/hooks/useDeviceProviders`、`src/renderer/hooks/useProviders`、`src/renderer/hooks/useApiKey`、`src/renderer/hooks/useClaudeOAuthConnected`、`src/renderer/hooks/useClaudeSessionRoute`、`src/renderer/hooks/useSessionUsageMoney`、`src/renderer/hooks/useSessionTokens`、`src/renderer/components/chat/ChatDisplaySnapshotContext`、`src/renderer/hooks/useAccountUsage`、`src/renderer/hooks/useClaudeAccountUsage`、`src/renderer/hooks/useModelAccessCreditUsage`、`src/renderer/hooks/useClaudeSubscriptionUsage`、`src/renderer/hooks/useRemoteClaudeSubscriptionUsage`、`src/renderer/hooks/useRemoteClaudeSessionRoute`、`src/renderer/hooks/useRemoteDeviceUsage`、`src/renderer/hooks/useCodexRuntimeRoute`、`src/renderer/hooks/useCodexRateLimits`、`src/renderer/hooks/useXaiRateLimit`、`src/renderer/hooks/useXaiSubscriptionUsage`、`src/renderer/lib/makerChatStore`
- 页面 `local-agent`：light / dark · zh-CN · 900×650 / 390×844
  - `dev-ready`：Copy the current development endpoint
  - `copy-failed`：Clipboard failure remains visible without claiming a copy
  - `copy-expired`：Click refresh prevents copying a retired endpoint
  - `dev-starting`：Starting API cannot supply a code
  - `dev-owner`：Owner unavailable cannot supply a code
  - `dev-in-use`：Shared profile lease is owned by another process
  - `dev-failed`：API startup failure cannot supply a code
  - `dev-stopped`：Stopped API cannot supply a code
  - `default`：Revoke one application and retain the other row
  - `visible-enabled`：Toggle one application without changing another
  - `save-failed`：A failed preference write retains the previous setting
  - `long`：Long unverified application names and IDs at phone width
  - `empty`：No application is connected
  - `read-failed`：Connection read error remains visible
  - `cancelled`：Cancelling native confirmation retains both applications
  - `revoke-failed`：Failed revocation retains both applications and offers retry
  - 未覆盖：Native consent, IPC authentication and actual grant revocation; these require isolated Desktop and protocol integration checks.
- 页面 `local-agent-confirmation`：light / dark · zh-CN · 900×650 / 320×640
  - `default`：Approve through the shared themed confirmation
  - `cancel`：Cancel returns a negative decision
  - `escape`：Escape dismisses without granting
  - `revoke`：Confirm revocation with the existing localized copy
  - `abort`：Main dismissal cannot yield a late approval
  - `queued`：Cancelling the first request preserves the second
  - `narrow`：Long unverified identity wraps at 320px
  - 未覆盖：Main IPC sender validation and actual API grants are verified separately in service and isolated Desktop checks.
- 页面 `local-plugin-sharing`：light / dark · zh-CN · 1100×850 / 900×850 / 360×740 / 320×740
  - `interactive`：Manual sharing demo with original detail pages, two versions, login states and device choices
  - `default`：The existing share button requires confirmation before uploading a local package
  - `reused`：An unchanged uploaded package opens share material without another confirmation
  - `narrow`：Local upload confirmation uses the existing dialog at narrow width
  - `changed`：Changed content requires reopening to check and confirm the new package
  - `recipient`：Exact shared version, explicit installation and real permission confirmation
  - `recipient-narrow`：Exact shared package at narrow width
  - `recipient-replace`：Explicit same-ID replacement and existing account/data notice
  - `remote-select`：Choose another computer and confirm that computer’s permissions
  - `remote-narrow`：Remote package and permission confirmation at minimum width
  - `remote-replace`：Same replacement action and data notice on the selected computer
  - `remote-offline`：Keep the offline target selected and disable installation
  - `remote-unsupported`：Explain the required target update without local fallback
  - `login`：No package read until login
  - 未覆盖：Installed detail eligibility, real login, package transport, native clipboard and durable installation; host APIs are scene data
  - 场景替换的模块（未验证）：`src/renderer/contexts/AuthContext`
- 页面 `login-skin`：light / dark · zh-CN · 400×400 / 400×300 / 760×480
  - `default`：邮箱登录:已填输入框、主按钮、跳过登录、Apple / Google / SSO 圆钮与协议行
  - `code`：验证码:返回钮、聚焦空输入框、重发链接、禁用主按钮与错误文字
  - `method`：选择登录方式:返回钮与两条方式行
  - `sso-history`：SSO 最近组织候选层与加载中的主按钮
  - `loading`：大加载环
  - `consent`：协议弹窗:不同意(次级钮)与同意(主按钮)
  - 未覆盖：登录流程、LoginStage 画布缩放与品牌层(立绘 / 字标)、真实社交图标资产、浏览器回调页与 Mobile 登录皮;圆钮内图标为占位字形
- 页面 `magpie-model-sources`：light / dark · zh-CN · 780×520 / 320×520
  - `default`：Existing aggregate source rows show distinct suppliers; same model name on two routes
  - `provider`：Existing descriptions replaced; unknown model remains single-line
  - `narrow`：Same production rows at 320px
  - 未覆盖：Full Desktop, IPC persistence, actual Magpie calls and ModelSelector icon dispatch; gateway response is fixture data
  - 场景替换的模块（未验证）：`src/renderer/components/new-chat/ModelSelector`
- 页面 `mail-reading`：light / dark · zh-CN · 640×700 / 320×700 / 320×400
  - `default`：Authored light colors, readable dark palette and collapsed source indentation
  - `narrow`：Sender responsive layout in a narrow reader
  - `fixed-width`：A fixed-width message remains scrollable inside its own document
  - 未覆盖：Mailbox access, original remote image fetching and native mobile WebView
- 页面 `markdown-preview-find`：light / dark · zh-CN · 1040×760
  - `default`：Document-only matching, visible pointer targets, table navigation and Escape order
  - `background-editor`：An existing file-editor search yields shortcuts to the foreground preview
  - `nested-mermaid`：A diagram opened from the document owns shortcuts until it closes
  - `loading-editor`：The foreground document owns find and Escape before its file read completes
  - `focus-restore`：Closing find restores the document toolbar opener for keyboard navigation
  - `ime-escape`：An IME-cancelling Escape and its repeats keep search open until a new press
  - `outside-focus`：Escape closes find first even after Tab reaches the backdrop or covered page
  - `background-project-search`：The covered project-search sidebar retains its mode and query until the document closes
  - `background-ask-voice`：Preview Escape preserves question-card dictation and its answer draft
  - `background-voice`：Preview Escape leaves the real composer voice-cancel handler untouched until the document closes
  - `fullscreen-video`：Fullscreen video exit and menus preserve search until a fresh Escape
  - `toolbar-tooltip`：Focused and hovered toolbar tooltips own Escape before document find
  - 未覆盖：Installed release, native menus/IME, PDF/draw.io, file/search backends, microphone capture and ASR; file/search data, video bytes and voice state are controlled fixtures
  - 场景替换的模块（未验证）：`src/renderer/features/cc-agent/workdir-browse/DrawioPreview`、`src/renderer/features/cc-agent/workdir-browse/PdfPreview`、`src/renderer/voice-input/captureSession`、`src/renderer/voice-input/workletUrl`、`src/renderer/voice-input/useVoiceInput`
- 页面 `mcp-app-approval`：light / dark · zh-CN · 560×650 / 360×650
  - `default`：Page approval never changes the conversation or composer height
  - `narrow`：Two approvals at phone-column width
  - 未覆盖：Agent runtime and device-link. Store supplies two pending Host requests; production event routing has unit coverage.
  - 场景替换的模块（未验证）：`src/renderer/lib/makerChatStore`
- 页面 `mcp-app-card`：light / dark · zh-CN · 800×520
  - `default`：Failed App retains saved text and offers retry
  - 未覆盖：Pending page approvals have a separate mcp-app-approval fixture; this card fixture supplies no pending requests. Live cross-origin App, teardown handshake, fullscreen and full Cindy session switching; verified separately from this error-surface screenshot
  - 场景替换的模块（未验证）：`src/renderer/features/device-link/stickySessionOrigin`、`src/renderer/features/device-link/remoteProjectsStore`、`src/renderer/lib/makerChatStore`
- 页面 `mcp-inline-form`：light / dark · zh-CN · 600×1000 / 320×1100 / 600×600
  - `default`：The existing Settings form expanded in the message flow
  - `narrow`：Inline form at 320 px
  - `invalid`：Original validation and focus in the embedded form
  - `result-error`：Saved configuration remains saved when result delivery fails; retry and cancel remain available
  - `settings`：Original modal remains a modal
  - `layout`：Production message scrollport carries the entire form; composer stays fixed
  - 未覆盖：OS safeStorage, real account switching, MCP network connections and vendor model calls use separate checks; host APIs here return fixture results.
  - 场景替换的模块（未验证）：`src/renderer/components/chat/GhostToolCard`
- 页面 `message-focus`：light / dark · zh-CN · 900×600
  - `default`：Ordinary task message navigation
  - `compact`：Companion message navigation
  - 未覆盖：Host search transport, native mobile, agent execution
  - 场景替换的模块（未验证）：`src/renderer/components/chat/GhostToolCard`
- 页面 `model-advanced`：light / dark · zh-CN · 1000×800 / 320×800
  - `default`：GPT-6 Astra with Codex Ultrafast entitlement
  - `narrow`：Model compaction at phone width
  - `sol`：GPT-6.1 Sol with Codex Ultrafast entitlement
  - `legacy-sol`：GPT-6 Sol reasoning metadata
  - `unavailable`：Account has not enabled Ultrafast
  - `owner-repair`：Same-owner generation change recovers an in-flight image capability save
  - 未覆盖：Account entitlement and live model calls; host context result and speed availability are fixture inputs
- 页面 `model-categories`：light / dark · zh-CN · 760×900
  - `default`：Decision, OCR and image editing alongside image, video and speech models
  - 未覆盖：Live catalog delivery and Decisions API execution; all six models are fixture data
- 页面 `model-protocol-paths`：light / dark · zh-CN · 1000×800 / 320×800
  - `default`：DeepSeek official: three direct APIs, Pi recommended (community default)
  - `cindy-deepseek`：Cindy AI DeepSeek: the gateway offers three APIs, every engine is direct
  - `cindy-gemini`：Cindy AI Gemini: four APIs including Google, Pi recommended
  - `chatgpt`：ChatGPT subscription: Claude Code uses local compatibility mode
  - `narrow`：ChatGPT subscription at phone width: compatibility mode on its own line
  - 未覆盖：Saving an interface choice, live catalog delivery and real requests; interface lists and recommendations are fixture inputs
- 页面 `model-speed`：light / dark · zh-CN · 360×500
  - `default`：GPT-6 Astra: catalog reasoning levels and Ultrafast speed
  - `sol`：GPT-6.1 Sol: catalog reasoning levels and Ultrafast speed
  - 未覆盖：Account entitlement, live model requests, database persistence and native mobile controls
- 页面 `nightly-learning`：light / dark · zh-CN · 620×1100
  - `default`：Pending conversations, last night learned five changes (one already undone), two approaches being watched
  - `idle`：Nothing new since the last run; the next run will be skipped without calling a model
  - `paused`：Turned off: conversations are still counted
  - `failed`：Last run failed; weekly frequency; memory turned off
  - `new`：Never run yet
  - `not-here`：This computer is not the teammate’s main computer: no nightly row, history page explains why
  - 未覆盖：The host job itself (model call, memory and skill writes), routine scheduling, the settings drawer chrome, Mobile
- 页面 `orca-worker-project`：light / dark · zh-CN · 560×640
  - `attention-error`：Idle Worker with unhandled task error in tabs, both menus and collapsed trigger
  - `attention-awaiting`：Waiting confirmation shown as blue avatar dots including collapsed trigger
  - `attention-done`：Completion unread stays green for unselected Worker and does not aggregate on trigger
  - `default`：Inherited Lead worktree, new-worktree branch chooser, project search and dirty other project
  - `same-repo`：Browsing the main checkout preserves that selection; current-project row restores inherited worktree
  - `browse-error`：Native folder dialog failure leaves the current project usable
  - `missing`：Missing directory explains why creation cannot continue
  - `empty`：Empty repository explains why worktree creation is unavailable
  - `detached`：Detached HEAD is displayed as a short SHA and allows choosing a real branch
  - `workers`：Worker project badge appears only for the other project
  - `dialogue`：Dialogue Lead hides checkbox until a Git project is selected
  - 未覆盖：Full Worker creation popover, model/device selection, native folder dialog, filesystem discovery, IPC and actual worktree creation
- 页面 `organization-quota`：light / dark · zh-CN · 560×440
  - `default`：Daily limit enabled with a valid spend
  - `unavailable`：Daily limit enabled but daily spend unavailable
  - `disabled`：Daily limit disabled: monthly quota without a warning
  - `legacy`：Legacy gateway snapshot without the optional flag
  - 未覆盖：Server reads, menu bar, device-link transport, subscription providers and the unmounted home dashboard
  - 场景替换的模块（未验证）：`src/renderer/hooks/useDeviceProviders`、`src/renderer/hooks/useProviders`、`src/renderer/hooks/useApiKey`、`src/renderer/hooks/useClaudeOAuthConnected`、`src/renderer/hooks/useClaudeSessionRoute`、`src/renderer/hooks/useSessionUsageMoney`、`src/renderer/hooks/useSessionTokens`、`src/renderer/components/chat/ChatDisplaySnapshotContext`、`src/renderer/hooks/useAccountUsage`、`src/renderer/hooks/useModelAccessCreditUsage`、`src/renderer/hooks/useClaudeSubscriptionUsage`、`src/renderer/hooks/useRemoteClaudeSubscriptionUsage`、`src/renderer/hooks/useRemoteClaudeSessionRoute`、`src/renderer/hooks/useRemoteDeviceUsage`、`src/renderer/hooks/useCodexRuntimeRoute`、`src/renderer/hooks/useCodexRateLimits`、`src/renderer/hooks/useXaiRateLimit`、`src/renderer/hooks/useXaiSubscriptionUsage`、`src/renderer/lib/makerChatStore`、`src/renderer/contexts/AuthContext`
- 页面 `performance-trace`：light / dark · zh-CN · 360×500 / 720×600 / 320×640
  - `main-menu`：Main window offers performance tracing
  - `secondary-menu`：Secondary window hides the unsupported trace action
  - `default`：Start instructions and local-only scope
  - `recording`：Non-modal recording status and stop action
  - `ready`：Completed report, optional description and local files
  - `partial`：Incomplete capture is explicitly disclosed
  - `upload-failed`：Submission failure preserves the description and permits retry
  - `narrow`：Completed report at narrow width
  - `reopened`：Menu reentry offers recording first; previous report requires an explicit action
  - `reopened-submitted`：Submitted previous report keeps its ID without becoming the default view
  - 未覆盖：Native capture, IPC sender authorization, network submission and shared-task hooks; capture has a separate isolated Electron smoke test
  - 场景替换的模块（未验证）：`src/renderer/features/device-link/useSharedTaskTasks`、`src/renderer/features/device-link/SharedTaskEndedNotice`
- 页面 `plugin-development`：light / dark · zh-CN · 900×900 / 360×900
  - `default`：Development instance and browser selection
  - `narrow`：Development details at phone width
  - `authoring`：Choose the exact local or market instance before submission
  - `market`：Market details do not offer in-place file updates
  - `permissions`：Explicit auto-tool and native-host permission rows
  - 未覆盖：Native registration, actual accounts and PDF preview; host data is simulated.
  - 场景替换的模块（未验证）：`src/renderer/contexts/AuthContext`、`src/renderer/contexts/PluginReviewUpdatesContext`
- 页面 `plugin-install-mail`：light / dark · zh-CN · 360×720 / 360×600 / 700×600
  - `participant-avatars`：Real reader with Google contact, public email, domain logo and initials; image endpoints use fixture bytes
  - `read-mail-body`：External images require a click; links follow chat navigation
  - `two-mail-views`：Typing in either editor updates its peer without iframe navigation or blank paint
  - `edit-mail-body`：Native whole-body selection, replace, delete, undo, and saved HTML round trip
  - `refresh-mail-body`：Source updates with identical sanitized HTML must reveal the mail body
  - `expanded-recipients`：Sidebar recipient rows retain expand/collapse with compact spacing
  - `default`：Two configured plugin instances
  - `narrow`：Long organization and plugin names in a narrow sidebar
  - `source-change`：Source replacement and duplicate account impact
  - `no-reader`：A restored tab with no mail plugin; original URL remains accessible
  - `not-ready`：An unconfigured mail plugin without a pointless retry
  - `read-failed`：A real read failure offers both original URL and retry
  - 未覆盖：Mailbox tools, installer writes, account credentials, live mail content, native mobile rendering and external network connections
  - 场景替换的模块（未验证）：`src/renderer/features/right-sidebar/registry`、`src/renderer/features/right-sidebar/lib/mailPreview`、`src/renderer/features/right-sidebar/plugins/mail-preview/MailCardBody`
- 页面 `plugin-model-picker`：light / dark · zh-CN · 800×760 / 360×740
  - `default`：Plugin picker with a complete initial configuration
  - `plugin-config`：Plugin picker with a complete initial configuration
  - `plugin-narrow`：Plugin picker in a narrow viewport
  - 未覆盖：Plugin transport, real provider entitlement, account changes, mobile native controls and paid inference
- 页面 `project-picker-aliases`：light / dark · zh-CN · 620×440
  - `default`：New-task project picker displays the saved alias and selects the original directory
  - `move`：Move-task menu displays the same saved alias and selects the original directory
  - `move-explicit-project`：Explicit membership is disabled even when execution uses a checkout
  - 未覆盖：Real database persistence, full new-task submission and task relocation; fixture host supplies saved aliases and paths.
- 页面 `provider-detection`：light / dark · zh-CN · 900×900
  - `loopback-identity`：HTTPS loopback address is not an official brand even if a catalog entry uses it
  - `ambiguous-official`：Two official plans sharing an address do not choose a provider automatically
  - `cloudflare-gateway-scheme`：Normalized Cloudflare address enters its wizard and saves account-bound engine routes
  - `cloudflare-gateway-host`：Normalized Cloudflare address enters its wizard and saves account-bound engine routes
  - `cloudflare-gateway-port`：Normalized Cloudflare address enters its wizard and saves account-bound engine routes
  - `cloudflare-workers-scheme`：Normalized Cloudflare address enters its wizard and saves account-bound engine routes
  - `cloudflare-workers-host`：Normalized Cloudflare address enters its wizard and saves account-bound engine routes
  - `cloudflare-workers-port`：Normalized Cloudflare address enters its wizard and saves account-bound engine routes
  - `return-reenable`：Checked previously disabled model survives wizard back and custom save
  - `custom-port`：Azure and Vertex custom ports stay custom and are saved unchanged
  - `local-noauth`：Local empty key remains editable; key changes affect test auth and saving keeps no-auth
  - `reenable`：A checked model with an old disabled draft is enabled in the saved payload
  - `empty`：HTML design: one default connection, collapsed manual entry and bottom actions
  - `return`：Return from the identified wizard with inputs preserved and no automatic navigation
  - `default`：Official address matches DeepSeek and enters its existing connection step
  - `litellm`：LiteLLM maps to its existing provider connection
  - `manual-fetch`：Unidentified endpoint has no cached list; user explicitly fetches models
  - `relay`：Identified Sub2API deployment keeps its own URL and key
  - `custom`：Unknown deployment retains discovered models and opens the full picker
  - `failed`：Unknown deployment with failed discovery permits manual addition
  - 未覆盖：Network/IPC logic has separate injected production-unit tests. Live credentials, persistence integration and actual harness calls are not covered here. Windows platform is simulated when requested.
- 页面 `provider-file-import`：light / dark · zh-CN · 800×700
  - `default`：Read the guide and expandable format help, find example downloads, review 257 models, then cancel
  - `batch`：Review three providers, import two API-key entries, retry only the failed entry and leave OAuth for individual consent
  - 未覆盖：Native file picker, file I/O, credentials, persistence and account changes (covered by IPC tests); preview data is synthetic
- 页面 `provider-name-search`：light / dark · zh-CN · 1000×900
  - `default`：Supplier matches appear directly below the free-text name
  - `many`：Many supplier matches scroll independently while the custom endpoint hint stays fully visible
  - `scroll`：Real mouse-wheel input scrolls to a bottom supplier that can be selected
  - `custom`：Unmatched names remain valid custom endpoint names
  - `jump`：Selecting DeepSeek opens its existing configuration form
  - `keyboard-reopen`：Reopening with ArrowUp keeps the active result visible, including a retained bottom selection
  - `offline-jump`：Bundled DeepSeek still opens when both catalog reads fail; cancel retains the original draft
  - `ollama`：Managed Ollama describes installation and opens its existing install guide
  - `theme-surface`：Independent popover/dialog theme overrides retain the shared popover surface and elevation
  - 未覆盖：Real credentials, OAuth, model discovery and persistence. Host reads are fixtures. Native app coexistence is verified separately.
- 页面 `provider-share-insights`：light / dark · zh-CN · 1220×900 / 1220×2100
  - `owner`：Owner detail with two independent switches; writes affect fixture memory only
  - `default`：Both capabilities; usage collapsed, models visible at desktop height
  - `expanded`：Explicitly expanded usage with charts by person and model
  - `subscription`：Read-only subscription windows with existing remaining bars
  - `organization`：Organization remaining balance and known budget
  - `warning`：15% remaining uses the existing quota warning
  - `critical`：10% remaining uses the existing quota danger
  - `low`：5% remaining keeps the danger state and true fill
  - `full`：100% remaining fills the track without warning
  - `unknown`：Unknown total has no fabricated percentage
  - `zero`：True zero balance has a zero progress bar
  - `quota-only`：Only remaining allowance shared
  - `usage-only`：Only usage details shared
  - `closed`：Both permissions disabled without disabling model use
  - `group`：Two anonymous own accounts; borrowed accounts excluded
  - 未覆盖：Live cross-account transport, persisted permissions, real upstream quota, Windows. All numbers and names are fixture data.
  - 场景替换的模块（未验证）：`src/renderer/hooks/useDeviceProviders`、`src/renderer/hooks/useProviders`
- 页面 `provider-share-sources`：light / dark · zh-CN · 1000×720
  - `default`：Local and remote outgoing shares appear together, separately from ordinary providers
  - `shared-sources`：Local and remote outgoing shares appear together, separately from ordinary providers
  - `no-outgoing-shares`：The outgoing section disappears without established shares
  - `wizard-reopen`：Complete the real wizard, reopen during a deferred refresh, and keep the new dialog interactive after the old refresh settles
  - `builtin-save-guard`：Search a builtin API-key entry from a custom draft, save with deferred IPC, and block Escape until completion
  - 未覆盖：Live accounts, actual local runtime connection, device catalogs, sharing authorization and provider detail usage
  - 场景替换的模块（未验证）：`src/renderer/hooks/useProviders`、`src/renderer/hooks/useCodexAuth`、`src/renderer/hooks/useApiKey`、`src/renderer/hooks/useModelAccessStatus`、`src/renderer/contexts/AuthContext`、`src/renderer/components/settings/useProviderSubscriptionCard`、`src/renderer/components/settings/ProviderAccountUsageModule`、`src/renderer/features/provider-share/providerShareStore`、`src/renderer/hooks/useControllableDevices`、`src/renderer/hooks/useDevicesProviders`
- 页面 `provider-speech-setup`：light / dark · zh-CN · 1120×820
  - `default`：Existing API-key connection adds speech without replacing its chat model
  - `empty`：An empty API-key connection keeps manual speech addition in Management
  - `minimax`：Single add-provider flow: MiniMax API key, grouped chat/speech, recommended speech default
  - `elevenlabs`：ElevenLabs catalog discovery, TTS-only connection
  - `bailian`：Alibaba Cloud speech recommendations visible above 100 discovered chat models
  - `bailian-fallback`：An empty mixed preset with failed discovery keeps manual chat entry beside speech suggestions
  - `bailian-existing`：Existing Beijing workspace recommends CosyVoice and preserves its chat model
  - `token-plan`：Token Plan recommends Qwen-Audio instead of workspace CosyVoice
  - `token-plan-existing`：Existing Token Plan uses the same Qwen-Audio recommendation
  - `speech-visibility`：Previously hidden speech can be shown and hidden through model management
  - `subscription`：Existing OpenAI subscription has no speech-add button or menu item
  - 未覆盖：Live credentials, manual refresh orchestration (covered by ProvidersSection unit tests), provider network calls, OS safe storage, Settings owner changes, OAuth login and actual synthesis; host catalog/save responses are scenario data
- 页面 `provider-template-catalog`：light / dark · zh-CN · 1000×900
  - `default`：Catalog completeness smoke
  - `wizard-sub2api`：wizard: sub2api 
  - `address-sub2api-0`：address: sub2api https://relay.example/team/v1
  - `wizard-openrouter`：wizard: openrouter 
  - `address-openrouter-0`：address: openrouter https://openrouter.ai/api
  - `address-openrouter-1`：address: openrouter https://openrouter.ai/api/v1
  - `wizard-deepseek`：wizard: deepseek 
  - `address-deepseek-0`：address: deepseek https://api.deepseek.com/anthropic
  - `address-deepseek-1`：address: deepseek https://api.deepseek.com
  - `wizard-zhipu-glm-cn`：wizard: zhipu-glm-cn 
  - `address-zhipu-glm-cn-0`：address: zhipu-glm-cn https://open.bigmodel.cn/api/anthropic
  - `address-zhipu-glm-cn-1`：address: zhipu-glm-cn https://open.bigmodel.cn/api/paas/v4
  - `wizard-zhipu-glm-global`：wizard: zhipu-glm-global 
  - `address-zhipu-glm-global-0`：address: zhipu-glm-global https://api.z.ai/api/anthropic
  - `address-zhipu-glm-global-1`：address: zhipu-glm-global https://api.z.ai/api/paas/v4
  - `wizard-moonshot-kimi-cn`：wizard: moonshot-kimi-cn 
  - `address-moonshot-kimi-cn-0`：address: moonshot-kimi-cn https://api.moonshot.cn/anthropic
  - `address-moonshot-kimi-cn-1`：address: moonshot-kimi-cn https://api.moonshot.cn/v1
  - `wizard-moonshot-kimi-global`：wizard: moonshot-kimi-global 
  - `address-moonshot-kimi-global-0`：address: moonshot-kimi-global https://api.moonshot.ai/anthropic
  - `address-moonshot-kimi-global-1`：address: moonshot-kimi-global https://api.moonshot.ai/v1
  - `wizard-moonshot-kimi-code`：wizard: moonshot-kimi-code 
  - `address-moonshot-kimi-code-0`：address: moonshot-kimi-code https://api.kimi.com/coding
  - `address-moonshot-kimi-code-1`：address: moonshot-kimi-code https://api.kimi.com/coding/v1
  - `wizard-minimax-cn`：wizard: minimax-cn 
  - `address-minimax-cn-0`：address: minimax-cn https://api.minimaxi.com/anthropic
  - `address-minimax-cn-1`：address: minimax-cn https://api.minimaxi.com/v1
  - `wizard-minimax-global`：wizard: minimax-global 
  - `address-minimax-global-0`：address: minimax-global https://api.minimax.io/anthropic
  - `address-minimax-global-1`：address: minimax-global https://api.minimax.io/v1
  - `wizard-aliyun-bailian-coding`：wizard: aliyun-bailian-coding 
  - `address-aliyun-bailian-coding-0`：address: aliyun-bailian-coding https://coding.dashscope.aliyuncs.com/apps/anthropic
  - `address-aliyun-bailian-coding-1`：address: aliyun-bailian-coding https://coding.dashscope.aliyuncs.com/v1
  - `wizard-aliyun-bailian-token-plan-cn`：wizard: aliyun-bailian-token-plan-cn 
  - `address-aliyun-bailian-token-plan-cn-0`：address: aliyun-bailian-token-plan-cn https://token-plan.cn-beijing.maas.aliyuncs.com/apps/anthropic
  - `address-aliyun-bailian-token-plan-cn-1`：address: aliyun-bailian-token-plan-cn https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1
  - `wizard-aliyun-bailian-token-plan-team-cn`：wizard: aliyun-bailian-token-plan-team-cn 
  - `address-aliyun-bailian-token-plan-team-cn-0`：address: aliyun-bailian-token-plan-team-cn https://token-plan.cn-beijing.maas.aliyuncs.com/apps/anthropic
  - `address-aliyun-bailian-token-plan-team-cn-1`：address: aliyun-bailian-token-plan-team-cn https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1
  - `wizard-google-gemini-api`：wizard: google-gemini-api 
  - `address-google-gemini-api-0`：address: google-gemini-api https://generativelanguage.googleapis.com/v1beta/openai
  - `wizard-litellm`：wizard: litellm 
  - `address-litellm-0`：address: litellm http://127.0.0.1:4000/v1
  - `address-litellm-1`：address: litellm http://127.0.0.1:4000
  - `wizard-lmstudio`：wizard: lmstudio 
  - `address-lmstudio-0`：address: lmstudio http://127.0.0.1:1234
  - `address-lmstudio-1`：address: lmstudio http://127.0.0.1:1234/v1
  - `wizard-llamacpp`：wizard: llamacpp 
  - `address-llamacpp-0`：address: llamacpp http://127.0.0.1:8080/v1
  - `wizard-vllm`：wizard: vllm 
  - `address-vllm-0`：address: vllm http://127.0.0.1:8000/v1
  - `wizard-longcat`：wizard: longcat 
  - `address-longcat-0`：address: longcat https://api.longcat.chat/anthropic
  - `address-longcat-1`：address: longcat https://api.longcat.chat/openai/v1
  - `wizard-zhipu-coding-plan-cn`：wizard: zhipu-coding-plan-cn 
  - `address-zhipu-coding-plan-cn-0`：address: zhipu-coding-plan-cn https://open.bigmodel.cn/api/anthropic
  - `address-zhipu-coding-plan-cn-1`：address: zhipu-coding-plan-cn https://open.bigmodel.cn/api/coding/paas/v4
  - `wizard-zai-coding-plan-global`：wizard: zai-coding-plan-global 
  - `address-zai-coding-plan-global-0`：address: zai-coding-plan-global https://api.z.ai/api/anthropic
  - `address-zai-coding-plan-global-1`：address: zai-coding-plan-global https://api.z.ai/api/coding/paas/v4
  - `wizard-xiaomi-mimo-api-cn`：wizard: xiaomi-mimo-api-cn 
  - `address-xiaomi-mimo-api-cn-0`：address: xiaomi-mimo-api-cn https://api.xiaomimimo.com/anthropic
  - `address-xiaomi-mimo-api-cn-1`：address: xiaomi-mimo-api-cn https://api.xiaomimimo.com/v1
  - `wizard-xiaomi-mimo-token-plan-cn`：wizard: xiaomi-mimo-token-plan-cn 
  - `address-xiaomi-mimo-token-plan-cn-0`：address: xiaomi-mimo-token-plan-cn https://token-plan-cn.xiaomimimo.com/anthropic
  - `address-xiaomi-mimo-token-plan-cn-1`：address: xiaomi-mimo-token-plan-cn https://token-plan-cn.xiaomimimo.com/v1
  - `wizard-volcengine-api`：wizard: volcengine-api 
  - `address-volcengine-api-0`：address: volcengine-api https://ark.cn-beijing.volces.com/api/v3
  - `wizard-siliconflow-cn`：wizard: siliconflow-cn 
  - `address-siliconflow-cn-0`：address: siliconflow-cn https://api.siliconflow.cn/v1
  - `wizard-siliconflow-global`：wizard: siliconflow-global 
  - `address-siliconflow-global-0`：address: siliconflow-global https://api.siliconflow.com/v1
  - `wizard-volcengine-agent-plan`：wizard: volcengine-agent-plan 
  - `address-volcengine-agent-plan-0`：address: volcengine-agent-plan https://ark.cn-beijing.volces.com/api/plan
  - `address-volcengine-agent-plan-1`：address: volcengine-agent-plan https://ark.cn-beijing.volces.com/api/plan/v3
  - `wizard-volcengine-coding-plan`：wizard: volcengine-coding-plan 
  - `address-volcengine-coding-plan-0`：address: volcengine-coding-plan https://ark.cn-beijing.volces.com/api/coding
  - `address-volcengine-coding-plan-1`：address: volcengine-coding-plan https://ark.cn-beijing.volces.com/api/coding/v3
  - `wizard-tencentcloud-coding-plan`：wizard: tencentcloud-coding-plan 
  - `address-tencentcloud-coding-plan-0`：address: tencentcloud-coding-plan https://api.lkeap.cloud.tencent.com/coding/anthropic
  - `address-tencentcloud-coding-plan-1`：address: tencentcloud-coding-plan https://api.lkeap.cloud.tencent.com/coding/v3
  - `wizard-opencode-go`：wizard: opencode-go 
  - `address-opencode-go-0`：address: opencode-go https://opencode.ai/zen/go
  - `address-opencode-go-1`：address: opencode-go https://opencode.ai/zen/go/v1
  - `wizard-vercel-ai-gateway`：wizard: vercel-ai-gateway 
  - `address-vercel-ai-gateway-0`：address: vercel-ai-gateway https://ai-gateway.vercel.sh
  - `address-vercel-ai-gateway-1`：address: vercel-ai-gateway https://ai-gateway.vercel.sh/v1
  - `wizard-agnes`：wizard: agnes 
  - `address-agnes-0`：address: agnes https://apihub.agnes-ai.com
  - `address-agnes-1`：address: agnes https://apihub.agnes-ai.com/v1
  - `wizard-amazon-bedrock`：wizard: amazon-bedrock 
  - `address-amazon-bedrock-0`：address: amazon-bedrock https://bedrock-runtime.us-east-1.amazonaws.com
  - `wizard-amazon-bedrock-eu-central-1`：wizard: amazon-bedrock-eu-central-1 
  - `address-amazon-bedrock-eu-central-1-0`：address: amazon-bedrock-eu-central-1 https://bedrock-runtime.eu-central-1.amazonaws.com
  - `wizard-ant-ling`：wizard: ant-ling 
  - `address-ant-ling-0`：address: ant-ling https://api.ant-ling.com/v1
  - `wizard-anthropic-api`：wizard: anthropic-api 
  - `address-anthropic-api-0`：address: anthropic-api https://api.anthropic.com
  - `wizard-azure-openai-responses`：wizard: azure-openai-responses 
  - `address-azure-openai-responses-0`：address: azure-openai-responses https://ReviewAccount.openai.azure.com/openai/v1
  - `wizard-baseten`：wizard: baseten 
  - `address-baseten-0`：address: baseten https://inference.baseten.co/v1
  - `wizard-cerebras`：wizard: cerebras 
  - `address-cerebras-0`：address: cerebras https://api.cerebras.ai/v1
  - `wizard-cloudflare-ai-gateway`：wizard: cloudflare-ai-gateway 
  - `address-cloudflare-ai-gateway-0`：address: cloudflare-ai-gateway https://gateway.ai.cloudflare.com/v1/ReviewAccount/ReviewAccount/anthropic
  - `wizard-cloudflare-workers-ai`：wizard: cloudflare-workers-ai 
  - `address-cloudflare-workers-ai-0`：address: cloudflare-workers-ai https://api.cloudflare.com/client/v4/accounts/ReviewAccount/ai/v1
  - `wizard-fireworks`：wizard: fireworks 
  - `address-fireworks-0`：address: fireworks https://api.fireworks.ai/inference
  - `wizard-github-copilot`：wizard: github-copilot 
  - `address-github-copilot-0`：address: github-copilot https://api.individual.githubcopilot.com
  - `wizard-google-vertex`：wizard: google-vertex 
  - `address-google-vertex-0`：address: google-vertex https://us-central1-aiplatform.googleapis.com
  - `wizard-groq`：wizard: groq 
  - `address-groq-0`：address: groq https://api.groq.com/openai/v1
  - `wizard-huggingface`：wizard: huggingface 
  - `address-huggingface-0`：address: huggingface https://router.huggingface.co/v1
  - `wizard-mistral`：wizard: mistral 
  - `address-mistral-0`：address: mistral https://api.mistral.ai
  - `wizard-nvidia`：wizard: nvidia 
  - `address-nvidia-0`：address: nvidia https://integrate.api.nvidia.com/v1
  - `wizard-openai-api`：wizard: openai-api 
  - `address-openai-api-0`：address: openai-api https://api.openai.com/v1
  - `wizard-opencode`：wizard: opencode 
  - `address-opencode-0`：address: opencode https://opencode.ai/zen/v1
  - `wizard-qwen-token-plan`：wizard: qwen-token-plan 
  - `address-qwen-token-plan-0`：address: qwen-token-plan https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1
  - `wizard-qwen-token-plan-individual`：wizard: qwen-token-plan-individual 
  - `address-qwen-token-plan-individual-0`：address: qwen-token-plan-individual https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1
  - `wizard-together`：wizard: together 
  - `address-together-0`：address: together https://api.together.ai/v1
  - `wizard-xai-api`：wizard: xai-api 
  - `address-xai-api-0`：address: xai-api https://api.x.ai/v1
  - `wizard-xiaomi-token-plan-ams`：wizard: xiaomi-token-plan-ams 
  - `address-xiaomi-token-plan-ams-0`：address: xiaomi-token-plan-ams https://token-plan-ams.xiaomimimo.com/v1
  - `wizard-xiaomi-token-plan-sgp`：wizard: xiaomi-token-plan-sgp 
  - `address-xiaomi-token-plan-sgp-0`：address: xiaomi-token-plan-sgp https://token-plan-sgp.xiaomimimo.com/v1
  - `wizard-nous`：wizard: nous 
  - `address-nous-0`：address: nous https://inference-api.nousresearch.com/v1
  - `wizard-deepseek-retained`：wizard: deepseek 
  - 未覆盖：Discovery and saving are fake host interfaces. No real keys, OAuth, network, disk persistence or model generation.
- 页面 `provider-usage`：light / dark · zh-CN · 960×1000
  - `default`：One card with people, current computers and models; removed-computer history stays in totals
  - `no-group`：Provider without a group offers people and models only
  - 未覆盖：Live usage retrieval, remote management, share mutations and actual device connectivity
- 页面 `quota-cost-details`：light / dark · zh-CN · 1280×900 / 320×900
  - `default`：Account card with identity keeps its quota width while showing cost details
  - `narrow`：Same card at 320 px
  - 未覆盖：TodaySpendChip popover positioning, live quota reads and cost detail loading. Synthetic account and rows only.
- 页面 `region-capture`：light / dark · zh-CN · 900×700
  - `locale`：An open capture updates its translation label and export after the Main locale changes, retaining annotations
  - `locale-editor`：An open editor follows the Main locale without replacing its document or annotations
  - `translation`：Follow UI language, choose a remembered target, recover from save failure, and export the chosen language
  - `translation-editor`：The independent image editor uses the same translation controls and export language
  - `snapping`：Correct a transparent window guess, hover adjacent elements, cycle hierarchy and click to select
  - `default`：Scroll overlapping text, finish, export the actual stitched pixels
  - `idle`：Repainting before the first scroll keeps the gesture hint, then scrolling still exports a long image
  - `preview-motion`：Prepending reveals new rows without jumping existing content; growth and scrolling share one animation
  - `inactive`：Only the display under the pointer shows capture controls
  - `drag`：Move the top toolbar horizontally without selecting pixels or leaving screen bounds
  - `video`：Record, annotate, pause/resume, save and decode a WebM
  - `gif`：Record, annotate, pause/resume, save and decode an animated GIF
  - 未覆盖：Native screen acquisition, global keyboard sampling, macOS permissions and native save dialogs; frame source is synthetic.
- 页面 `relay-service`：light / dark · zh-CN · 760×720 / 360×900
  - `default`：Official relay in use; a deployed server relay is available to switch to
  - `server`：Server relay in use: details with devices, certificate and version
  - `host`：This computer is the relay: settings icon and its add-device area
  - `retry-replace`：A failed replacement rechecks the server and asks again before clearing its relay
  - `retry-own`：A failed deployment retains its elapsed time and retries its own relay without clearing it
  - `retry-existing`：An existing complete relay keeps an entry to view and retry a redeployment that failed before changing the server
  - `retry-check-error`：A failed retry check stays in the deployment dialog with a visible error
  - `deploy-steady`：Choosing a server, its check, each deployment step and the finished page keep the dialog and form fields in place
  - `multi`：Two server relays, one in use; renaming the other and deploying again stay available
  - 未覆盖：Real SSH, deployment, certificate issuance, joining and switching; covered separately by deployment/runtime unit tests
- 页面 `remote-desktop-input`：light / dark · zh-CN · 1000×700
  - `default`：Unsupported desktop input explains compatibility, not missing permission
  - `permission`：An actual missing permission retains the permission guidance
  - 未覆盖：Host API is a scenario fixture; actual XTest injection and Air-to-GX102 transport are not exercised
- 页面 `remote-model-access`：light / dark · zh-CN · 760×700
  - `alias-all`：Codex and Pi/Claude aliases display once and are toggled together
  - `alias-partial`：Existing Codex-only permission remains mixed and unchanged on save
  - `alias-pi-ceiling`：Personal selection cannot exceed a Pi-only provider ceiling
  - `alias-pi-only`：Pi-only catalogs save the actual chatgpt/ ID without fabricating a Codex ID
  - `budget`：OpenAI single-model percentage limit
  - `budget-claude`：Claude uses its own catalog and single-model percentage limit
  - `budget-new-model`：A new catalog model can be selected without product code changes
  - `budget-learning`：Unknown usage is not zero
  - `budget-save-failure`：Retains a percentage change on save failure
  - `budget-unsupported`：Provider group cannot add a percentage policy
  - `default`：Provider-wide model selection
  - `member`：Per-person model selection within the provider ceiling
  - 未覆盖：Live IPC, persisted permissions and cross-device calls. Names and models are fixture data.
- 页面 `remote-plugin-ui-consent`：light / dark · zh-CN · 560×650 / 360×650
  - `default`：Remote confirmation lists pages, domains and app tools
  - `narrow`：Same facts readable at 360 px
  - 未覆盖：Device-link network, owner and receipt validation are covered by production transaction unit tests; this fixture supplies an online device and receipt.
  - 场景替换的模块（未验证）：`src/renderer/features/plugin/PluginDevicePicker`、`src/renderer/features/plugin/remotePluginManagementClient`
- 页面 `remote-project-icon`：light / dark · zh-CN · 760×320
  - `default`：connected / connecting / disconnected device-link rows plus an SSH row
  - 未覆盖：Live device-link state transitions, project headers / session rows that pass the status in, tooltips
- 页面 `rich-answer`：light / dark · zh-CN · 560×480 / 320×520
  - `default`：Edit values and explicitly submit the displayed message
  - `narrow`：Controls and submitted message at 320px
  - `readonly`：Read-only history cannot send a message
  - 未覆盖：Real host sending, queue delivery and model continuation; covered separately in isolated Desktop.
  - 场景替换的模块（未验证）：`src/renderer/contexts/AuthContext`
- 页面 `scheduler-model`：light / dark · zh-CN · 720×600
  - `default`：Pick the shared source, then return to the local source
  - 未覆盖：Live device/share discovery, authorization, persistence and task execution; catalog hooks use fixture snapshots
  - 场景替换的模块（未验证）：`src/renderer/hooks/useAvailableAgents`、`src/renderer/hooks/useAgentCapabilities`、`src/renderer/hooks/useProviders`、`src/renderer/hooks/useDeviceProviders`、`src/renderer/hooks/useModelRouteDevices`、`src/renderer/hooks/useDevicesProviders`
- 页面 `session-import`：light / dark · zh-CN · 900×760
  - `default`：Grouped candidates with a missing folder, an archived and an unsupported record
  - `empty`：Nothing importable: supported tools and rescan
  - `running`：Import in progress with queued and writing rows
  - `result`：Finished import: ready, needs a folder and failed rows
  - 未覆盖：Reading real tool histories, starting or cancelling imports, folder relocation and opening imported tasks; verified in the full isolated Desktop.
- 页面 `subscription-fast`：light / dark · zh-CN · 760×800 / 320×950
  - `default`：Supplier and group allow Fast
  - `prohibited`：Both levels prohibit Fast
  - `pending`：Group reports an unconfirmed executor
  - `narrow`：Subscription controls at 320 px
  - 未覆盖：Real subscriptions, native Agent settings and cross-device delivery. Host APIs use fixture memory.
- 页面 `task-execution-errors`：light / dark · zh-CN · 560×440 / 320×540
  - `default`：Historical automatic execution failure
  - `narrow`：Automatic execution failure at 320 px
  - `history`：Historical task execution error
  - `subagent`：Subagent execution error
  - 未覆盖：Live scheduler execution, host transport and new-task navigation; covered separately by targeted tests
- 页面 `teammate-feishu`：light / dark · zh-CN · 720×900 / 320×700
  - `default`：Feishu creation prompt and link share one row
  - `feishu-onboarding`：Feishu creation prompt and link share one row
  - `feishu-lark`：Lark updates the link, description and submit label
  - `feishu-expanded`：Expanded setup guide above the credential inputs
  - `feishu-narrow`：320px viewport wraps guidance and keeps the form scrollable
  - 未覆盖：Live Feishu/Lark login, application provisioning, external browser navigation, credential persistence and connection handshake; host writes are forbidden
- 页面 `teammate-glance`：light / dark · zh-CN · 1040×760
  - `default`：Cindy on several computers, todos with one due today, finished deliverables
  - `menu`：Right-clicking a todo offers only Delete
  - `new`：Empty teammate: only Computers; no todo suggestions or outputs
  - `activity`：No todos, attributed recent tasks, unread result and true PR title
  - `routines`：Never-run and paused routines mixed with ordinary tasks; direct timer icons in one list
  - 未覆盖：Live todo/delegation data, cloud companion home switching, remote teammates over device-link, sending the quoted todo or 帮我查查, toggling the daily check, opening files
  - 场景替换的模块（未验证）：`src/renderer/features/bots/botStore`、`src/renderer/lib/sessionAttentionStore`、`src/renderer/hooks/useCCSessions`、`src/renderer/contexts/PrRefsContext`、`src/renderer/features/bots/botFollowScopes`、`src/renderer/features/device-link/refreshRemoteSessions`、`src/renderer/features/device-link/useDeviceLinkDeviceList`、`src/renderer/features/bots/botDelegationLive`、`src/renderer/features/bots/useRemoteBots`
- 页面 `teammate-process`：light / dark · zh-CN · 720×850 / 320×850 / 640×950
  - `default`：Live private turn with stage notes and initial thinking
  - `finished`：Completed private turn with final answer outside
  - `retry`：Two failed attempts followed by a running read: current action stays visible
  - `artifacts-wide`：Avatar, long reply, Excel preview and related file align in the production stream
  - `artifacts-narrow`：A narrow companion column preserves card sizing
  - `artifacts-thread`：The production topic panel and compact styles retain reply/artifact alignment
  - `artifacts-no-avatar`：No avatar means no additional inset
  - `artifacts-task`：Ordinary task layout stays unchanged
  - `artifacts-cached`：Cached cards keep their height while remount stats are pending; confirmation enables them and deletion removes the entire row
  - `artifacts-missing`：Missing files leave no empty avatar row
  - 未覆盖：Full CCAgentSessionView, login, host execution, document opening, native mobile layout and transport
  - 场景替换的模块（未验证）：`src/renderer/components/chat/GhostToolCard`、`src/renderer/contexts/AuthContext`
- 页面 `teammate-task-filter`：light / dark · zh-CN · 840×640
  - `default`：Legacy choice migration → one Cindy across computers → unrestricted → single/multiple/reset; archived creator avatar
  - `archived-reminder`：Display settings → Task status → Archived shows reminder at every level; Active/All clear it
  - 未覆盖：Live cross-device transport and host database reads; task/roster snapshots are fixture data. Pinned exemptions remain in the full sidebar.
  - 场景替换的模块（未验证）：`src/renderer/features/bots/useRemoteBots`、`src/renderer/features/bots/botStore`、`src/renderer/features/device-link/useMachineSwitcher`、`src/renderer/features/cc-agent/hooks/useRemoteHostProjectOrders`
- 页面 `teammates-section`：light / dark · zh-CN · 800×600
  - `group-types`：Group and private rows retain their original avatars without type markers; running/unread @ points remain
  - `group-avatars`：Collapsed one-to-five-member groups keep their composition and corner-dot space
  - `states`：Shared solid-dot states in expanded rows and collapsed overflow
  - `default`：Shell-mounted sidebar on default route; selected sixth row and reversible collapse
  - `session`：Shell-mounted sidebar on session route; selected sixth row and reversible collapse
  - `history`：Shell-mounted sidebar on history route; selected sixth row and reversible collapse
  - `direct`：Shell-mounted sidebar on direct route; selected sixth row and reversible collapse
  - `remote`：Shell-mounted sidebar on remote route; selected sixth row and reversible collapse
  - `merged-cindy`：Shell-mounted sidebar on merged-cindy route; selected sixth row and reversible collapse
  - `long-speakers-11`：Long speaking member names ellipsize before the unread count in a narrow sidebar
  - `long-speakers-999`：Long speaking member names ellipsize before the unread count in a narrow sidebar
  - `collapsed-mention`：Collapsed strip: orange @ on a running group, blue @ on an idle one, plain dot on an unread group without @
  - `collapsed-plain`：Collapsed strip: the same chats and selection plate without any @
  - `device-names`：Duplicate and missing computer names never expose device fingerprints in teammate rows
  - 未覆盖：Roster loading, cloud/device connections, create/delete menus and message delivery
  - 场景替换的模块（未验证）：`src/renderer/contexts/AuthContext`、`src/renderer/state/agentIslandActivity`、`src/renderer/features/bots/useRemoteBots`、`src/renderer/features/bots/companionCloudStore`、`src/renderer/features/device-link/useDeviceLinkDeviceList`、`src/renderer/features/bots/BotCreateMenu`、`src/renderer/features/bots/BotDeleteDialog`、`src/renderer/features/bots/botGroupStore`、`src/renderer/features/bots/botStore`
- 页面 `thread-panels`：light / dark · zh-CN · 960×640 / 640×800 / 800×650
  - `group`：Group topic with a long source message and working follow switch, with and without wallpaper
  - `group-attachments`：Thread + menu, image-only send and tray reset at narrow panel width
  - `group-cache-pending`：Reopen a thread before its delayed image cache finishes; retain the image and newer text
  - `default`：Private topic opening with the same long source message
  - `failed`：Private topic failure keeps the entire source and retry reachable
  - `group-narrow`：2026-10-29: 320px topic preserves bubble width, readable table columns and bounded file chips
  - `composer-attachments`：Review regression: multiline group draft and 分工 must not clip attachment removal
  - 未覆盖：Private ready-state task runtime, model execution, real media upload, server persistence and attachment IO; attachment selection and layout use scenario host data
  - 场景替换的模块（未验证）：`src/renderer/lib/makerChatStore`、`src/renderer/features/cc-agent/CCAgentSessionView`
- 页面 `unified-model-rail`：light / dark · zh-CN · 780×640
  - `default`：「全部」视图:联合列表 + 侧栏 rail 全格
  - `recent`：「最近」视图:三态 Fast 载体(`ultrafast`/`true`)的条目后缀原样保留
  - `cindy-personal`：Personal Cindy AI source identity in the real model selector
  - `cindy-xd`：XD Cindy AI source identity beside the unchanged Auto model
  - `cindy-organization`：Long organization name in the real provider rail
  - 未覆盖：Account entitlement, live model calls, database persistence and native mobile controls
- 页面 `usage-cost-details`：light / dark · zh-CN · 720×760 / 320×760
  - `default`：One model in subscription and Cindy AI channels; two additional models
  - `narrow`：Same detail panel at 320 px
  - `legacy`：Older host has no breakdown; do not show zero
  - 未覆盖：Scenario billing data; no paid model request or remote device connection.
- 页面 `usage-task-table`：light / dark · zh-CN · 1100×320
  - `default`：Historical token total next to the current task configuration
  - 未覆盖：Usage collection, model switching and navigation to live tasks
- 页面 `voice-call`：light / dark · zh-CN · 800×820 / 320×900 / 1280×900
  - `default`：Live transcript only in the disclosure; history card appears after End
  - `narrow`：Call record and controls at 320 px
  - `wide`：Voice cards center in the conversation column beside a sidebar, not in the window
  - `failed`：Retained failed original appears once in the unified transcript
  - `speech-timeout`：Concise audio timeout feedback at 320 px
  - `speech-error`：Unknown read-aloud failure retains the reply without prescribing configuration changes
  - `empty`：Ending an empty call leaves the existing conversation without a call card
  - `elsewhere`：Off its task page: open-conversation entry and a question waiting off screen
  - `muted`：Microphone-only mute retains its feedback
  - `speaking`：Speaking retains the interrupt control
  - `countdown`：A narrow exit countdown keeps Cancel and End reachable
  - `long`：Long transcript is bounded and wraps without moving the composer
  - 未覆盖：Live microphone, ASR, model requests, handoff execution and database persistence
- 页面 `voice-settings`：light / dark · zh-CN · 460×740 / 320×900 / 320×820
  - `openrouter-auto-voice`：Switching to Qwen chooses its first returned voice; an explicit choice survives refresh
  - `minimax-auto-voice`：Native BYOK model switching follows the same automatic voice selection rule
  - `openrouter`：OpenRouter provider voice IDs and no unsupported speed slider
  - `openrouter-manual`：A saved OpenRouter manual voice keeps audition without carrying an old speed
  - `gateway-elevenlabs`：Gateway replacement reference voices with separate selection and audition
  - `gateway-minimax`：Gateway MiniMax system candidates in a narrow drawer, still labeled as references
  - `gateway-manual`：A saved manual Gateway voice survives a populated reference catalog and preview
  - `default`：ElevenLabs default 1× without an override
  - `narrow`：Saved speed in a narrow settings drawer
  - `minimax`：MiniMax native speed range
  - `openai`：OpenAI native speed range
  - `qwen`：Official Qwen3 HTTP reference voice, no unsupported speed control
  - `qwen-proxy`：Explicit Qwen HTTP proxy protocol in a narrow settings drawer
  - `cosyvoice`：CosyVoice HTTP proxy, reference voice and native speed range
  - `unsupported`：Eleven v3 keeps voice and preview but does not offer a speed slider
  - `hidden`：A saved hidden model remains displayed without offering other unchecked speech models
  - `hidden-empty`：Hidden models are not selected automatically without a saved preference
  - `qwen-catalog`：Complete Qwen3 system catalog with official display names and keyboard navigation
  - `cosy-catalog`：Complete CosyVoice system catalog plus a matching account voice in a narrow drawer
  - `cosy-custom-failure`：Account catalog failure preserves system choices, selected voice, and refresh
  - `empty`：No models keeps only the existing setup introduction and provider link
  - `manual`：Custom voice keeps compact audition beside the input without a blur/save race
  - `menu`：Preview an unselected voice without saving; keyboard and cancellation
  - `menu-narrow`：Long voice names and inline preview controls in a narrow drawer
  - `menu-error`：Failed preview stays in the menu without replacing the saved voice
  - `menu-timeout`：Preview timeout keeps the selected voice and reports only the known cause
  - `manual-timeout`：Manual audition timeout stays beside the input without saving the draft
  - `manual-error`：Unknown manual audition failure does not blame model or voice configuration
  - 未覆盖：Real preference persistence, provider requests, audio playback and microphone capture
  - 场景替换的模块（未验证）：`src/renderer/lib/makerChatStore`
- 页面 `wechat-companion`：light / dark · zh-CN · 620×900 / 360×900 / 1280×900 / 1280×1000 / 1280×1100
  - `default`：New WeChat connection for a teammate
  - `existing`：Reuse the already authorized personal WeChat connection
  - `assigned`：Connected teammate and remove-link action
  - `other`：Another teammate owns this connection
  - `feishu-hidden-tasks`：Clickable hidden IM records and independent restart action
  - `feishu-hidden-tasks-narrow`：Hidden IM records in a narrow window
  - `sidebar-394`：#6706: 394px card in a wide window
  - `sidebar-320`：320px card keeps summary, status and chevron visible
  - `wide-settings`：760px settings card keeps a compact horizontal header
  - `long-name`：Long unbroken teammate name wraps without hiding the connected status
  - `header-action`：Independent sibling-channel switch and long route summary at 320px
  - `header-action-empty`：Independent switch without a route summary in a wide settings card
  - `sidebar-empty-320`：Review #6729: empty summary keeps status and chevron at the right edge after wrapping
  - `header-action-empty-320`：Empty summary with an independent switch at 320px
  - `header-action-empty-394`：Empty summary with an independent switch at 394px
  - 未覆盖：Real account login, Tencent scan authorization, persisted binding, message delivery, full-app history navigation and live agent execution
- 未通过：`explicit-file-links.default.light.zh-CN.560x420` — page.waitForFunction: Timeout 10000ms exceeded.
- 未通过：`explicit-file-links.default.dark.zh-CN.560x420` — page.waitForFunction: Timeout 10000ms exceeded.
- 未通过：`im-default-model.default.light.zh-CN.660x520` — Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider
- 未通过：`im-default-model.default.dark.zh-CN.660x520` — Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider
- 未通过：`im-default-model.im-automatic.light.zh-CN.660x520` — Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider
- 未通过：`im-default-model.im-automatic.dark.zh-CN.660x520` — Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider
- 未通过：`im-default-model.im-fixed.light.zh-CN.660x520` — Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider
- 未通过：`im-default-model.im-fixed.dark.zh-CN.660x520` — Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider
- 未通过：`im-default-model.im-unavailable.light.zh-CN.660x520` — Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider
- 未通过：`im-default-model.im-unavailable.dark.zh-CN.660x520` — Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider
- 未通过：`im-default-model.im-narrow.light.zh-CN.320x640` — Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider
- 未通过：`im-default-model.im-narrow.dark.zh-CN.320x640` — Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider
- 未通过：`mail-reading.default.light.zh-CN.640x700` — Blocked script execution in 'about:srcdoc' because the document's frame is sandboxed and the 'allow-scripts' permission is not set.
- 未通过：`mail-reading.default.dark.zh-CN.640x700` — Blocked script execution in 'about:srcdoc' because the document's frame is sandboxed and the 'allow-scripts' permission is not set.
- 未通过：`mail-reading.narrow.light.zh-CN.320x700` — Blocked script execution in 'about:srcdoc' because the document's frame is sandboxed and the 'allow-scripts' permission is not set.
- 未通过：`mail-reading.narrow.dark.zh-CN.320x700` — Blocked script execution in 'about:srcdoc' because the document's frame is sandboxed and the 'allow-scripts' permission is not set.
- 未通过：`mail-reading.fixed-width.light.zh-CN.320x400` — Blocked script execution in 'about:srcdoc' because the document's frame is sandboxed and the 'allow-scripts' permission is not set.
- 未通过：`mail-reading.fixed-width.dark.zh-CN.320x400` — Blocked script execution in 'about:srcdoc' because the document's frame is sandboxed and the 'allow-scripts' permission is not set.
- 未通过：`markdown-preview-find.nested-mermaid.light.zh-CN.1040x760` — AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
- 未通过：`markdown-preview-find.nested-mermaid.dark.zh-CN.1040x760` — AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
- 未通过：`markdown-preview-find.outside-focus.light.zh-CN.1040x760` — AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
- 未通过：`markdown-preview-find.outside-focus.dark.zh-CN.1040x760` — AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
- 未通过：`markdown-preview-find.fullscreen-video.light.zh-CN.1040x760` — locator.evaluate: Timeout 10000ms exceeded.
- 未通过：`markdown-preview-find.fullscreen-video.dark.zh-CN.1040x760` — locator.evaluate: Timeout 10000ms exceeded.
- 未通过：`markdown-preview-find.toolbar-tooltip.light.zh-CN.1040x760` — locator.click: Timeout 10000ms exceeded.
- 未通过：`markdown-preview-find.toolbar-tooltip.dark.zh-CN.1040x760` — locator.click: Timeout 10000ms exceeded.
- 未通过：`plugin-install-mail.participant-avatars.light.zh-CN.360x720` — Blocked script execution in 'about:srcdoc' because the document's frame is sandboxed and the 'allow-scripts' permission is not set.
- 未通过：`plugin-install-mail.participant-avatars.dark.zh-CN.360x720` — Blocked script execution in 'about:srcdoc' because the document's frame is sandboxed and the 'allow-scripts' permission is not set.
- 未通过：`plugin-install-mail.read-mail-body.light.zh-CN.360x600` — Blocked script execution in 'about:srcdoc' because the document's frame is sandboxed and the 'allow-scripts' permission is not set.
- 未通过：`plugin-install-mail.read-mail-body.dark.zh-CN.360x600` — Blocked script execution in 'about:srcdoc' because the document's frame is sandboxed and the 'allow-scripts' permission is not set.
- 未通过：`plugin-install-mail.two-mail-views.light.zh-CN.700x600` — Error: page failed to start: ResizeObserver loop completed with undelivered notifications.
- 未通过：`plugin-install-mail.two-mail-views.dark.zh-CN.700x600` — Error: page failed to start: ResizeObserver loop completed with undelivered notifications.
- 未通过：`plugin-install-mail.edit-mail-body.light.zh-CN.700x600` — Error: page failed to start: ResizeObserver loop completed with undelivered notifications.
- 未通过：`plugin-install-mail.edit-mail-body.dark.zh-CN.700x600` — Error: page failed to start: ResizeObserver loop completed with undelivered notifications.
- 未通过：`plugin-install-mail.refresh-mail-body.light.zh-CN.700x600` — Error: page failed to start: ResizeObserver loop completed with undelivered notifications.
- 未通过：`plugin-install-mail.refresh-mail-body.dark.zh-CN.700x600` — Error: page failed to start: ResizeObserver loop completed with undelivered notifications.
- 未通过：`plugin-model-picker.default.light.zh-CN.800x760` — Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider
- 未通过：`plugin-model-picker.default.dark.zh-CN.800x760` — Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider
- 未通过：`plugin-model-picker.plugin-config.light.zh-CN.800x760` — Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider
- 未通过：`plugin-model-picker.plugin-config.dark.zh-CN.800x760` — Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider
- 未通过：`plugin-model-picker.plugin-narrow.light.zh-CN.360x740` — Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider
- 未通过：`plugin-model-picker.plugin-narrow.dark.zh-CN.360x740` — Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider
- 未通过：`provider-template-catalog.wizard-moonshot-kimi-cn.light.zh-CN.1000x900` — AssertionError [ERR_ASSERTION]: missing selected model codex
- 未通过：`provider-template-catalog.wizard-moonshot-kimi-cn.dark.zh-CN.1000x900` — AssertionError [ERR_ASSERTION]: missing selected model codex
- 未通过：`provider-template-catalog.wizard-moonshot-kimi-global.light.zh-CN.1000x900` — AssertionError [ERR_ASSERTION]: missing selected model codex
- 未通过：`provider-template-catalog.wizard-moonshot-kimi-global.dark.zh-CN.1000x900` — AssertionError [ERR_ASSERTION]: missing selected model codex
- 未通过：`provider-template-catalog.wizard-agnes.light.zh-CN.1000x900` — locator.click: Timeout 10000ms exceeded.
- 未通过：`provider-template-catalog.wizard-agnes.dark.zh-CN.1000x900` — locator.click: Timeout 10000ms exceeded.
- 未通过：`region-capture.locale.light.zh-CN.900x700` — locator.waitFor: Timeout 10000ms exceeded.
- 未通过：`region-capture.locale.dark.zh-CN.900x700` — locator.waitFor: Timeout 10000ms exceeded.
- 未通过：`region-capture.locale-editor.light.zh-CN.900x700` — locator.waitFor: Timeout 10000ms exceeded.
- 未通过：`region-capture.locale-editor.dark.zh-CN.900x700` — locator.waitFor: Timeout 10000ms exceeded.
- 本分支改动中没有被单页验证覆盖的界面文件：`apps\desktop\src\renderer\components\layout\WallpaperVideo.tsx`、`apps\desktop\src\renderer\vite-env.d.ts`

![总览 1](overview.png)
![总览 2](overview-2.png)
![总览 3](overview-3.png)
![总览 4](overview-4.png)
![总览 5](overview-5.png)
![总览 6](overview-6.png)
![总览 7](overview-7.png)
![总览 8](overview-8.png)
![总览 9](overview-9.png)
![总览 10](overview-10.png)
![总览 11](overview-11.png)
![总览 12](overview-12.png)
![总览 13](overview-13.png)
![总览 14](overview-14.png)
![总览 15](overview-15.png)
![总览 16](overview-16.png)
![总览 17](overview-17.png)
![总览 18](overview-18.png)
![总览 19](overview-19.png)
![总览 20](overview-20.png)
![总览 21](overview-21.png)
![总览 22](overview-22.png)
![总览 23](overview-23.png)
![总览 24](overview-24.png)
![总览 25](overview-25.png)
![总览 26](overview-26.png)
![总览 27](overview-27.png)
![总览 28](overview-28.png)
![总览 29](overview-29.png)
![总览 30](overview-30.png)
![总览 31](overview-31.png)
![总览 32](overview-32.png)
![总览 33](overview-33.png)
![总览 34](overview-34.png)
![总览 35](overview-35.png)
![总览 36](overview-36.png)
![总览 37](overview-37.png)
![总览 38](overview-38.png)
![总览 39](overview-39.png)
![总览 40](overview-40.png)
![总览 41](overview-41.png)
![总览 42](overview-42.png)
![总览 43](overview-43.png)
![总览 44](overview-44.png)
![总览 45](overview-45.png)
![总览 46](overview-46.png)
![总览 47](overview-47.png)
![总览 48](overview-48.png)
![总览 49](overview-49.png)
![总览 50](overview-50.png)
![总览 51](overview-51.png)
![总览 52](overview-52.png)
![总览 53](overview-53.png)
![总览 54](overview-54.png)
![总览 55](overview-55.png)
![总览 56](overview-56.png)
![总览 57](overview-57.png)
![总览 58](overview-58.png)
![总览 59](overview-59.png)
![总览 60](overview-60.png)
![总览 61](overview-61.png)
![总览 62](overview-62.png)
![总览 63](overview-63.png)
![总览 64](overview-64.png)
![总览 65](overview-65.png)
![总览 66](overview-66.png)
![总览 67](overview-67.png)
![总览 68](overview-68.png)
![总览 69](overview-69.png)
![总览 70](overview-70.png)
![总览 71](overview-71.png)
![总览 72](overview-72.png)
![总览 73](overview-73.png)
![总览 74](overview-74.png)
![总览 75](overview-75.png)
![总览 76](overview-76.png)
![总览 77](overview-77.png)
![总览 78](overview-78.png)
![总览 79](overview-79.png)
![总览 80](overview-80.png)
![总览 81](overview-81.png)
![总览 82](overview-82.png)
![总览 83](overview-83.png)
![总览 84](overview-84.png)
![总览 85](overview-85.png)
![总览 86](overview-86.png)
![总览 87](overview-87.png)
![总览 88](overview-88.png)
![总览 89](overview-89.png)
![总览 90](overview-90.png)
![总览 91](overview-91.png)
![总览 92](overview-92.png)
![总览 93](overview-93.png)
![总览 94](overview-94.png)
![总览 95](overview-95.png)
![总览 96](overview-96.png)
![总览 97](overview-97.png)
![总览 98](overview-98.png)
![总览 99](overview-99.png)
![总览 100](overview-100.png)
![总览 101](overview-101.png)
![总览 102](overview-102.png)
![总览 103](overview-103.png)
![总览 104](overview-104.png)
![总览 105](overview-105.png)
![总览 106](overview-106.png)
![总览 107](overview-107.png)
![总览 108](overview-108.png)
![总览 109](overview-109.png)
![总览 110](overview-110.png)
![总览 111](overview-111.png)
![总览 112](overview-112.png)
![总览 113](overview-113.png)
![总览 114](overview-114.png)
![总览 115](overview-115.png)
![总览 116](overview-116.png)
![总览 117](overview-117.png)
![总览 118](overview-118.png)
![总览 119](overview-119.png)
![总览 120](overview-120.png)
![总览 121](overview-121.png)
![总览 122](overview-122.png)
![总览 123](overview-123.png)
![总览 124](overview-124.png)
![总览 125](overview-125.png)
![总览 126](overview-126.png)
![总览 127](overview-127.png)
![总览 128](overview-128.png)
![总览 129](overview-129.png)
![总览 130](overview-130.png)
![总览 131](overview-131.png)
![总览 132](overview-132.png)
![总览 133](overview-133.png)
![总览 134](overview-134.png)
![总览 135](overview-135.png)
![总览 136](overview-136.png)
![总览 137](overview-137.png)
![总览 138](overview-138.png)
![总览 139](overview-139.png)
![总览 140](overview-140.png)
![总览 141](overview-141.png)
![总览 142](overview-142.png)
![总览 143](overview-143.png)
![总览 144](overview-144.png)
![总览 145](overview-145.png)
![总览 146](overview-146.png)
![总览 147](overview-147.png)
![总览 148](overview-148.png)
![总览 149](overview-149.png)
![总览 150](overview-150.png)
![总览 151](overview-151.png)
![总览 152](overview-152.png)
![总览 153](overview-153.png)
![总览 154](overview-154.png)
![总览 155](overview-155.png)
![总览 156](overview-156.png)
![总览 157](overview-157.png)
![总览 158](overview-158.png)
![总览 159](overview-159.png)
![总览 160](overview-160.png)
![总览 161](overview-161.png)
![总览 162](overview-162.png)
![总览 163](overview-163.png)
![总览 164](overview-164.png)
![总览 165](overview-165.png)
![总览 166](overview-166.png)
![总览 167](overview-167.png)
![总览 168](overview-168.png)
![总览 169](overview-169.png)
![总览 170](overview-170.png)
![总览 171](overview-171.png)
![总览 172](overview-172.png)
![总览 173](overview-173.png)
![总览 174](overview-174.png)
![总览 175](overview-175.png)
![总览 176](overview-176.png)
![总览 177](overview-177.png)
![总览 178](overview-178.png)
![总览 179](overview-179.png)
![总览 180](overview-180.png)
![总览 181](overview-181.png)
![总览 182](overview-182.png)
![总览 183](overview-183.png)
![总览 184](overview-184.png)
![总览 185](overview-185.png)
![总览 186](overview-186.png)
![总览 187](overview-187.png)
![总览 188](overview-188.png)
![总览 189](overview-189.png)
![总览 190](overview-190.png)
![总览 191](overview-191.png)
![总览 192](overview-192.png)
![总览 193](overview-193.png)
![总览 194](overview-194.png)
![总览 195](overview-195.png)
![总览 196](overview-196.png)
![总览 197](overview-197.png)
![总览 198](overview-198.png)
![总览 199](overview-199.png)
![总览 200](overview-200.png)
![总览 201](overview-201.png)
![总览 202](overview-202.png)
![总览 203](overview-203.png)
![总览 204](overview-204.png)
![总览 205](overview-205.png)
![总览 206](overview-206.png)
![总览 207](overview-207.png)
![总览 208](overview-208.png)
![总览 209](overview-209.png)
![总览 210](overview-210.png)
![总览 211](overview-211.png)
![总览 212](overview-212.png)
![总览 213](overview-213.png)
![总览 214](overview-214.png)
![总览 215](overview-215.png)
![总览 216](overview-216.png)
![总览 217](overview-217.png)
![总览 218](overview-218.png)
![总览 219](overview-219.png)
![总览 220](overview-220.png)
![总览 221](overview-221.png)
![总览 222](overview-222.png)
![总览 223](overview-223.png)
![总览 224](overview-224.png)
![总览 225](overview-225.png)
![总览 226](overview-226.png)
![总览 227](overview-227.png)
![总览 228](overview-228.png)
![总览 229](overview-229.png)
![总览 230](overview-230.png)
![总览 231](overview-231.png)
![总览 232](overview-232.png)
![总览 233](overview-233.png)
![总览 234](overview-234.png)
![总览 235](overview-235.png)
![总览 236](overview-236.png)
![总览 237](overview-237.png)
![总览 238](overview-238.png)
![总览 239](overview-239.png)
![总览 240](overview-240.png)
![总览 241](overview-241.png)
![总览 242](overview-242.png)
![总览 243](overview-243.png)
![总览 244](overview-244.png)
![总览 245](overview-245.png)
![总览 246](overview-246.png)
![总览 247](overview-247.png)
![总览 248](overview-248.png)
