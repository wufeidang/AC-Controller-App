# Tasks: App 深度优化 v2.3.0

**Input**: Design documents from `/specs/002-deep-optimization/`
**Prerequisites**: plan.md (✅), spec.md (✅)

**Tests**: Included — US6 explicitly requires Vitest test infrastructure
**Organization**: Tasks grouped by user story (US1-US6) for independent delivery

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks (different files, no dependencies)
- **[Story]**: Maps to user story (US1-US6, P1-P3 in spec.md)
- Exact file paths in descriptions — all relative to `空调温控/`

---

## Phase 0: 预备 — Constitution + Constants (US0-Base)

**Purpose**: 建立本期规范的基础常量与宪法更新，所有 Phase 均依赖此 Phase

- [ ] T001 [P] [US0] 在 `config/constants.js` 新增 `EVENTS` 与 `STORAGE_KEYS` 常量段
  - `EVENTS: { SETTINGS_CHANGED: 'settings:changed', DEVICE_CONNECTED: 'deviceConnected', APP_ERROR: 'app-error', APP_TOAST: 'app-toast', APP_LOADING: 'app-loading' }`
  - `STORAGE_KEYS: { CONNECTED_DEVICE: 'connectedDevice', STA_WIFI_HISTORY: 'staWifiHistory' }`
  - 每个 STORAGE_KEYS 加 JSDoc 注释标注允许的 schema 字段

- [ ] T002 [P] [US0] 在 `config/constants.js` 中删除 `OTA_DEFAULT_FIRMWARE_URL` 的令牌部分
  - 当前值: `'http://bin.bemfa.com/b/27002/3BcZGI1OTA5NDczM2FjYjkzMTg2N2Q1YWY5NGE1N2ZjNzg=FRESTEC.bin'`
  - 改为: `''`（空字符串），并注释说明"用户需自行从文档获取最新固件地址"
  - 搜索全项目 `OTA_DEFAULT_FIRMWARE_URL` 引用处本页也一并检查

- [ ] T003 [P] [US0] 更新 `.specify/memory/constitution.md` 版本至 v1.1.0
  - 追加 Principle VI「Storage Key 单一职责」
  - 追加 Principle VII「凭据零持久化」
  - 日期更新为 2026-07-06

- [ ] T004 [P] [US0] 在 `config/constants.js` 新增 `POLL_BACKOFF_INTERVAL: 30000`
  - 设备连续失败 ≥ 3 次后排级轮询间隔

**Checkpoint**: `constants.js` 已含 EVENTS / STORAGE_KEYS / POLL_BACKOFF_INTERVAL；constitution 已追加两原则

---

## Phase 1: User Story 1 — 统一错误处理 (Priority: P1) 🔴

**Goal**: 消灭全项目静默 catch，让 ErrorHandler 真正被调用
**Independent Test**: 断开设备后进入温湿度设置页，看到 toast 提示而非空白表单

### Implementation for US1

- [ ] T005 [US1] 增强 `services/errorHandler.js` 的 `handleError` 静默通道
  - `options.silent` 不是空白 catch，而是 `console.warn('[app] silent error:', error.message)` 含结构化键
  - 确保所有经 `handleError(e)` 的错误调用至少有一条 console.error 或 warn

- [ ] T006 [US1] 修复 `pages/settings/temp-hum.vue:177` 的 `getSettings` 静默 catch
  - 当前: `catch (e) { /* 静默 */ }`
  - 改为: `catch (e) { this.showToast('提示', '获取设置失败', 'warning'); console.warn('[temp-hum] getSettings failed', e.message); }`
  - 表单保留默认值（data 内已声明，符合宪法 II）

- [ ] T007 [US1] 修复 `pages/index/index.vue:374` 的 `fetchTempHum` 静默 catch
  - 当前: `catch (e) { /* 静默，不干扰主轮询 */ }`
  - 改为: `catch (e) { this.failCount++; console.warn('[index] fetchTempHum failed', e.message, `(${this.failCount}/${this.failThreshold})`); }`
  - 保留 failCount 递增，供退避判定使用

