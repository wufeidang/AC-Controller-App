<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->

# AGENTS.md — 空调温控 App 开发指令

## 项目背景

ESP8266 空调温控系统的移动端应用（uni-app + Vue2），通过 HTTP POST 与 ESP8266 设备通信，实现空调远程控制、温湿度监测、场景切换、OTA 升级等功能。

## 知识库

| 路径 | 内容 |
|------|------|
| `docs/README.md` | 文档中心导航 |
| `docs/01-项目概览.md` | 技术栈、架构概览、核心数据流 |
| `docs/02-架构知识图谱.md` | 完整架构图、节点说明、依赖关系 |
| `docs/03-API文档.md` | ESP8266 设备通信协议（29 接口） |
| `docs/04-宪法与规范.md` | 核心开发原则与技术约束 |
| `docs/05-开发指南.md` | 构建命令、目录结构、调试技巧 |
| `.understand-anything/knowledge-graph.json` | 项目架构知识图谱（JSON 格式） |
| `.specify/memory/constitution.md` | 项目宪法（原始） |
| `.specify/specs/` | 功能规格与实施计划 |

## 开发规范

- **语言**: JavaScript (Vue2) — 不加 TypeScript
- **状态管理**: 优先抽取 mixin，不引入 Vuex/Pinia
- **UI 风格**: Ant Design 蓝 #1677FF + 圆角卡片
- **兼容性**: uni-app HBuilderX 构建，支持 Android/iOS/H5
- **Git**: 每次改动提交一个独立 commit，message 格式 `fix:` / `refactor:` / `chore:` / `feat:` / `docs:`

## 核心原则（宪法）

1. **数据持久化安全**: 禁止在生命周期钩子中清空 storage
2. **Vue 响应式规范**: 模板绑定字段必须在 data() 中声明
3. **防抖与竞态保护**: 用户触发型操作必须实现防抖
4. **代码去重（DRY）**: 重复逻辑必须抽取为 mixin
5. **统一错误处理**: 所有异步操作必须有可读的错误提示

详见 [docs/04-宪法与规范.md](./docs/04-宪法与规范.md)