<template>
	<view class="page">
		<view class="body">
			<!-- 版本信息 -->
			<view class="card">
				<text class="card-title">固件信息</text>
				<view class="row"><text class="row-label">当前版本</text><text class="row-val version">{{ currentVersion || '获取中...' }}</text></view>
			</view>

			<!-- OTA 配置 -->
			<view class="card">
				<text class="card-title">固件升级</text>
				<view class="form-item">
					<text class="label">固件 URL</text>
						<input v-model="firmwareUrl" class="input" placeholder="请输入固件下载 URL（可从 Bemfa 等平台获取）" />
				</view>
				<view class="form-item">
					<text class="label">WiFi 名称 (SSID)</text>
					<input v-model="wifiSsid" class="input" placeholder="用于下载固件的 WiFi" maxlength="32" />
				</view>
				<view class="form-item">
					<text class="label">WiFi 密码</text>
					<input v-model="wifiPassword" :password="!showPassword" class="input" placeholder="WiFi 密码" maxlength="64" />
					<view class="pw-toggle" @click="togglePassword"><text>{{ showPassword ? '隐藏' : '显示' }}</text></view>
				</view>
			</view>

			<view class="card">
				<text class="card-title">说明</text>
				<view class="tips">
					<text>· 请确保固件 URL 可访问且为 .bin 格式</text>
						<text>· WiFi 信息用于设备连接互联网下载固件</text>
						<text>· 升级过程中请勿断电，完成后设备自动重启</text>
						<text>· 可从 Bemfa 物联网平台等获取固件下载链接</text>
				</view>
			</view>

			<view class="btn btn-primary" @click="startUpdate" :class="{ off: !deviceConnected || updating }">
				<text>{{ updating ? '升级中...' : '开始升级' }}</text>
			</view>
		</view>

		<!-- OTA 进度遮罩 -->
			<view class="ota-overlay" v-if="otaPhase !== 'idle'" @click.stop role="alert" aria-live="polite">
				<view class="ota-panel" :class="otaPhase">
					<!-- 标题 -->
					<text class="ota-title">固件升级</text>
					<!-- 警告说明 -->
					<view class="ota-warn" v-if="otaPhase === 'connecting' || otaPhase === 'downloading'">
						<text class="ota-warn-icon">⚠</text>
						<text class="ota-warn-text">升级期间请勿断电或关闭页面</text>
					</view>
					<!-- 进度区 -->
					<view class="ota-ring-wrap" role="progressbar" :aria-valuenow="otaProgress" aria-valuemin="0" aria-valuemax="100" aria-label="OTA升级进度">
						<view class="ota-ring">
							<text class="ota-pct">{{ otaProgress }}</text>
							<text class="ota-pct-sign">%</text>
						</view>
						<progress :percent="otaProgress" :stroke-width="6" :activeColor="otaPhase==='done' ? '#00B96B' : '#1677FF'" backgroundColor="#E8E8E8" class="ota-bar" />
					</view>
					<!-- 阶段文字 -->
					<text class="ota-phase">{{ phaseLabel }}</text>
					<text class="ota-hint" v-if="otaPhase === 'verifying'">设备重启后将自动恢复连接</text>
					<!-- 取消按钮（仅 verifying 阶段可取消） -->
					<view class="ota-cancel" v-if="otaPhase === 'verifying'" @click="cancelOta">
						<text>取消等待</text>
					</view>
				</view>
			</view>

		<Loading :visible="loadingVisible" :text="loadingText" />

		<!-- 确认 -->
		<CustomModal :visible="confirmModalVisible" title="确认升级" :content="confirmModalContent"
			confirm-text="确定升级" cancel-text="取消" type="warning"
			@confirm="handleConfirmModalConfirm" @cancel="handleConfirmModalCancel" />

		<!-- 验证输入 -->
		<CustomModal :visible="validateModalVisible" title="输入验证" :content="validateModalContent"
			:editable="true" :placeholder-text="validateModalPlaceholder"
			confirm-text="确定" cancel-text="取消"
			@confirm="handleValidateModalConfirm" @cancel="handleValidateModalCancel" />

			<!-- 普通提示 -->
			<CustomModal :visible="modalVisible" :title="modalTitle" :content="modalContent"
				:close-on-click-overlay="false" :type="modalType" :show-buttons="false" />
	</view>
</template>

