<template>
	<view class="page">
		<!-- 未连接 -->
		<view class="body" v-if="!deviceConnected">
			<view class="hero">
				<view class="hero-icon-wrap">
					<image src="/static/icons/device.svg" class="hero-icon" mode="aspectFit" />
				</view>
				<text class="hero-title">连接设备</text>
				<text class="hero-desc">首次连接请先连 ESP8266 热点，之后可通过同一 WiFi 自动发现</text>
			</view>

			<!-- P0: 上次连接过的设备（最显眼） -->
			<view class="card last-card" v-if="lastDevice">
				<view class="card-title-row">
					<text class="card-title">上次连接</text>
					<text class="card-meta">{{ lastDevice.ssid || 'AP 模式' }}</text>
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

			<!-- P1: 当 WiFi 连到 ESP 热点时，给一个直达系统连接的大按钮 -->
			<view class="card hotspot-card" v-if="connectedToEsp">
				<view class="hotspot-row">
					<view class="hotspot-icon-wrap">
						<image src="/static/icons/device.svg" class="hotspot-icon" mode="aspectFit" />
					</view>
					<view class="hotspot-text">
						<text class="hotspot-title">检测到设备热点</text>
						<text class="hotspot-sub">{{ wifiSSID }}</text>
					</view>
				</view>
				<view class="btn" @click="openSystemWifi" role="button" aria-label="前往系统 WiFi 设置连接设备热点">
					<text>前往系统 WiFi 设置</text>
				</view>
			</view>

			<!-- WiFi 列表：信号强度前置，加扫描中的骨架 -->
			<view class="card" v-if="!connectedToEsp">
				<view class="card-title-row">
					<text class="card-title">{{ wifiSSID ? '附近 WiFi' : '选择 WiFi' }}</text>
					<view class="scan-btn" @click="startWifiScan(true)" :class="{ off: wifiScanning }" role="button" :aria-label="wifiScanning ? '扫描中' : '刷新 WiFi 列表'">
						<view class="scan-dot" v-if="wifiScanning"></view>
						<text>{{ wifiScanning ? '扫描中' : '刷新' }}</text>
					</view>
				</view>

				<!-- wifi-status 简短提示 -->
				<view class="wifi-status" v-if="wifiSSID">
					<view class="ws-dot on"></view>
					<text>当前已连：{{ wifiSSID }}</text>
				</view>

				<!-- WiFi 列表 -->
				<view class="wifi-list" v-if="wifiList.length > 0">
					<view class="wl-item" v-for="(w, i) in wifiList" :key="w.SSID || w.ssid || i"
						@click="onWifiItemClick(w)" role="button"
						:aria-label="`连接到 WiFi ${w.SSID || w.ssid}`">
						<view class="wl-signal" :class="signalLevel(w)" :aria-label="`信号 ${signalLabel(w)}`">
							<view class="wl-bar"></view>
							<view class="wl-bar"></view>
							<view class="wl-bar"></view>
							<view class="wl-bar"></view>
						</view>
						<view class="wl-left">
							<text class="wl-name">{{ w.SSID || w.ssid }}</text>
							<text class="wl-tag" v-if="isEspHotspot(w)">设备热点 · 点此连接</text>
							<text class="wl-sub" v-else>点击前往系统设置</text>
						</view>
					</view>
				</view>

				<!-- 扫描中骨架 -->
				<view class="wifi-skeleton" v-else-if="wifiScanning">
					<view class="ws-row" v-for="n in 4" :key="n"></view>
				</view>

				<!-- 空态：分首次 vs 失败 -->
				<view class="wifi-empty" v-else-if="wifiScanFailed">
					<text class="we-icon">📶</text>
					<text class="we-title">未获取到附近的 WiFi</text>
					<text class="we-desc">{{ wifiScanError || '请检查位置服务（Android）和 WiFi 是否开启' }}</text>
					<view class="we-btn" @click="startWifiScan(true)" role="button" aria-label="重试扫描 WiFi">
						<text>重试</text>
					</view>
				</view>
				<view class="wifi-empty" v-else>
					<text class="we-icon">📶</text>
					<text class="we-title">点击刷新扫描周围 WiFi</text>
					<text class="we-desc">也需要 WiFi 开启 + 位置服务授权（Android）</text>
				</view>
			</view>

			<!-- P1: mDNS / 局域网自动发现 -->
			<view class="card" v-if="!connectedToEsp">
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

			<!-- 手动 IP 输入折叠 / 高级展开 -->
			<view class="card">
				<view class="card-title-row" @click="advancedOpen = !advancedOpen" role="button" aria-label="展开或收起手动配置">
					<text class="card-title">手动输入 IP</text>
					<text class="card-toggle">{{ advancedOpen ? '收起 ▴' : '展开 ▾' }}</text>
				</view>

				<view v-if="advancedOpen">
					<view class="field-hint">
						<text>仅用于排查，例如直接连设备 WiFi 后手动填入。</text>
						<text class="hint-strong">不要带 http:// 或端口号</text>
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
			</view>

			<!-- 帮助提示 -->
			<view class="help" v-if="showHelp">
				<text class="help-title">连接不上？</text>
				<text class="help-row">1. 先在系统 WiFi 设置里连上设备的热点（名称通常含 ESP 或 8266）</text>
				<text class="help-row">2. 设备和手机连到同一 WiFi 后，回到本页会自动发现</text>
				<text class="help-row">3. 还不行就用「手动输入 IP」连接 AP 默认地址 192.168.4.1</text>
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

			<!-- P1: 连接成功但还没配家庭 WiFi 时，提示用户配置 -->
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
					inputAddress: constants.DEFAULT_IP, inputFocused: false,
					wifiSSID: '', wifiScanning: false, wifiList: [],
					wifiScanFailed: false,
					wifiScanError: '',
					staIp: '',
					mdnsScanning: false, mdnsDevices: [],
					advancedOpen: false,
					lastDevice: null,
					showStaHint: true,
					showHelp: true,
					_scanStarted: false   // 仅首次进入触发扫描，避免 onShow 反复刷
		};
		},
		computed: {
			defaultIp() { return constants.DEFAULT_IP; },
			connectedToEsp() {
				return this.wifiSSID && /esp|8266/i.test(this.wifiSSID);
			}
		},
			onLoad() {
			this._loadLastDevice();
			this.checkDevice();
			if (this.deviceConnected) return;
			this._initialScan();
		},
		onShow() {
			this.checkDevice();
			if (this.deviceConnected) return;
			// 用户从系统 WiFi 切回 → 重新获取 WiFi 状态（不重复触发扫描，避免抖动）
			this.getWifiStatus().then(() => {
				this.autoFillIp();
			});
		},
		onUnload() { try { uni.offGetWifiList(); } catch (e) {} },
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
				ssid: this.wifiSSID || stale.ssid || '',
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

		async _initialScan() {
			if (this._scanStarted) return;
			this._scanStarted = true;
			await this.getWifiStatus();
			this.autoFillIp();
			// 两个扫描并行启动（互不依赖）
			this.startWifiScan();
			this.scanMdns();
		},

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
		async startWifiScan(userInitiated) {
			if (this.wifiScanning) return;
			this.wifiScanning = true;
			this.wifiScanFailed = false;
			this.wifiScanError = '';
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
					// 将当前已连的 WiFi 排到第一位（最高优先级提示用户已在用）
					const seen = new Set();
					const list = pending
						.filter(w => { const s = w.SSID || w.ssid || ''; if (!s || seen.has(s)) return false; seen.add(s); return true; })
						.sort((a, b) => {
							const aCur = (a.SSID || a.ssid) === this.wifiSSID ? 1 : 0;
							const bCur = (b.SSID || b.ssid) === this.wifiSSID ? 1 : 0;
							if (aCur !== bCur) return bCur - aCur;
							return (b.signalStrength || 0) - (a.signalStrength || 0);
						});
					this.wifiList = list;
				} else {
					// 设备未返回列表 → 在某些 Android 机型属于正常（需位置权限）
					if (userInitiated) {
						this.wifiScanFailed = true;
						this.wifiScanError = '未返回 WiFi 列表，请确保 WiFi 与位置服务都已开启';
					}
				}
			} catch (e) {
				const msg = e.errMsg || e.message || '';
				if (msg.indexOf('location') > -1) {
					this.wifiScanFailed = true;
					this.wifiScanError = '请在系统设置中开启"位置服务"';
					this.showToast('提示', '请开启位置服务后重试');
				} else {
					if (userInitiated) {
						this.wifiScanFailed = true;
						this.wifiScanError = '扫描失败，请检查 WiFi 和位置权限';
					} else {
						this.showToast('提示', '扫描失败，请检查 WiFi 和位置权限');
					}
				}
			} finally {
				this.wifiScanning = false;
			}
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
		signalLevel(w) {
			return 'lv' + this.signalBars(w);
		},
		signalLabel(w) {
			const lv = this.signalBars(w);
			return ['无', '弱', '一般', '良好', '极强'][lv] || '未知';
		},
		signalBars(w) {
			const s = w.signalStrength || 0;
			if (s > -55) return 4; if (s > -70) return 3; if (s > -85) return 2; return 1;
		},
		isEspHotspot(w) {
			const ssid = (w.SSID || w.ssid || '').toLowerCase();
			return ssid.indexOf('esp') > -1 || ssid.indexOf('8266') > -1;
		},
		onWifiItemClick(w) {
			// 所有 WiFi 都跳系统设置（因为 ESP8266 不支持应用内直接连接任意 WiFi）
			this.openSystemWifi(undefined, w);
		},
		openSystemWifi(_ignore, w) {
			const platform = uni.getSystemInfoSync().platform;
			if (platform === 'android' && typeof plus !== 'undefined') {
				const main = plus.android.runtimeMainActivity();
				const intent = new plus.android.newObject('android.content.Intent', 'android.settings.WIFI_SETTINGS');
				main.startActivity(intent);
			} else {
				this.showToast('提示', '请在系统设置中连接 WiFi "' + (w ? (w.SSID || w.ssid) : (this.wifiSSID || '')) + '"');
			}
		},
		async doConnect() {
			if (this.connecting || this.deviceConnected) return;
			const addr = this.inputAddress.trim();
			if (!isValidAddress(addr)) {
				this.showToast('提示', '请输入有效的 IP 或域名，例如 192.168.4.1');
				return;
			}
			try {
				// 先把目标地址写入 apiService，再发起请求
				// ——从 mDNS 选中或手动输入时 baseUrl 可能还是上一次的值；
				//  不更新会导致请求落到旧地址或 baseUrl='' 抛出「设备未连接」。
				apiService.setDeviceAddress(addr);
				this.connecting = true; this.loadingVisible = true;
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
				this.connecting = false; this.loadingVisible = false;
			}
		},
		async scanMdns(userInitiated) {
			if (this.mdnsScanning || this.deviceConnected) return;
			this.mdnsScanning = true;
			if (userInitiated) this.mdnsDevices = [];

			const set = new Set();
			constants.MDNS_SCAN_CANDIDATES.forEach(h => set.add(h));
			if (this.lastDevice && this.lastDevice.ip) set.add(this.lastDevice.ip);
			if (this.wifiSSID && /esp|8266/i.test(this.wifiSSID)) {
				set.add(constants.DEFAULT_IP);
			}
			const sta = uni.getStorageSync('staNetwork');
			if (sta && sta.ip) set.add(sta.ip);
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
		navigateBack() { uni.redirectTo({ url: '/pages/index/index' }); },
		navigateTo(page) { uni.navigateTo({ url: '/pages/' + page }); }
	},
	};
