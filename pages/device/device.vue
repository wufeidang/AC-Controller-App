<template>
	<view class="page">
		<!-- 未连接 -->
		<view class="body" v-if="!deviceConnected">
			<view class="hero">
				<view class="hero-icon-wrap">
					<image src="/static/icons/device.svg" class="hero-icon" mode="aspectFit" />
				</view>
				<text class="hero-title">连接设备</text>
				<text class="hero-desc">扫描附近 WiFi，连接 ESP8266 热点</text>
			</view>

			<!-- WiFi 状态 + 扫描 -->
			<view class="card">
				<view class="wifi-row">
					<view class="wifi-status">
						<view class="ws-dot" :class="{ on: wifiSSID }"></view>
						<text>{{ wifiSSID || '未连接 WiFi' }}</text>
					</view>
					<view class="scan-btn" @click="startWifiScan" :class="{ off: wifiScanning }">
						<view class="scan-dot" v-if="wifiScanning"></view>
						<text>刷新</text>
					</view>
				</view>

				<!-- WiFi 列表（v-show 保持 DOM 稳定） -->
				<scroll-view class="wifi-list" scroll-y v-show="wifiList.length > 0">
					<view class="wl-item" v-for="(w, i) in wifiList" :key="w.SSID || w.ssid || i" @click="openSystemWifi">
						<view class="wl-left">
							<text class="wl-name">{{ w.SSID || w.ssid }}</text>
							<text class="wl-tag" v-if="isEspHotspot(w)">设备热点</text>
						</view>
						<view class="wl-signal">
							<view class="wl-bar" v-for="n in signalBars(w)" :key="n"></view>
						</view>
					</view>
				</scroll-view>

				<view class="wifi-empty" v-show="!wifiScanning && wifiList.length === 0">
					<text>扫描中…</text>
				</view>
			</view>

			<!-- IP 输入（手动连接） -->
			<view class="card">
				<text class="card-title">手动连接</text>
				<view class="field">
					<text class="label">IP 地址</text>
					<view class="input-wrap" :class="{ focus: inputFocused }">
						<input v-model="inputAddress" class="input"
							placeholder="192.168.4.1" placeholder-class="ph"
							:disabled="connecting"
							@focus="inputFocused = true"
							@blur="inputFocused = false"
							@confirm="doConnect" />
					</view>
				</view>
				<view class="btn" @click="doConnect" :class="{ off: connecting }">
					<text>{{ connecting ? '连接中...' : '连接设备' }}</text>
				</view>
			</view>
		</view>

		<!-- 已连接 -->
		<view class="body" v-else>
			<view class="success-hero">
				<view class="sh-icon">✓</view>
				<text class="sh-title">设备已连接</text>
			</view>

			<view class="card">
				<text class="card-title">连接信息</text>
				<view class="info-row">
					<text class="ir-label">AP 地址</text>
					<text class="ir-val">{{ deviceAddress }}</text>
				</view>
				<view class="info-row" v-if="staIp">
					<text class="ir-label">STA 地址</text>
					<text class="ir-val sta">{{ staIp }}</text>
				</view>
				<view class="info-row">
					<text class="ir-label">设备 ID</text>
					<text class="ir-val">{{ deviceId || '-' }}</text>
				</view>
			</view>

			<view class="btn btn-primary" @click="navigateBack">
				<text>进入控制面板</text>
			</view>
			<view class="btn btn-danger" @click="handleDisconnect">
				<text>断开连接</text>
			</view>
		</view>

		<Loading :visible="loadingVisible" :text="loadingText" />
		<CustomModal :visible="modalVisible" :title="modalTitle" :content="modalContent"
			:confirm-text="modalConfirmText" :cancel-text="modalHasCancel ? modalCancelText : ''"
			:close-on-click-overlay="false"
			:type="modalTitle === '失败' ? 'error' : (modalTitle === '成功' ? 'success' : 'info')"
			@confirm="handleModalConfirm" @cancel="handleModalCancel" />
	</view>
</template>

<script>
import Loading from '../../components/Loading';
import CustomModal from '../../components/CustomModal';
import apiService from '../../services/api';
import deviceMixin from '../../mixins/device-mixin';
import errorHandler from '../../services/errorHandler';

