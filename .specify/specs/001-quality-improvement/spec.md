# Feature Specification: App 质量改进 v2.2.1

**Created**: 2026-06-26

**Status**: Draft

**Input**: 用户提供的完整代码审查（11 项问题，评分 6.5/10）

## 用户故事

### User Story 1 - 修复严重 Bug (Priority: P1)

修复三项灾难级 Bug：`onHide` 清空 storage、`device` 未响应式声明、全项目无防抖。

**Why this priority**: 这三项直接导致用户数据丢失、逻辑判断失效和请求错乱，是拦在用户体验面前的最严重问题。

**Independent Test**: 切后台再切回，连接信息不丢失；快速点击连接/开关按钮，只产生 1 次请求。

**验收场景**:
1. **Given** 用户已连接设备，**When** 切到微信再切回 App，**Then** 连接信息不丢失，设备保持在线
2. **Given** `this.device` 在模板中绑定，**When** 连接设备后赋值，**Then** 模板响应式更新
3. **Given** 用户快速点击「开启空调」3 次，**Then** 只发出 1 次请求

---

### User Story 2 - 抽取全局 Mixin 消除代码重复 (Priority: P2)

将 `checkDevice()`、`showToast()`、`showConfirm()`、`setDeviceAddress()` 等 12 个页面重复的方法抽取为 Vue mixin，减少 80% 重复代码。

**Why this priority**: 重复代码是后续维护的噩梦。先抽取基础 mixin，后续改进才能建立在干净基础上。

**Independent Test**: 每个页面调用 mixin 方法后行为与之前完全一致；修改 mixin 一处，所有页面同步生效。

**验收场景**:
1. **Given** `device-mixin.js` 已创建，**When** 12 个页面导入此 mixin，**Then** 各页面的 `checkDevice()` 行为不变
2. **Given** `modal-mixin.js` 已创建，**When** 13 个页面导入，**Then** `showToast`/`showConfirm` 行为不变
3. **Given** 删除所有页面中重复的 `checkDevice` 实现，**When** 编译运行，**Then** `checkDevice` 功能正常

---

### User Story 3 - 常量配置 + 统一错误处理 (Priority: P2)

创建 `config/constants.js` 集中管理所有魔法数字（超时时间、IP 默认值、防抖间隔、品牌映射表），并建立统一错误处理通道。

**Why this priority**: 魔法数字散落各处使得修改困难；错误处理不统一导致用户无法判断故障原因。

**Independent Test**: 修改 `constants.js` 中的超时值后，所有页面读到的超时同步更新；模拟网络错误时，所有页面显示一致的中文错误提示。

**验收场景**:
1. **Given** `config/constants.js` 已创建，**When** 修改 `TOAST_DURATION` 值，**Then** 所有页面的 toast 显示时长同步变化
2. **Given** 设备离线，**When** 用户操作任一页面，**Then** 显示「设备已离线，请检查连接」提示
3. **Given** API 请求超时，**When** 捕获错误，**Then** 中文提示「连接超时，请检查网络」

---

### User Story 4 - 内存泄漏修复 + 输入校验 (Priority: P3)

修复 `device.vue` 的 `onGetWifiList` 回调重复注册问题和 `index.vue` 轮询残留问题；加强 IP 校验和前端输入验证。

**Why this priority**: 不影响正常功能，但长时间使用后可能导致内存增长和错误输入。

**Independent Test**: 进入设备页 10 次再退出，只注册 1 个回调；输入 `999.999.999.999` 被拦截。

**验收场景**:
1. **Given** 用户进入/退出设备页 10 次，**When** 查看回调注册数，**Then** 只有 1 个 `onGetWifiList` 回调
2. **Given** 用户输入 `999.999.999.999` ，**When** 点击连接，**Then** 提示「无效的 IP 地址」
3. **Given** `index.vue` 被 `redirectTo` 跳转，**When** 检查定时器，**Then** 轮询已清理

---

## 要求

### 功能要求
- **FR-001**: App.vue 必须删除 `onHide` 中的 `uni.clearStorageSync()` 调用
- **FR-002**: 所有模板绑定的字段必须在 `data()` 中有初始值声明
- **FR-003**: 所有用户触发型异步操作必须实现防抖（触发按钮禁用 + 标志位保护）
- **FR-004**: 三种通用逻辑必须抽取为全局 mixin：`checkDevice`、`showToast/showConfirm`、`apiService` 调用链
- **FR-005**: 所有魔法数字必须集中在 `config/constants.js`
- **FR-006**: 所有异步操作必须经过统一错误处理通道，离线检测覆盖所有页面
- **FR-007**: `onGetWifiList` 必须确保单次注册，`setInterval` 在页面销毁时清理
- **FR-008**: IP 输入校验必须严格（0-255 的各段校验）

## 成功标准

1. **SC-001**: 切后台再切回，连接信息 100% 不丢失
2. **SC-002**: 所有模板绑定字段在 `data()` 中声明，Vue2 响应式正常
3. **SC-003**: 快速点击操作按钮，请求数量 = 1（防抖生效）
4. **SC-004**: 12 个页面的重复代码被 mixin 替代，删除 >= 200 行重复代码
5. **SC-005**: `config/constants.js` 覆盖所有魔法数字，修改一处全局生效
6. **SC-006**: 离线状态在 10 秒内被检测并提示用户

## 假设

- 不改动 CSS/UI 设计体系，仅修复 JS 逻辑
- 不引入第三方库（Vuex/Pinia 等），优先使用 Vue2 mixin
- 不改动固件端代码，仅优化 App 端