</script>

<style lang="scss">
/* .page / .body / .card / .btn / .label / .input-wrap 由 App.vue 全局提供
   本页 .btn 调整为更宽版（96rpx 高 + 阴影），.input-wrap 同样加大到 96rpx 容大字号
   .scan-btn/scanning/empty/skeleton/hotspot 等设计模式专属 */

/* ===================== Hero ===================== */
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
.hero-desc {
	font-size: 26rpx; color: $text-hint; text-align: center;
	padding: 0 32rpx; line-height: 1.6;
}

/* card-title 本页略小于全局 */
.card-title { font-size: $fs-body; }

/* ===================== 通用行 ===================== */
.card-title-row {
	display: flex; align-items: center; justify-content: space-between;
	margin-bottom: 16rpx;
}
.card-meta { font-size: $fs-caption; color: $text-hint; }
.card-toggle {
	font-size: $fs-label; color: $brand-primary; font-weight: 500;
	padding: 8rpx 12rpx;
	border-radius: $radius-sm;
}
.card-toggle:active { background: $brand-primary-bg; }

/* 扫描按钮 — 三处共享视觉语言 */
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

/* ===================== Hotspot 直达卡 ===================== */
.hotspot-card {
	background: linear-gradient(135deg, $color-success-bg 0%, $bg-card 100%);
	border: 1rpx solid $color-success-bg;
}
.hotspot-row {
	display: flex; align-items: center; gap: 16rpx;
	margin-bottom: 20rpx;
}
.hotspot-icon-wrap {
	width: 80rpx; height: 80rpx; border-radius: 20rpx;
	background: $bg-card; display: flex; align-items: center; justify-content: center;
	box-shadow: 0 4rpx 12rpx rgba(0,200,83,0.12);
}
.hotspot-icon { width: 48rpx; height: 48rpx; }
.hotspot-text { display: flex; flex-direction: column; gap: 4rpx; }
.hotspot-title { font-size: $fs-title; font-weight: 700; color: $text-primary; }
.hotspot-sub { font-size: $fs-label; color: $color-success; font-weight: 500; }