- [ ] T008 [P] [US1] grep 全项目 `catch (e)` 并逐条 review，每处判定
  - `rg "catch\s*\(" --include '*.vue' --include '*.js'` 列出所有 catch 分支
  - 规则：
    * 带 toast / ErrorHandler 调用：通过 ✅
    * 空白块 `{ }`：改为 `ErrorHandler.handleError(e, { silent: true })` 或加注释说明降级理由 ✅
    * 当前有 2 处合法：`_trySelfHeal`（P0 自愈不需要 toast）与 `onLoad: getSystemInfoSync`（非异步）
  - 完成后 `/* 静默 */` 全项目命中 ≤ 2

- [ ] T009 [US1] 将 `mixins/modal-mixin.js` 中硬编码的事件名替换为 `constants.EVENTS`
  - 当前第 146-148 行第 150-155 行 `'app-error'` / `'app-toast'` / `'app-loading'`
  - 改为 `constants.EVENTS.APP_ERROR` / `constants.EVENTS.APP_TOAST` / `constants.EVENTS.APP_LOADING`

**Checkpoint**: `rg "catch\s*\(\s*e?\s*\)\s*\{?\s*/\*?\s*[静默|silent]"` ≤ 2 命中，每处有说明

---

## Phase 2: User Story 2 — 缓存一致性清理 (Priority: P1) 🔴

**Goal**: 移除 `tempHumSettings` 冗余缓存，清出 `acStatus` 快照混入
**Independent Test**: 保存阈值后 storage 无 `tempHumSettings` 键；storage `connectedDevice` 不含 `acStatus`

### Implementation for US2

- [ ] T010 [US2] 删除 `pages/settings/temp-hum.vue` 中 `saveSettings` 保存 tempHumSettings 逻辑
  - 当前第 194-198 行: `uni.setStorageSync('tempHumSettings', { ... })`
  - 整块删除，不保留
  - 保存成功后仅 toast 成功 + emit 事件（US5 加的），不再写 storage

- [ ] T011 [US2] 删除 `pages/index/index.vue` 中 `connectedDevice.acStatus` 同步逻辑
  - 当前第 330-340 行: `if (dev.acStatus !== this.acStatus)` 块
  - 以及第 387-388 行: `d.acStatus = on; uni.setStorageSync('connectedDevice', d)`
  - 全部删除；`acStatus` 仅响应式变量，权威源为 `fetchStatus()`

- [ ] T012 [US2] 检查 `mixins/device-mixin.js` 中的 storage 读写，确保不涉及 `acStatus`
  - `checkDevice()` 仅读写 `address/deviceId/connected/location`
  - `setDevice(info)` 同上
  - `disconnectDevice()` 调用 `uni.removeStorageSync('connectedDevice')` — 无 acStatus

- [ ] T013 [P] [US2] grep 全项目 `acStatus.*setStorage` / `acStatus.*getStorage` 确认 0 命中
  - 目标：全项目无一处将 `acStatus` 写/读 storage
  - 业务态完全由 `fetchStatus` → `setIfChanged('acStatus', ...)` 维护

**Checkpoint**: `rg "tempHumSettings"` 全项目 0 命中；`rg "acStatus.*setStorage"` 0 命中

---

## Phase 3: User Story 3 — 轮询减负 (Priority: P2) 🟡

**Goal**: 合并双轮询 + 暂停后台 + 失败退避
**Independent Test**: 切微信后设备 HTTP 请求停止；切回后恢复；failCount≥3 间隔退避

### Implementation for US3

- [ ] T014 [US3] 删除 `pages/index/index.vue` 的 `tempPollTimer` 与 `fetchTempHum`
  - `data()` 中删除 `tempPollTimer: null`
  - `startPoll()` 中删除 `this.tempPollTimer = setInterval(...)` 与 `this.fetchTempHum()` 初始调用 (第 354-360 行)
  - `stopPoll()` 中删除 `if (this.tempPollTimer)` 分支
  - -> `onUnload` 无需更改，stopPoll 清理逻辑已集中
  - 温湿度改由 `fetchStatus` 读取（`res.data.temperature` / `res.data.humidity`）

