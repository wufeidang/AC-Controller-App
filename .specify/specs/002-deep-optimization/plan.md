# Implementation Plan: App 深度优化 v2.3.0

**Branch**: `002-deep-optimization` | **Date**: 2026-07-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-deep-optimization/spec.md`
（在 001-quality-improvement 基础上的二次审查）

## Summary

001 已修复严重 Bug 与抽取 mixin；本次聚焦四类遗留问题——

1. **错误处理真正落地**：消灭静默 catch，让 `ErrorHandler` 被实际调用
2. **缓存一致性**：清理 `tempHumSettings` 与 `acStatus` 快照混入
3. **轮询减负**：合并双轮询 + 可见性暂停 + 失败退避
4. **安全收紧**：移除硬编码凭据、密码不落 storage、OTA 二次确认
5. **事件驱动同步**：`settings:changed` 替代等下次轮询
6. **测试骨架**：Vitest + @vue/test-utils@1 兜底

## Technical Context

**Language/Version**: JavaScript (Vue 2.6, uni-app) — 不引入 TypeScript
**Primary Dependencies**: vue@2.6.14, uni-app, uni-wifi uts module；新增 vitest@^1, @vue/test-utils@1, jsdom
**Storage**: uni-app `uni.getStorageSync` (localStorage 同步语义)
**Testing**: Vitest + @vue/test-utils@1（无 uni 运行时 mock，仅测纯 JS 模块与组件逻辑）
**Target Platform**: Android 4.4+ / iOS 9+ / H5（uni-app 三端）
**Project Type**: uni-app mobile-app 单包
**Performance Goals**:
- 设备 HTTP 平均 RPS ≤ 0.1（前台，每 10s 一次）
- 切后台后 RPS = 0
- 首屏 `fetchStatus` 完整 < 1500ms
**Constraints**:
- 不改 ESP8266 固件 / API 契约
- 不引入 Vuex/Pinia
- 测试不依赖 uni 运行时（仅测可纯 JS 部分组件）
**Scale/Scope**: 14 页面 / 4 组件 / 1 service 单例；本期新文件 ≤ 6 个

## Constitution Check

*GATE: 在 Phase 0 起研究前必过；Phase 1 设计完后再 review*

| 宪法原则 | 是否冲突 | 处理 |
|---------|---------|------|
| I. 数据持久化安全 | 不冲突 | 当前修复仅移除**冗余缓存**，不擦连接信息 |
| II. Vue 响应式规范 | 不冲突 | 新增事件名常量在 `data()` 中无绑定 |
| III. 防抖与竞态保护 | **强化** | 轮询退避引入"防抖式"轮询；事件总线加 throttle |
| IV. DRY | 不冲突 | `EVENTS` 与 `STORAGE_KEYS` 集中即 DRY |
| V. 统一错误处理 | **真正落地** | 全项目 catch 清零静默 |

**新增原则提案**（写入 constitution v1.1）：

> **VI. storage key 单一职责 (NON-NEGOTIABLE)**
> 每个 storage key 仅承载单一职责的数据结构。
> `connectedDevice` 只允许保存连接信息（address/deviceId/connected/location），
> 不得混入业务状态快照（acStatus / 阈值等）。
> 业务态必须从权威源（设备）实时获取，不缓存到 storage。
> **理由**：缓存混入让 storage dump 无法追踪单一字段变更来源，是上次审查中
> `acStatus` 双写导致竞态的根因。

> **VII. 凭据零持久化 (NON-NEGOTIABLE)**
> 任何密码、令牌、私钥禁止写入 localStorage / sessionStorage / 持久 cookie。
> 需要持久化的应是"是否记住"标志位，而非密码本身。
> 不应将第三方服务令牌硬编码进源代码 / `constants.js`。
> **理由**：APK 反编译与 storage dump 是平凡攻击，明文凭据立即暴露。

## Project Structure

### Documentation (this feature)

```text
specs/002-deep-optimization/
├── plan.md              # 本文件
├── spec.md              # 已创建
└── tasks.md             # 后续 /speckit-tasks 输出
```

### Source Code (repository root)

```text
空调温控/
├── config/
│   └── constants.js            # + EVENTS, + STORAGE_KEYS，- OTA_DEFAULT_FIRMWARE_URL
├── services/
│   ├── api.js                  # 失败计数暴露给调用方做退避
│   └── errorHandler.js         # 增 logger 字段，加 silent 通道
├── mixins/
│   ├── device-mixin.js         # + EVENTS 监听 wiring
│   └── modal-mixin.js          # 已存在，不动
├── pages/
│   ├── index/index.vue         # 单轮询 + 可见性 + 退避 + settings:changed
│   └── settings/temp-hum.vue   # 移除 tempHumSettings + 改静默 catch + emit 事件
│   └── settings/ota.vue        # 默认 URL 清空 + 二次确认
│   └── settings/sta-wifi.vue   # 密码瞬态（如保存仅存 SSID）
│   └── settings/mqtt-config.vue # 同上
├── tests/                      # 新增
│   ├── services/
│   │   └── api.test.js         # request 错误分类、setDeviceAddress
│   ├── components/
│   │   └── SliderControl.test.js # applyDelta clamp、reset
│   └── utils/
│       └── validator.test.js  # IP / URL 校验（已有 utility）
├── package.json                # + vitest, @vue/test-utils@1, jsdom
└── vitest.config.js           # 新增
```

**Structure Decision**: 沿用现有单包结构；新增 `tests/` 目录与 `vitest.config.js`
不参与 uni-app 构建（`.gitignore` 已忽略 `unpackage/`，tests 不需额外忽略）。

## Complexity Tracking

> Constitution Check 仅一处需要 justify：引入 vitest 属"新增 devDependency"，
> 但不破坏 uni-app 构建链（独立 npm script）。

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 引入 vitest devDep | 001 后续回归无自动化 | 仅靠手工回归已导致 002 需重新审计静默 catch |

## 实施阶段（保证可独立交付）

### Phase 0: 准备 (~10min)

| 任务 | 文件 | 改动 |
|------|------|------|
| P0-1 | `config/constants.js` | 新增 `EVENTS`、`STORAGE_KEYS` 段，文档化 |
| P0-2 | `config/constants.js` | 删除 `OTA_DEFAULT_FIRMWARE_URL` 令牌，改为空字符串 |
| P0-3 | `.specify/memory/constitution.md` | 追加 Principle VI / VII |

### Phase 1: 错误处理真正落地 (US1 — P1, ~30min)

| 任务 | 文件 | 改动 |
|------|------|------|
| P1-1 | `services/errorHandler.js` | 加 `silent` 通道写 console.warn |
| P1-2 | `pages/settings/temp-hum.vue:177` | `getSettings()` catch 调 `ErrorHandler.handleError(e)` + toast |
| P1-3 | `pages/index/index.vue:374` | `fetchTempHum()` catch 改为console.warn 含 `failCount` |
| P1-4 | 全项目 | grep `catch (e)` 全量 review，每处判定留有降级注释 or 接入 ErrorHandler |

### Phase 2: 缓存一致性 (US2 — P1, ~20min)

| 任务 | 文件 | 改动 |
|------|------|------|
| P2-1 | `pages/settings/temp-hum.vue:194-198` | 删除 `uni.setStorageSync('tempHumSettings', ...)` 块 |
| P2-2 | `pages/index/index.vue:330-340, 387-388` | 移除 `connectedDevice.acStatus` 同步逻辑 |
| P2-3 | `mixins/device-mixin.js` | `disconnectDevice` 不再依赖/清 `acStatus` |
| P2-4 | 文档 | 在 `constants.STORAGE_KEYS` 注释明确每个 key 的 schema |

### Phase 3: 轮询性能与 ESP8266 减负 (US3 — P2, ~45min)

| 任务 | 文件 | 改动 |
|------|------|------|
| P3-1 | `pages/index/index.vue` | 删除 `tempPollTimer`、`fetchTempHum()`，温湿度由 `fetchStatus` 提供 |
| P3-2 | `pages/index/index.vue` | `onShow` 拉一次 `fetchStatus` + 重启轮询；`onHide` `stopPoll()` |
| P3-3 | `pages/index/index.vue` | `startPoll` 接收 interval 参数；`failCount >= 3` 时切到 `BACKOFF_INTERVAL` (30s) |
| P3-4 | `config/constants.js` | `POLL_INTERVAL: 10000`（保留），新增 `POLL_BACKOFF_INTERVAL: 30000` |
| P3-5 | 验证 | 设备原 RPS 由 ~12/min 降至 ~6/min，前台；切后台 0 |

### Phase 4: 安全加固 (US4 — P2, ~40min)

| 任务 | 文件 | 改动 |
|------|------|------|
| P4-1 | `config/constants.js:27` | 将 `OTA_DEFAULT_FIRMWARE_URL` 改为 `''` |
| P4-2 | `pages/settings/ota.vue` | 默认 URL 为空，placeholder 提示文档链接；增加"将向 `<domain>` 请求固件"提示与二次确认 |
| P4-3 | `pages/settings/sta-wifi.vue` | 密码瞬态：仅在 `doSave()` 内 in-memory 使用，不写 storage；如勾选"记住"则仅存 SSID |
| P4-4 | `pages/settings/mqtt-config.vue` | 同 P4-3 |
| P4-5 | `services/api.js` | 不缓存 password 字段；setStaWifi 等只透传不写 storage |
| P4-6 | grep | 全项目搜 `password` / `pass` / `token`，确认无写入 storage 路径 |

### Phase 5: 跨页面事件同步 (US5 — P3, ~25min)

| 任务 | 文件 | 改动 |
|------|------|------|
| P5-1 | `config/constants.js` | `EVENTS: { SETTINGS_CHANGED: 'settings:changed' }` |
| P5-2 | `pages/settings/temp-hum.vue` | 保存成功后 `uni.$emit(constants.EVENTS.SETTINGS_CHANGED, { type: 'temp_hum' })` |
| P5-3 | `pages/index/index.vue onLoad` | `uni.$on(SETTINGS_CHANGED, throttle(fetchStatus, 500))` |
| P5-4 | `pages/index/index.vue onUnload` | `uni.$off(SETTINGS_CHANGED)` |
| P5-5 | `utils/throttle.js` | 新建极简 throttle；或复用 modal-mixin 的清抖思路（避免新依赖） |
| P5-6 | 同步其他写设置页 | `ac-params.vue`、`calibration.vue`、`scene.vue` 等保存后 emit `SETTINGS_CHANGED` |

### Phase 6: 测试基础设施 (US6 — P3, ~45min)

| 任务 | 文件 | 改动 |
|------|------|------|
| P6-1 | `package.json` | devDependencies 加 `vitest@^1`、`@vue/test-utils@^1`、`jsdom@^24`；scripts 加 `"test": "vitest run"` 与 `"test:watch": "vitest"` |
| P6-2 | `vitest.config.js` | 新建：environment `jsdom`，include `tests/**/*.test.js` |
| P6-3 | `tests/services/api.test.js` | mock `uni.request`；测 `request` 200/404/timeout/error status；setDeviceAddress 切换 baseUrl |
| P6-4 | `tests/components/SliderControl.test.js` | mount；传 `min/max/step`；trigger `onQuickClick({delta:+5})` 验证 emit `changing` 被 clamp |
| P6-5 | `tests/utils/validator.test.js` | 已有纯函数，覆盖 IP / URL 正反例 |
| P6-6 | 验证 | `npm run test` 退出 0，输出 ≥ 6 个用例通过 |

### Phase 7: Polish & Cross-Cutting (~15min)

| 任务 | 描述 |
|------|------|
| P7-1 | 更新 README，新增 `npm run test` 与 `tests/` 说明 |
| P7-2 | 全项目跑一次 `grep -n "console.log"` 清除调试残留 |
| P7-3 | 跑一次 build (`npm run build:h5`) 验证无回归 |

## 依赖关系

```
Phase 0 ──> Phase 1 ──> Phase 2 ─┐
                                  ├──> Phase 5 ──> Phase 7
              Phase 3 ────────────┤
              Phase 4 ────────────┤
              Phase 6（独立）────┘
