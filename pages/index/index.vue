<template>
	<view class="page">
		<!-- 顶部 -->
		<view class="top-bar">
			<view class="top-left">
				<text class="top-location">{{ deviceConnected ? (deviceLocation || '温控') : '空调温控' }}</text>
			</view>
			<view class="top-right">
				<view class="status-badge" :class="{ on: deviceConnected }">
					<view class="status-dot"></view>
					<text>{{ deviceConnected ? '已连接' : '离线' }}</text>
				</view>
			</view>
		</view>

		<!-- 未连接 -->
		<view class="body" v-if="!deviceConnected">
			<view class="empty-block">
				<image src="/static/icons/device.svg" class="empty-img" mode="aspectFit" />
				<text class="empty-title">暂无已连接的设备</text>
				<text class="empty-desc">连接 ESP8266 温控设备后，即可实时查看温度、湿度并自动控制空调</text>
				<view class="empty-features">
					<view class="ef-item"><text class="ef-dot">·</text><text>实时温湿度监测</text></view>
					<view class="ef-item"><text class="ef-dot">·</text><text>多品牌红外空调控制</text></view>
					<view class="ef-item"><text class="ef-dot">·</text><text>温湿度阈值自动开关</text></view>
					<view class="ef-item"><text class="ef-dot">·</text><text>场景模式一键切换</text></view>
				</view>
				<view class="empty-steps">
					<text class="es-title">快速连接</text>
					<text class="es-step">1. 手机连接设备 WiFi 热点</text>
					<text class="es-step">2. 进入设备管理输入 192.168.4.1</text>
					<text class="es-step">3. 点击连接即可开始使用</text>
				</view>
				<view class="btn btn-primary" @click="navigateTo('device/device')">
					<text>去连接设备</text>
				</view>
			</view>
		</view>

		<!-- 已连接：看板 -->
		<view class="body" v-else>
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
					color="#00B96B"
					@change="toggleACStatus"
					:disabled="switchLoading"
				/>
			</view>

			<!-- 场景快捷 -->
			<view class="scene-strip">
				<view
					v-for="s in scenes"
					:key="s.value"
					class="scene-chip"
					:class="{ active: currentScene === s.value }"
					@click="switchScene(s.value)"
				>
					<image :src="'/static/icons/' + s.icon + '.svg'" class="chip-icon" mode="aspectFit" />
					<text class="chip-label">{{ s.label }}</text>
				</view>
			</view>

			<!-- 入口 -->
			<view class="nav-list">
				<view class="nav-row" @click="navigateTo('settings/ac-params')">
					<view class="nav-left">
						<image src="/static/icons/air-conditioner.svg" class="nav-icon" mode="aspectFit" />
						<text class="nav-label">空调控制</text>
					</view>
					<view class="nav-arr">›</view>
				</view>
				<view class="nav-row" @click="navigateTo('settings/temp-hum')">
					<view class="nav-left">
						<image src="/static/icons/temperature.svg" class="nav-icon" mode="aspectFit" />
						<text class="nav-label">温湿度阈值</text>
					</view>
					<view class="nav-arr">›</view>
				</view>
				<view class="nav-row" @click="navigateTo('settings/settings')">
					<view class="nav-left">
						<image src="/static/icons/settings.svg" class="nav-icon" mode="aspectFit" />
						<text class="nav-label">更多设置</text>
					</view>
					<view class="nav-arr">›</view>
				</view>
			</view>
		</view>

		<Loading :visible="loadingVisible" :text="loadingText" />

		<CustomModal
			:visible="modalVisible"
			:title="modalTitle"
			:content="modalContent"
			:confirm-text="modalConfirmText"
			:cancel-text="modalHasCancel ? modalCancelText : ''"
			:close-on-click-overlay="false"
			:type="modalTitle === '失败' ? 'error' : (modalTitle === '成功' ? 'success' : 'info')"
			@confirm="handleModalConfirm"
			@cancel="handleModalCancel"
		/>
	</view>
