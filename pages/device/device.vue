<template>
	<view class="page">
		<!-- 未连接 -->
		<view class="body" v-if="!deviceConnected">
			<view class="hero">
				<view class="hero-icon-wrap">
					<image src="/static/icons/device.svg" class="hero-icon" mode="aspectFit" />
				</view>
				<text class="hero-title">连接设备</text>
				<text class="hero-desc">输入设备 IP 地址，或快速重连上次使用的设备</text>
			</view>

			<!-- 上次连接过的设备（最显眼） -->
			<view class="card last-card" v-if="lastDevice">
				<view class="card-title-row">
					<text class="card-title">上次连接</text>
					<text class="card-meta">{{ lastDevice.ssid || '手动连接' }}</text>
				</view>
				<view class="last-item" @click="quickReload" role="button" tabindex="0" :aria-label="`快速重连到 ${lastDevice.ip}`">
					<view class="last-left">
						<image src="/static/icons/refresh.svg" class="last-icon" mode="aspectFit" />
						<view class="last-text">
							<text class="last-ip">{{ lastDevice.ip }}</text>
							<text class="last-time" v-if="lastDevice.lastAt">{{ formatRelative(lastDevice.lastAt) }}</text>
						</view>
					</view>
					<view class="last-go">›</view>
				</view>
			</view>

			<!-- 手动 IP 输入（始终显示） -->
			<view class="card">
				<view class="card-title-row">
					<text class="card-title">手动输入 IP</text>
				</view>
				<view class="field-hint">
					<text>填入设备的 IP 地址，不要带 http:// 或端口号</text>
				</view>
				<view class="field">
					<view class="input-wrap" :class="{ focus: inputFocused }">
						<input v-model="inputAddress" class="input"
								:placeholder="defaultIp" placeholder-class="ph"
							:disabled="connecting"
							@focus="inputFocused = true"
							@blur="inputFocused = false"
							@confirm="doConnect" />
					</view>
				</view>
				<view class="btn btn-primary" @click="doConnect" :class="{ off: connecting }" role="button" aria-label="连接到指定 IP">
					<text>{{ connecting ? '连接中...' : '连接到此 IP' }}</text>
				</view>
			</view>

			<!-- mDNS 局域网设备发现 -->
			<view class="card">
				<view class="card-title-row">
					<text class="card-title">局域网设备</text>
					<view class="scan-btn" @click="scanMdns(true)" :class="{ off: mdnsScanning }" role="button" :aria-label="mdnsScanning ? '正在扫描局域网设备' : '重新扫描局域网设备'">
						<view class="scan-dot" v-if="mdnsScanning"></view>
						<text>{{ mdnsScanning ? '扫描中' : '刷新' }}</text>
					</view>
				</view>

				<view class="md-status">
					<view class="ws-dot" :class="mdnsDevices.length > 0 ? 'on' : ''"></view>
					<text v-if="mdnsScanning">正在扫描局域网…</text>
					<text v-else-if="mdnsDevices.length > 0">发现 {{ mdnsDevices.length }} 台可连接设备</text>
					<text v-else>设备和手机需要在同一 WiFi 下</text>
				</view>

				<view class="md-list" v-if="mdnsDevices.length > 0">
					<view class="md-item" v-for="(d, i) in mdnsDevices" :key="d.hostname + i"
						@click="selectMdnsDevice(d)" role="button"
						:aria-label="`连接到局域网设备 ${d.hostname}`">
						<view class="md-left">
							<image src="/static/icons/device.svg" class="md-icon" mode="aspectFit" />
							<view class="md-text">
								<text class="md-hostname">{{ d.hostname }}</text>
								<text class="md-id" v-if="d.deviceId">{{ d.deviceId }}</text>
							</view>
						</view>
						<view class="md-go">›</view>
					</view>
				</view>

				<view class="mdns-skeleton" v-else-if="mdnsScanning">
					<view class="ws-row" v-for="n in 2" :key="n"></view>
				</view>
			</view>
		</view>

		<!-- 已连接 -->
		<view class="body" v-else>
			<view class="success-hero">
				<view class="sh-icon">✓</view>
				<text class="sh-title">设备已连接</text>
				<text class="sh-desc">{{ deviceAddress }}</text>
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

			<view class="card hint-card" v-if="!staIp && showStaHint">
				<view class="hint-row">
					<text class="hint-emoji">💡</text>
					<text class="hint-text">设备尚未接入家庭 WiFi，手机切回家庭 WiFi 后将无法远程控制</text>
				</view>
				<view class="hint-btn" @click="navigateTo('settings/sta-wifi')" role="button" aria-label="配置家庭 WiFi">
					<text>配置家庭 WiFi</text>
				</view>
			</view>

			<view class="btn btn-primary" @click="navigateBack" role="button" aria-label="进入控制面板">
				<text>进入控制面板</text>
			</view>
			<view class="btn-danger-outline" @click="handleDisconnect" role="button" aria-label="断开当前设备连接">
				<text>断开连接</text>
			</view>
		</view>

		<Loading :visible="loadingVisible" text="连接中..." />

		<CustomModal :visible="modalVisible" :title="modalTitle" :content="modalContent"
			:close-on-click-overlay="false" :type="modalType" :show-buttons="false" />

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

