// 设备状态 mixin — 抽取 checkDevice() + 设备相关 data
// 所有页面导入此 mixin 后，不再需要重复实现 checkDevice()
// API 地址设置（apiService.setDeviceAddress）由调用方在外层处理

export default {
	data() {
		return {
			deviceConnected: false,
			deviceAddress: '',
			deviceId: ''
		};
	},
	methods: {
		/**
		 * 从 localStorage 读取设备连接状态
		 * 调用方需在外层自行调用 api.setDeviceAddress(this.deviceAddress)
		 */
		checkDevice() {
			const d = uni.getStorageSync('connectedDevice');
			if (d && d.connected) {
				this.deviceConnected = true;
				this.deviceAddress = d.address || '';
				this.deviceId = d.deviceId || '';
			} else {
				this.deviceConnected = false;
			}
		}
	}
};