</template>

<script>
import Loading from '../../components/Loading';
import CustomModal from '../../components/CustomModal';
import apiService from '../../services/api';

const MODE_LABEL = { cool: '制冷', heat: '制热', dry: '除湿', fan: '送风', auto: '自动' };
const FAN_LABEL  = { auto: '自动', low: '低速', medium: '中速', high: '高速', quiet: '静音' };
const SWING_LABEL = { auto: '摆风', fixed: '定向' };

export default {
	components: { Loading, CustomModal },
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
			deviceConnected: false,
			deviceLocation: '',
			switchLoading: false,
			pollTimer: null,
			currentScene: '',
			scenes: [
				{ value: 'sleep',  label: '睡眠', icon: 'moon' },
				{ value: 'comfort', label: '舒适', icon: 'smile' },
				{ value: 'energy_saving', label: '节能', icon: 'lightning' },
				{ value: 'quick',  label: '快速', icon: 'light' }
			],
			loadingVisible: false,
			loadingText: '',
			modalVisible: false, modalTitle: '', modalContent: '',
			modalConfirmText: '确定', modalCancelText: '', modalHasCancel: false
		};
	},
	computed: {
		tempColor() {
			if (this.currentTemp <= 0) return '';
			if (this.currentTemp < 20) return 'cold';
			if (this.currentTemp > 28) return 'hot';
			return 'warm';
		},
		modeLabel() { return MODE_LABEL[this.acMode] || this.acMode; },
		fanLabel()  { return FAN_LABEL[this.acFanSpeed] || this.acFanSpeed; },
		swingLabel() { return SWING_LABEL[this.acSwing] || this.acSwing; },
		brandLabel() { const m={tcl:'TCL',midea:'美的',haier:'海尔',gree:'格力',daikin:'大金',mitsubishi:'三菱',panasonic:'松下',samsung:'三星',lg:'LG',toshiba:'东芝',hitachi:'日立',fujitsu:'富士通',sharp:'夏普',carrier:'开利',whirlpool:'惠而浦'}; return m[this.acBrand] || this.acBrand.toUpperCase(); },
		ruleBrief() {
			if (this.controlType === 'temperature') return this.tempOnThreshold + '°';
			return this.humOnThreshold + '%';
		}
	},
	onLoad() {
		this.checkDevice();
		this.startPoll();
		uni.$on('deviceConnected', e => this.onDeviceEvent(e));
	},
	onShow() {
		this.checkDevice();
		this.startPoll();
	},
	onUnload() {
		this.stopPoll();
		uni.$off('deviceConnected', this.onDeviceEvent);
	},
	methods: {
		checkDevice() {
			const d = uni.getStorageSync('connectedDevice');
			if (d && d.connected) {
				this.device = d;
				this.deviceConnected = true;
				this.deviceLocation = d.location || '';
				apiService.setDeviceAddress(d.address);
				this.fetchStatus();
			} else {
				this.deviceConnected = false;
				this.device = null;
				this.deviceLocation = '';
			}
		},
		onDeviceEvent(e) {
			if (e.connected) {
				this.device = e.device;
				this.deviceConnected = true;
				this.deviceLocation = e.device.location || '';
				apiService.setDeviceAddress(e.device.address);
				this.fetchStatus();
			} else {
				this.deviceConnected = false;
				this.device = null;
				this.deviceLocation = '';
			}
		},
		async fetchStatus() {
			if (!this.deviceConnected) return;
			try {
				const res = await apiService.getStatus();
				if (res.status !== 'success') return;
				const d = res.data;
				this.currentTemp = d.temperature;
				this.currentHum = d.humidity;
				this.acStatus = d.ac_status === 'on';
				this.controlType = d.control_type || 'temperature';
				this.tempOnThreshold = d.temp_on_threshold ?? this.tempOnThreshold;
					this.tempOffThreshold = d.temp_off_threshold ?? this.tempOffThreshold;
					this.humOnThreshold = d.hum_on_threshold ?? this.humOnThreshold;
					this.humOffThreshold = d.hum_off_threshold ?? this.humOffThreshold;
				if (d.ac_params) {
						this.acTemp = d.ac_params.temperature ?? this.acTemp;
						this.acMode = d.ac_params.mode || this.acMode;
						this.acFanSpeed = d.ac_params.fan_speed || this.acFanSpeed;
						this.acSwing = d.ac_params.swing || this.acSwing;
						this.acBrand = d.ac_params.brand || '';
					}
				if (d.device_info) {
					this.deviceLocation = d.device_info.device_location || this.deviceLocation;
				}
				const dev = uni.getStorageSync('connectedDevice');
				if (dev) { dev.acStatus = this.acStatus; uni.setStorageSync('connectedDevice', dev); }
			} catch (e) { console.error(e); }
		},
		startPoll() {
			this.stopPoll();
			this.pollTimer = setInterval(() => { this.checkDevice(); if (this.deviceConnected) this.fetchStatus(); }, 10000);
		},
		stopPoll() {
			if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
		},
		async toggleACStatus(e) {
			const on = e.detail.value;
			if (!this.deviceConnected) { this.toast('提示', '请先连接设备'); return; }
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
					this.toast('成功', on ? '空调已开启' : '空调已关闭');
				} else {
					this.toast('失败', (res.data && res.data.message) || '操作失败');
				}
			} catch (e) {
				this.toast('失败', e.message || '操作失败');
			} finally { this.switchLoading = false; this.loadingVisible = false; }
		},
		async switchScene(scene) {
			if (!this.deviceConnected) { this.toast('提示', '请先连接设备'); return; }
			this.currentScene = scene;
			try {
				this.loadingVisible = true; this.loadingText = '切换场景...';
				const res = await apiService.setScene(scene);
				if (res.status === 'success') {
					await this.fetchStatus();
					this.toast('成功', '场景已切换');
				} else {
					this.toast('失败', (res.data && res.data.message) || '切换失败');
				}
			} catch (e) {
				this.toast('失败', e.message || '切换失败');
			} finally { this.loadingVisible = false; }
		},
		toast(title, content) {
			this.modalTitle = title; this.modalContent = content;
			this.modalHasCancel = false; this.modalVisible = true;
		},
		handleModalConfirm() { this.modalVisible = false; },
		handleModalCancel() { this.modalVisible = false; },
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
.empty-block { margin-top: 60rpx; display: flex; flex-direction: column; align-items: center; }
.empty-img { width: 160rpx; height: 160rpx; margin-bottom: 32rpx; opacity: 0.25; }
.empty-title { font-size: 34rpx; color: #333; font-weight: 600; margin-bottom: 12rpx; }
.empty-desc { font-size: 26rpx; color: #999; text-align: center; line-height: 1.6; margin-bottom: 32rpx; padding: 0 20rpx; }
.empty-features { display: flex; flex-wrap: wrap; justify-content: center; gap: 12rpx 28rpx; margin-bottom: 32rpx; }
.ef-item { display: flex; align-items: center; gap: 6rpx; }
.ef-dot { color: #1677FF; font-weight: 700; font-size: 24rpx; }
.ef-item text:last-child { font-size: 24rpx; color: #666; }
.empty-steps { background: #FFF; border-radius: 20rpx; padding: 28rpx; width: 100%; box-sizing: border-box; margin-bottom: 32rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.es-title { font-size: 28rpx; font-weight: 600; color: #1A1A1A; display: block; margin-bottom: 16rpx; }
.es-step { font-size: 24rpx; color: #666; line-height: 1.8; display: block; }

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

/* 按钮 */
.btn { padding: 22rpx 60rpx; border-radius: 44rpx; display: inline-flex; align-items: center; justify-content: center; }
.btn-primary { background: #1677FF; }
.btn-primary text { color: #FFF; font-size: 28rpx; font-weight: 500; }
.btn-primary:active { background: #0958D9; transform: scale(0.98); }
</style>
