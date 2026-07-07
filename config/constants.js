// 全局常量配置
// 所有魔法数字集中管理，修改此处全项目同步

export default {
	// HTTP 请求超时 (ms)
	HTTP_TIMEOUT: 8000,

	// 轮询间隔 (ms)
	POLL_INTERVAL: 10000,
	TEMP_POLL_INTERVAL: 5000,  // @deprecated v2.3.0 温湿度由 getStatus 承载，不再单独轮询

	// Toast 自动关闭时长 (ms)
	TOAST_DURATION: 1500,

	// 默认设备 IP
	DEFAULT_IP: '192.168.4.1',

	// mDNS 设备发现
	MDNS_DEFAULT_HOSTNAME: 'esp8266-ac.local',
	MDNS_SCAN_CANDIDATES: ['esp8266-ac.local'],
	MDNS_SCAN_TIMEOUT: 3000,  // 单次扫描超时 (ms)

		// OTA 超时 (ms)
	OTA_TIMEOUT: 60000,

	// OTA 默认固件 URL
	OTA_DEFAULT_FIRMWARE_URL: 'http://bin.bemfa.com/b/27002/3BcZGI1OTA5NDczM2FjYjkzMTg2N2Q1YWY5NGE1N2ZjNzg=FRESTEC.bin',

	// OTA 进度追踪
	OTA_PROGRESS_MAX: 80,       // 模拟进度最高到 80%，余下靠轮询确认
	OTA_POLL_INTERVAL: 5000,     // 轮询检测设备重启间隔 (ms)
	OTA_VERIFY_TIMEOUT: 120000, // 轮询超时 (ms)

	// 品牌映射表 — 支持 3 个品牌值
	BRAND_MAP: {
		tcl: 'TCL',
		midea: '美的',
		philips: '飞利浦'
	},

	// 品牌能力差异配置（红外协议、温度范围、支持的风速）
	BRAND_CAPABILITIES: {
		tcl: {
			protocol: 'TCL 112bit',
			minTemp: 16,
			maxTemp: 30,
			fanSpeeds: ['auto', 'low', 'medium', 'high', 'quiet']
		},
		midea: {
			protocol: 'Coolix',
			minTemp: 17,
			maxTemp: 30,
			fanSpeeds: ['auto', 'low', 'medium', 'high']  // quiet → auto
		},
		philips: {
			protocol: 'Goodweather',
			minTemp: 17,
			maxTemp: 30,
			fanSpeeds: ['auto', 'low', 'medium', 'high']  // quiet → auto
		}
	},

	// 模式标签映射
	MODE_LABELS: {
		cool: '制冷',
		heat: '制热',
		dry: '除湿',
		fan: '送风',
		auto: '自动'
	},

	// 风速标签
	FAN_LABELS: {
		auto: '自动',
		low: '低速',
		medium: '中速',
		high: '高速',
		quiet: '静音'
	},

	// 摆风标签
	SWING_LABELS: {
		auto: '摆风',
		fixed: '定向'
	},

	// 错误消息映射
	ERROR_MESSAGES: {
		NETWORK_ERROR: '网络连接失败，请检查设备是否在线',
		TIMEOUT: '连接超时，请检查网络',
		OFFLINE: '设备已离线，请检查连接',
		INVALID_JSON: '数据格式错误',
		DEVICE_BUSY: '设备忙，请稍后重试',
		UNKNOWN: '操作失败，请重试'
	},

	// 场景预设
	SCENES: [
		{ value: 'sleep',  label: '睡眠', icon: 'moon' },
		{ value: 'comfort', label: '舒适', icon: 'smile' },
		{ value: 'energy_saving', label: '节能', icon: 'lightning' },
		{ value: 'quick',  label: '快速', icon: 'light' }
	],

	// 事件总线常量 — 统一跨页面/组件通信
	EVENTS: {
		SETTINGS_CHANGED: 'settings:changed',
		DEVICE_CONNECTED: 'deviceConnected',
		APP_ERROR: 'app-error',
		APP_TOAST: 'app-toast',
		APP_LOADING: 'app-loading'
	},

	// Storage Key 定义 — 单一职责（宪法 VI）
	// connectedDevice: { address, deviceId, connected, location }
	// staWifiHistory: [{ ssid, timestamp }] — 仅 SSID，不含密码（宪法 VII）
	STORAGE_KEYS: {
		CONNECTED_DEVICE: 'connectedDevice',
		STA_WIFI_HISTORY: 'staWifiHistory'
	},

	// 轮询退避间隔 — 设备连续失败 ≥ 3 次后降频
	POLL_BACKOFF_INTERVAL: 30000
};
