// 设备状态 mixin — 统一设备连接状态管理
// 所有页面导入此 mixin 后，自动获得 deviceConnected / deviceAddress / deviceId / deviceLocation
// 以及 checkDevice() 方法和 API 地址同步

import apiService from '../services/api';

export default {
	data() {
		return {
			deviceConnected: false,
			deviceAddress: '',
			deviceId: '',
			deviceLocation: ''
		};
	},
	methods: {
		/**
		 * 从 localStorage 读取设备连接状态，同步 API 地址
		 */
		checkDevice() {
			const d = uni.getStorageSync('connectedDevice');
			if (d && d.connected) {
				this.deviceConnected = true;
				this.deviceAddress = d.address || '';
				this.deviceId = d.deviceId || '';
				if (d.location) {
					this.deviceLocation = d.location;
				}
				apiService.setDeviceAddress(this.deviceAddress);
			} else {
				this.deviceConnected = false;
				this.deviceAddress = '';
				this.deviceId = '';
				this.deviceLocation = '';
			}
			return this.deviceConnected;
		},

		/**
		 * 手动设置设备信息（用于连接成功后初始化）
		 */
		setDevice(info) {
			this.deviceConnected = true;
			this.deviceAddress = info.address || '';
			this.deviceId = info.deviceId || '';
			if (info.location) {
				this.deviceLocation = info.location;
			}
			apiService.setDeviceAddress(this.deviceAddress);
		},

		/**
		 * 断开设备连接
		 */
		disconnectDevice() {
				uni.removeStorageSync('connectedDevice');
				uni.$emit('deviceConnected', { connected: false });
				this.deviceConnected = false;
				this.deviceAddress = '';
				this.deviceId = '';
				this.deviceLocation = '';
				apiService.resetFailCount(); // 重置 API 失败计数
			}
	}
};
