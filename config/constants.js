// 全局常量配置
// 所有魔法数字集中管理，修改此处全项目同步

export default {
	// HTTP 请求超时 (ms)
	HTTP_TIMEOUT: 8000,

	// 轮询间隔 (ms)
	POLL_INTERVAL: 10000,

	// Toast 自动关闭时长 (ms)
	TOAST_DURATION: 1500,

	// 默认设备 IP
	DEFAULT_IP: '192.168.4.1',

	// OTA 超时 (ms)
	OTA_TIMEOUT: 60000,

	// 品牌映射表
	BRAND_MAP: {
		tcl: 'TCL',
		midea: '美的',
		haier: '海尔',
		gree: '格力',
		daikin: '大金',
		mitsubishi: '三菱',
		panasonic: '松下',
		samsung: '三星',
		lg: 'LG',
		toshiba: '东芝',
		hitachi: '日立',
		fujitsu: '富士通',
		sharp: '夏普',
		carrier: '开利',
		whirlpool: '惠而浦'
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
	]
};
