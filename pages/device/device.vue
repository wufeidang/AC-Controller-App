<template>
	<view class="page">
		<!-- 未连接 -->
		<view class="body" v-if="!deviceConnected">
			<view class="hero">
				<view class="hero-icon-wrap">
					<image src="/static/icons/device.svg" class="hero-icon" mode="aspectFit" />
				</view>
				<text class="hero-title">连接设备</text>
				
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

			<!-- 手动 IP 输入（始终显示）
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
			</view>  -->

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
						:aria-label="`连接到设备 ${d.deviceId || d.hostname}`">
						<view class="md-left">
							<view class="md-text">
								<text class="md-id">{{ d.deviceId || d.hostname }}</text>
								<text class="md-ip" v-if="d.hostAddress">{{ d.hostAddress }}</text>
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

		<!-- 已连接 — 直接跳转控制面板 -->
		<view class="body" v-else>
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
		if (this.deviceConnected) {
			uni.redirectTo({ url: '/pages/index/index' });
			return;
		}
		if (this.lastDevice && this.lastDevice.ip) {
			this.inputAddress = this.lastDevice.ip;
		}
		this._autoScanMdns();
	},
	onShow() {
		this.checkDevice();
		if (this.deviceConnected) {
			uni.redirectTo({ url: '/pages/index/index' });
			return;
		}
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
					uni.redirectTo({ url: '/pages/index/index' });
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

			// 优先使用原生 mDNS 服务发现
			const nativeDevices = await this._nativeMdnsScan();
			if (nativeDevices.length > 0) {
				// 对发现的设备逐个 HTTP 探测确认
				const results = await Promise.allSettled(
					nativeDevices.map(d => this._tryHost(d.hostname, d))
				);
				this.mdnsDevices = results
					.filter(r => r.status === 'fulfilled' && r.value)
					.map(r => r.value);
			}

			// 如果原生发现无结果，回退到候选列表探测
			if (this.mdnsDevices.length === 0) {
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
			}
			this.mdnsScanning = false;
		},
		/**
		 * 原生 mDNS 服务发现
		 * Android: NsdManager 扫描 _http._tcp 服务
		 * iOS: NSNetServiceBrowser 扫描 _http._tcp 服务
		 */
		_nativeMdnsScan() {
			return new Promise((resolve) => {
				const platform = uni.getSystemInfoSync().platform;
				if (platform === 'android' && typeof plus !== 'undefined') {
					this._androidNsdScan(resolve, 5000);
				} else if (platform === 'ios' && typeof plus !== 'undefined') {
					this._iosBonjourScan(resolve, 5000);
				} else {
					resolve([]);
				}
			});
		},
		_androidNsdScan(resolve, timeoutMs) {
			try {
				const main = plus.android.runtimeMainActivity();
				const Context = plus.android.importClass('android.content.Context');
				const NsdManager = plus.android.importClass('android.net.nsd.NsdManager');
				const nsdManager = main.getSystemService(Context.NSD_SERVICE);
				if (!nsdManager) {
					console.warn('[mdns] NsdManager not available');
					resolve([]);
					return;
				}
				const discovered = [];

				const discoveryListener = plus.android.implements('android.net.nsd.NsdManager$DiscoveryListener', {
					onDiscoveryStarted: function() {},
					onDiscoveryStopped: function() {},
					onServiceFound: function(serviceInfo) {
						try {
							// 使用 plus.android.invoke 调用 Java 方法
							const serviceType = plus.android.invoke(serviceInfo, 'getServiceType');
							if (serviceType === '_http._tcp.') {
								const resolveListener = plus.android.implements('android.net.nsd.NsdManager$ResolveListener', {
									onResolveFailed: function() {},
									onServiceResolved: function(svc) {
										try {
											const host = plus.android.invoke(svc, 'getHost');
											if (host) {
												const hostname = plus.android.invoke(host, 'getHostName');
												const hostAddress = plus.android.invoke(host, 'getHostAddress');
												if (hostname) {
													// getHostName 可能不含 .local，补全
													const fullName = hostname.indexOf('.') > -1 ? hostname : hostname + '.local';
													discovered.push({ hostname: fullName, hostAddress });
												}
											}
										} catch (e) { console.warn('[mdns] resolve err:', e); }
									}
								});
								plus.android.invoke(nsdManager, 'resolveService', serviceInfo, resolveListener);
							}
						} catch (e) { console.warn('[mdns] onServiceFound:', e); }
					},
					onServiceLost: function() {},
					onStartDiscoveryFailed: function() { resolve(discovered); },
					onStopDiscoveryFailed: function() {}
				});

				plus.android.invoke(nsdManager, 'discoverServices', '_http._tcp', NsdManager.PROTOCOL_DNS_SD, discoveryListener);

				setTimeout(() => {
					try { plus.android.invoke(nsdManager, 'stopServiceDiscovery', discoveryListener); } catch (e) {}
					resolve(discovered);
				}, timeoutMs);
			} catch (e) {
				console.warn('[mdns] android nsd err:', e);
				resolve([]);
			}
		},
		_iosBonjourScan(resolve, timeoutMs) {
			try {
				const found = [];
				const NSNetServiceBrowser = plus.ios.importClass('NSNetServiceBrowser');
				const browser = NSNetServiceBrowser.alloc().init();

				// 获取当前 run loop
				const NSRunLoop = plus.ios.importClass('NSRunLoop');
				const currentRunLoop = NSRunLoop.currentRunLoop();

				const delegate = plus.ios.implements({
					netServiceBrowserDidFindService: function(brow, service, moreComing) {
						try {
							const hostName = service.hostName();
							const name = service.name();
							if (hostName) {
								found.push({ hostname: hostName, name: name });
							}
						} catch (e) { console.warn('[mdns] ios found:', e); }
					},
					netServiceBrowserDidRemoveService: function(brow, service, moreComing) {},
					netServiceBrowserDidStopSearch: function(brow) {},
					netServiceBrowserDidNotSearch: function(brow, dict) {}
				});

				browser.setDelegate(delegate);
				browser.searchForServicesOfType('_http._tcp', 'local.');

				setTimeout(() => {
					try {
						browser.stop();
						plus.ios.deleteObject(browser);
						plus.ios.deleteObject(delegate);
					} catch (e) {}
					resolve(found);
				}, timeoutMs);
			} catch (e) {
				console.warn('[mdns] ios bonjour err:', e);
				resolve([]);
			}
		},
		_tryHost(hostname, extra) {
			return new Promise((resolve) => {
				const cleanHost = hostname.replace(/\.$/, ''); // 去掉末尾点
				const timer = setTimeout(() => resolve(null), constants.MDNS_SCAN_TIMEOUT);
				uni.request({
					url: `http://${cleanHost}:80`,
					method: 'POST',
					data: { cmd: 'get_device_id', data: {} },
					timeout: constants.MDNS_SCAN_TIMEOUT,
					success: (r) => {
						clearTimeout(timer);
						if (r.statusCode === 200 && r.data && r.data.status === 'success') {
							resolve({
								hostname: cleanHost,
								deviceId: r.data.data.device_id || '',
								hostAddress: extra ? extra.hostAddress : ''
							});
						} else { resolve(null); }
					},
					fail: () => { clearTimeout(timer); resolve(null); }
				});
			});
		},
		selectMdnsDevice(device) {
			uni.vibrateShort && uni.vibrateShort({});
			this.inputAddress = device.hostAddress || device.hostname;
			this.doConnect();
		},
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
.hero-icon { width: 60rpx; height: 60rpx; }
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
.md-text { display: flex; flex-direction: column; gap: 4rpx; min-width: 0; }
.md-id {
	font-size: 28rpx; color: $text-primary; font-weight: 500;
	white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.md-ip {
	font-size: $fs-caption; color: $text-hint;
	font-family: monospace;
	white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
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
</style>