export default {
	components: { Loading, CustomModal },
	mixins: [deviceMixin],
	data() {
		return {
			connecting: false,
			inputAddress: '192.168.4.1', inputFocused: false,
			wifiSSID: '', wifiScanning: false, wifiList: [],
			staIp: '',
			_modalCallback: null
		};
	},
		onLoad() {
			this.checkDevice();
			if (this.deviceConnected) return;  // 已连接则跳过
			this.getWifiStatus().then(() => this.autoFillIp());
			this.startWifiScan();
		},
		onShow() {
			this.checkDevice();
			if (this.deviceConnected) return;
			this.getWifiStatus().then(() => { this.autoFillIp(); this.onWifiChanged(); });
			if (this.wifiList.length === 0) this.startWifiScan();
		},
		onUnload() { try { uni.offGetWifiList(); } catch (e) {} },
	methods: {
		async getWifiStatus() {
			try {
				const res = await new Promise((resolve, reject) => {
					uni.getNetworkType({ success: resolve, fail: reject });
				});
				if (res.networkType !== 'wifi') { this.wifiSSID = ''; return; }
				try {
					await uni.startWifi({});
					const wifi = await new Promise((resolve, reject) => {
						uni.getConnectedWifi({ success: resolve, fail: reject });
					});
					this.wifiSSID = (wifi && wifi.wifi) ? (wifi.wifi.SSID || wifi.wifi.ssid || '') : '';
				} catch (e) { /* 静默 */ }
			} catch (e) { this.wifiSSID = ''; }
		},
		autoFillIp() {
			if (this.deviceConnected) return;
			const saved = uni.getStorageSync('staNetwork');
			if (!saved || !saved.ip) return;
			if (this.wifiSSID && saved.ssid && this.wifiSSID.indexOf(saved.ssid) > -1) {
				this.inputAddress = saved.ip;
			} else if (this.wifiSSID && !saved.ssid) {
				this.inputAddress = saved.ip;
			}
		},
		async onWifiChanged() {
			// WiFi 变化时重新获取状态 + 自动填充 IP
			await this.getWifiStatus();
			this.autoFillIp();
		},
		async startWifiScan() {
				if (this.wifiScanning) return;
				this.wifiScanning = true;
				try {
					if (uni.getSystemInfoSync().platform === 'android') {
						await this.requestLocationPermission();
					}
					await uni.startWifi({});
					try { uni.offGetWifiList(); } catch (e) {}
					let pending = [];
					uni.onGetWifiList(res => {
						if (res && res.wifiList) pending = res.wifiList;
					});
					await uni.getWifiList({});
					// 动态等待：每 100ms 检查一次，最多等 2s
					for (let i = 0; i < 20; i++) {
						if (pending.length > 0) break;
						await new Promise(r => setTimeout(r, 100));
					}
					if (pending.length > 0) {
						const seen = new Set();
						this.wifiList = pending
							.filter(w => { const s = w.SSID || w.ssid || ''; if (!s || seen.has(s)) return false; seen.add(s); return true; })
							.sort((a, b) => (b.signalStrength || 0) - (a.signalStrength || 0));
					}
					// 扫描完成，重新获取 WiFi 状态 + 自动填充 IP
					this.onWifiChanged();
				} catch (e) {
					const msg = e.errMsg || e.message || '';
					if (msg.indexOf('location') > -1) this.showToast('提示', '请开启位置服务后重试');
					else this.showToast('提示', '扫描失败，请检查 WiFi 和位置权限');
				} finally { this.wifiScanning = false; }
			},
		requestLocationPermission() {
			return new Promise(resolve => {
				if (typeof plus === 'undefined') { resolve(true); return; }
				plus.android.requestPermissions(
					['android.permission.ACCESS_FINE_LOCATION'],
					e => { resolve(e && e.granted && e.granted.length > 0); },
					() => { resolve(false); }
				);
			});
		},
		signalBars(w) {
			const s = w.signalStrength || 0;
			if (s > -55) return 4; if (s > -70) return 3; if (s > -85) return 2; return 1;
		},
		isEspHotspot(w) {
			const ssid = (w.SSID || w.ssid || '').toLowerCase();
			return ssid.indexOf('esp') > -1 || ssid.indexOf('8266') > -1;
		},
		openSystemWifi() {
			const platform = uni.getSystemInfoSync().platform;
			if (platform === 'android' && typeof plus !== 'undefined') {
				const main = plus.android.runtimeMainActivity();
				const intent = new plus.android.newObject('android.content.Intent', 'android.settings.WIFI_SETTINGS');
				main.startActivity(intent);
			} else {
				this.showToast('提示', '请在系统设置中连接 WiFi');
			}
		},
		async doConnect() {
			if (this.connecting || this.deviceConnected) return;
			const addr = this.inputAddress.trim();
			if (!/^(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])$/.test(addr)) {
				this.showToast('提示', '请输入有效的 IP 地址'); return;
			}
			try {
				this.connecting = true; this.loadingVisible = true; this.loadingText = '连接中...';
				apiService.setDeviceAddress(addr);
				const res = await apiService.getDeviceId();
				if (res.status === 'success') {
					const info = { address: addr, deviceId: res.data.device_id, connected: true };
					uni.setStorageSync('connectedDevice', info);
					this.setDevice(info);
					uni.$emit('deviceConnected', { connected: true, device: info });
					// 连接 AP 模式，清空 STA IP
					this.staIp = '';
					this.fetchStaStatus();
				} else {
					this.showConfirm('失败', (res.data && res.data.message) || '获取设备 ID 失败');
				}
			} catch (e) {
				errorHandler.handleError(e);
			} finally { this.connecting = false; this.loadingVisible = false; }
		},
		async fetchStaStatus() {
			try {
				const res = await apiService.getStaWifi();
				if (res.status === 'success' && res.data && res.data.connected && res.data.local_ip) {
					this.staIp = res.data.local_ip;
					const ssid = res.data.ssid || this.wifiSSID;
					if (ssid) {
						uni.setStorageSync('staNetwork', { ssid: ssid, ip: res.data.local_ip });
					}
				} else {
					// 设备未连上家庭 WiFi（可能是 AP 模式），清空 STA IP
					this.staIp = '';
				}
			} catch (e) { this.staIp = ''; }
		},
		showToast(title, content, type = 'info') {
			this.modalTitle = title; this.modalContent = content;
			this.modalHasCancel = false; this.modalShowButtons = false; this.modalVisible = true;
			setTimeout(() => { this.modalVisible = false; }, 1500);
		},
		showConfirm(title, content) {
			this.modalTitle = title; this.modalContent = content;
			this.modalHasCancel = false; this.modalShowButtons = true; this.modalConfirmText = '确定';
			this.modalVisible = true;
		},
		handleModalConfirm() {
			this.modalVisible = false;
			if (this._modalCallback) { this._modalCallback(); this._modalCallback = null; }
		},
		handleModalCancel() { this.modalVisible = false; this._modalCallback = null; },
		handleDisconnect() {
			this.modalTitle = '确认'; this.modalContent = '确定要断开设备连接吗？';
			this.modalHasCancel = true; this.modalConfirmText = '断开';
			this.modalCancelText = '取消'; this.modalVisible = true;
			this._modalCallback = () => { this.doDisconnect(); };
		},
		doDisconnect() {
			this.disconnectDevice();
		},
		navigateBack() { uni.redirectTo({ url: '/pages/index/index' }); },
		}
	};
