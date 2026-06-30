# 空调温控 App

ESP8266 空调智能控制系统的移动端应用，支持温湿度监测、空调远程控制、场景切换、OTA 升级等功能。

## 快速开始

### 环境要求

- HBuilderX（推荐）或 Node.js 14+
- Android 手机（WiFi 扫描功能）
- ESP8266 空调控制器设备

### 运行

```bash
# 安装依赖
npm install

# 运行到浏览器（调试用）
npm run dev:h5

# 构建 Android App
npm run build:app-android
```

### 设备连接

1. 手机连接 ESP8266 热点（默认 SSID: `ESP8266-AC`）
2. 打开 App，进入设备连接页
3. 默认 IP `192.168.4.1`，点击连接
4. 连接成功后进入首页控制面板

## 文档

| 文档 | 说明 |
|------|------|
| [📖 文档中心](./docs/README.md) | 所有文档的入口 |
| [项目概览](./docs/01-项目概览.md) | 技术栈、架构概览、核心数据流 |
| [架构知识图谱](./docs/02-架构知识图谱.md) | 完整架构图、节点说明、依赖关系 |
| [API 文档](./docs/03-API文档.md) | ESP8266 设备通信协议（29 接口） |
| [宪法与规范](./docs/04-宪法与规范.md) | 核心开发原则与技术约束 |
| [开发指南](./docs/05-开发指南.md) | 构建命令、目录结构、调试技巧 |

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | uni-app (HBuilderX) |
| 前端 | Vue 2.6（兼容 Vue 3） |
| 通信 | HTTP POST → ESP8266 :80 |
| 状态 | uni.getStorageSync + 事件总线 |
| WiFi | uni_modules/uni-wifi（UTS） |
| 目标 | Android / H5 / 微信小程序 |

## 目录结构

```
├── App.vue              # 全局应用组件
├── main.js              # 应用入口
├── manifest.json        # uni-app 配置清单
├── pages.json           # 页面路由配置
├── config/
│   └── constants.js     # 全局常量
├── services/
│   ├── api.js           # 设备通信（28 API）
│   └── errorHandler.js  # 错误处理
├── mixins/
│   ├── device-mixin.js  # 设备状态复用
│   └── modal-mixin.js   # 弹窗逻辑复用
├── components/          # 5 个可复用组件
├── pages/
│   ├── index/           # 首页
│   ├── device/          # 设备连接
│   └── settings/        # 设置中心（14 子页面）
├── uni_modules/         # 原生模块
├── static/              # 静态资源（50+ SVG）
└── docs/                # 文档中心
```

## 核心特性

- 🌡️ **温湿度监测** — 实时显示温度/湿度，支持阈值告警
- 🎛️ **空调控制** — 开关/温度/模式/风速/摆风，支持 15 个品牌
- 🎬 **场景模式** — 睡眠/舒适/节能/快速 4 种预设
- 📶 **双模式 WiFi** — AP + STA 共存，本地管理 + 互联网访问
- 🏠 **MQTT 集成** — 支持 Home Assistant 自动发现
- 🔄 **OTA 升级** — 远程固件更新
- 💾 **EEPROM 保护** — 脏标记延迟写入，保护闪存寿命

## 项目统计

| 指标 | 数值 |
|------|------|
| 页面 | 16 |
| 组件 | 5 |
| Mixin | 2 |
| API 方法 | 28 |
| 空调品牌 | 15 |
| SVG 图标 | 50+ |

## 开发规范

详见 [宪法与规范](./docs/04-宪法与规范.md)

- 数据持久化安全：禁止在生命周期钩子中清空 storage
- Vue 响应式规范：模板绑定字段必须在 data() 中声明
- 防抖与竞态保护：用户触发型操作必须实现防抖
- 代码去重（DRY）：重复逻辑必须抽取为 mixin
- 统一错误处理：所有异步操作必须有可读的错误提示

## License

MIT