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
					<view class="input-wrap" :class="{ focus: focusUrl }">
						<input v-model="firmwareUrl" class="input"
							placeholder="请输入固件下载 URL（可从 Bemfa 等平台获取）"
							@focus="focusUrl = true" @blur="focusUrl = false" />
					</view>
				</view>

				<!-- 已连接家庭 WiFi 时隐藏 WiFi 输入 -->
				<template v-if="staConnected">
					<view class="sta-hint">
						<view class="sta-hint-dot"></view>
						<text>设备已连接家庭 WiFi（{{ staSsid }}），可直接下载固件</text>
					</view>
				</template>
				<template v-else>
					<view class="form-item">
						<text class="label">WiFi 名称 (SSID)</text>
						<view class="input-wrap" :class="{ focus: focusSsid }">
							<input v-model="wifiSsid" class="input" placeholder="用于下载固件的 WiFi" maxlength="32"
								@focus="focusSsid = true" @blur="focusSsid = false" />
						</view>
					</view>
					<view class="form-item">
						<text class="label">WiFi 密码</text>
						<view class="input-wrap" :class="{ focus: focusPwd }">
							<input v-model="wifiPassword" class="input"
								:type="showPassword ? 'text' : 'password'"
								placeholder="WiFi 密码" maxlength="64"
								@focus="focusPwd = true" @blur="focusPwd = false" />
							<view class="pw-eye" @click="togglePassword">
								<image :src="'/static/icons/' + (showPassword ? 'eye' : 'eye-slash') + '.svg'" class="pw-eye-icon" mode="aspectFit" />
							</view>
						</view>
					</view>
				</template>
			</view>

			<view class="card">
				<text class="card-title">说明</text>
				<view class="tips">
					<text>· 请确保固件 URL 可访问且为 .bin 格式</text>
						<text>· WiFi 信息用于设备连接互联网下载固件</text>
						<text>· 升级过程中请勿断电，完成后设备自动重启</text>
						<text>· 可从 Bemfa 物联网平台等获取固件下载链接</text>
						<text class="tip-warn">· 固件将下载自第三方服务器，请确认来源可靠</text>
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
					currentVersion: '', firmwareUrl: constants.OTA_DEFAULT_FIRMWARE_URL, wifiSsid: '', wifiPassword: '', showPassword: false,
				focusUrl: false, focusSsid: false, focusPwd: false,
				updating: false,
				staConnected: false, staSsid: '',
				confirmModalVisible: false, confirmModalContent: '设备将开始固件升级，升级完成后自动重启。确定继续吗？',
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
	onLoad() { this.checkDevice(); this.loadSaved(); this.getFw(); this.checkSta(); },
	onUnload() { this.cancelOta(); },
	methods: {
		loadSaved() {
			const u = uni.getStorageSync('otaUrl'); if (u) this.firmwareUrl = u;
			const s = uni.getStorageSync('wifiSsid'); if (s) { this.wifiSsid = s; const p = uni.getStorageSync('wifiPassword'); if (p) this.wifiPassword = p; }
		},
		async getFw() { if (!this.deviceConnected) return; try { this.showLoading('获取中...'); const res = await apiService.getFirmwareVersion(); if (res.status === 'success') this.currentVersion = res.data.firmware_version || '未知'; } catch (e) { console.warn('[ota] getFw:', e.message); } finally { this.hideLoading(); } },
		async checkSta() {
			if (!this.deviceConnected) return;
			try {
				const res = await apiService.getStaWifi();
				if (res.status === 'success' && res.data && res.data.connected) {
					this.staConnected = true;
					this.staSsid = res.data.ssid || '';
				}
			} catch (e) { /* 静默 */ }
		},
		togglePassword() { this.showPassword = !this.showPassword; },
		startUpdate() {
			if (!this.deviceConnected) { this.showToast('警告', '请先连接设备', 'warning'); return; }
				if (!isNonEmpty(this.firmwareUrl)) { this.showToast('提示', '请输入固件 URL', 'warning'); return; }
				if (!isValidUrl(this.firmwareUrl)) { this.showToast('提示', '固件 URL 格式不正确，请输入有效的 HTTP/HTTPS 地址', 'warning'); return; }
				// 未连接家庭 WiFi 时需验证 WiFi 信息
				if (!this.staConnected && !isNonEmpty(this.wifiSsid)) { this.showToast('提示', '请输入 WiFi 名称', 'warning'); return; }
			if (this.updating) return;
			let domain = '';
			try { domain = new URL(this.firmwareUrl).hostname; } catch (e) { domain = this.firmwareUrl; }
			let confirmMsg = `将向 ${domain} 请求固件文件。`;
			if (!this.staConnected) {
				confirmMsg += '设备将先连接家庭 WiFi 再下载固件，请确保 WiFi 密码正确。';
			}
			confirmMsg += '升级完成后自动重启。确定继续吗？';
			this.confirmModalContent = confirmMsg;
			this.confirmModalVisible = true;
		},
		handleConfirmModalConfirm() { this.confirmModalVisible = false; this.performOtaUpdate(); },
		handleConfirmModalCancel() { this.confirmModalVisible = false; },

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
				// 在 AP 热点下无互联网，属于正常现象，给出明确指引
				if (!this.staConnected) {
					this.showToast('提示', '设备当前在 AP 热点模式，无法访问互联网下载固件。请确保设备已连接家庭 WiFi', 'warning');
				} else {
					this.showToast('升级异常', msg, 'error');
				}
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

				// 步骤1：启动OTA配网模式（v1.2.0 新增）
				const modeRes = await apiService.otaStartMode();
				if (!modeRes || modeRes.status !== 'success') {
					this._onOtaFailed((modeRes && modeRes.data && modeRes.data.message) || '进入OTA模式失败');
					return;
				}

				// 步骤2：发送固件URL及WiFi信息，开始升级
				const data = { firmware_url: this.firmwareUrl };
				if (this.wifiSsid) { data.wifi_ssid = this.wifiSsid; if (this.wifiPassword) data.wifi_password = this.wifiPassword; }
				const res = await apiService.otaUpdate(data);
				if (res && res.status === 'success') {
					uni.setStorageSync('otaUrl', this.firmwareUrl);
					if (this.wifiSsid) { uni.setStorageSync('wifiSsid', this.wifiSsid); uni.removeStorageSync('wifiPassword'); }
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

	<style lang="scss">
	/* .page / .body / .card / .card-title / .btn / .input-wrap 均已全局化（App.vue） */

	.row {
		display: flex; justify-content: space-between; align-items: center;
		padding: 16rpx 0; border-bottom: 1rpx solid $bg-page;
	}
	.row:last-child { border-bottom: none; }
	.row-label { font-size: 26rpx; color: $text-secondary; }
	.row-val { font-size: 26rpx; color: $text-regular; font-weight: 500; }
	.row-val.version { color: $brand-primary; font-weight: 600; }

	.form-item { margin-bottom: 24rpx; }
	.form-item:last-child { margin-bottom: 0; }

	/* 密码框眼睛图标 — 使用 SVG 图标替代文字，避免重叠 */
	.input-wrap .pw-eye {
		position: absolute; right: 16rpx; top: 50%; transform: translateY(-50%);
		padding: 12rpx; z-index: 1;
	}
	.pw-eye-icon { width: 36rpx; height: 36rpx; display: block; }

	.tips { display: flex; flex-direction: column; gap: 12rpx; }
	.tips text { font-size: $fs-label; color: $text-secondary; line-height: 1.6; }
	.sta-hint {
		display: flex; align-items: center; gap: 10rpx;
		background: $color-success-bg; border-radius: $radius-md;
		padding: 16rpx 20rpx; margin-bottom: 4rpx;
	}
	.sta-hint-dot {
		width: 14rpx; height: 14rpx; border-radius: 50%;
		background: $color-success; flex-shrink: 0;
	}
	.sta-hint text { font-size: $fs-label; color: $color-success; line-height: 1.5; }

	/* OTA 进度遮罩 */
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

	.ota-title {
		font-size: 34rpx; font-weight: 600; color: $text-primary;
		text-align: center; margin-bottom: 20rpx;
	}
	.ota-warn {
		display: flex; align-items: center; gap: 8rpx;
		background: $color-warning-bg; border: 1rpx solid #FFE58F; border-radius: $radius-md;
		padding: 12rpx 20rpx; margin-bottom: 28rpx; width: 100%; box-sizing: border-box;
	}
	.ota-warn-icon { font-size: $fs-body; }
	.ota-warn-text { font-size: $fs-caption; color: $color-warning-text; line-height: 1.4; }

	.ota-ring-wrap { width: 100%; margin-bottom: 32rpx; }
	.ota-ring {
		display: flex; align-items: baseline; justify-content: center;
		margin-bottom: 20rpx;
	}
	.ota-pct { font-size: 72rpx; font-weight: 700; color: $brand-primary; line-height: 1; }
	.ota-pct-sign { font-size: $fs-body; color: $brand-primary; margin-left: 4rpx; }
	.ota-bar { width: 100%; border-radius: $radius-sm; }

	.ota-phase {
		font-size: $fs-title; font-weight: 600; color: $text-primary;
		text-align: center; margin-bottom: 12rpx;
	}
	.ota-hint {
		font-size: $fs-label; color: $text-hint; text-align: center;
		margin-bottom: 24rpx;
	}

	.ota-cancel {
		padding: 16rpx 32rpx; border-radius: 20rpx;
		background: $bg-page; transition: 150ms;
	}
	.ota-cancel:active { background: $border-light; }
	.ota-cancel text { font-size: 26rpx; color: $text-secondary; font-weight: 500; }

	.ota-panel.done .ota-pct { color: $color-success; }
	.ota-panel.done .ota-pct-sign { color: $color-success; }
	</style>