/* ===================== WiFi 列表 ===================== */
.wifi-status {
	display: flex; align-items: center;
	padding: 12rpx 16rpx;
	background: $color-success-bg-alt;
	border-radius: $radius-md;
	margin-bottom: 16rpx;
}
.ws-dot {
	width: 14rpx; height: 14rpx; border-radius: 50%;
	background: $border-normal; margin-right: 10rpx; flex-shrink: 0;
}
.ws-dot.on { background: $color-success; }
.wifi-status text {
	font-size: $fs-label; color: $text-secondary;
	overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.wifi-list {
	max-height: 360rpx;
	background: $bg-elevated;
	border-radius: $radius-lg;
	padding: 4rpx 20rpx;
	box-sizing: border-box;
	overflow-y: auto;
	-webkit-overflow-scrolling: touch;
}
.wl-item {
	display: flex; align-items: center;
	padding: 22rpx 0;
	border-bottom: 1rpx solid $border-light;
	min-height: 96rpx;
	transition: background 150ms;
}
.wl-item:last-child { border-bottom: none; }
.wl-item:active { background: rgba(0,0,0,0.03); }

/* 信号强度 4 bar：信号等级决定前几根着色 */
.wl-signal {
	display: flex; align-items: flex-end;
	gap: 3rpx;
	width: 60rpx;
	flex-shrink: 0;
	margin-right: 16rpx;
	height: 32rpx;
}
.wl-bar {
	width: 8rpx; border-radius: 2rpx;
	background: $border-normal;
	transition: background 200ms;
}
.wl-bar:nth-child(1) { height: 8rpx; }
.wl-bar:nth-child(2) { height: 14rpx; }
.wl-bar:nth-child(3) { height: 22rpx; }
.wl-bar:nth-child(4) { height: 30rpx; }
/* 根据等级 lv1~lv4 为前 N 根着色 */
.wl-signal.lv1 .wl-bar:nth-child(-n+1) { background: $brand-primary; }
.wl-signal.lv1 .wl-bar:nth-child(n+2) { background: $border-normal; }
.wl-signal.lv2 .wl-bar:nth-child(-n+2) { background: $brand-primary; }
.wl-signal.lv2 .wl-bar:nth-child(n+3) { background: $border-normal; }
.wl-signal.lv3 .wl-bar:nth-child(-n+3) { background: $brand-primary; }
.wl-signal.lv3 .wl-bar:nth-child(n+4) { background: $border-normal; }
.wl-signal.lv4 { color: $brand-primary; }
.wl-signal.lv4 .wl-bar { background: $brand-primary; }

.wl-left {
	display: flex; flex-direction: column; gap: 4rpx;
	flex: 1; min-width: 0;
}
.wl-name {
	font-size: 28rpx; color: $text-primary; font-weight: 500;
	white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.wl-tag {
	font-size: $fs-caption;
	color: $color-success;
	background: $color-success-bg-alt;
	padding: 4rpx 12rpx;
	border-radius: $radius-sm;
	white-space: nowrap;
	font-weight: 500;
	align-self: flex-start;
}
.wl-sub {
	font-size: $fs-caption;
	color: $text-hint;
}

/* ===================== Skeleton ===================== */
.wifi-skeleton,
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

/* ===================== Empty / Error 态 ===================== */
.wifi-empty {
	padding: 56rpx 32rpx;
	background: $bg-elevated;
	border-radius: $radius-lg;
	display: flex; flex-direction: column;
	align-items: center; gap: 12rpx;
	text-align: center;
}
.we-icon { font-size: 56rpx; margin-bottom: 4rpx; }
.we-title {
	font-size: $fs-body; color: $text-primary;
	font-weight: 600;
}
.we-desc {
	font-size: $fs-caption; color: $text-hint;
	line-height: 1.5;
	max-width: 80%;
}
.we-btn {
	margin-top: 16rpx;
	padding: 16rpx 40rpx;
	background: $brand-primary-bg;
	border-radius: $radius-lg;
}
.we-btn text {
	font-size: $fs-label; color: $brand-primary; font-weight: 500;
}
.we-btn:active { background: $brand-primary; }
.we-btn:active text { color: $bg-card; }

/* ===================== mDNS 列表 ===================== */
.md-status {
	display: flex; align-items: center;
	padding: 12rpx 16rpx;
	background: $bg-elevated;
	border-radius: $radius-md;
	margin-bottom: 16rpx;
}
.md-status text {
	font-size: $fs-label; color: $text-secondary;
}

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
	padding: 22rpx 0;
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

/* ===================== 手动 IP（折叠表单） ===================== */
.field-hint {
	background: $bg-elevated;
	padding: 16rpx 20rpx;
	border-radius: $radius-md;
	margin-bottom: 16rpx;
	display: flex; flex-direction: column; gap: 4rpx;
}
.field-hint text { font-size: $fs-caption; color: $text-secondary; line-height: 1.6; }
.field-hint .hint-strong { color: $color-warning-text; font-weight: 500; }

.field { margin-bottom: 20rpx; }
.input-wrap { height: 96rpx; padding: 0 24rpx; border-radius: 18rpx; }
.input { height: 96rpx; font-size: $fs-title; color: $text-primary; font-weight: 500; }

/* ===================== 按钮（device 更宽版） ===================== */
.btn {
	height: 96rpx; border-radius: $radius-lg;
	display: flex; align-items: center; justify-content: center;
	margin-top: 8rpx;
	background: $brand-primary; /* 兜底：避免漏写 btn-primary / hotspot 上下文导致透明背景文字不可见 */
	box-shadow: 0 8rpx 20rpx rgba(22, 119, 255, 0.25);
}
.btn:active { transform: scale(0.99); }
.btn text { font-size: $fs-title; font-weight: 600; color: $bg-card; }

/* hotspot-card 等内部的高级按钮不带阴影，更轻量化 */
.hotspot-card .btn { box-shadow: none; background: $color-success; }
.hotspot-card .btn text { color: $bg-card; }
.hotspot-card .btn:active { background: #00A85F; }

/* ===================== 帮助提示 ===================== */
.help {
	margin-top: 24rpx; padding: 24rpx;
	background: $bg-card;
	border-radius: $radius-xl;
	box-shadow: $shadow-sm;
	display: flex; flex-direction: column; gap: 8rpx;
}
.help-title {
	font-size: $fs-body; font-weight: 600; color: $text-primary;
	display: block; margin-bottom: 8rpx;
}
.help-row {
	font-size: $fs-label; color: $text-secondary;
	line-height: 1.7;
	display: block;
}

/* ===================== 已连接态 ===================== */
.success-hero {
	display: flex; flex-direction: column; align-items: center;
	padding: 64rpx 0 40rpx;
}
.sh-icon {
	width: 112rpx; height: 112rpx; border-radius: 50%;
	background: #F6FFED; color: $color-success;
	display: flex; align-items: center; justify-content: center;
	font-size: 56rpx; font-weight: 700; margin-bottom: 24rpx;
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

/* 进入控制面板按钮（已连接态） */
.btn-primary { margin-bottom: 16rpx; }
</style>
