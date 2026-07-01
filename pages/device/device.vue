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

			<!-- mDNS 设备发现 -->
			<view class="card mdns-card">
				<text class="card-title">mDNS 设备发现</text>
				<view class="mdns-scan-row">
					<text class="mdns-hint">{{ mdnsScanning ? '正在扫描局域网设备…' : (mdnsDevices.length > 0 ? '发现 ' + mdnsDevices.length + ' 台设备' : '未发现设备，点击扫描') }}</text>
				<view class="scan-btn" @click="scanMdns" :class="{ off: mdnsScanning }">
					<view class="scan-dot" v-if="mdnsScanning"></view>
					<text>扫描</text>
				</view>
				</view>

				<!-- 发现的设备列表 -->
				<scroll-view class="mdns-list" scroll-y v-show="mdnsDevices.length > 0">
					<view class="md-item" v-for="(d, i) in mdnsDevices" :key="i" @click="selectMdnsDevice(d)">
						<view class="md-left">
							<text class="md-hostname">{{ d.hostname }}</text>
							<text class="md-tag">mDNS</text>
						</view>
						<view class="md-right">
							<text class="md-id" v-if="d.deviceId">{{ d.deviceId }}</text>
							<text class="md-arr">›</text>
						</view>
					</view>
				</scroll-view>
			</view>

			<!-- IP 输入（手动连接） -->
			<view class="card">
				<text class="card-title">手动连接</text>
				<view class="field">
					<text class="label">IP 地址 / 域名</text>
					<view class="input-wrap" :class="{ focus: inputFocused }">
						<input v-model="inputAddress" class="input"
								:placeholder="defaultIp" placeholder-class="ph"
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

			<view class="btn btn-primary" @click="navigateBack" role="button" aria-label="进入控制面板">
				<text>进入控制面板</text>
			</view>
			<view class="btn-danger-outline" @click="handleDisconnect" role="button" aria-label="断开当前设备连接">
				<text>断开连接</text>
			</view>
		</view>

		<Loading :visible="loadingVisible" :text="loadingText" />

			<!-- Toast 提示 -->
			<CustomModal :visible="modalVisible" :title="modalTitle" :content="modalContent"
				:close-on-click-overlay="false" :type="modalType" :show-buttons="false" />

			<!-- 确认弹窗 -->
			<CustomModal :visible="confirmVisible" :title="confirmTitle" :content="confirmContent"
				:confirm-text="confirmText" :cancel-text="cancelText"
				:close-on-click-overlay="false" :type="confirmType"
				@confirm="handleConfirmOk" @cancel="handleConfirmCancel" />
		</view>
	</template>

	<script>
	import Loading from '../../components/Loading';
	import CustomModal from '../../components/CustomModal';
	import apiService from '../../services/api';
	import deviceMixin from '../../mixins/device-mixin';
	import modalMixin from '../../mixins/modal-mixin';
