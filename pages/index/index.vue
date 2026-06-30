<template>
	<view class="page">
		<!-- 顶部 -->
		<view class="top-bar">
			<view class="top-left">
				<text class="top-location">{{ deviceConnected ? deviceLocation  : '空调温控' }}</text>
			</view>
			<view class="top-right" v-if="deviceConnected">
				<view class="status-badge on">
					<view class="status-dot"></view>
					<text>已连接</text>
				</view>
			</view>
		</view>

		
		<!-- 已连接：看板 -->
		<view class="body">
			<!-- 主数据大卡：温度 / 湿度 根据控制类型切换 C 位 -->
			<view class="temp-hero" v-if="controlType !== 'humidity'">
				<text class="temp-num" :class="tempColor">{{ currentTemp }}</text>
				<text class="temp-unit">°C</text>
				<text class="temp-sub">室内温度</text>
			</view>
			<view class="temp-hero hum-hero" v-else>
				<text class="temp-num hum-num">{{ currentHum }}</text>
				<text class="temp-unit">%</text>
				<text class="temp-sub">室内湿度</text>
			</view>

			<!-- 次要数据 + 模式 -->
			<view class="info-row">
				<view class="info-item" v-if="controlType !== 'humidity'">
					<image src="/static/icons/humidity.svg" class="info-icon" mode="aspectFit" />
					<text class="info-val">{{ currentHum }}%</text>
					<text class="info-lbl">湿度</text>
				</view>
				<view class="info-item" v-else>
					<image src="/static/icons/temperature.svg" class="info-icon" mode="aspectFit" />
					<text class="info-val" :class="tempColor">{{ currentTemp }}°C</text>
					<text class="info-lbl">温度</text>
				</view>
				<view class="info-div"></view>
				<view class="info-item">
					<image src="/static/icons/air-conditioner.svg" class="info-icon" mode="aspectFit" />
					<text class="info-val ac-on" v-if="acStatus">{{ modeLabel }}</text>
					<text class="info-val ac-off" v-else>待机</text>
					<text class="info-lbl">空调</text>
				</view>
				<view class="info-div"></view>
				<view class="info-item" @click="navigateTo('settings/temp-hum')">
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
				<view class="scene-strip" role="group" aria-label="场景切换">
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
					<image :src="'/static/icons/' + s.icon + '.svg'" class="chip-icon" mode="aspectFit" />
					<text class="chip-label">{{ s.label }}</text>
				</view>
			</view>

			<!-- 入口 -->
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

				<view class="disconnect-btn" @click="handleDisconnect" role="button" aria-label="断开连接">
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
				currentTemp: 0,
				currentHum: 0,
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
				statusPending: false  // 防止 fetchStatus 竞态
			};
		},
	computed: {
		tempColor() {
			if (this.currentTemp <= 0) return '';
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
		onLoad() {
			this.checkDevice();
			if (!this.deviceConnected) {
				uni.redirectTo({ url: '/pages/device/device' });
				return;
			}
			this.fetchStatus();
				this.startPoll();
				this._deviceHandler = (e) => this.onDeviceEvent(e);
				uni.$on('deviceConnected', this._deviceHandler);
		},
		onShow() {
			this.checkDevice();
			if (!this.deviceConnected) {
				uni.redirectTo({ url: '/pages/device/device' });
				return;
			}
			// onShow 时不再立即 fetchStatus，依赖轮询即可（避免竞态）
		},
		onUnload() {
				this.stopPoll();
				uni.$off('deviceConnected', this._deviceHandler);
			},
	methods: {
		setIfChanged(key, value) {
			if (this[key] !== value) {
				this[key] = value;
			}
		},
		onDeviceEvent(e) {
				if (e.connected) {
					this.setDevice(e.device);
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
			if (!this.deviceConnected || this.statusPending) return;
			this.statusPending = true;
			try {
				const res = await apiService.getStatus();
				if (res.status !== 'success') return;
				const d = res.data;
				this.setIfChanged('currentTemp', d.temperature);
				this.setIfChanged('currentHum', d.humidity);
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
					if (dev.acStatus !== this.acStatus) {
						dev.acStatus = this.acStatus;
						changed = true;
					}
					if (d.device_info && d.device_info.device_location && dev.location !== d.device_info.device_location) {
						dev.location = d.device_info.device_location;
						changed = true;
					}
					if (changed) {
					uni.setStorageSync('connectedDevice', dev);
					}
				}
			} catch (e) { /* 静默失败，轮询会重试 */ }
			finally { this.statusPending = false; }
		},
		startPoll() {
			this.stopPoll();
			this.pollTimer = setInterval(() => {
				this.checkDevice();
				if (this.deviceConnected) this.fetchStatus();
			}, constants.POLL_INTERVAL);
		},
		stopPoll() {
			if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
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
					const d = uni.getStorageSync('connectedDevice');
					if (d) { d.acStatus = on; uni.setStorageSync('connectedDevice', d); }
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

<style scoped>
.page    { min-height: 100vh; background: #F5F5F5; }
.top-bar { padding: 24rpx 32rpx; display: flex; justify-content: space-between; align-items: center; }
.top-location { font-size: 36rpx; font-weight: 700; color: #1A1A1A; }
.status-badge { display: flex; align-items: center; padding: 8rpx 20rpx; border-radius: 24rpx; background: #FFF1F0; }
.status-badge.on { background: #F6FFED; }
.status-dot { width: 14rpx; height: 14rpx; border-radius: 50%; background: #FF4D4F; margin-right: 10rpx; }
.status-badge.on .status-dot { background: #00B96B; }
.status-badge text { font-size: 24rpx; color: #FF4D4F; font-weight: 500; }
.status-badge.on text { color: #00B96B; }

/* 空状态 */
.body { padding: 0 32rpx 32rpx; }


/* 温度大卡 */
.temp-hero { background: #FFF; border-radius: 24rpx; padding: 48rpx 32rpx; text-align: center; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.temp-num { font-size: 120rpx; font-weight: 700; line-height: 1; color: #333; }
.temp-num.cold { color: #1677FF; }
.temp-num.warm { color: #FA8C16; }
.temp-num.hot  { color: #FF4D4F; }
.temp-unit { font-size: 36rpx; font-weight: 500; color: #999; margin-left: 4rpx; }
.temp-sub { display: block; font-size: 26rpx; color: #999; margin-top: 16rpx; }
.hum-hero { background: linear-gradient(135deg, #E6FFFB 0%, #FFFFFF 100%); }
.hum-num { color: #13C2C2 !important; }

/* 信息行 */
.info-row { background: #FFF; border-radius: 24rpx; padding: 32rpx; display: flex; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.info-item { flex: 1; display: flex; flex-direction: column; align-items: center; }
.info-icon { width: 40rpx; height: 40rpx; margin-bottom: 12rpx; }
.info-val { font-size: 30rpx; font-weight: 600; color: #333; }
.info-val.ac-on { color: #00B96B; }
.info-val.ac-off { color: #C0C0C0; }
.info-lbl { font-size: 22rpx; color: #999; margin-top: 6rpx; }
.info-div { width: 1rpx; background: #F0F0F0; align-self: stretch; }

/* 开关卡 */
.switch-card { background: #FFF; border-radius: 24rpx; padding: 28rpx 32rpx; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.switch-card.on { border: 1rpx solid #E6FFFB; background: #FAFFFE; }
.switch-title { font-size: 30rpx; font-weight: 600; color: #333; display: block; }
.switch-meta { font-size: 24rpx; color: #999; margin-top: 6rpx; display: block; }

/* 场景 */
.scene-strip { display: flex; gap: 16rpx; margin-bottom: 24rpx; }
.scene-chip { flex: 1; background: #FFF; border-radius: 20rpx; padding: 20rpx 12rpx; display: flex; flex-direction: column; align-items: center; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.03); transition: transform 150ms; }
.scene-chip:active { transform: scale(0.96); }
.scene-chip.active { background: #E6F4FF; border: 1rpx solid #1677FF; }
.chip-icon { width: 40rpx; height: 40rpx; margin-bottom: 8rpx; }
.chip-label { font-size: 22rpx; color: #666; }
.scene-chip.active .chip-label { color: #1677FF; font-weight: 600; }

/* 导航列表 */
.nav-list { background: #FFF; border-radius: 24rpx; overflow: hidden; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.nav-row { padding: 28rpx 32rpx; display: flex; justify-content: space-between; align-items: center; border-bottom: 1rpx solid #F5F5F5; }
.nav-row:last-child { border-bottom: none; }
.nav-row:active { background: #FAFAFA; }
.nav-left { display: flex; align-items: center; gap: 16rpx; }
.nav-icon { width: 44rpx; height: 44rpx; }
.nav-label { font-size: 28rpx; color: #333; }
	.nav-arr { font-size: 32rpx; color: #C0C0C0; font-weight: 300; }

/* 断开连接 */
.disconnect-btn {
	margin-top: 32rpx; padding: 24rpx; border-radius: 24rpx;
	background: #FFF; text-align: center;
	box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
}
.disconnect-btn:active { background: #FFF1F0; }
.disconnect-btn text { font-size: 28rpx; color: #FF4D4F; font-weight: 500; }

/* 按钮 */
.btn { padding: 22rpx 60rpx; border-radius: 44rpx; display: inline-flex; align-items: center; justify-content: center; }
.btn-primary { background: #1677FF; }
.btn-primary text { color: #FFF; font-size: 28rpx; font-weight: 500; }
.btn-primary:active { background: #0958D9; transform: scale(0.98); }
</style>