<script>
import Loading from '../../components/Loading';
import CustomModal from '../../components/CustomModal';
import apiService from '../../services/api';
import constants from '../../config/constants';
import deviceMixin from '../../mixins/device-mixin.js';
import modalMixin from '../../mixins/modal-mixin.js';
import { isValidUrl, isNonEmpty } from '../../utils/validator';

// OTA 阶段文案
const PHASE_LABELS = {
	connecting: '正在连接 WiFi...',
	downloading: '正在下载固件...',
	verifying: '等待设备重启...',
	done: '升级完成',
	failed: '升级异常'
};

export default {
	components: { Loading, CustomModal },
	mixins: [deviceMixin, modalMixin],
		data() {
			return {
				currentVersion: '', firmwareUrl: '', wifiSsid: '', wifiPassword: '', showPassword: false,
				updating: false,
				confirmModalVisible: false, confirmModalContent: '设备将开始固件升级，升级完成后自动重启。确定继续吗？',
				validateModalVisible: false, validateModalTitle: '输入验证',
				validateModalContent: '请输入 "upgrade" 确认升级', validateModalPlaceholder: '请输入 upgrade',
				// OTA 进度追踪
				otaProgress: 0,
				otaPhase: 'idle', // idle | connecting | downloading | verifying | done | failed
				_progressTimer: null,
				_pollTimer: null,
				_verifyStart: 0
		};
	},
	computed: {
		phaseLabel() {
			return PHASE_LABELS[this.otaPhase] || '';
		},
		defaultIp() {
			return constants.DEFAULT_IP;
		}
	},
	onLoad() { this.checkDevice(); this.loadSaved(); this.getFw(); },
	onUnload() { this.cancelOta(); },
	methods: {
		loadSaved() {
			const u = uni.getStorageSync('otaUrl'); if (u) this.firmwareUrl = u;
			const s = uni.getStorageSync('wifiSsid'); if (s) { this.wifiSsid = s; const p = uni.getStorageSync('wifiPassword'); if (p) this.wifiPassword = p; }
		},
		async getFw() { if (!this.deviceConnected) return; try { this.showLoading('获取中...'); const res = await apiService.getFirmwareVersion(); if (res.status === 'success') this.currentVersion = res.data.firmware_version || '未知'; } catch (e) { /* 静默 */ } finally { this.hideLoading(); } },
		togglePassword() { this.showPassword = !this.showPassword; },
		startUpdate() {
			if (!this.deviceConnected) { this.showToast('警告', '请先连接设备', 'warning'); return; }
				if (!isNonEmpty(this.firmwareUrl)) { this.showToast('提示', '请输入固件 URL', 'warning'); return; }
				if (!isValidUrl(this.firmwareUrl)) { this.showToast('提示', '固件 URL 格式不正确，请输入有效的 HTTP/HTTPS 地址', 'warning'); return; }
				if (!isNonEmpty(this.wifiSsid)) { this.showToast('提示', '请输入 WiFi 名称', 'warning'); return; }
			if (this.updating) return;
			this.confirmModalVisible = true;
		},
		handleConfirmModalConfirm() { this.confirmModalVisible = false; this.validateModalVisible = true; },
		handleConfirmModalCancel() { this.confirmModalVisible = false; },
			handleValidateModalConfirm(inputValue) { this.validateModalVisible = false; if (inputValue === 'upgrade') this.performOtaUpdate(); },
			handleValidateModalCancel() { this.validateModalVisible = false; },

		// ===== OTA 进度追踪 =====
		/**
		 * 启动模拟进度：从当前进度匀速推进至 targetPct
		 * @param {number} targetPct - 目标百分比
		 * @param {number} durationMs - 匀速推进持续时长 (ms)
		 */
		_startSimProgress(targetPct, durationMs) {
			this._stopSimProgress();
			const startPct = this.otaProgress;
			const delta = targetPct - startPct;
			const tickMs = 200; // 每 200ms 更新一次
			const totalTicks = Math.max(1, Math.floor(durationMs / tickMs));
			const step = delta / totalTicks;
			let ticks = 0;
			this._progressTimer = setInterval(() => {
				ticks++;
				if (ticks >= totalTicks) {
					this.otaProgress = targetPct;
					this._stopSimProgress();
					this._onProgressTargetReached();
				} else {
					this.otaProgress = Math.round(startPct + step * ticks);
				}
			}, tickMs);
		},
		_stopSimProgress() {
			if (this._progressTimer) { clearInterval(this._progressTimer); this._progressTimer = null; }
		},
		/** 模拟进度到达目标后的回调 */
		_onProgressTargetReached() {
			if (this.otaPhase === 'connecting') {
				// WiFi 连接阶段完成 → 进入下载阶段
				this.otaPhase = 'downloading';
				this._startSimProgress(constants.OTA_PROGRESS_MAX, 35000);
			} else if (this.otaPhase === 'downloading') {
				// 下载模拟完成 → 进入验证阶段，开始轮询
				this.otaPhase = 'verifying';
				this._verifyStart = Date.now();
				this._startVerifyPoll();
			}
		},

		/** 轮询 getFirmwareVersion 检测设备重启 */
		_startVerifyPoll() {
			this._stopVerifyPoll();
			this._pollTimer = setInterval(() => {
				// 超时检查
				if (Date.now() - this._verifyStart > constants.OTA_VERIFY_TIMEOUT) {
					this._onOtaFailed('验证超时，设备可能仍在重启中，请稍后手动确认');
					return;
				}
				apiService.getFirmwareVersion().then(res => {
					if (res && res.status === 'success' && res.data && res.data.firmware_version) {
						// 设备恢复响应 → 升级完成
						this._onOtaDone(res.data.firmware_version);
					}
				}).catch(() => {
					// 设备离线（正在重启）→ 继续等待
				});
			}, constants.OTA_POLL_INTERVAL);
		},
		_stopVerifyPoll() {
			if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
		},

		_onOtaDone(newVersion) {
				this._stopSimProgress();
				this._stopVerifyPoll();
				this.otaPhase = 'done';
				this.otaProgress = 100;
				this.updating = false;
				if (newVersion && newVersion !== this.currentVersion) {
					this.currentVersion = newVersion;
				}
				// 自动关闭进度面板 + 显示完成提示
				setTimeout(() => {
					this.otaPhase = 'idle';
					this.otaProgress = 0;
					this.showToast('升级成功', '固件已更新至 ' + (newVersion || this.currentVersion), 'success');
				}, 1500);
			},
			_onOtaFailed(msg) {
				this._stopSimProgress();
				this._stopVerifyPoll();
				this.otaPhase = 'idle';
				this.otaProgress = 0;
				this.updating = false;
				this.showToast('升级异常', msg, 'error');
			},

		/** 用户取消等待（仅 verifying 阶段） */
		cancelOta() {
			this._stopSimProgress();
			this._stopVerifyPoll();
			this.otaPhase = 'idle';
			this.otaProgress = 0;
			this.updating = false;
		},

		async performOtaUpdate() {
			try {
				this.updating = true;
				this.otaProgress = 0;
				this.otaPhase = 'connecting';
				const data = { firmware_url: this.firmwareUrl };
				if (this.wifiSsid) { data.wifi_ssid = this.wifiSsid; if (this.wifiPassword) data.wifi_password = this.wifiPassword; }
				const res = await apiService.otaUpdate(data);
				if (res && res.status === 'success') {
					uni.setStorageSync('otaUrl', this.firmwareUrl);
					if (this.wifiSsid) { uni.setStorageSync('wifiSsid', this.wifiSsid); if (this.wifiPassword) uni.setStorageSync('wifiPassword', this.wifiPassword); }
					else { uni.removeStorageSync('wifiSsid'); uni.removeStorageSync('wifiPassword'); }
					if (res.data.message === '正在连接WiFi') {
						// WiFi 连接阶段 → 0→15% 模拟 (5s)
						this.otaPhase = 'connecting';
						this._startSimProgress(15, 5000);
					} else if (res.data.message === 'OTA升级开始') {
						// 跳过 WiFi 连接，直接下载 → 0→80% 模拟 (40s)
						this.otaPhase = 'downloading';
						this._startSimProgress(constants.OTA_PROGRESS_MAX, 40000);
					} else {
						// 其他响应 → 按 downloading 处理
						this.otaPhase = 'downloading';
						this._startSimProgress(constants.OTA_PROGRESS_MAX, 40000);
					}
				} else {
					this._onOtaFailed((res && res.data && res.data.message) || '升级失败');
				}
			} catch (e) {
				this._onOtaFailed(e.message || '升级失败');
			}
		}
	}
};
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background: $bg-page; }
.body { padding: 32rpx; }
.card { background: $bg-card; border-radius: $radius-xl; padding: 32rpx; margin-bottom: 24rpx; box-shadow: $shadow-sm; }
.card-title { font-size: $fs-title; font-weight: 600; color: $text-primary; margin-bottom: 20rpx; display: block; }
.row { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid $bg-page; }
.row:last-child { border-bottom: none; }
.row-label { font-size: 26rpx; color: $text-secondary; }
.row-val { font-size: 26rpx; color: $text-regular; font-weight: 500; }
.row-val.version { color: $brand-primary; font-weight: 600; }
.form-item { margin-bottom: 24rpx; position: relative; }
.form-item:last-child { margin-bottom: 0; }
.label { display: block; font-size: 26rpx; color: $text-regular; font-weight: 500; margin-bottom: 12rpx; }
.input { width: 100%; height: 80rpx; padding: 0 20rpx; border: 1rpx solid $border-normal; border-radius: $radius-md; font-size: $fs-body; color: $text-regular; background: $bg-card; box-sizing: border-box; }
.pw-toggle { position: absolute; right: 16rpx; top: 44rpx; padding: 8rpx 12rpx; }
.pw-toggle text { font-size: $fs-label; color: $brand-primary; }
.tips { display: flex; flex-direction: column; gap: 12rpx; }
.tips text { font-size: $fs-label; color: $text-secondary; line-height: 1.6; }
.btn { padding: 28rpx 32rpx; border-radius: $radius-xl; text-align: center; margin-bottom: 32rpx; transition: 150ms; }
.btn:active { transform: scale(0.98); }
.btn-primary { background: $brand-primary; }
.btn-primary text { color: $bg-card; font-size: $fs-title; font-weight: 500; }
.btn.off { opacity: 0.5; }

