# Feature Specification: App 深度优化 v2.3.0

**Feature Branch**: `002-deep-optimization`

**Created**: 2026-07-06

**Status**: Draft

**Input**: 在 001-quality-improvement 完成后的二次代码审查。
001 已修复严重 Bug（onHide 清空 storage、未声明响应式、无防抖），
本次聚焦 **安全 / 性能 / 测试 / 架构** 四大类遗留问题。

## 用户故事与测试

> 每个 story 可独立交付、独立验收。P1 为 MVP，其余增量推进。

### User Story 1 - 统一错误处理与静默吞异常清零 (Priority: P1)

消灭全项目 `catch (e) { /* 静默 */ }` 模式：`temp-hum.vue` 的 `getSettings()`、
`index.vue` 的 `fetchTempHum()` 等静默分支要么显式降级（保留 UI 数据但记录日志），
要么走统一错误通道向用户展示。建立 `ErrorHandler` 的强制使用规约。

**Why this priority**: 静默 catch 让用户面对无提示的失败界面，
违反 Constitution Principle V「统一错误处理与用户反馈」。
该问题在 001 既有 spec 中仅写入但未真正落地执行。

**Independent Test**: 断开设备后打开温湿度设置页，应在 toast 中
看到"获取设置失败"提示而不是空白表单；查看控制台有结构化日志。

**验收场景**:
1. **Given** 设备已断开或离线，**When** 用户进入 `temp-hum.vue` 页面，
   **Then** toast 提示"获取设置失败"，表单仍可用（保留上次值或默认值）
2. **Given** `index.vue` 的 `fetchTempHum` 第 3 次连续失败，**When** 检查控制台，
   **Then** 输出包含 failCount 与 endpoint，不再只有空 catch
3. **Given** 全项目搜索 `/* 静默 */`，**Then** 数量为 0 或每处带注释说明降级理由

---

### User Story 2 - 缓存一致性清理 (Priority: P1)

移除 `temp-hum.vue` 中 `uni.setStorageSync('tempHumSettings', ...)` 这一无用缓存；
统一 `connectedDevice` storage 仅承载连接信息，清出 `acStatus` 快照混入。
建立"storage key 单一职责"清单写入 Constitution。

**Why this priority**: 缓存与 `getStatus()` 数据不一致，
用户进入设置页时可能看到与服务端不同的旧阈值，构成数据正确性风险。

**Independent Test**: 修改 `temp-hum` 保存后 storage 中 `tempHumSettings` 不被写入；
`index.vue` 仍可通过 `getStatus()` 拉到最新阈值。

**验收场景**:
1. **Given** `temp-hum.vue` 保存成功，**When** 检查 storage，
   **Then** 不存在 `tempHumSettings` 键
2. **Given** `connectedDevice` storage，**When** 读取其内容，
   **Then** 仅包含 address/deviceId/connected/location，不包含 `acStatus`
3. **Given** `index.vue` 中 `toggleACStatus` 同步 acStatus 到 storage 的代码，
   **When** 删除该同步逻辑，**Then** UI 仍通过 fetchStatus 正常更新

---

### User Story 3 - 轮询性能与 ESP8266 减负 (Priority: P2)

合并双轮询为单轮询并按页面可见性暂停。ESP8266 当前每 5s 处理一次
`getTempHum` + 每 10s 一次 `getStatus`，应改为：
- 单轮询 10s（`getStatus` 已含温湿度，废弃 `tempPollTimer`）
- `onHide` / `visibilitychange` 暂停轮询，`onShow` 恢复
- 轮询间隔按 `failCount` 指数退避（异常时拉长到 30s）

**Why this priority**: ESP8266 资源受限，高频 HTTP 请求会拖慢设备主循环和红外发送。
不必要的轮询还耗电、耗用户流量。

**Independent Test**: 切后台后查看网络面板，HTTP 请求停止；
切回前台后立即拉一次状态并恢复轮询。

**验收场景**:
1. **Given** App 在前台运行，**When** 观察 30 秒，**Then** 对设备 HTTP 请求 ≤ 3 次
2. **Given** 用户切到微信，**When** 等 30 秒后切回，**Then** 期间请求为 0，
   切回时立即触发一次 `fetchStatus`
3. **Given** 设备连续失败 3 次，**When** 第 4 次轮询，**Then** 距上次 ≥ 30s（退避生效）

---

### User Story 4 - 安全加固：凭据处理与凭据存储 (Priority: P2)

- `constants.js:27` 中 OTA URL 内嵌 `b/27002/...` 令牌，移出代码至用户在 OTA 页输入
- WiFi 密码 / MQTT 密码发送前不落 storage（仅瞬态 in-memory）；如需记住，加 `*` 显示
- 在 OTA 升级页加显式"固件来源"提示，标明将向 `bemfa.com` 发起请求

**Why this priority**: 凭据泄露与隐私问题是 IoT 应用最高优先级的安全项。
配合固件端后续加 HTTPS / 鉴权。

**Independent Test**: 反编译 APK 或检查 storage dump 中不出现明文密码；
OTA 默认 URL 为空或从用户配置读取。

**验收场景**:
1. **Given** 反编译 APK，**When** 搜索 `bemfa` / `27002`，**Then** 命中 0 处
2. **Given** 用户连接 WiFi 时输入密码 `abc123`，**When** storage dump，
   **Then** 密码不出现在持久 storage 中，仅瞬态 in-memory
3. **Given** 打开 OTA 页，**When** 检查默认 URL，**Then** 默认值为空或 placeholder，
   并向用户提示"将向第三方服务器请求固件"

---

### User Story 5 - 跨页面状态同步（事件总线替代轮询） (Priority: P3)