const LAST_KEY = 'lastConnectedDevice';

export default {
	components: { Loading, CustomModal },
	mixins: [deviceMixin, modalMixin],
	data() {
		return {
			connecting: false,
			inputAddress: constants.DEFAULT_IP,
			inputFocused: false,
			staIp: '',
			lastDevice: null,
			showStaHint: true,
			mdnsScanning: false,
			mdnsDevices: [],
			_scanStarted: false
		};
	},
	computed: {
		defaultIp() { return constants.DEFAULT_IP; }
	},
	onLoad() {
		this._loadLastDevice();
		this.checkDevice();
		if (this.deviceConnected) return;
		// 如果有上次连接的设备且有上次的 IP，自动填入输入框
		if (this.lastDevice && this.lastDevice.ip) {
			this.inputAddress = this.lastDevice.ip;
		}
		// 进入页面自动扫描局域网设备
		this._autoScanMdns();
	},
	onShow() {
		this.checkDevice();
		if (this.deviceConnected) return;
	},
	methods: {
		_loadLastDevice() {
			const last = uni.getStorageSync(LAST_KEY);
			if (last && last.ip) {
				this.lastDevice = last;
			}
		},
		_saveLastDevice() {
			const cur = uni.getStorageSync('connectedDevice');
			if (!cur || !cur.address) return;
			const stale = uni.getStorageSync(LAST_KEY) || {};
			const next = {
				ip: cur.address,
				ssid: stale.ssid || '',
				lastAt: Date.now()
			};
			uni.setStorageSync(LAST_KEY, next);
		},
		quickReload() {
			if (!this.lastDevice) return;
			this.inputAddress = this.lastDevice.ip;
			this.inputFocused = false;
			uni.vibrateShort && uni.vibrateShort({});
			this.doConnect();
		},
		formatRelative(ts) {
			if (!ts) return '';
			const diff = Date.now() - ts;
			const min = Math.floor(diff / 60000);
			if (min < 1) return '刚刚';
			if (min < 60) return min + ' 分钟前';
			const hr = Math.floor(min / 60);
			if (hr < 24) return hr + ' 小时前';
			const d = Math.floor(hr / 24);
			if (d < 7) return d + ' 天前';
			const date = new Date(ts);
			return (date.getMonth() + 1) + '-' + date.getDate();
		},
		async doConnect() {
			if (this.connecting || this.deviceConnected) return;
			const addr = this.inputAddress.trim();
			if (!isValidAddress(addr)) {
				this.showToast('提示', '请输入有效的 IP 或域名，例如 192.168.4.1');
				return;
			}
			try {
				apiService.setDeviceAddress(addr);
				this.connecting = true;
				this.loadingVisible = true;
				const res = await apiService.getDeviceId();
				if (res.status === 'success') {
					const info = { address: addr, deviceId: res.data.device_id, connected: true };
					uni.setStorageSync('connectedDevice', info);
					this.setDevice(info);
					uni.$emit('deviceConnected', { connected: true, device: info });
					this._saveLastDevice();
					this.staIp = '';
					this.fetchStaStatus();
				} else {
					this.showToast('失败', (res.data && res.data.message) || '获取设备 ID 失败', 'error');
				}
			} catch (e) {
				errorHandler.handleError(e);
			} finally {
				this.connecting = false;
				this.loadingVisible = false;
			}
		},
		async fetchStaStatus() {
			try {
				const res = await apiService.getStaWifi();
				if (res.status === 'success' && res.data && res.data.connected && res.data.local_ip) {
					this.staIp = res.data.local_ip;
				} else {
					this.staIp = '';
				}
			} catch (e) { this.staIp = ''; }
		},
		/** 首次进入自动扫描（仅一次） */
		_autoScanMdns() {
			if (this._scanStarted) return;
			this._scanStarted = true;
			this.scanMdns();
		},
		async scanMdns(userInitiated) {
			if (this.mdnsScanning || this.deviceConnected) return;
			this.mdnsScanning = true;
			if (userInitiated) this.mdnsDevices = [];

			const set = new Set();
			constants.MDNS_SCAN_CANDIDATES.forEach(h => set.add(h));
			if (this.lastDevice && this.lastDevice.ip) set.add(this.lastDevice.ip);
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
			uni.vibrateShort && uni.vibrateShort({});
			this.inputAddress = device.hostname;
			this.doConnect();
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
		navigateBack() { uni.redirectTo({ url: '/pages/index/index' }); },
		navigateTo(page) { uni.navigateTo({ url: '/pages/' + page }); }
	}
};
</script>

<style lang="scss">
/* .page / .body / .card / .btn / .label / .input-wrap 由 App.vue 全局提供 */

/* ===================== Hero ===================== */
.hero { display: flex; flex-direction: column; align-items: center; padding: 32rpx 0 20rpx; }
.hero-icon-wrap {
	width: 80rpx; height: 80rpx; border-radius: 20rpx;
	background: linear-gradient(145deg, $brand-primary-bg 0%, #F0F7FF 100%);
	display: flex; align-items: center; justify-content: center;
	margin-bottom: 12rpx;
	box-shadow: 0 6rpx 16rpx rgba(22, 119, 255, 0.1);
}
.hero-icon { width: 44rpx; height: 44rpx; }
.hero-title { font-size: 32rpx; font-weight: 700; color: $text-primary; margin-bottom: 4rpx; }
.hero-desc {
	font-size: 24rpx; color: $text-hint; text-align: center;
	padding: 0 32rpx; line-height: 1.5;
}

/* card-title */
.card-title { font-size: $fs-body; }
.card-title-row {
	display: flex; align-items: center; justify-content: space-between;
	margin-bottom: 16rpx;
}
.card-meta { font-size: $fs-caption; color: $text-hint; }

/* ===================== 上次连接 ===================== */
.last-card { background: linear-gradient(135deg, $brand-primary-bg 0%, $bg-card 100%); }
.last-item {
	display: flex; align-items: center; justify-content: space-between;
	padding: 20rpx;
	border-radius: $radius-lg;
	background: $bg-card;
	box-shadow: 0 2rpx 12rpx rgba(22, 119, 255, 0.1);
	transition: transform 150ms;
}
.last-item:active { transform: scale(0.98); }
.last-left { display: flex; align-items: center; gap: 16rpx; flex: 1; min-width: 0; }
.last-icon { width: 40rpx; height: 40rpx; opacity: 0.85; }
.last-text { display: flex; flex-direction: column; gap: 4rpx; min-width: 0; }
.last-ip {
	font-size: $fs-title; font-weight: 700; color: $brand-primary;
	white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.last-time { font-size: $fs-caption; color: $text-hint; }
.last-go { font-size: 40rpx; color: $brand-primary; font-weight: 300; margin-left: 12rpx; }

/* ===================== 手动 IP 输入 ===================== */
.field-hint {
	background: $bg-elevated;
	padding: 16rpx 20rpx;
	border-radius: $radius-md;
	margin-bottom: 16rpx;
	display: flex; flex-direction: column; gap: 4rpx;
}
.field-hint text { font-size: $fs-caption; color: $text-secondary; line-height: 1.6; }
.field { margin-bottom: 14rpx; }
.input-wrap { height: 76rpx; padding: 0 24rpx; border-radius: 16rpx; }
.input { height: 76rpx; font-size: $fs-body; color: $text-primary; font-weight: 500; }

/* ===================== mDNS 局域网发现 ===================== */
.scan-btn {
	height: 48rpx; padding: 0 20rpx; border-radius: 32rpx;
	background: $brand-primary;
	flex-shrink: 0;
	display: flex; align-items: center;
	transition: opacity 150ms, background 150ms;
}
.scan-btn:active { background: $brand-primary-hover; }
.scan-btn text { color: $bg-card; font-size: $fs-label; font-weight: 500; }
.scan-btn.off { opacity: 0.6; pointer-events: none; }
.scan-dot {
	width: 12rpx; height: 12rpx; border-radius: 50%;
	background: rgba(255,255,255,0.7);
	animation: scanPulse 800ms ease-in-out infinite;
	margin-right: 6rpx;
}
@keyframes scanPulse { 0%,100% { opacity: 0.4; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }

.md-status {
	display: flex; align-items: center;
	padding: 12rpx 16rpx;
	background: $bg-elevated;
	border-radius: $radius-md;
	margin-bottom: 16rpx;
}
.md-status text { font-size: $fs-label; color: $text-secondary; }
.ws-dot {
	width: 14rpx; height: 14rpx; border-radius: 50%;
	background: $border-normal; margin-right: 10rpx; flex-shrink: 0;
}
.ws-dot.on { background: $color-success; }

.md-list {
	max-height: 300rpx;
	background: $bg-elevated;
	border-radius: $radius-lg;
	padding: 4rpx 20rpx;
	box-sizing: border-box;
	overflow-y: auto;
}
.md-item {
	display: flex; align-items: center; justify-content: space-between;
	padding: 16rpx 0;
	border-bottom: 1rpx solid $border-light;
	transition: background 150ms;
}
.md-item:last-child { border-bottom: none; }
.md-item:active { background: rgba(0,0,0,0.03); }
.md-left { display: flex; align-items: center; gap: 16rpx; flex: 1; min-width: 0; }
.md-icon { width: 44rpx; height: 44rpx; opacity: 0.7; }
.md-text { display: flex; flex-direction: column; gap: 4rpx; min-width: 0; }
.md-hostname {
	font-size: 28rpx; color: $text-primary; font-weight: 500;
	white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.md-id {
	font-size: $fs-caption; color: $text-hint;
	font-family: monospace;
}
.md-go {
	font-size: 40rpx; color: $text-disabled; font-weight: 300;
	margin-left: 12rpx;
}
.mdns-skeleton {
	padding: 24rpx 20rpx;
	background: $bg-elevated;
	border-radius: $radius-lg;
	display: flex; flex-direction: column; gap: 16rpx;
}
.ws-row {
	height: 40rpx;
	background: linear-gradient(90deg, $bg-subtle 0%, $border-light 50%, $bg-subtle 100%);
	background-size: 200% 100%;
	border-radius: $radius-sm;
	animation: shimmer 1.2s linear infinite;
}
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

/* ===================== 按钮 ===================== */
.btn {
	height: 76rpx; border-radius: $radius-lg;
	display: flex; align-items: center; justify-content: center;
	margin-top: 4rpx;
	background: $brand-primary;
	box-shadow: 0 4rpx 12rpx rgba(22, 119, 255, 0.22);
}
.btn:active { transform: scale(0.99); }
.btn text { font-size: $fs-body; font-weight: 600; color: $bg-card; }

/* ===================== 已连接态 ===================== */
.success-hero {
	display: flex; flex-direction: column; align-items: center;
	padding: 32rpx 0 20rpx;
}
.sh-icon {
	width: 88rpx; height: 88rpx; border-radius: 50%;
	background: #F6FFED; color: $color-success;
	display: flex; align-items: center; justify-content: center;
	font-size: 44rpx; font-weight: 700; margin-bottom: 16rpx;
}
.sh-title { font-size: $fs-heading; font-weight: 700; color: $text-primary; }
.sh-desc {
	font-size: $fs-label; color: $text-hint;
	margin-top: 8rpx; font-family: monospace;
}

.info-row {
	display: flex; justify-content: space-between; align-items: center;
	padding: 16rpx 0; border-bottom: 1rpx solid $border-light;
}
.info-row:last-child { border-bottom: none; }
.ir-label { font-size: 26rpx; color: $text-hint; }
.ir-val { font-size: 26rpx; color: $text-regular; font-weight: 500; word-break: break-all; max-width: 60%; text-align: right; }
.ir-val.sta { color: $brand-primary; }

/* STA 未配置提示卡 */
.hint-card {
	background: linear-gradient(135deg, $color-warning-bg 0%, $bg-card 100%);
	border: 1rpx solid #FFE58F;
}
.hint-row { display: flex; gap: 12rpx; align-items: flex-start; margin-bottom: 16rpx; }
.hint-emoji { font-size: 32rpx; flex-shrink: 0; }
.hint-text {
	font-size: $fs-label; color: $color-warning-text;
	line-height: 1.6; flex: 1;
}
.hint-btn {
	padding: 16rpx 32rpx;
	background: $color-warning;
	border-radius: $radius-lg;
	text-align: center;
}
.hint-btn text { color: $bg-card; font-size: $fs-label; font-weight: 500; }
.hint-btn:active { background: #D97706; }

/* 进入控制面板按钮 */
.btn-primary { margin-bottom: 16rpx; }
</style>