# 同步 v0.1.125：失败场景对照

候选源码：877a41ca4336e1c35360aa3555db8a1497fd7921；基线：4342e08b0921f869b7abbf1437e5e83564d2cd83。

完整首轮：1434/1486 通过，52 未通过。保持相同断言，对失败场景运行 `node apps/desktop/scripts/ui-page/cli.mjs --page <page> --case <failed cases> --theme all --compare origin/main`。52 个中16个重跑通过，其余36个在基线亦出现失败；未将既有失败改记为通过。

原始报告和248张图见 [完整首轮报告](changed-6MgI8i/ui-report.md)。动态壁纸和 vite-env.d.ts 未被单页检查覆盖；动态壁纸原有生产单测由完整 CI 执行，本轮未进行实机壁纸目检。

| 场景 | 候选 | 基线问题 | 候选问题 |
| --- | --- | --- | --- |
| explicit-file-links.default.light.zh-CN.560x420 | failed | window.electronAPI.fileBrowser.onEvent is not a function; check on origin/main stopped: page.waitForFunction: Timeout 10000ms exceeded. | page.waitForFunction: Timeout 10000ms exceeded.; window.electronAPI.fileBrowser.onEvent is not a function |
| explicit-file-links.default.dark.zh-CN.560x420 | failed | window.electronAPI.fileBrowser.onEvent is not a function; check on origin/main stopped: page.waitForFunction: Timeout 10000ms exceeded. | page.waitForFunction: Timeout 10000ms exceeded.; window.electronAPI.fileBrowser.onEvent is not a function |
| im-default-model.default.light.zh-CN.660x520 | failed | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider |
| im-default-model.default.dark.zh-CN.660x520 | failed | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider |
| im-default-model.im-automatic.light.zh-CN.660x520 | failed | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider |
| im-default-model.im-automatic.dark.zh-CN.660x520 | failed | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider |
| im-default-model.im-fixed.light.zh-CN.660x520 | failed | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider |
| im-default-model.im-fixed.dark.zh-CN.660x520 | failed | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider |
| im-default-model.im-unavailable.light.zh-CN.660x520 | failed | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider |
| im-default-model.im-unavailable.dark.zh-CN.660x520 | failed | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider |
| im-default-model.im-narrow.light.zh-CN.320x640 | failed | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider |
| im-default-model.im-narrow.dark.zh-CN.320x640 | failed | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider |
| mail-reading.default.light.zh-CN.640x700 | passed | 无 | 无 |
| mail-reading.default.dark.zh-CN.640x700 | passed | 无 | 无 |
| mail-reading.narrow.light.zh-CN.320x700 | passed | 无 | 无 |
| mail-reading.narrow.dark.zh-CN.320x700 | passed | 无 | 无 |
| mail-reading.fixed-width.light.zh-CN.320x400 | passed | 无 | 无 |
| mail-reading.fixed-width.dark.zh-CN.320x400 | passed | 无 | 无 |
| markdown-preview-find.nested-mermaid.light.zh-CN.1040x760 | failed | check on origin/main stopped: Expected values to be strictly equal: | AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: |
| markdown-preview-find.nested-mermaid.dark.zh-CN.1040x760 | failed | check on origin/main stopped: Expected values to be strictly equal: | AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: |
| markdown-preview-find.outside-focus.light.zh-CN.1040x760 | failed | check on origin/main stopped: Expected values to be strictly equal: | AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: |
| markdown-preview-find.outside-focus.dark.zh-CN.1040x760 | failed | check on origin/main stopped: Expected values to be strictly equal: | AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: |
| markdown-preview-find.fullscreen-video.light.zh-CN.1040x760 | failed | check on origin/main stopped: locator.evaluate: Timeout 10000ms exceeded. | locator.evaluate: Timeout 10000ms exceeded. |
| markdown-preview-find.fullscreen-video.dark.zh-CN.1040x760 | failed | check on origin/main stopped: locator.evaluate: Timeout 10000ms exceeded. | locator.evaluate: Timeout 10000ms exceeded. |
| markdown-preview-find.toolbar-tooltip.light.zh-CN.1040x760 | failed | check on origin/main stopped: locator.click: Timeout 10000ms exceeded. | locator.click: Timeout 10000ms exceeded. |
| markdown-preview-find.toolbar-tooltip.dark.zh-CN.1040x760 | failed | check on origin/main stopped: locator.click: Timeout 10000ms exceeded. | locator.click: Timeout 10000ms exceeded. |
| plugin-install-mail.participant-avatars.light.zh-CN.360x720 | passed | 无 | 无 |
| plugin-install-mail.participant-avatars.dark.zh-CN.360x720 | passed | 无 | 无 |
| plugin-install-mail.read-mail-body.light.zh-CN.360x600 | passed | 无 | 无 |
| plugin-install-mail.read-mail-body.dark.zh-CN.360x600 | passed | 无 | 无 |
| plugin-install-mail.two-mail-views.light.zh-CN.700x600 | passed | 无 | 无 |
| plugin-install-mail.two-mail-views.dark.zh-CN.700x600 | passed | 无 | 无 |
| plugin-install-mail.edit-mail-body.light.zh-CN.700x600 | passed | 无 | 无 |
| plugin-install-mail.edit-mail-body.dark.zh-CN.700x600 | passed | 无 | 无 |
| plugin-install-mail.refresh-mail-body.light.zh-CN.700x600 | passed | 无 | 无 |
| plugin-install-mail.refresh-mail-body.dark.zh-CN.700x600 | passed | 无 | 无 |
| plugin-model-picker.default.light.zh-CN.800x760 | failed | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider |
| plugin-model-picker.default.dark.zh-CN.800x760 | failed | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider |
| plugin-model-picker.plugin-config.light.zh-CN.800x760 | failed | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider |
| plugin-model-picker.plugin-config.dark.zh-CN.800x760 | failed | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider |
| plugin-model-picker.plugin-narrow.light.zh-CN.360x740 | failed | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider |
| plugin-model-picker.plugin-narrow.dark.zh-CN.360x740 | failed | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider | Error: page failed to start: Uncaught Error: useAuth must be used within AuthProvider; useAuth must be used within AuthProvider |
| provider-template-catalog.wizard-moonshot-kimi-cn.light.zh-CN.1000x900 | failed | check on origin/main stopped: missing selected model codex | AssertionError [ERR_ASSERTION]: missing selected model codex |
| provider-template-catalog.wizard-moonshot-kimi-cn.dark.zh-CN.1000x900 | failed | check on origin/main stopped: missing selected model codex | AssertionError [ERR_ASSERTION]: missing selected model codex |
| provider-template-catalog.wizard-moonshot-kimi-global.light.zh-CN.1000x900 | failed | check on origin/main stopped: missing selected model codex | AssertionError [ERR_ASSERTION]: missing selected model codex |
| provider-template-catalog.wizard-moonshot-kimi-global.dark.zh-CN.1000x900 | failed | check on origin/main stopped: missing selected model codex | AssertionError [ERR_ASSERTION]: missing selected model codex |
| provider-template-catalog.wizard-agnes.light.zh-CN.1000x900 | failed | check on origin/main stopped: locator.click: Timeout 10000ms exceeded. | locator.click: Timeout 10000ms exceeded. |
| provider-template-catalog.wizard-agnes.dark.zh-CN.1000x900 | failed | check on origin/main stopped: locator.click: Timeout 10000ms exceeded. | locator.click: Timeout 10000ms exceeded. |
| region-capture.locale.light.zh-CN.900x700 | failed | check on origin/main stopped: locator.waitFor: Timeout 10000ms exceeded. | locator.waitFor: Timeout 10000ms exceeded. |
| region-capture.locale.dark.zh-CN.900x700 | failed | check on origin/main stopped: locator.waitFor: Timeout 10000ms exceeded. | locator.waitFor: Timeout 10000ms exceeded. |
| region-capture.locale-editor.light.zh-CN.900x700 | failed | check on origin/main stopped: locator.waitFor: Timeout 10000ms exceeded. | locator.waitFor: Timeout 10000ms exceeded. |
| region-capture.locale-editor.dark.zh-CN.900x700 | failed | check on origin/main stopped: locator.waitFor: Timeout 10000ms exceeded. | locator.waitFor: Timeout 10000ms exceeded. |