`temp-hum.vue` 保存阈值成功后 `uni.$emit('settings:changed', { type: 'temp_hum' })`；
`index.vue` 监听该事件并立即 `fetchStatus()` 一次，无需等下次轮询。
建立项目级事件常量集中在 `constants.js` 的 `EVENTS` 段。

**Why this priority**: 用户改阈值后看首页需等 10s 才刷新，体验割裂。
事件驱动是 vuex 之外的轻量方案。

**Independent Test**: 在温湿度页修改阈值并保存，
返回首页规则卡片立即显示新阈值。

**验收场景**:
1. **Given** 用户在 `temp-hum.vue` 调整开机温度为 30°C 并保存，
   **When** 保存成功，**Then** `uni.$emit('settings:changed')`
2. **Given** `index.vue` 已在 `onLoad` 监听 `settings:changed`，
   **When** 收到事件，**Then** 立即 `fetchStatus()` 并更新 `ruleBrief`
3. **Given** 用户离开 `index.vue`，**When** `onUnload` 触发，
   **Then** 已 `uni.$off('settings:changed')` 解绑

---

### User Story 6 - 测试基础设施 (Priority: P3)

引入 Vitest（不影响 uni-app 构建）+ `@vue/test-utils@1` 跑 Vue2 组件测试，
建立 `tests/services/api.test.js` + `tests/components/SliderControl.test.js` 作为起点。
CI 不阻塞，仅本地 `npm run test` 入口。

**Why this priority**: 001 修复完全靠手工回归，相同问题易回归。
最小可测骨架即可帮助回归 `applyDelta` 边界、`setIfChanged` 行为等。

**Independent Test**: `npm run test` 输出 2 个 describe 通过。

**验收场景**:
1. **Given** 已配置 Vitest，**When** 执行 `npm run test`，
   **Then** 退出码 0，输出至少 2 个 describe 通过
2. **Given** `SliderControl` 长按超过 max，**When** 触发 applyDelta，
   **Then** 值被 clamp 为 max 而非超出
3. **Given** `api.request` 返回 `status: 'error'`，**When** 调用方 await，
   **Then** reject 一个带 `deviceError=true` 的 Error

---

## 边缘情况

- 网络 4G 切 WiFi 期间所有请求失败：US1 应让 UI 显示"网络切换中"而非设备离线
- ESP8266 复位中（OTA 后）：US3 退避策略应避免瞬间重试风暴
- 用户在设置页保存时正好收到 settings:changed 事件：US5 不应导致 index 与设置页数据打架
- 连续 emit `settings:changed`：US5 应做去重/throttle，避免 `fetchStatus` 并发

---

## 要求

### 功能要求

- **FR-001**: 全项目 `catch (e) {}` 空块必须替换为 `ErrorHandler.handleError(e, options)` 或显式注释说明降级
- **FR-002**: `temp-hum.vue` 保存设置后禁止再写 `tempHumSettings` 到 storage
- **FR-003**: `connectedDevice` storage 不再承载 `acStatus` 快照
- **FR-004**: 移除 `index.vue` 的 `tempPollTimer`，温湿度改由 `getStatus` 单轮询提供
- **FR-005**: 轮询在 `onHide` 暂停、`onShow` 恢复
- **FR-006**: 设备连续失败 ≥ 3 次后，轮询间隔退避到 ≥ 30s
- **FR-007**: `constants.OTA_DEFAULT_FIRMWARE_URL` 从代码中删除，改为 `OTA_DEFAULT_FIRMWARE_URL: ''`
- **FR-008**: WiFi / MQTT 密码禁止写入持久 storage；如保存需明确"记住密码"复选框
- **FR-009**: OTA 升级页加入第三方服务器请求提示 + 用户二次确认
- **FR-010**: `temp-hum.vue` 保存成功后 `uni.$emit('settings:changed')`
- **FR-011**: `index.vue` 在 `onLoad` 注册 `settings:changed`，收到后 `fetchStatus()` 一次
- **FR-012**: 全局事件名集中在 `constants.EVENTS` 维护
- **FR-013**: 引入 Vitest + `@vue/test-utils@1` 到 `devDependencies`
- **FR-014**: 至少覆盖 `services/api.js` 的 `request` 错误分类与 `components/SliderControl.vue` 的 `applyDelta` 边界

### 关键实体

- **StorageKey**: `connectedDevice`（连接信息）、`staWifiHistory`（可选，仅 SSID 不含密码）
- **Event**: `settings:changed` / `device:connected` / `app:error` 等，统一在 `constants.EVENTS`

## 成功标准

- **SC-001**: 存储 dump 中不再出现明文 WiFi/MQTT 密码
- **SC-002**: 切后台 30s 期间对设备的 HTTP 请求 = 0，切回后立即有 1 次刷新
- **SC-003**: 修改阈值并保存，返回首页 ≤ 500ms 内 ruleBrief 更新为新值
- **SC-004**: 全项目 grep `/* 静默 */` 命中数 ≤ 2 且每处有解释注释
- **SC-005**: `npm run test` 退出码 0 且至少 6 个用例通过
- **SC-006**: 反编译 APK 不出现 `bemfa.com` 令牌字符串

## 假设

- 不改动 ESP8266 固件代码（API 契约不变）
- HTTPS / 设备鉴权由固件端后续迭代，本期仅在 App 侧做能做的安全收紧
- 不引入 Vuex/Pinia（沿用 001 决策）
- 测试仅覆盖核心 service 与高频组件，不追求覆盖率数字
- OTA 默认 URL 清空后用户需手动粘贴；可保留"获取固件地址"链接指向文档但不内嵌令牌
