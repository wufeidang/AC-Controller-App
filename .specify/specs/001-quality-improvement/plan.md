# 实施计划: App 质量改进 v2.2.1

## Summary

根据代码审查结果（评分 6.5/10），对空调温控 App 进行系统性质量改进。
按严重程度排序：先修 P1 严重 Bug，再抽 mixin 重构，最后处理次要问题。

## 技术上下文

**语言**: JavaScript (Vue 2.6, uni-app)
**状态**: 无状态管理，依赖 localStorage + 事件总线
**构建**: HBuilderX / uni-app CLI
**主要页面**: index.vue, device.vue, ac-set.vue, device-set.vue, room-set.vue
**服务层**: services/api.js (单例，31 个 API 方法)
**组件**: CustomModal, Loading, SettingItem, Card, Button

## 实施阶段

### Phase 1: 修复严重 Bug (US1 — P1, ~30min)

**目标**: 删除三处灾难级 Bug

| 任务 | 文件 | 改动 |
|------|------|------|
| T001 | `App.vue:28` | 删除 `uni.clearStorageSync()` 行，保留其他逻辑 |
| T002 | `index.vue` | 在 `data()` 中添加 `device: null` 声明 |
| T003 | 全项目 | 为 `toggleACStatus`、`switchScene`、`doConnect` 添加防抖/禁用按钮 |

**校验**: 切后台再切回连接不丢；快速点击只发 1 次请求

---

### Phase 2: 抽取全局 Mixin (US2 — P2, ~45min)

**目标**: 消除重复代码，创建 3 个 mixin

| 任务 | 文件 | 改动 |
|------|------|------|
| T004 | `mixins/device-mixin.js` | 新建：抽取 `checkDevice()`、`deviceConnected` state、`apiService.setDeviceAddress()` |
| T005 | `mixins/modal-mixin.js` | 新建：抽取 `showToast()`、`showConfirm()`、`handleModalConfirm/cancel` |
| T006 | 12 个页面 | 导入 mixin，删除重复方法体 |
| T007 | 编译验证 | 确认所有页面行为不变 |

**数据结构**:
```
mixins/
  device-mixin.js   → checkDevice(), deviceConnected, apiService setup
  modal-mixin.js    → showToast(), showConfirm(), modal state
```

---

### Phase 3: 常量配置 + 错误处理 (US3 — P2, ~30min)

**目标**: 集中魔法数字，统一错误处理

| 任务 | 文件 | 改动 |
|------|------|------|
| T008 | `config/constants.js` | 新建：TIMEOUT, POLL_INTERVAL, TOAST_DURATION, DEFAULT_IP, BRAND_MAP 等 |
| T009 | 全项目 | 替换魔法数字为 constants 引用 |
| T010 | `services/api.js` | 添加统一错误处理（中文消息映射 + 离线检测） |
| T011 | 所有页面 | 统一 catch 路径为 `apiService.handleError()` |

---

### Phase 4: 内存泄漏 + 输入校验 (US4 — P3, ~20min)

| 任务 | 文件 | 改动 |
|------|------|------|
| T012 | `device.vue` | 修复 `onGetWifiList` 回调只注册一次 |
| T013 | `index.vue` | 确保 `redirectTo` 前清理轮询 |
| T014 | `device.vue` | IP 正则加强为严格校验 |

---

## 依赖关系

- Phase 1 无依赖，可独立执行（P1）
- Phase 2 依赖于 Phase 1（在同一文件上操作，避免冲突）
- Phase 3 依赖于 Phase 2（mixin 中的 toast 需引用 constants）
- Phase 4 无依赖，可与 Phase 2/3 并行

## 风险

| 风险 | 缓解 |
|------|------|
| mixin 抽取后某些页面行为变化 | 每个 mixin 抽取后手动测试 3 个关键页面 |
| 常量替换遗漏 | 在 constants.js 中导出 ALL，IDE 全局搜索魔法数字 |
| onGetWifiList 回调时序 | 在 `onUnload` 中强制调用 `uni.offGetWifiList()` |