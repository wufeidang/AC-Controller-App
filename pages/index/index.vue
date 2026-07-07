<template>
	<view class="page">
		<!-- 顶部 -->
		<view class="top-bar" :style="{ paddingTop: (statusBarHeight + 24) + 'px' }">
			<view class="top-left">
				<text class="top-location">{{ deviceConnected ? deviceLocation  : '空调温控' }}</text>
			</view>
			<view class="top-right" v-if="deviceConnected">
				<view class="status-badge" :class="connectionState">
					<view class="status-dot"></view>
					<text>{{ connectionLabel }}</text>
				</view>
			</view>
		</view>


		<!-- 已连接：看板 -->
		<view class="body">
			<!-- 主数据大卡：温度 / 湿度 根据控制类型切换 C 位 -->
			<view class="temp-hero" v-if="controlType !== 'humidity'">
				<text class="temp-num" :class="tempColor" v-if="hasTemp">{{ currentTemp }}</text>
				<text class="temp-num placeholder" v-else>--</text>
				<text class="temp-unit">°C</text>
				<text class="temp-sub">室内温度</text>
			</view>
			<view class="temp-hero hum-hero" v-else>
				<text class="temp-num hum-num" v-if="hasHum">{{ currentHum }}</text>
				<text class="temp-num hum-num placeholder" v-else>--</text>
				<text class="temp-unit">%</text>
				<text class="temp-sub">室内湿度</text>
			</view>

			<!-- 次要数据 + 模式 -->
			<view class="info-row">
				<view class="info-item clickable" v-if="controlType !== 'humidity'" @click="navigateTo('settings/temp-hum')">
					<image src="/static/icons/humidity.svg" class="info-icon" mode="aspectFit" />
					<text class="info-val" v-if="hasHum">{{ currentHum }}%</text>
					<text class="info-val placeholder" v-else>--%</text>
					<text class="info-lbl">湿度</text>
				</view>
				<view class="info-item clickable" v-else @click="navigateTo('settings/temp-hum')">
					<image src="/static/icons/temperature.svg" class="info-icon" mode="aspectFit" />
					<text class="info-val" :class="tempColor" v-if="hasTemp">{{ currentTemp }}°C</text>
					<text class="info-val placeholder" v-else>--°C</text>
					<text class="info-lbl">温度</text>
				</view>
				<view class="info-div"></view>
				<view class="info-item clickable" @click="navigateTo('settings/scene')">
					<image src="/static/icons/air-conditioner.svg" class="info-icon" mode="aspectFit" />
					<text class="info-val ac-on" v-if="acStatus">{{ modeLabel }}</text>
					<text class="info-val ac-off" v-else>待机</text>
					<text class="info-lbl">空调</text>
				</view>
				<view class="info-div"></view>
				<view class="info-item clickable" @click="navigateTo('settings/temp-hum')">
					<image src="/static/icons/target.svg" class="info-icon" mode="aspectFit" />
					<text class="info-val">{{ ruleBrief }}</text>
					<text class="info-lbl">规则</text>
				</view>
			</view>

			<!-- 空调开关 -->
				<view class="switch-card" :class="{ on: acStatus }">
					<view class="switch-left">
						<text class="switch-title">{{ acStatus ? '空调运行中' : '空调已关闭' }}</text>
						<text class="switch-meta" v-if="acStatus">{{ acTemp }}°C · {{ fanLabel }} · {{ swingLabel }}</text>
						<text class="switch-meta" v-if="acBrand" :style="{color:'#999'}">{{ brandLabel }} 品牌</text>
						<text class="switch-meta" v-else>点击右侧开关开启</text>
					</view>
						<switch
							class="switch-ctl"
							:checked="acStatus"
							color="#1677FF"
							@change="toggleACStatus"
							:disabled="switchLoading"
							role="switch"
							:aria-checked="acStatus"
							aria-label="空调开关"
						/>
			</view>

			<!-- 场景快捷 -->
				<view class="section-label">快捷场景</view>
				<view class="scene-grid" role="group" aria-label="场景切换">
					<view
						v-for="s in scenes"
						:key="s.value"
						class="scene-chip"
						:class="{ active: currentScene === s.value }"
						@click="switchScene(s.value)"
						role="button"
						:aria-label="s.label + '场景'"
						:aria-pressed="currentScene === s.value"
					>
					<view class="chip-icon-wrap">
						<image :src="'/static/icons/' + s.icon + '.svg'" class="chip-icon" mode="aspectFit" />
					</view>
					<text class="chip-label">{{ s.label }}</text>
				</view>
				</view>

			<!-- 入口 -->
				<view class="section-label">控制与设置</view>
				<view class="nav-list">
					<view class="nav-row" @click="navigateTo('settings/ac-params')" role="link" aria-label="空调控制">
						<view class="nav-left">
							<image src="/static/icons/air-conditioner.svg" class="nav-icon" mode="aspectFit" />
							<text class="nav-label">空调控制</text>
						</view>
						<view class="nav-arr">›</view>
					</view>
					<view class="nav-row" @click="navigateTo('settings/temp-hum')" role="link" aria-label="温湿度阈值">
						<view class="nav-left">
							<image src="/static/icons/temperature.svg" class="nav-icon" mode="aspectFit" />
							<text class="nav-label">温湿度阈值</text>
						</view>
						<view class="nav-arr">›</view>
					</view>
					<view class="nav-row" @click="navigateTo('settings/settings')" role="link" aria-label="更多设置">
						<view class="nav-left">
							<image src="/static/icons/settings.svg" class="nav-icon" mode="aspectFit" />
							<text class="nav-label">更多设置</text>
						</view>
						<view class="nav-arr">›</view>
					</view>
				</view>

				<view class="disconnect-btn row-action danger" @click="handleDisconnect" role="button" aria-label="断开连接">
					<text>断开连接</text>
				</view>
		</view>

		<Loading :visible="loadingVisible" :text="loadingText" />

			<!-- Toast 提示 -->
			<CustomModal
				:visible="modalVisible"
				:title="modalTitle"
				:content="modalContent"
				:close-on-click-overlay="false"
				:type="modalType"
				:show-buttons="false"
			/>

			<!-- 确认弹窗 -->
			<CustomModal
				:visible="confirmVisible"
				:title="confirmTitle"
				:content="confirmContent"
				:confirm-text="confirmText"
				:cancel-text="cancelText"
				:close-on-click-overlay="false"
				:type="confirmType"
				@confirm="handleConfirmOk"
				@cancel="handleConfirmCancel"
			/>
		</view>
	</template>

	<script>
	import Loading from '../../components/Loading';
	import CustomModal from '../../components/CustomModal';
	import apiService from '../../services/api';
	import constants from '../../config/constants';
	import deviceMixin from '../../mixins/device-mixin';
	import modalMixin from '../../mixins/modal-mixin';

	export default {
		components: { Loading, CustomModal },
		mixins: [deviceMixin, modalMixin],
		data() {
			return {
				currentTemp: null,
				currentHum: null,
				acStatus: false,
				acTemp: 26,
				acMode: 'cool',
				acFanSpeed: 'medium',
				acSwing: 'auto',
				acBrand: '',
				controlType: 'temperature',
				tempOnThreshold: 28,
				tempOffThreshold: 26,
				humOnThreshold: 70,
				humOffThreshold: 60,
				switchLoading: false,
				pollTimer: null,
				currentScene: '',
				scenes: constants.SCENES,
				statusPending: false,  // 防止 fetchStatus 竟态
				_retryPending: false, // 设置变更后若遇竟态，排队重试
				_settingsChangedTimer: null,
				failCount: 0,         // 连续失败次数
				failThreshold: 3,     // 超过此次数标记为连接异常
				hasShownBackoffToast: false,
				_currentInterval: 0,
				statusBarHeight: 0
			};
		},
	computed: {
		hasTemp() { return this.currentTemp != null && this.currentTemp > 0; },
		hasHum() { return this.currentHum != null && this.currentHum > 0; },
		connectionState() {
			if (!this.deviceConnected) return '';
			return this.failCount >= this.failThreshold ? 'warn' : 'on';
		},
		connectionLabel() {
			if (!this.deviceConnected) return '未连接';
			return this.failCount >= this.failThreshold ? '连接异常' : '已连接';
		},
		tempColor() {
			if (!this.hasTemp) return '';
			if (this.currentTemp < 20) return 'cold';
			if (this.currentTemp > 28) return 'hot';
			return 'warm';
		},
		modeLabel() { return constants.MODE_LABELS[this.acMode] || this.acMode; },
		fanLabel()  { return constants.FAN_LABELS[this.acFanSpeed] || this.acFanSpeed; },
		swingLabel() { return constants.SWING_LABELS[this.acSwing] || this.acSwing; },
		brandLabel() { return constants.BRAND_MAP[this.acBrand] || (this.acBrand && this.acBrand.toUpperCase()) || ''; },
		ruleBrief() {
			if (this.controlType === 'temperature') return this.tempOnThreshold + '°';
			return this.humOnThreshold + '%';
		}
	},
		async onLoad() {
			try {
				const sys = uni.getSystemInfoSync();
				this.statusBarHeight = sys.statusBarHeight || 0;
			} catch (e) { this.statusBarHeight = 0; }
			// 自愈：storage 中若残留 connected=false 但有地址，先 ping 恢复
			await this._trySelfHeal();
			this.checkDevice();
			if (!this.deviceConnected) {
				uni.redirectTo({ url: '/pages/device/device' });
				return;
			}
			this.fetchStatus();
			this.startPoll();
			this._deviceHandler = (e) => this.onDeviceEvent(e);
			uni.$on('deviceConnected', this._deviceHandler);
			this._onSettingsChanged = () => {
				if (!this.deviceConnected) return;
				// 延迟短期内让设备端处理完设置变更，防止后端时序竞态
				clearTimeout(this._settingsChangedTimer);
				this._settingsChangedTimer = setTimeout(() => {
					if (this.deviceConnected) this.fetchStatus();
				}, 400);
			};
			uni.$on(constants.EVENTS.SETTINGS_CHANGED, this._onSettingsChanged);
		},
		onShow() {
			this.checkDevice();
			if (!this.deviceConnected) {
				uni.redirectTo({ url: '/pages/device/device' });
				return;
			}
			this.fetchStatus();
			this.startPoll(this._currentInterval);
		},
		onHide() {
			this.stopPoll();
		},
		onUnload() {
				this.stopPoll();
				clearTimeout(this._settingsChangedTimer);
				uni.$off('deviceConnected', this._deviceHandler);
				if (this._onSettingsChanged) { uni.$off(constants.EVENTS.SETTINGS_CHANGED, this._onSettingsChanged); this._onSettingsChanged = null; }
			},
		onPullDownRefresh() {
			this.fetchStatus().finally(() => {
				uni.stopPullDownRefresh();
			});
		},
	methods: {
		setIfChanged(key, value) {
			if (this[key] !== value) {
				this[key] = value;
			}
		},
		/**
		 * 自愈：storage 内有连接信息（地址/deviceId），但被误标记为未连接
		 * ——多半源于历史版本中 api 请求连续 3 次失败直接擦 connected 的 bug。
		 * 这里主动 ping 一次设备，成功即恢复 connected=true，不打扰用户。
		 */
		async _trySelfHeal() {
			const d = uni.getStorageSync('connectedDevice');
			if (!d || d.connected !== false || !d.address) return;
			apiService.setDeviceAddress(d.address);
			try {
				const res = await apiService.getDeviceId();
				if (res && res.status === 'success') {
					const restored = {
						...d,
						connected: true,
						deviceId: res.data.device_id || d.deviceId
					};
					uni.setStorageSync('connectedDevice', restored);
					apiService.resetFailCount();
				}
			} catch (e) { /* 不自愈，跳转 device 页让用户处理 */ }
		},
		onDeviceEvent(e) {
				if (e.connected) {
					this.setDevice(e.device);
					this.failCount = 0;
					this.fetchStatus();
				} else {
					this.deviceConnected = false;
					this.deviceAddress = '';
					this.deviceId = '';
					this.deviceLocation = '';
					uni.redirectTo({ url: '/pages/device/device' });
				}
			},
		async fetchStatus() {
			if (!this.deviceConnected) return;
			if (this.statusPending) {
				this._retryPending = true;
				return;
			}
			this.statusPending = true;
			try {
				const res = await apiService.getStatus();
				if (res.status !== 'success') {
					this._disconnectAndRedirect();
					return;
				}
				this.failCount = 0;
				this.hasShownBackoffToast = false;
				if (this._currentInterval !== constants.POLL_INTERVAL) {
					this.stopPoll();
					this.startPoll(constants.POLL_INTERVAL);
				}
				const d = res.data;
				this.setIfChanged('currentTemp', d.temperature != null ? d.temperature : null);
				this.setIfChanged('currentHum', d.humidity != null ? d.humidity : null);
				this.setIfChanged('acStatus', d.ac_status === 'on');
				this.setIfChanged('controlType', d.control_type || 'temperature');
				this.setIfChanged('tempOnThreshold', d.temp_on_threshold ?? this.tempOnThreshold);
				this.setIfChanged('tempOffThreshold', d.temp_off_threshold ?? this.tempOffThreshold);
				this.setIfChanged('humOnThreshold', d.hum_on_threshold ?? this.humOnThreshold);
				this.setIfChanged('humOffThreshold', d.hum_off_threshold ?? this.humOffThreshold);
				if (d.ac_params) {
					this.setIfChanged('acTemp', d.ac_params.temperature ?? this.acTemp);
					this.setIfChanged('acMode', d.ac_params.mode || this.acMode);
					this.setIfChanged('acFanSpeed', d.ac_params.fan_speed || this.acFanSpeed);
					this.setIfChanged('acSwing', d.ac_params.swing || this.acSwing);
					this.setIfChanged('acBrand', d.ac_params.brand || '');
				}
				if (d.device_info) {
					const loc = d.device_info.device_location;
					if (loc) this.setIfChanged('deviceLocation', loc);
				}
				const dev = uni.getStorageSync('connectedDevice');
				if (dev) {
					let changed = false;
					if (d.device_info && d.device_info.device_location && dev.location !== d.device_info.device_location) {
						dev.location = d.device_info.device_location;
						changed = true;
					}
					if (changed) {
					uni.setStorageSync('connectedDevice', dev);
					}
				}
			} catch (e) {
				this._disconnectAndRedirect();
			}
			finally {
				this.statusPending = false;
				if (this._retryPending) {
					this._retryPending = false;
					this.fetchStatus();
				}
			}
		},
		startPoll(interval) {
			this.stopPoll();
			this._currentInterval = interval || constants.POLL_INTERVAL;
			this.pollTimer = setInterval(() => {
				this.checkDevice();
				if (this.deviceConnected) this.fetchStatus();
			}, this._currentInterval);
		},
		stopPoll() {
			if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
		},
		_disconnectAndRedirect() {
				this.stopPoll();
				this.deviceConnected = false;
				const dev = uni.getStorageSync('connectedDevice');
				if (dev) {
					dev.connected = false;
					uni.setStorageSync('connectedDevice', dev);
				}
				uni.redirectTo({ url: '/pages/device/device' });
			},
			async toggleACStatus(e) {
			const on = e.detail.value;
			if (!this.deviceConnected) { this.showToast('提示', '请先连接设备'); return; }
			if (this.switchLoading) return;
			uni.vibrateShort();
			try {
				this.switchLoading = true; this.loadingVisible = true;
				this.loadingText = on ? '正在开启空调...' : '正在关闭空调...';
				const res = await apiService.controlAc(on ? 'on' : 'off');
				if (res.status === 'success') {
					this.acStatus = on;
					await this.fetchStatus();
					this.showToast('成功', on ? '空调已开启' : '空调已关闭');
				} else {
					this.showToast('失败', (res.data && res.data.message) || '操作失败');
				}
			} catch (e) {
				this.showToast('失败', e.message || '操作失败');
			} finally { this.switchLoading = false; this.loadingVisible = false; }
		},
		async switchScene(scene) {
			if (!this.deviceConnected) { this.showToast('提示', '请先连接设备'); return; }
			if (this.switchLoading) return;
			this.currentScene = scene;
			this.switchLoading = true;
			try {
				this.loadingVisible = true; this.loadingText = '切换场景...';
				const res = await apiService.setScene(scene);
				if (res.status === 'success') {
					await this.fetchStatus();
					const label = (this.scenes.find(s => s.value === scene) || {}).label || scene;
					this.showToast('已切换', `已切换至「${label}」模式`, 'success');
				} else {
					this.showToast('失败', (res.data && res.data.message) || '切换失败', 'error');
				}
			} catch (e) {
				this.showToast('失败', e.message || '切换失败', 'error');
			} finally { this.switchLoading = false; this.loadingVisible = false; }
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
		navigateTo(page) { uni.navigateTo({ url: '/pages/' + page }); }
	}
};
</script>

<style lang="scss">
/* .page / .body / 按钮等骨架类被全局化（App.vue） */

/* 顶部状态栏安全区 */
.top-bar {
	padding: 24rpx 32rpx;
	display: flex;
	justify-content: space-between;
	align-items: center;
}
.top-location { font-size: $fs-heading; font-weight: 700; color: $text-primary; }
.status-badge {
	display: flex; align-items: center;
	padding: 8rpx 20rpx; border-radius: $radius-xl;
	background: $bg-subtle;
	transition: background 200ms;
}
.status-badge.on { background: #F6FFED; }
.status-badge.warn { background: $color-warning-bg; }
.status-dot {
	width: 14rpx; height: 14rpx; border-radius: 50%;
	background: $text-disabled; margin-right: 10rpx;
	transition: background 200ms;
}
.status-badge.on .status-dot { background: $color-success; }
.status-badge.warn .status-dot { background: $color-warning; }
.status-badge text { font-size: $fs-label; color: $text-disabled; font-weight: 500; }
.status-badge.on text { color: $color-success; }
.status-badge.warn text { color: $color-warning-text; }

/* 温度大卡 */
.temp-hero {
	background: $bg-card; border-radius: $radius-xl;
	padding: 48rpx 32rpx; text-align: center;
	margin-bottom: 24rpx; box-shadow: $shadow-sm;
}
.temp-num { font-size: 120rpx; font-weight: 700; line-height: 1; color: $text-regular; }
.temp-num.cold { color: $temp-cold; }
.temp-num.warm { color: $temp-warm; }
.temp-num.hot  { color: $temp-hot; }
.temp-num.hum-num { color: $hum-color; }
.temp-num.placeholder {
	font-size: 96rpx; color: $text-disabled; font-weight: 500;
}
.temp-unit { font-size: $fs-heading; font-weight: 500; color: $text-hint; margin-left: 4rpx; }
.temp-sub { display: block; font-size: 26rpx; color: $text-hint; margin-top: 16rpx; }
.hum-hero { background: linear-gradient(135deg, $color-success-bg 0%, $bg-card 100%); }

/* 信息行 */
.info-row {
	background: $bg-card; border-radius: $radius-xl;
	padding: 32rpx; display: flex; margin-bottom: 24rpx;
	box-shadow: $shadow-sm;
}
.info-item {
	flex: 1; display: flex; flex-direction: column; align-items: center;
	padding: 8rpx 4rpx; border-radius: $radius-md;
	transition: background 150ms;
}
.info-item.clickable:active { background: $bg-elevated; }
.info-icon { width: 40rpx; height: 40rpx; margin-bottom: 12rpx; opacity: 0.7; }
.info-item.clickable .info-icon { opacity: 1; }
.info-val { font-size: $fs-title; font-weight: 600; color: $text-regular; }
.info-val.ac-on { color: $color-success; }
.info-val.ac-off { color: $text-disabled; }
.info-val.placeholder { color: $text-disabled; font-weight: 400; }
.info-lbl { font-size: $fs-caption; color: $text-hint; margin-top: 6rpx; }
.info-div { width: 1rpx; background: $border-light; align-self: stretch; }

/* 开关卡 */
.switch-card {
	background: $bg-card; border-radius: $radius-xl;
	padding: 28rpx 32rpx; display: flex;
	justify-content: space-between; align-items: center;
	margin-bottom: 24rpx; box-shadow: $shadow-sm;
}
.switch-card.on { background: #FAFFFE; }
.switch-title { font-size: $fs-title; font-weight: 600; color: $text-regular; display: block; }
.switch-meta { font-size: $fs-label; color: $text-hint; margin-top: 6rpx; display: block; }

/* 场景快捷：4 列网格单卡，激活态用反色填充 + 顶部标记，避免边框切换 */
.scene-grid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 16rpx;
	margin-bottom: 24rpx;
}
.scene-chip {
	position: relative;
	background: $bg-card;
	border-radius: $radius-lg;
	padding: 24rpx 8rpx 20rpx;
	display: flex; flex-direction: column; align-items: center; gap: 10rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
	transition: transform 150ms, background 200ms, box-shadow 200ms;
	overflow: hidden;
}
.scene-chip:active { transform: scale(0.96); }
.scene-chip.active {
	background: $brand-primary;
	box-shadow: 0 6rpx 16rpx rgba(22, 119, 255, 0.25);
}
.chip-icon-wrap {
	width: 72rpx; height: 72rpx;
	border-radius: 50%;
	background: $bg-elevated;
	display: flex; align-items: center; justify-content: center;
	transition: background 200ms;
}
.scene-chip.active .chip-icon-wrap { background: rgba(255, 255, 255, 0.22); }
.chip-icon { width: 40rpx; height: 40rpx; opacity: 0.85; }
.scene-chip.active .chip-icon { opacity: 1; }
.chip-label {
	font-size: $fs-caption; color: $text-secondary;
	font-weight: 500;
	max-width: 100%;
	white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.scene-chip.active .chip-label { color: $bg-card; font-weight: 600; }

/* 导航列表（控制与设置） */
.nav-list {
	background: $bg-card; border-radius: $radius-xl;
	overflow: hidden; box-shadow: $shadow-sm;
}
.nav-row {
	padding: 28rpx 32rpx; display: flex;
	justify-content: space-between; align-items: center;
	border-bottom: 1rpx solid $bg-page;
	transition: background 150ms;
}
.nav-row:last-child { border-bottom: none; }
.nav-row:active { background: $bg-elevated; }
.nav-left { display: flex; align-items: center; gap: 16rpx; }
.nav-icon { width: 44rpx; height: 44rpx; opacity: 0.75; }
.nav-label { font-size: $fs-body; color: $text-regular; }
.nav-arr { font-size: 32rpx; color: $text-disabled; font-weight: 300; }

/* 断开连接：使用全局 .row-action.danger 样式 */
.disconnect-btn {
	margin-top: 32rpx; padding: 24rpx;
	background: $bg-card; border-radius: $radius-xl;
	box-shadow: $shadow-sm;
}
</style>