```

- Phase 1 与 Phase 2 都改 `temp-hum.vue` 与 `index.vue`，建议先 P1 再 P2 顺序执行
- Phase 3 / 4 / 6 可并行（不同文件）
- Phase 5 依赖 Phase 0（EVENTS 常量）与 Phase 2（settings 已落定）
- Phase 7 在所有 Phase 完成后跑

## 风险

| 风险 | 缓解 |
|------|------|
| uni-app 构建 + Vitest 共存冲突 | Vitest 仅扫 `tests/`，不影响 uni-app webpack；package.json scripts 分离 |
| mock `uni.request` 与真实行为差异 | 仅测 `request` 的错误分类逻辑，不测 uni 内部行为 |
| 移除 `tempPollTimer` 导致首屏温湿度延迟 | `onLoad` 立即 `fetchStatus()`；首屏数据来自这次请求 |
| 退避后用户感知"无响应" | 退避同时 toast "设备连接异常，已进入低频心跳" |
| OTA 用户依赖默认 URL | 文档里给出获取 URL 的说明；不内嵌令牌 |
| settings:changed 在多个页面同时监听导致重复请求 | throttle 500ms + statusPending 标志拦截并发 |

## Git 提交策略

每个 Phase 完成作为一个独立 commit，message 前缀：

- `fix:` Phase 1 / 2 / 3（修复类）
- `chore:` Phase 0 / 4（任务收尾 + 安全收紧）
- `feat:` Phase 5（事件驱动是新功能）
- `test:` Phase 6
- `docs:` Phase 7

> 每个 Phase 完成手动回归对应验收场景，再进入下一 Phase。

## 验收回顾点

| Checkpoint | 触发条件 | 检查命令 |
|-----------|---------|---------|
| C1 错误清零 | Phase 1 完 | `rg "catch.*\{\s*\}" --type vue` 命中 0 |
| C2 缓存清理 | Phase 2 完 | `rg "tempHumSettings"` 命中 0 |
| C3 轮询降负 | Phase 3 完 | 切后台 30s 网络请求 = 0 |
| C4 凭据零持久化 | Phase 4 完 | storage dump 无明文密码 |
| C5 事件同步 | Phase 5 完 | 入设置页改阈值返回首页 ≤ 500ms 刷新 |
| C6 测试可跑 | Phase 6 完 | `npm run test` 退出 0 |