import errorHandler from '../../services/errorHandler';
import constants from '../../config/constants';
import { isValidAddress } from '../../utils/validator';

	export default {
		components: { Loading, CustomModal },
		mixins: [deviceMixin, modalMixin],
			data() {
				return {
					connecting: false,
					inputAddress: constants.DEFAULT_IP, inputFocused: false,
					wifiSSID: '', wifiScanning: false, wifiList: [],
					staIp: '',
					mdnsScanning: false, mdnsDevices: []
		};
		},
		computed: {
			defaultIp() { return constants.DEFAULT_IP; }
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
			if (this.mdnsDevices.length === 0) this.scanMdns();
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
			if (!isValidAddress(addr)) {
				this.showToast('提示', '请输入有效的 IP 地址或域名'); return;
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
			this.showToast('失败', (res.data && res.data.message) || '获取设备 ID 失败', 'error');
				}
			} catch (e) {
				errorHandler.handleError(e);
			} finally { this.connecting = false; this.loadingVisible = false; }
		},
		async scanMdns() {
			if (this.mdnsScanning || this.deviceConnected) return;
			this.mdnsScanning = true; this.mdnsDevices = [];

			// 构建候选列表（去重）
			const set = new Set();
			// 1. .local 域名（iOS / Android 12+ 系统解析）
			constants.MDNS_SCAN_CANDIDATES.forEach(h => set.add(h));
			// 2. 若当前连的是 ESP 热点 → 直试 AP IP
			if (this.wifiSSID && /esp|8266/i.test(this.wifiSSID)) {
				set.add(constants.DEFAULT_IP);
			}
			// 3. 上次保存的 STA IP 优先
			const sta = uni.getStorageSync('staNetwork');
			if (sta && sta.ip) set.add(sta.ip);
			// 4. 默认 AP IP（兜底）
			set.add(constants.DEFAULT_IP);

			const candidates = [...set];
			const results = await Promise.allSettled(
				candidates.map(h => this._tryHost(h))
			);
			this.mdnsDevices = results
				.filter(r => r.status === 'fulfilled' && r.value)
				.map(r => r.value);
			this.mdnsScanning = false;
		},
		_tryHost(hostname) {
			return new Promise((resolve) => {
				const timer = setTimeout(() => resolve(null), constants.MDNS_SCAN_TIMEOUT);
				uni.request({
					url: `http://${hostname}:80`,
					method: 'POST',
					data: { cmd: 'get_device_id', data: {} },
					timeout: constants.MDNS_SCAN_TIMEOUT,
					success: (r) => {
						clearTimeout(timer);
						if (r.statusCode === 200 && r.data && r.data.status === 'success') {
							resolve({ hostname, deviceId: r.data.data.device_id || '' });
						} else { resolve(null); }
					},
					fail: () => { clearTimeout(timer); resolve(null); }
				});
			});
		},
		selectMdnsDevice(device) {
			this.inputAddress = device.hostname;
			this.doConnect();
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
			handleDisconnect() {
				this.showConfirm('确认', '确定要断开设备连接吗？', {
					confirmText: '断开',
					cancelText: '取消',
					type: 'warning',
					onConfirm: () => this.doDisconnect()
				});
			},
			doDisconnect() {
				this.disconnectDevice();
			},
		navigateBack() { uni.redirectTo({ url: '/pages/index/index' }); }
	},
	};
</script>

<style lang="scss">
/* .page / .body / .card / .btn-danger-outline 由 App.vue 全局提供
   本页 .btn 更宽（96rpx 高 + 阴影），局部覆盖；.input-wrap 加宽到 96rpx 容纳大字号 */