- [ ] T015 [US3] 在 `fetchStatus` 回包中补充 `currentTemp` / `currentHum` 赋值
  - 当前 `fetchStatus` (第 302 行) 有 `// 温湿度由 fetchTempHum() 轻量级轮询独立刷新，此处不再覆盖`
  - 改为: `this.setIfChanged('currentTemp', res.data.temperature != null ? res.data.temperature : null)`
  - 改: `this.setIfChanged('currentHum', res.data.humidity != null ? res.data.humidity : null)`
  - 缺陷：如果 getStatus 不含有温湿度，则后续仍从 getTempHum() 咖 - 实际检查 API 回包字段

- [ ] T016 [US3] 轮询可见性管理：`onShow` 恢复，`onHide` 暂停
  - `onShow` (第 240 行后): `resetPoll()` — 拉一次 `fetchStatus` + 重新 `startPoll(normalInterval)`
  - 新增 `hidePoll()` 方法 = 调 `stopPoll()`
  - `onHide` 调 `hidePoll()`
  - `onLoad` 已调 `startPoll()`，不冲突

- [ ] T017 [US3] 轮询指数退避：failCount ≥ `failThreshold` 时切换 interval
  - `startPoll(interval)` 接收 interval 参数，默认 `constants.POLL_INTERVAL`
  - 在 `fetchStatus` 的 catch 分支 (第 342 行) 中: 如果 `this.failCount >= this.failThreshold`:
    - `this.stopPoll()`
    - `this.startPoll(constants.POLL_BACKOFF_INTERVAL)` // 30 秒
    - toast 一次 "设备连接异常，已降低心跳频率" (显示一次即可，用标志位防重复)
  - `fetchStatus` 成功分支重置: `this.stopPoll(); this.startPoll(constants.POLL_INTERVAL)`
  - 加 data 字段 `hasShownBackoffToast: false` 避免重复 toast

- [ ] T018 [P] [US3] 调整 `config/constants.js` `TEMP_POLL_INTERVAL` 标记为废弃
  - 加注释 `// @deprecated 自 v2.3.0 起温湿度由 getStatus 承载，不再单独轮询`
  - 不删除（若未来需要恢复），但注释清晰

**Checkpoint**: 前台对设备 ≤6 req/min；切后台 0 req；设备连续失败 toast 提示 + 退避间隔 30s

---

## Phase 4: User Story 4 — 安全加固 (Priority: P2) 🟡

**Goal**: 移除硬编码令牌 + 密码不落 storage + OTA 二次确认
**Independent Test**: 反编译 APK 不出现 `bemfa` 令牌；storage dump 无明文密码

### Implementation for US4

- [ ] T019 [US4] 加固 `pages/settings/ota.vue` — 默认 URL 空 + 二次确认
  - 读 `ota.vue` 当前 OTA URL 初始值的来源
  - 将默认值改为 `''`（空白），placeholder 文字: `"请粘贴固件下载地址"`
  - 点击"开始升级"前弹出 `showConfirm`:
    - title: `"确认升级"`
    - content: `将向 <网址中的域名> 发起 OTA 请求，设备将重启。升级过程中不要断开供电。`
  - 确认后才调 `apiService.otaUpdate()`

- [ ] T020 [US4] 加固 `pages/settings/sta-wifi.vue` — 密码瞬态
  - 读当前实现：密码是否写入 storage?
  - 保存 STA WiFi 时: password 仅在 `apiService.setStaWifi` 的请求载荷中使用
  - 不将 password 写入 `uni.setStorageSync`
  - 如现有有"记住密码"逻辑: 改为仅存 SSID 到 `staWifiHistory`（不含密码）
  - 注释声明: `// 密码仅瞬态 in-memory，不落持久存储 (宪法 VII)`

