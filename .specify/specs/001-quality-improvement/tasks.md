# 任务列表: App 质量改进 v2.2.1

## Phase 1: 修复严重 Bug (US1 — P1)

**目的**: 修复三项灾难级 Bug

- [ ] T001 [P] 删除 `App.vue:28` 的 `uni.clearStorageSync()`
  - 文件: `App.vue`
  - 找到 `onHide` 或 `onHide: function()` 中的 `uni.clearStorageSync()`，整行删除
  - **不要删除其他逻辑**

- [ ] T002 [P] 在 `index.vue` 的 `data()` 中添加 `device: null`
  - 文件: `pages/index/index.vue`
  - 在 `data()` 中添加 `device: null`
  - 确保 `checkDevice()` 中 `this.device` 的赋值是响应式的

- [ ] T003 [P] 为 `doConnect`、`toggleACStatus`、`switchScene` 添加防抖
  - 文件: `pages/device/device.vue`, `pages/index/index.vue`
  - `doConnect`: `connecting` 标志已存在，确保按钮 `:disabled="connecting"`
  - `toggleACStatus`: `switchLoading` 标志已存在，确保 `@click` 时检查
  - `switchScene`: 同上
  - 如果快速点击场景按钮，每次只触发一次请求

**Checkpoint**: 切后台再切回连接不丢失；快速点击只发 1 次请求

---

## Phase 2: 抽取全局 Mixin (US2 — P2)

**目的**: 消除 12 个页面的重复代码

- [ ] T004 [P] 创建 `mixins/device-mixin.js`
  - 新建 `mixins/` 目录
  - 抽取 `checkDevice()` — 从 localStorage 读取设备，设置 apiService 地址
  - 抽取 `deviceConnected`、`deviceAddress`、`deviceId` 等 data 字段
  - 抽取 `onDeviceEvent(e)` 处理方法
  - 导出为 Vue mixin 对象

- [ ] T005 [P] 创建 `mixins/modal-mixin.js`
  - 抽取 `showToast(title, content)` — 异步方法
  - 抽取 `showConfirm(title, content)` — 带按钮的方法
  - 抽取 `handleModalConfirm()`、`handleModalCancel()`
  - 抽取 `modalVisible`、`modalTitle`、`modalContent` 等 data 字段
  - 导出为 Vue mixin 对象

- [ ] T006 [P] 在 12 个页面中导入 mixin 并删除重复代码
  - 搜索 `checkDevice()` 出现的所有文件（约 12 个），替换为 mixin
  - 搜索 `showToast`/`showConfirm` 出现的所有文件（约 13 个），替换为 mixin
  - 删除各页面中对应的方法体和 data 声明

- [ ] T007 [P] 编译运行验证
  - 确认 `npm run build` 或 `uni-app build` 编译无错误
  - 手动测试 3 个关键页面：index、device、ac-set

**Checkpoint**: 12 个页面的重复代码被 2 个 mixin 替代

---

## Phase 3: 常量配置 + 错误处理 (US3 — P2)

**目的**: 集中管理魔法数字，统一错误处理

- [ ] T008 [P] 创建 `config/constants.js`
  - `HTTP_TIMEOUT: 8000`
  - `POLL_INTERVAL: 10000`
  - `TOAST_DURATION: 1500`
  - `DEFAULT_IP: '192.168.4.1'`
  - `OTA_TIMEOUT: 60000`
  - `WS_PORT: 81`
  - `BRAND_MAP: { tcl:'TCL', midea:'美的', ... }`
  - `ERROR_MESSAGES: { NETWORK_ERROR: '网络连接失败', TIMEOUT: '连接超时', ... }`

- [ ] T009 [P] 替换全项目魔法数字为 constants 引用
  - 搜索 `8000`、`10000`、`1500`、`192.168.4.1`、`60000`
  - 逐一替换为 `CONSTANTS.HTTP_TIMEOUT` 等引用
  - 将 BRAND_MAP 从 computed 移到 constants

- [ ] T010 [P] 统一错误处理通道
  - 在 `api.js` 中添加 `handleError(err)` 静态方法
  - 映射 HTTP 错误码到中文消息
  - 添加 `isOffline()` 离线检测方法（心跳）

- [ ] T011 [P] 统一所有页面的 catch 路径
  - 搜索所有 `catch (e)` 语句
  - 替换为 `apiService.handleError(e)` 或统一的中文提示

**Checkpoint**: 修改 constants 一处，全项目同步；离线 10 秒内提示

---

## Phase 4: 内存泄漏 + 输入校验 (US4 — P3)

**目的**: 修复长期使用中的资源泄漏和输入漏洞

- [ ] T012 [P] 修复 `device.vue` 的 `onGetWifiList` 回调
  - 将 `onGetWifiList` 注册移到 `onLoad`，避免重试循环中重复注册
  - 在 `onUnload` 中确保 `offGetWifiList` 被调用

- [ ] T013 [P] 修复 `index.vue` 轮询清理
  - 在 `redirectTo` 前检查 `pollTimer` 并清理
  - 或在 `onUnload` 中确保清理（已验证）

- [ ] T014 [P] 加强 IP 正则校验
  - 原正则: `/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/`
  - 新正则: `/^(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])$/`

**Checkpoint**: 进入/退出设备页 10 次，回调不重复；输入 999.999.999.999 被拦截

---

## 里程碑

| 阶段 | 预计时间 | 交付物 |
|------|----------|--------|
| Phase 1 | 30 分钟 | Bug 修复完成，切后台不丢数据 |
| Phase 2 | 45 分钟 | 2 个 mixin + 12 页面导入 |
| Phase 3 | 30 分钟 | constants.js + 统一错误处理 |
| Phase 4 | 20 分钟 | 内存泄漏修复 + IP 校验 |

## 执行顺序

Phase 1 → Phase 2 → Phase 3 （Phase 4 可并行）