/* Hero */
.hero { display: flex; flex-direction: column; align-items: center; padding: 48rpx 0 32rpx; }
.hero-icon-wrap {
	width: 112rpx; height: 112rpx; border-radius: 28rpx;
		background: linear-gradient(145deg, $brand-primary-bg 0%, #F0F7FF 100%);
	display: flex; align-items: center; justify-content: center;
	margin-bottom: 20rpx;
	box-shadow: 0 10rpx 28rpx rgba(22, 119, 255, 0.1);
}
.hero-icon { width: 60rpx; height: 60rpx; }
.hero-title { font-size: 38rpx; font-weight: 700; color: $text-primary; margin-bottom: 6rpx; }
.hero-desc { font-size: 26rpx; color: $text-hint; }

/* card-title 本页略小于全局（$fs-body vs $fs-title）*/
.card-title { font-size: $fs-body; }

/* WiFi 行 */
.wifi-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.wifi-status { display: flex; align-items: center; flex: 1; min-width: 0; }
.ws-dot { width: 14rpx; height: 14rpx; border-radius: 50%; background: $border-normal; margin-right: 10rpx; flex-shrink: 0; }
.ws-dot.on { background: $color-success; }
.wifi-status text { font-size: $fs-label; color: $text-secondary; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.scan-btn { height: 48rpx; padding: 0 20rpx; border-radius: 32rpx; background: $brand-primary; flex-shrink: 0; display: flex; align-items: center; }
.scan-btn:active { background: $brand-primary-hover; }
.scan-btn text { color: $bg-card; font-size: $fs-label; font-weight: 500; }
.scan-btn.off { opacity: 0.6; pointer-events: none; }
.scan-dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: rgba(255,255,255,0.7); animation: scanPulse 800ms ease-in-out infinite; margin-right: 6rpx; }
@keyframes scanPulse { 0%,100% { opacity: 0.4; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }

/* WiFi 列表 */
.wifi-list { max-height: 320rpx; background: $bg-elevated; border-radius: $radius-lg; padding: 0 16rpx;width:95%; }
.wl-item { display: flex; align-items: center; justify-content: space-between; padding: 22rpx 0; border-bottom: 1rpx solid $border-light; }
.wl-item:last-child { border-bottom: none; }
.wl-item:active { background: rgba(0,0,0,0.03); }
.wl-left { display: flex; align-items: center; gap: 10rpx; flex: 1; min-width: 0; }
.wl-name { font-size: 26rpx; color: $text-primary; font-weight: 500; }
.wl-tag { font-size: $fs-caption; color: $brand-primary; background: $brand-primary-bg; padding: 2rpx 10rpx; border-radius: $radius-sm; white-space: nowrap; }
.wl-signal { display: flex; align-items: flex-end; gap: 3rpx; flex-shrink: 0; margin-left: 12rpx; }
.wl-bar { width: 5rpx; border-radius: 2rpx; background: $brand-primary; }
.wl-bar:nth-child(1) { height: 6rpx; }
.wl-bar:nth-child(2) { height: 12rpx; }
.wl-bar:nth-child(3) { height: 18rpx; }
.wl-bar:nth-child(4) { height: 24rpx; }
.wifi-empty { padding: 40rpx 0; text-align: center; }
.wifi-empty text { font-size: $fs-label; color: $text-disabled; }

/* mDNS 设备发现 */
.mdns-scan-row { display: flex; align-items: center; justify-content: space-between; min-height: 56rpx; margin-bottom: 16rpx; }
.mdns-hint { font-size: $fs-label; color: $text-hint; flex: 1; line-height: 1.4; padding-right: 16rpx; }
.mdns-list { max-height: 260rpx; background: $bg-elevated; border-radius: $radius-lg; padding: 0 16rpx;width:95%; }
.md-item { display: flex; align-items: center; justify-content: space-between; padding: 22rpx 0; border-bottom: 1rpx solid $border-light; }
.md-item:last-child { border-bottom: none; }
.md-item:active { background: rgba(0,0,0,0.03); }
.md-left { display: flex; align-items: center; gap: 10rpx; flex: 1; min-width: 0; }
.md-hostname { font-size: 26rpx; color: $text-primary; font-weight: 500; }
.md-tag { font-size: $fs-caption; color: $color-success; background: $color-success-bg-alt; padding: 2rpx 10rpx; border-radius: $radius-sm; white-space: nowrap; }
.md-right { display: flex; align-items: center; gap: 8rpx; flex-shrink: 0; }
.md-id { font-size: $fs-label; color: $text-hint; }
.md-arr { font-size: $fs-body; color: $text-disabled; font-weight: 300; }

/* 输入（device 页需要 96rpx 高配大字号，覆盖全局 80rpx 版本） */
.field { margin-bottom: 24rpx; }
.input-wrap { height: 96rpx; padding: 0 24rpx; border-radius: 18rpx; }
.input { height: 96rpx; font-size: $fs-title; color: $text-primary; font-weight: 500; }

/* 页内主按钮更宽（96rpx）+ 阴影 */
.btn {
	height: 96rpx; border-radius: $radius-lg;
	display: flex; align-items: center; justify-content: center;
	box-shadow: 0 8rpx 20rpx rgba(22, 119, 255, 0.25);
}
.btn:active { transform: scale(0.99); }
.btn text { font-size: $fs-title; font-weight: 600; }
.btn-primary { margin-bottom: 16rpx; }

/* 已连接 */
.success-hero { display: flex; flex-direction: column; align-items: center; padding: 64rpx 0 40rpx; }
.sh-icon {
	width: 112rpx; height: 112rpx; border-radius: 50%;
	background: #F6FFED; color: $color-success;
	display: flex; align-items: center; justify-content: center;
	font-size: 56rpx; font-weight: 700; margin-bottom: 24rpx;
}
.sh-title { font-size: $fs-heading; font-weight: 700; color: $text-primary; }

.info-row { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid $border-light; }
.info-row:last-child { border-bottom: none; }
.ir-label { font-size: 26rpx; color: $text-hint; }
.ir-val { font-size: 26rpx; color: $text-regular; font-weight: 500; }
.ir-val.sta { color: $brand-primary; }

.tips { font-size: $fs-label; color: $text-secondary; line-height: 1.7; }
</style>