- [ ] T021 [US4] 加固 `pages/settings/mqtt-config.vue` — 同上
  - `mqttConfig.password` 仅 in-memory
  - 不允许存到 storage 或 MQTT 连接缓存
  - 追加注释

- [ ] T022 [P] [US4] 加固 `pages/settings/ap-wifi.vue` 与 `pages/device/device.vue` 挨个检查
  - AP WiFi 密码：发送 setSsid / setWifiPassword 后不保留
  - device.vue 连接设备：无任何密码字段出现在 storage
  - 逐个 grep `password|pass|password|token|key|secret` 确认无 storage 写路径

- [ ] T023 [US4] 在 `services/api.js` 中确认所有请求载荷不来自 storage 密码字段
  - 检查 `setStaWifi` / `setMqttConfig` / `setSsid` / `setWifiPassword` 的 data 来源
  - 如果这些方法不从 storage 读密码，仅从调用方传参 — 通过 ✅

**Checkpoint**: storage dump 无明文密码；`rg "password.*setStorage\|setStorage.*password"` 0 命中

---

## Phase 5: User Story 5 — 跨页面事件同步 (Priority: P3) 🟢

**Goal**: 保存阈值后 emit 事件，首页立即刷新无需等轮询
**Independent Test**: 调阈值返首页 ≤ 500ms 规则卡片更新

### Implementation for US5

- [ ] T024 [US5] 在 `pages/settings/temp-hum.vue` 的 `saveSettings` 成功后 emit
  - 第 199 行 toast 成功之后: `uni.$emit(constants.EVENTS.SETTINGS_CHANGED, { type: 'temp_hum' })`
  - import `constants` 到本页（确认已 import 后是否 get -- 检查）
  - 需检查 temp-hum.vue 当前是否已 import constants（>= v2.2.1 后应已引入）; 如无，import

- [ ] T025 [US5] 在 `pages/index/index.vue` 的 `onLoad` 注册监听
  - `uni.$on(constants.EVENTS.SETTINGS_CHANGED, this._onSettingsChanged)`
  - `_onSettingsChanged(e)` 方法: `if (this.deviceConnected && !this.statusPending) this.fetchStatus()`
  - 在 `onUnload` 解绑: `uni.$off(constants.EVENTS.SETTINGS_CHANGED, this._onSettingsChanged)`
  - 靠 statusPending 标志做竞态保护，避免重复 fetch

- [ ] T026 [US5] 对 `_onSettingsChanged` 加 throttle 保护
  - 新建 `utils/throttle.js` — 极简实现（≤ 30 行，无新依赖）:
    ```js
    export function throttle(fn, delay = 500) {
      let last = 0, timer = null;
      return function(...args) {
        const now = Date.now();
        if (now - last >= delay) {
          last = now;
          fn.apply(this, args);
        } else {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => { last = Date.now(); fn.apply(this, args); }, delay - (now - last));
        }
      };
    }
    ```
  - `_onSettingsChanged` 在 onLoad 注册为 `throttle(this._onSettingsChangedRaw, 500)`
  - 或者直接用 `fetchStatus` 自带的 `statusPending` 做保护（即仅防并发不 throttle 也是可接受方案）

- [ ] T027 [P] [US5] 同步其他设置页 emit 事件
  - `pages/settings/ac-params.vue` 保存成功后 `uni.$emit(constants.EVENTS.SETTINGS_CHANGED, { type: 'ac_params' })`
  - `pages/settings/scene.vue` 保存成功后 emit `{ type: 'scene' }`
  - `pages/settings/calibration.vue` 保存成功后 emit `{ type: 'calibration' }`
  - 每个 .vue 确认已有 import constants

**Checkpoint**: 修改 `temp-hum` 阈值保存，返回首页，ruleBrief 在 ≤ 500ms 更新

---

## Phase 6: User Story 6 — 测试基础设施 (Priority: P3) 🟢

**Goal**: Vitest + @vue/test-utils@1 兜底回归，至少覆盖 api.js request 与 SliderControl applyDelta
**Independent Test**: `npm run test` 退出 0，≥6 用例通过

### Implementation for US6