</script>

<style scoped>
.page { min-height: 100vh; background: #F5F5F5; }
.body { padding: 32rpx; }

/* Hero */
.hero { display: flex; flex-direction: column; align-items: center; padding: 48rpx 0 32rpx; }
.hero-icon-wrap {
	width: 112rpx; height: 112rpx; border-radius: 28rpx;
	background: linear-gradient(145deg, #E6F4FF 0%, #F0F7FF 100%);
	display: flex; align-items: center; justify-content: center;
	margin-bottom: 20rpx;
	box-shadow: 0 10rpx 28rpx rgba(22, 119, 255, 0.1);
}
.hero-icon { width: 60rpx; height: 60rpx; }
.hero-title { font-size: 38rpx; font-weight: 700; color: #1A1A1A; margin-bottom: 6rpx; }
.hero-desc { font-size: 26rpx; color: #999; }

/* 卡片 */
.card { background: #FFF; border-radius: 26rpx; padding: 32rpx; margin-bottom: 24rpx; box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.04); }
.card-title { font-size: 28rpx; font-weight: 700; color: #1A1A1A; display: block; margin-bottom: 20rpx; }

/* WiFi 行 */
.wifi-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.wifi-status { display: flex; align-items: center; flex: 1; min-width: 0; }
.ws-dot { width: 14rpx; height: 14rpx; border-radius: 50%; background: #D9D9D9; margin-right: 10rpx; flex-shrink: 0; }
.ws-dot.on { background: #00B96B; }
.wifi-status text { font-size: 24rpx; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.scan-btn { padding: 12rpx 24rpx; border-radius: 20rpx; background: #1677FF; flex-shrink: 0; display: flex; align-items: center; gap: 8rpx; }
.scan-btn:active { background: #0958D9; }
.scan-btn text { color: #FFF; font-size: 24rpx; font-weight: 500; }
.scan-btn.off { opacity: 0.6; pointer-events: none; }
.scan-dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: rgba(255,255,255,0.7); animation: scanPulse 800ms ease-in-out infinite; }
@keyframes scanPulse { 0%,100% { opacity: 0.4; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }

/* WiFi 列表 */
.wifi-list { max-height: 320rpx; background: #F7F8FA; border-radius: 16rpx; padding: 0 16rpx; }
.wl-item { display: flex; align-items: center; justify-content: space-between; padding: 22rpx 0; border-bottom: 1rpx solid #EBEBEB; }
.wl-item:last-child { border-bottom: none; }
.wl-item:active { background: rgba(0,0,0,0.03); }
.wl-left { display: flex; align-items: center; gap: 10rpx; flex: 1; min-width: 0; }
.wl-name { font-size: 26rpx; color: #1A1A1A; font-weight: 500; }
.wl-tag { font-size: 20rpx; color: #1677FF; background: #E6F4FF; padding: 2rpx 10rpx; border-radius: 8rpx; white-space: nowrap; }
.wl-signal { display: flex; align-items: flex-end; gap: 3rpx; flex-shrink: 0; margin-left: 12rpx; }
.wl-bar { width: 5rpx; border-radius: 2rpx; background: #1677FF; }
.wl-bar:nth-child(1) { height: 6rpx; }
.wl-bar:nth-child(2) { height: 12rpx; }
.wl-bar:nth-child(3) { height: 18rpx; }
.wl-bar:nth-child(4) { height: 24rpx; }
.wifi-empty { padding: 40rpx 0; text-align: center; }
.wifi-empty text { font-size: 24rpx; color: #BFBFBF; }

/* 输入 */
.field { margin-bottom: 24rpx; }
.label { display: block; font-size: 26rpx; color: #333; font-weight: 500; margin-bottom: 12rpx; }
.input-wrap {
	height: 96rpx; padding: 0 24rpx; background: #F7F8FA; border-radius: 18rpx;
	border: 2rpx solid transparent; transition: all 200ms;
}
.input-wrap.focus { background: #FFF; border-color: #1677FF; box-shadow: 0 0 0 6rpx rgba(22, 119, 255, 0.07); }
.input { width: 100%; height: 96rpx; font-size: 30rpx; color: #1A1A1A; font-weight: 500; }
.ph { color: #C0C4CC; }

/* 按钮 */
.btn {
	height: 96rpx; border-radius: 20rpx;
	display: flex; align-items: center; justify-content: center;
	transition: 150ms; background: #1677FF;
	box-shadow: 0 8rpx 20rpx rgba(22, 119, 255, 0.25);
}
.btn:active { transform: scale(0.99); }
.btn text { font-size: 30rpx; font-weight: 600; color: #FFF; }
.btn.off { opacity: 0.5; box-shadow: none; }
.btn-danger { background: #FFF1F0; box-shadow: none; margin-top: 0; }
.btn-danger text { color: #FF4D4F; }
.btn-primary { margin-bottom: 16rpx; }

/* 已连接 */
.success-hero { display: flex; flex-direction: column; align-items: center; padding: 64rpx 0 40rpx; }
.sh-icon {
	width: 112rpx; height: 112rpx; border-radius: 50%;
	background: #F0FFF4; color: #00B96B;
	display: flex; align-items: center; justify-content: center;
	font-size: 56rpx; font-weight: 700; margin-bottom: 24rpx;
}
.sh-title { font-size: 36rpx; font-weight: 700; color: #1A1A1A; }

.info-row { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #F5F5F5; }
.info-row:last-child { border-bottom: none; }
.ir-label { font-size: 26rpx; color: #999; }
.ir-val { font-size: 26rpx; color: #333; font-weight: 500; }
.ir-val.sta { color: #1677FF; }

.tips { font-size: 24rpx; color: #666; line-height: 1.7; }
</style>