/* ===== OTA 进度遮罩 ===== */
.ota-overlay {
	position: fixed; top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(0,0,0,0.5);
	display: flex; align-items: center; justify-content: center;
	z-index: 9999;
	animation: fadeIn 200ms ease-out;
}
.ota-panel {
	width: 80%; max-width: 500rpx;
	background: $bg-card; border-radius: 32rpx;
	padding: 56rpx 40rpx 40rpx;
	display: flex; flex-direction: column; align-items: center;
	box-shadow: 0 16rpx 48rpx rgba(0,0,0,0.12);
	animation: popIn 250ms cubic-bezier(0.34,1.56,0.64,1);
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes popIn { from { opacity: 0; transform: scale(0.92) translateY(16rpx); } to { opacity: 1; transform: scale(1) translateY(0); } }

/* 标题 */
.ota-title {
	font-size: 34rpx; font-weight: 600; color: $text-primary;
	text-align: center; margin-bottom: 20rpx;
}
/* 警告说明 */
.ota-warn {
	display: flex; align-items: center; gap: 8rpx;
	background: $color-warning-bg; border: 1rpx solid $color-warning-border; border-radius: $radius-md;
	padding: 12rpx 20rpx; margin-bottom: 28rpx; width: 100%; box-sizing: border-box;
}
.ota-warn-icon { font-size: $fs-body; }
.ota-warn-text { font-size: $fs-caption; color: $color-warning-text; line-height: 1.4; }

/* 进度百分比 */
.ota-ring-wrap { width: 100%; margin-bottom: 32rpx; }
.ota-ring {
	display: flex; align-items: baseline; justify-content: center;
	margin-bottom: 20rpx;
}
.ota-pct { font-size: 72rpx; font-weight: 700; color: $brand-primary; line-height: 1; }
.ota-pct-sign { font-size: $fs-body; color: $brand-primary; margin-left: 4rpx; }
.ota-bar { width: 100%; border-radius: $radius-sm; }

/* 阶段文字 */
.ota-phase {
	font-size: $fs-title; font-weight: 600; color: $text-primary;
	text-align: center; margin-bottom: 12rpx;
}
.ota-hint {
	font-size: $fs-label; color: $text-hint; text-align: center;
	margin-bottom: 24rpx;
}

/* 取消按钮 */
.ota-cancel {
	padding: 16rpx 32rpx; border-radius: 20rpx;
	background: $bg-page; transition: 150ms;
}
.ota-cancel:active { background: $border-light; }
.ota-cancel text { font-size: 26rpx; color: $text-secondary; font-weight: 500; }

/* 结果高亮 */
.ota-panel.done .ota-pct { color: $color-success; }
.ota-panel.done .ota-pct-sign { color: $color-success; }
</style>