- [ ] T028 [US6] 安装测试依赖
  - 执行: `npm install --save-dev vitest@^1 @vue/test-utils@^1 jsdom@^24`
  - 确认 `package.json` devDependencies 更新

- [ ] T029 [US6] 配置 Vitest
  - 新建 `vitest.config.js`:
    ```js
    import { defineConfig } from 'vitest/config';
    export default defineConfig({
      test: {
        environment: 'jsdom',
        include: ['tests/**/*.test.js'],
        globals: true
      }
    });
    ```
  - `package.json` 的 scripts 添加:
    - `"test": "vitest run"`
    - `"test:watch": "vitest"`

- [ ] T030 [US6] 新建 `tests/services/api.test.js`
  - Mock `uni.request` 通过 `vi.stubGlobal`:
    ```js
    vi.stubGlobal('uni', { request: vi.fn() })
    ```
  - 用例 1: 200 成功回包 `{ status: 'success', data: {...} }` → 断言 resolve
  - 用例 2: 200 失败回包 `{ status: 'error', data: { message: '参数错误' } }` → 断言 reject + deviceError=true
  - 用例 3: 404 → 断言 reject message 含"设备未响应"
  - 用例 4: timeout → 断言 reject message 含"请求超时"
  - 用例 5: `setDeviceAddress('192.168.1.1')` 后 `baseUrl` 正确更新

- [ ] T031 [US6] 新建 `tests/components/SliderControl.test.js`
  - Mount SliderControl(`value=25, min=20, max=50, step=1`)
  - 用例 1: `onQuickClick({delta: +5})` → emit `changing` 值为 30
  - 用例 2: `onQuickClick({delta: -10})` → emit `changing` 值为 15 (被 clamp 成 20)
  - 用例 3: `applyReset()` → emit `changing` 值为 20 (min clamp)
  - 用例 4: `applyDelta(+1)` → emit 值为 26

- [ ] T032 [P] [US6] 新建 `tests/utils/validator.test.js`
  - 用例 1: `isValidAddress('192.168.1.1')` true
  - 用例 2: `isValidAddress('999.999.999.999')` false
  - 用例 3: `isValidAddress('esp8266-ac.local')` true
  - 用例 4: `isValidPort(8080)` true, `isValidPort(70000)` false
  - 用例 5: `isValidUrl('http://example.com/bin')` true

- [ ] T033 [US6] 同仓库的 `.gitignore` 校验 — tests 目录不需忽略
  - 当前 `.gitignore` 无忽略 tests
  - 确认 `node_modules/` 已忽略，vitest.config.js 不忽略

- [ ] T034 [US6] 最终验证: `npm run test` 退出 0
  - 输出 ≥ 12 个用例通过（3 个文件 × 各 4 5 个 at minimum）

**Checkpoint**: `npm run test` 退出 0，控制台输出 Green ✅ 不少于 2 个 describe

---

## Phase 7: Polish & 收尾

**Purpose**: 全项目交叉检查 + 构建验证

- [ ] T035 [P] [Polish] 全项目 grep `console.log(` 清调试日志
  - `rg "console\.log\(" --include '*.vue' --include '*.js'` 逐条判定:
    * `console.error` / `console.warn` — 保留 ✅
    * `console.log` — 删除 ✅（调试残留不应发布）
  - 请判断是否有应该保留的合法 `console.log` 输出

- [ ] T036 [P] [Polish] 更新 `README.md`
  - 添加 `##  测试` 节
  - `npm run test` 说明 + Vitest 简介

- [ ] T037 [Polish] 构建验证
  - 执行: `npm run build:h5` 确认编译无 Error
  - 不得有红色 warning 关于 import / export / alias

**Checkpoint**: README 含测试指南；构建无 fatal error

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 0 (Constants + Constitution) ← 所有 Phase 前必须
    ↓
Phase 1 (US1) → Phase 2 (US2) → Phase 3 (US3) → Phase 5 (US5) → Phase 7
                              ↓ Phase 4 可并行启用 Phase 1 后
                              ↓ Phase 6 可并行与其他 Phase 无冲突
