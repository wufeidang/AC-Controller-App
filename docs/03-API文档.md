# ESP8266 空调控制器 API文档

## 目录

- [基本格式](#基本格式)
- [API接口列表](#api接口列表)
  - [1. 获取设备状态](#1-获取设备状态)
  - [2. 设置温湿度阈值](#2-设置温湿度阈值)
  - [3. 设置空调参数](#3-设置空调参数)
  - [4. 控制空调](#4-控制空调)
  - [5. OTA升级](#5-ota升级)
  - [6. 设置校准参数](#6-设置校准参数)
  - [7. 设置设备信息](#7-设置设备信息)
  - [8. 获取温湿度阈值](#8-获取温湿度阈值)
  - [9. 获取空调参数](#9-获取空调参数)
  - [10. 获取设备信息](#10-获取设备信息)
  - [11. 获取校准参数](#11-获取校准参数)
  - [12. 获取设备ID](#12-获取设备id)
  - [13. 设置WiFi SSID](#13-设置wifi-ssid)
  - [14. 设置WiFi密码](#14-设置wifi密码)
  - [15. 获取固件版本](#15-获取固件版本)
  - [16. 设置空调品牌](#16-设置空调品牌)
  - [17. 获取温湿度数据](#17-获取温湿度数据)
  - [18. 设置场景模式](#18-设置场景模式)
  - [19. 获取场景模式](#19-获取场景模式)
  - [20. 重启设备](#20-重启设备)
  - [21. 恢复出厂设置](#21-恢复出厂设置)
  - [22. 获取系统信息](#22-获取系统信息)
  - [23. 进入深度睡眠](#23-进入深度睡眠)
  - [24. 设置休眠开关](#24-设置休眠开关)
  - [25. 获取休眠开关状态](#25-获取休眠开关状态)
  - [26. 设置STA（客户端）WiFi](#26-设置sta客户端wifi)
  - [27. 获取STA（客户端）WiFi状态](#27-获取sta客户端wifi状态)
  - [28. 设置MQTT配置](#28-设置mqtt配置)
  - [29. 获取MQTT配置](#29-获取mqtt配置)
- [MQTT集成说明](#mqtt集成说明)
  - [MQTT主题格式](#mqtt主题格式)
  - [MQTT状态推送格式](#mqtt状态推送格式)
  - [MQTT控制指令格式](#mqtt控制指令格式)
  - [Home Assistant 自动发现](#home-assistant-自动发现)
- [WiFi网络架构说明](#wifi网络架构说明)
  - [双模式共存（AP + STA）](#双模式共存ap--sta)
  - [STA模式配置流程](#sta模式配置流程)
- [EEPROM写入策略](#eeprom写入策略)

## 基本格式

所有API请求都是POST请求，发送到设备的IP地址，数据格式为JSON。

```json
{
  "cmd": "命令名称",
  "data": {
    "参数1": "值1",
    "参数2": "值2"
  }
}
```

## API接口列表

### 1. 获取设备状态

**命令**: `get_status`

**参数**: 无

**返回值**:
```json
{
  "status": "success",
  "data": {
    "temperature": 25.5,
    "humidity": 60,
    "ac_status": "off",
    "control_type": "temperature",
    "temp_on_threshold": 28.0,
    "temp_off_threshold": 26.0,
    "hum_on_threshold": 70.0,
    "hum_off_threshold": 60.0,
    "check_interval": 5,
    "client_connected": false,
    "sleep_enabled": false,
    "calibration": {
      "temp_offset": 0.0,
      "hum_offset": 0.0
    },
    "device_info": {
      "device_name": "ESP8266-AC",
      "device_location": "Living Room",
      "wifi_name": "ESP8266-AC",
      "device_id": "ESP8266-123456",
      "firmware_version": "1.0.0"
    },
    "ac_params": {
      "temperature": 26,
      "mode": "cool",
      "fan_speed": "medium",
      "swing": "auto",
      "brand": "tcl"  // 见下方"设置空调品牌"章节，共支持15个品牌
    }
  }
}
```

> **注意**: 设备还支持 `get_sta_wifi` 获取STA网络状态、`get_mqtt_config` 获取MQTT配置，详见对应章节。

### 2. 设置温湿度阈值

**命令**: `set_temp_hum`

**参数**:
- `controlType`: 控制类型，可选值：`temperature`（温度）或 `humidity`（湿度）
- `temp_on_threshold`: 温度开机阈值（当controlType为temperature时必填）
- `temp_off_threshold`: 温度关机阈值（当controlType为temperature时必填）
- `hum_on_threshold`: 湿度开机阈值（当controlType为humidity时必填）
- `hum_off_threshold`: 湿度关机阈值（当controlType为humidity时必填）
- `check_interval`: 检查间隔时间（分钟）

**返回值**:
```json
{
  "status": "success",
  "data": {
    "message": "温湿度设置成功"
  }
}
```

### 3. 设置空调参数

**命令**: `set_ac_params`

**参数**:
- `temperature`: 温度（整数）
- `mode`: 模式，可选值：`auto`（自动）、`cool`（制冷）、`heat`（制热）、`fan`（送风）、`dry`（除湿）
- `fan_speed`: 风速，可选值：`auto`（自动）、`low`（低速）、`medium`（中速）、`high`（高速）、`quiet`（静音）
- `swing`: 摆风，可选值：`auto`（自动）、`fixed`（固定）

**返回值**:
```json
{
  "status": "success",
  "data": {
    "message": "空调参数设置成功"
  }
}
```

### 4. 控制空调

**命令**: `control_ac`

**参数**:
- `action`: 动作，可选值：`on`（开机）、`off`（关机）

**返回值**:
```json
{
  "status": "success",
  "data": {
    "message": "空调已on"
  }
}
```

### 5. OTA升级

**命令**: `ota_update`

**参数**:
- 启动OTA模式:
  ```json
  {
    "action": "start_ota_mode"
  }
  ```
- 开始OTA升级:
  ```json
  {
    "firmware_url": "http://example.com/firmware.bin",
    "wifi_ssid": "WiFi名称",
    "wifi_password": "WiFi密码"
  }
  ```

**返回值**:
- 启动OTA模式:
  ```json
  {
    "status": "success",
    "data": {
      "message": "进入OTA配网模式",
      "mode": "ota_setup"
    }
  }
  ```
- 开始OTA升级:
  ```json
  {
    "status": "success",
    "data": {
      "message": "OTA升级开始",
      "progress": 0,
      "firmware_url": "http://example.com/firmware.bin"
    }
  }
  ```

### 6. 设置校准参数

**命令**: `set_calibration`

**参数**:
- `temp_offset`: 温度校准偏移值（-5.0到5.0）
- `hum_offset`: 湿度校准偏移值（-10.0到10.0）

**返回值**:
```json
{
  "status": "success",
  "data": {
    "message": "温湿度校准成功"
  }
}
```

### 7. 设置设备信息

**命令**: `set_device_info`

**参数**:
- `device_name`: 设备名称
- `device_location`: 设备位置
- `wifi_name`: WiFi名称

**返回值**:
```json
{
  "status": "success",
  "data": {
    "message": "设备信息设置成功"
  }
}
```

### 8. 获取温湿度阈值

**命令**: `get_temp_hum_threshold`

**参数**: 无

**返回值**:
```json
{
  "status": "success",
  "data": {
    "control_type": "temperature",
    "temp_on_threshold": 28.0,
    "temp_off_threshold": 26.0,
    "hum_on_threshold": 70.0,
    "hum_off_threshold": 60.0,
    "check_interval": 5
  }
}
```

### 9. 获取空调参数

**命令**: `get_ac_params`

**参数**: 无

**返回值**:
```json
{
  "status": "success",
  "data": {
    "temperature": 26,
    "mode": "cool",
    "fan_speed": "medium",
    "swing": "auto",
    "brand": "tcl"
  }
}
```

> **注意**: `brand` 字段共支持 15 个空调品牌，详见 [16. 设置空调品牌](#16-设置空调品牌)。

### 10. 获取设备信息

**命令**: `get_device_info`

**参数**: 无

**返回值**:
```json
{
  "status": "success",
  "data": {
    "device_name": "ESP8266-AC",
    "device_location": "Living Room",
    "wifi_name": "ESP8266-AC"
  }
}
```

### 11. 获取校准参数

**命令**: `get_calibration`

**参数**: 无

**返回值**:
```json
{
  "status": "success",
  "data": {
    "temp_offset": 0.0,
    "hum_offset": 0.0
  }
}
```

### 12. 获取设备ID

**命令**: `get_device_id`

**参数**: 无

**返回值**:
```json
{
  "status": "success",
  "data": {
    "device_id": "ESP8266-123456"
  }
}
```

### 13. 设置WiFi SSID

**命令**: `set_ssid`

**参数**:
- `ssid`: WiFi名称

**返回值**:
```json
{
  "status": "success",
  "data": {
    "message": "SSID设置成功",
    "new_ssid": "新的WiFi名称"
  }
}
```

### 14. 设置WiFi密码

**命令**: `set_wifi_password`

**参数**:
- `password`: WiFi密码

**返回值**:
```json
{
  "status": "success",
  "data": {
    "message": "WiFi密码设置成功"
  }
}
```

### 15. 获取固件版本

**命令**: `get_firmware_version`

**参数**: 无

**返回值**:
```json
{
  "status": "success",
  "data": {
    "firmware_version": "1.0.0"
  }
}
```

### 16. 设置空调品牌

**命令**: `set_ac_brand`

**参数**:
- `brand`: 空调品牌，可选值：

| 值 | 品牌 | 值 | 品牌 |
|---|---|---|---|
| `tcl` | TCL | `lg` | LG 乐金 |
| `midea` | 美的 Midea | `mitsubishi` | 三菱电机 |
| `haier` | 海尔 Haier | `panasonic` | 松下 Panasonic |
| `gree` | 格力 Gree | `samsung` | 三星 Samsung |
| `carrier` | 开利 Carrier | `sharp` | 夏普 Sharp |
| `daikin` | 大金 Daikin | `toshiba` | 东芝 Toshiba |
| `fujitsu` | 富士通 Fujitsu | `whirlpool` | 惠而浦 Whirlpool |
| `hitachi` | 日立 Hitachi | | |

> **注意**：如果飞利浦/其他贴牌空调不响应，请依次尝试 `midea` → `gree` → `tcl`（飞利浦空调多为美的代工）

**返回值**:
```json
{
  "status": "success",
  "data": {
    "message": "空调品牌设置成功",
    "brand": "tcl"
  }
}
```

### 17. 获取温湿度数据

**命令**: `get_temp_hum`

**参数**: 无

**返回值**:
```json
{
  "status": "success",
  "data": {
    "temperature": 25.5,
    "humidity": 60
  }
}
```

### 18. 设置场景模式

**命令**: `set_scene`

**参数**:
- `scene`: 场景模式，可选值：`sleep`（睡眠模式）、`energy_saving`（节能模式）、`comfort`（舒适模式）、`quick`（快速模式）

**返回值**:
```json
{
  "status": "success",
  "data": {
    "message": "睡眠模式已设置",
    "temperature": 26,
    "fan_speed": "low",
    "swing": "fixed",
    "mode": "cool"
  }
}
```

### 19. 获取场景模式

**命令**: `get_scene`

**参数**: 无

**返回值**:
```json
{
  "status": "success",
  "data": {
    "sleep": {
      "temperature": 26,
      "fan_speed": "low",
      "swing": "fixed"
    },
    "energy_saving": {
      "temperature": 28,
      "fan_speed": "auto",
      "swing": "auto"
    },
    "comfort": {
      "temperature": 24,
      "fan_speed": "medium",
      "swing": "auto"
    },
    "quick": {
      "temperature": 20,
      "fan_speed": "high",
      "swing": "auto"
    }
  }
}
```

### 20. 重启设备

**命令**: `restart_device`

**参数**: 无

**返回值**:
```json
{
  "status": "success",
  "data": {
    "message": "设备重启中"
  }
}
```

### 21. 恢复出厂设置

**命令**: `factory_reset`

**参数**: 无

**返回值**:
```json
{
  "status": "success",
  "data": {
    "message": "恢复出厂设置成功"
  }
}
```

### 22. 获取系统信息

**命令**: `get_system_info`

**参数**: 无

**返回值**:
```json
{
  "status": "success",
  "data": {
    "device_id": "ESP8266-123456",
    "firmware_version": "1.0.0",
    "esp_version": "3.0.2",
    "flash_size": 4,
    "free_heap": 45678,
    "chip_id": 123456,
    "sketch_size": 234,
    "free_sketch_space": 1234,
    "uptime": 3600
  }
}
```

### 23. 进入深度睡眠

**命令**: `enter_deep_sleep`

**参数**: 无

**返回值**:
```json
{
  "status": "success",
  "data": {
    "message": "进入深度睡眠模式"
  }
}
```

### 24. 设置休眠开关

**命令**: `set_sleep_enabled`

**参数**:
- `enabled`: 休眠开关状态，布尔值（true/false）

**返回值**:
```json
{
  "status": "success",
  "data": {
    "message": "休眠开关已开启"
  }
}
```

### 25. 获取休眠开关状态

**命令**: `get_sleep_enabled`

**参数**: 无

**返回值**:
```json
{
  "status": "success",
  "data": {
    "sleep_enabled": true
  }
}
```

### 26. 设置STA（客户端）WiFi

**命令**: `set_sta_wifi`

**说明**: 配置设备连接家庭/公司WiFi网络（STA模式）。设备将以 AP+STA 双模式运行，AP 模式保持用于本地管理，STA 模式连接外部网络用于 MQTT 通信和互联网访问。

**参数**:
- `ssid`: STA模式WiFi名称（必填）
- `password`: STA模式WiFi密码（必填）

**返回值**:
```json
{
  "status": "success",
  "data": {
    "message": "STA WiFi设置成功"
  }
}
```

### 27. 获取STA（客户端）WiFi状态

**命令**: `get_sta_wifi`

**说明**: 获取设备的STA模式WiFi连接状态。

**参数**: 无

**返回值**:
```json
{
  "status": "success",
  "data": {
    "ssid": "MyHomeWiFi",
    "connected": true,
    "local_ip": "192.168.1.100",
    "rssi": -45
  }
}
```

### 28. 设置MQTT配置

**命令**: `set_mqtt_config`

**说明**: 配置MQTT（Message Queuing Telemetry Transport）连接，用于与 Home Assistant 等智能家居平台集成。配置后设备会自动连接到 MQTT 服务器并订阅控制主题。所有参数均为可选，只传需要修改的字段即可。

**参数**:
- `server`: MQTT服务器地址（域名或IP）
- `port`: MQTT服务器端口（默认 1883）
- `user`: MQTT用户名（可选）
- `pass`: MQTT密码（可选）
- `topic`: MQTT主题前缀（例如 `home/ac`）

**返回值**:
```json
{
  "status": "success",
  "data": {
    "message": "MQTT配置设置成功"
  }
}
```

### 29. 获取MQTT配置

**命令**: `get_mqtt_config`

**说明**: 获取当前MQTT配置信息（注意密码以明文返回）。

**参数**: 无

**返回值**:
```json
{
  "status": "success",
  "data": {
    "server": "mqtt.example.com",
    "port": 1883,
    "user": "mqtt_user",
    "pass": "mqtt_pass",
    "topic": "home/ac"
  }
}
```

## MQTT集成说明

### MQTT主题格式

设备使用两级主题，主题前缀可通过 `set_mqtt_config` API 配置：

| 主题 | 方向 | 说明 |
|------|------|------|
| `{topic}/status` | 设备 → 服务器 | 设备状态推送（JSON），定时发布（每60秒） |
| `{topic}/cmd` | 服务器 → 设备 | 控制指令订阅，支持JSON格式和简单文本 |
| `{topic}/threshold` | 设备 → 服务器 | 温湿度阈值信息推送 |
| `{topic}/status` | 设备 → 服务器 | LWT遗嘱消息，上线"online"，离线"offline" |

> **示例**: 如果主题前缀设置为 `home/ac`，则状态主题为 `home/ac/status`，控制主题为 `home/ac/cmd`

### MQTT状态推送格式

设备定期向 `{topic}/status` 发布以下 JSON 状态：

```json
{
  "temperature": 25.5,
  "humidity": 60,
  "ac_status": "on",
  "ac_temp": 26,
  "ac_mode": "cool",
  "ac_fan_speed": "medium",
  "ac_swing": "auto",
  "ac_brand": "tcl",
  "rssi": -45,
  "uptime_sec": 3600,
  "device_id": "ESP8266-123456",
  "device_name": "ESP8266-AC",
  "device_location": "Living Room"
}
```

### MQTT控制指令格式

设备订阅 `{topic}/cmd` 主题，支持以下指令格式：

**开/关控制（简单格式）**:
```
on
off
```

**开/关控制（JSON格式）**:
```json
{
  "cmd": "control_ac",
  "data": {
    "action": "on"
  }
}
```

**设置空调参数**:
```json
{
  "cmd": "set_ac_params",
  "data": {
    "temperature": 24,
    "mode": "cool",
    "fan_speed": "auto",
    "swing": "auto"
  }
}
```

**设置场景**:
```json
{
  "cmd": "set_scene",
  "data": {
    "scene": "sleep"
  }
}
```

**获取状态**:
```json
{
  "cmd": "get_status"
}
```

### Home Assistant 自动发现

MQTT 消息中包含了 `device_id`、`device_name`、`device_location` 等字段，可配合 Home Assistant 的 [MQTT Discovery](https://www.home-assistant.io/integrations/mqtt/) 实现自动接入。建议在 Home Assistant 的 `configuration.yaml` 中添加：

```yaml
mqtt:
  sensor:
    - name: "AC Temperature"
      state_topic: "home/ac/status"
      value_template: "{{ value_json.temperature }}"
      unit_of_measurement: "°C"
    - name: "AC Humidity"
      state_topic: "home/ac/status"
      value_template: "{{ value_json.humidity }}"
      unit_of_measurement: "%"
  climate:
    - name: "Air Conditioner"
      modes:
        - "auto"
        - "cool"
        - "heat"
        - "dry"
        - "fan_only"
      mode_command_topic: "home/ac/cmd"
      mode_state_topic: "home/ac/status"
      mode_state_template: "{{ value_json.ac_mode }}"
      temperature_command_topic: "home/ac/cmd"
      temperature_state_topic: "home/ac/status"
      temperature_state_template: "{{ value_json.ac_temp }}"
      current_temperature_topic: "home/ac/status"
      current_temperature_template: "{{ value_json.temperature }}"
      json_attributes_topic: "home/ac/status"
```

## WiFi网络架构说明

### 双模式共存（AP + STA）

设备现在支持 **AP + STA 双模式共存**：

```
┌─────────────────────────────────┐
│          ESP8266                 │
│  ┌───────────────────────────┐  │
│  │  AP 模式 (Soft AP)         │  │  ← ESP8266-AC (SSID)
│  │  IP: 192.168.4.1          │  │  ← 本地管理入口（永远可用）
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │  STA 模式 (Client)        │  │  ← 连接家庭WiFi路由器
│  │  IP: 192.168.1.x (DHCP)  │  │  ← 互联网访问/MQTT通信
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

- **AP模式**：始终开启，SSID 由 `set_device_info` 中的 `wifi_name` 配置，用于本地管理
- **STA模式**：通过 `set_sta_wifi` 配置，连接家庭/公司网络，用于MQTT和互联网OTA

### STA模式配置流程

设备首次启动或未配置STA时，仅以AP模式运行。配置STA的推荐流程：

```
1. 手机/电脑连接设备 AP (ESP8266-AC)
2. 通过HTTP API发送 set_sta_wifi 命令
   POST http://192.168.4.1/
   {"cmd":"set_sta_wifi","data":{"ssid":"家庭WiFi","password":"密码"}}
3. 设备自动连接家庭WiFi
4. 通过 get_sta_wifi 检查连接状态
5. 连接成功后可通过 STA IP 继续管理
```

### mDNS 局域网发现（设备域名）

设备支持 **mDNS（Multicast DNS）**，启动后自动注册为 `<device_name>.local` 域名（默认 `esp8266-ac.local`），局域网内的客户端无需知道 IP 地址即可直接访问。

#### 优势

- **无需记 IP**：设备 IP 可能随 DHCP 变化，但 `.local` 域名始终不变
- **双模式可用**：mDNS 同时在 AP 和 STA 网口广播，无论客户端连在哪个网络都能解析
- **设备名联动**：通过 `set_device_info` 修改 `device_name` 后，mDNS 域名自动同步更新（例如改为 `living-room-ac.local`）

#### 各平台访问方式

| 平台 | 方法 | 说明 |
|------|------|------|
| **iOS / macOS** | `http://esp8266-ac.local` | 原生 Bonjour 支持，Safari/Chrome 直接可用 |
| **Android** | `http://esp8266-ac.local` | Chrome 85+ 原生支持；Android 12+ 系统级支持 |
| **Windows** | `http://esp8266-ac.local` | 需安装 Bonjour（iTunes 附带），或 Win10 1803+ 内置支持 |
| **Linux** | `http://esp8266-ac.local` | 大多数发行版预装 Avahi，直接可用 |

#### 使用示例

连接 STA WiFi 后，可以直接用域名调用 API：

```bash
# 获取设备状态
curl -X POST http://esp8266-ac.local \
  -H "Content-Type: application/json" \
  -d '{"cmd":"get_status"}'

# 控制空调开机
curl -X POST http://esp8266-ac.local \
  -H "Content-Type: application/json" \
  -d '{"cmd":"control_ac","data":{"action":"on"}}'
```

#### 在 App 中发现设备

Android 使用 `NsdManager`，iOS 使用 `Bonjour`/`NWBrowser` 可以主动发现局域网内所有 AC 控制器：

**Android (Kotlin)**:
```kotlin
val nsdManager = context.getSystemService(Context.NSD_SERVICE) as NsdManager
nsdManager.discoverServices("_http._tcp", NsdManager.PROTOCOL_DNS_SD,
    object : NsdManager.DiscoveryListener {
        override fun onServiceFound(info: NsdServiceInfo) {
            // info.serviceName 如 "esp8266-ac"
            // 通过 serviceName 构造 URL: http://esp8266-ac.local
        }
        // ...
    })
```

**iOS (Swift)**:
```swift
let browser = NWBrowser(
    for: .bonjour(type: "_http._tcp", domain: "local"),
    using: .tcp
)
browser.browseResultsChangedHandler = { results, _ in
    for result in results {
        if case .bonjour(let name, _, _) = result.endpoint {
            print("发现设备: \(name)") // → "esp8266-ac"
        }
    }
}
browser.start(queue: .main)
```

> **注意**：`device_name` 中的中文和特殊字符会被自动清理为合法 mDNS 主机名。建议使用英文+数字+连字符的设备名以获得最佳兼容性。

## EEPROM写入策略

### 延迟写入（Dirty Flag）

为保护ESP8266的闪存寿命（约10万次写入），系统实现了**脏标记延迟写入**机制：

```
API调用 → 修改内存数据 → 设置脏标记(dirty flag)
                                    ↓
                        loop() 每60秒检查一次
                                    ↓
                           脏标记为 true？──→ 一次性写入EEPROM
                           否 ──→ 跳过写入
```

- 所有 `set_*` API 命令仅修改内存数据并标记"脏"
- 主循环每 **60秒** 检查一次脏标记，仅在需要时执行物理写入
- 频繁的参数调整不会频繁磨损闪存
- 设备意外掉电最多丢失最后一次写入后的数据（最多60秒）

### 首次上电初始化保护

全新 ESP8266 芯片的 EEPROM 区域为全 `0xFF`（未编程状态），直接读取会导致String构造越界出现乱码。系统在 `loadSettings()` 时进行了三层防护：

1. **memset 清零** — 读取前先将运行时结构体全部置零
2. **强制 null 终止** — 所有 `char[]` 字段末尾强制写入 `\0`
3. **Magic 校验** — 检查魔数 `0xAC02`，未通过则调用 `setDefaults()` 写入默认值（WiFi 密码默认 `12345678`）

### 版本升级迁移

当 EEPROM 结构体版本号（当前 `version=3`）不匹配时，系统自动执行迁移：
- 旧版本字段保留（通过再次 `EEPROM.get()` 补回）
- 新增字段使用默认值填充
- 迁移完成后自动保存，避免用户配置丢失

当API请求出错时，返回以下格式的响应：

```json
{
  "status": "error",
  "data": {
    "message": "错误信息"
  }
}
```

常见的错误信息包括：
- `"Invalid JSON format"`: JSON格式无效
- `"No data received"`: 未接收到数据
- `"Unknown command"`: 未知命令
- `"No action specified"`: 未指定动作
- `"Invalid firmware URL"`: 无效的固件URL
- `"Missing required parameters"`: 缺少必要参数
- `"无效的空调品牌，支持的品牌：tcl, midea, haier, gree, carrier, daikin, fujitsu, hitachi, lg, mitsubishi, panasonic, samsung, sharp, toshiba, whirlpool"`: 空调品牌无效
- `"No SSID specified"`: 未指定SSID
- `"No password specified"`: 未指定密码
- `"No brand specified"`: 未指定品牌
- `"无效的场景模式"`: 场景模式无效
- `"Missing ssid or password"`: 设置STA WiFi时缺少SSID或密码

## 错误处理

## 版本历史

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v1.0.0 | 初始 | 基础功能：温湿度监测、TCL/美的/海尔/格力红外控制、Web API、场景模式、OTA升级、电源管理 |
| v1.1.0 | 2025-03 | 新增 MQTT 集成（Home Assistant）、STA模式（AP+STA双模共存）、休眠开关、EEPROM结构体化管理 |
| v1.2.0 | 2025-06 | **品牌扩展 4→15**：新增大金/三菱/松下/三星/LG/东芝/日立/富士通/夏普/开利/惠而浦；EEPROM初始化乱码修复；命令分发表重构；场景模式结构体化；OTA版本解析去重；MQTT写入策略统一