```

- **Phase 0** 必须最先完成（Phase 5 依赖 EVENTS 常量）
- **Phase 1 与 Phase 2** 都改 temp-hum.vue 和 index.vue，部分同一函数 — 建议顺序 (P1 → P2)
- **Phase 3** 依赖 Phase 2 (index.vue 无 acStatus 后才重整 fetchStatus)
- **Phase 4** 与 Phase 1/2/3 适当并行（改 ota.vue / sta-wifi.vue / mqtt-config.vue 改动与 index 不会冲突）
- **Phase 5** 依赖 Phase 0 (EVENTS) + Phase 2 (settings logic finalized)
- **Phase 6** 完全独立，可任何时候开始
- **Phase 7** 在所有 Phase 完成后

### Parallel Opportunities

| 并行组 | 包含 Phase | 条件 |
|--------|----------|------|
| A | Phase 1 + Phase 6 | Phase 0 先完成；Phase 6 不受 Phase 1 影响 |
| B | Phase 4 + Phase 6 | Phase 0 先完成；Phase 4 对独立 v ue 文件改动 |
| C | Phase 3 T014+T015 (移 timer) 与 T018 (废弃常量) | 不同文件，可并行 |
| D | Phase 5 T024-T026 与 T027 (其他设置页 emit) | 不同 vue，可并行 |

### Within Each Phase

- T001/T002/T003/T004 (Phase 0) 全 P 平行 → 可同时进行
- T005/T006/T008 都需要 grep review，可先执行 T005 + T006 (两文件)，T007 独立，T008 汇总扫描
- Phase 2 T010-T012 需顺序 (改 temp-hum → 同步改 index → 验证 devie-mixin)
- Phase 3 T014 + T015 先完成 → T016 show/hide 加 → T017 backoff

---

## Implementation Strategy

### MVP First (US1 + US2 完成则出 MVP)

1. Phase 0: Constants 完备
2. Phase 1: 静默 catch 清空 — 所有页面错误可见 ✅
3. Phase 2: 缓存清空 — 无歧义数据 ✅
4. **STOP**: 回归验证、所有验收场景

### Incremental Delivery

- MVP (Phase 0 + 1 + 2) → 错误通透明 + 缓存干净
- + Phase 3 → 轮询优化，ESP8266 减负
- + Phase 4 → 安全收紧
- + Phase 5 → 事件同步，UX 流畅
- + Phase 6 → 测试回归骨架
- + Phase 7 → Polish 收尾

### Single-Developer Strategy

按 Phase 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 顺序执行
（无多人分配，仅按文件冲突程度决定 Phase 顺序）

---

## Git 提交策略（参考）

| Phase | Commit Message | 
|-------|---------------|
| Phase 0 | `chore: add EVENTS & STORAGE_KEYS constants, update constitution to v1.1` |
| Phase 1 | `fix: enforce error-handling everywhere, zero client-facing silent-catch blocks` |
| Phase 2 | `fix: remove stale tempHumSettings cache & acStatus snapshot pollution` |
| Phase 3 | `fix: consolidate dual polling into single interval with backoff on failure` |
| Phase 4 | `fix: purge embedded OTA token & prevent credential storage in localStorage` |
| Phase 5 | `feat: event-driven settings sync — settings pages emit on save, home page listens` |
| Phase 6 | `test: add Vitest scaffold with api, SliderControl, validator coverage` |
| Phase 7 | `chore: polish — remove debug logs, update README, verify build integrity` |

---

## Notes

- Final `npm run test` count ≥ 12 用例；文件列表: `api.test.js` ×5, `SliderControl.test.js` ×4, `validator.test.js` ×5
- Constitution v1.1 原子则 VII 禁止密码写持久存储已改动 — 先在 Phase 0 更新
- Phase 3 关键衡量：前台 RPS ≤ 6/min；需手动验证
- Phase 5 event-driven 使用 throttle 目估不依赖 package.json 加依赖
- 所有改动符合 constitution v1.1 各原则