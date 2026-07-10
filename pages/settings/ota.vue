<template>
	<view class="page">
		<view class="body">
			<!-- 版本信息 -->
			<view class="card">
				<text class="card-title">固件信息</text>
				<view class="row"><text class="row-label">设备版本</text><text class="row-val version">{{ currentVersion || '获取中...' }}</text></view>
				<view class="row" v-if="remoteVersion"><text class="row-label">平台版本</text><text class="row-val" :class="hasUpdate ? 'version-new' : ''">{{ remoteVersion }}</text></view>
				<view class="row" v-if="remoteTag"><text class="row-label">固件备注</text><text class="row-val">{{ remoteTag }}</text></view>
				<view class="update-hint" v-if="remoteVersion && currentVersion">
					<text v-if="hasUpdate" class="update-hint-new">有新版本可用</text>
					<text v-else class="update-hint-ok">已是最新版本</text>
				</view>
			</view>

			<!-- Bemfa 配置 -->
			<view class="card">
				<text class="card-title">Bemfa 平台配置</text>
				<text class="card-hint">填写后可自动获取最新固件链接</text>
				<view class="form-item">
					<text class="label">用户私钥 (openID)</text>
					<view class="input-wrap" style="position:relative;">
						<input v-model="bemfaOpenID" class="input" :password="!showOpenID"
							placeholder="Bemfa 用户私钥" maxlength="128" />
						<view class="pw-toggle" @click="showOpenID = !showOpenID">
							<text>{{ showOpenID ? '隐藏' : '显示' }}</text>
						</view>
					</view>
				</view>
				<view class="form-item">
					<text class="label">设备主题 (topic)</text>
					<input v-model="bemfaTopic" class="input" placeholder="设备 topic 值" maxlength="64" />
				</view>
				<view class="btn-row">
					<view class="btn-small" @click="saveBemfaConfig" :class="{ off: savingBemfa }">
						<text>{{ savingBemfa ? '保存中...' : '保存配置' }}</text>
					</view>
					<view class="btn-small primary" @click="fetchRemoteFirmware" :class="{ off: fetchingFirmware || !bemfaOpenID || !bemfaTopic }">
						<text>{{ fetchingFirmware ? '获取中...' : '获取最新固件' }}</text>
					</view>
				</view>
			</view>

			<!-- OTA 配置 -->
			<view class="card">
				<text class="card-title">固件升级</text>
				<view class="form-item">
					<text class="label">固件 URL</text>
					<view class="input-wrap" :class="{ focus: focusUrl }">
						<input v-model="firmwareUrl" class="input"
							placeholder="请输入固件下载 URL 或点击上方获取"
							@focus="focusUrl = true" @blur="focusUrl = false" />
					</view>
				</view>

				<template v-if="staConnected">
					<view class="sta-hint">
						<view class="sta-hint-dot"></view>
						<text>设备已连接家庭 WiFi（{{ staSsid }}），可直接下载固件</text>
					</view>
				</template>
				<template v-else>
					<view class="sta-hint warn">
						<view class="sta-hint-dot"></view>
						<text>设备当前在 AP 热点模式，请先连接家庭 WiFi 后再升级</text>
					</view>
				</template>
			</view>

			<view class="card">
				<text class="card-title">说明</text>
				<view class="tips">
					<text>· 填写 Bemfa openID 和 topic 后可一键获取最新固件</text>
					<text>· 也可手动输入任意 .bin 固件下载地址</text>
					<text>· WiFi 信息用于设备连接互联网下载固件</text>
					<text>· 升级过程中请勿断电，完成后设备自动重启</text>
					<text class="tip-warn">· 固件将下载自第三方服务器，请确认来源可靠</text>
				</view>
			</view>

			<view class="btn btn-primary" @click="startUpdate" :class="{ off: !deviceConnected || updating || (remoteVersion && !hasUpdate) }">
				<text>{{ updating ? '升级中...' : (remoteVersion && !hasUpdate ? '已是最新版本' : '开始升级') }}</text>
			</view>
		</view>

		<!-- OTA 进度遮罩 -->
			<view class="ota-overlay" v-if="otaPhase !== 'idle'" @click.stop role="alert" aria-live="polite">
				<view class="ota-panel" :class="otaPhase">
					<text class="ota-title">固件升级</text>
					<view class="ota-warn" v-if="otaPhase === 'connecting' || otaPhase === 'downloading'">
						<text class="ota-warn-icon">⚠</text>
						<text class="ota-warn-text">升级期间请勿断电或关闭页面</text>
					</view>
					<view class="ota-ring-wrap" role="progressbar" :aria-valuenow="otaProgress" aria-valuemin="0" aria-valuemax="100" aria-label="OTA升级进度">
						<view class="ota-ring">
							<text class="ota-pct">{{ otaProgress }}</text>
							<text class="ota-pct-sign">%</text>
						</view>
						<progress :percent="otaProgress" :stroke-width="6" :activeColor="otaPhase==='done' ? '#00B96B' : '#1677FF'" backgroundColor="#E8E8E8" class="ota-bar" />
					</view>
					<text class="ota-phase">{{ phaseLabel }}</text>
					<text class="ota-hint" v-if="otaPhase === 'verifying'">设备重启后将自动恢复连接</text>
					<view class="ota-cancel" v-if="otaPhase === 'verifying'" @click="cancelOta">
						<text>取消等待</text>
					</view>
				</view>
			</view>

		<Loading :visible="loadingVisible" :text="loadingText" />

		<CustomModal :visible="confirmModalVisible" title="确认升级" :content="confirmModalContent"
			confirm-text="确定升级" cancel-text="取消" type="warning"
			@confirm="handleConfirmModalConfirm" @cancel="handleConfirmModalCancel" />

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
					currentVersion: '', firmwareUrl: '',
				focusUrl: false,
				updating: false,
				staConnected: false, staSsid: '',
				confirmModalVisible: false, confirmModalContent: '设备将开始固件升级，升级完成后自动重启。确定继续吗？',
				// OTA 进度追踪
				otaProgress: 0,
				otaPhase: 'idle', // idle | connecting | downloading | verifying | done | failed
				_progressTimer: null,
				_pollTimer: null,
				_verifyStart: 0,
			// Bemfa 配置
			bemfaOpenID: '',
			bemfaTopic: '',
			savingBemfa: false,
			fetchingFirmware: false,
			remoteVersion: '',
			remoteTag: '',
			showOpenID: false,
		};
	},
	computed: {
		phaseLabel() {
			return PHASE_LABELS[this.otaPhase] || '';
		},
		defaultIp() {
			return constants.DEFAULT_IP;
		},
		hasUpdate() {
			if (!this.remoteVersion || !this.currentVersion) return false;
			return String(this.remoteVersion) !== String(this.currentVersion);
		}
	},
	onLoad() {
		this.checkDevice();
		this.getFw();
		this.checkSta();
		this.loadBemfaConfig();
	},
	onUnload() { this.cancelOta(); },
	methods: {
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

		// ===== Bemfa 配置 =====
		loadBemfaConfig() {
			const cfg = uni.getStorageSync(constants.STORAGE_KEYS.BEMFA_CONFIG);
			if (cfg) {
				this.bemfaOpenID = cfg.openID || '';
				this.bemfaTopic = cfg.topic || '';
				// 有配置则自动获取
				if (this.bemfaOpenID && this.bemfaTopic) {
					this.fetchRemoteFirmware();
				}
			}
		},
		saveBemfaConfig() {
			if (!isNonEmpty(this.bemfaOpenID)) { this.showToast('提示', '请输入 openID', 'warning'); return; }
			if (!isNonEmpty(this.bemfaTopic)) { this.showToast('提示', '请输入 topic', 'warning'); return; }
			this.savingBemfa = true;
			try {
				uni.setStorageSync(constants.STORAGE_KEYS.BEMFA_CONFIG, {
					openID: this.bemfaOpenID,
					topic: this.bemfaTopic
				});
				this.showToast('成功', 'Bemfa 配置已保存', 'success');
			} catch (e) {
				this.showToast('失败', '保存失败', 'error');
			} finally {
				this.savingBemfa = false;
			}
		},
		async fetchRemoteFirmware() {
			if (!this.bemfaOpenID || !this.bemfaTopic) return;
			if (this.fetchingFirmware) return;
			try {
				this.fetchingFirmware = true;
				this.showLoading('获取最新固件...');
				const data = await apiService.getBemfaFirmwareUrl({
					openID: this.bemfaOpenID,
					topic: this.bemfaTopic,
					deviceType: constants.BEMFA_DEVICE_TYPE
				});
				if (data && data.url) {
					this.firmwareUrl = data.url;
					this.remoteVersion = data.version ? String(data.version) : '';
					this.remoteTag = data.tag || '';
					const sizeKB = data.size ? (data.size / 1024).toFixed(1) : '';
					if (this.hasUpdate) {
						this.showToast('发现新版本', `v${this.remoteVersion}${sizeKB ? ' (' + sizeKB + 'KB)' : ''}，可升级`, 'warning');
					} else {
						this.showToast('已是最新', `当前版本 v${this.currentVersion}，无需升级`, 'success');
					}
				} else {
					this.showToast('提示', '未获取到固件链接', 'warning');
				}
			} catch (e) {
				this.showToast('获取失败', e.message || '无法获取固件信息', 'error');
			} finally {
				this.fetchingFirmware = false;
				this.hideLoading();
			}
		},

		startUpdate() {
			if (!this.deviceConnected) { this.showToast('警告', '请先连接设备', 'warning'); return; }
			if (this.remoteVersion && !this.hasUpdate) { this.showToast('提示', '已是最新版本，无需升级', 'success'); return; }
				if (!isNonEmpty(this.firmwareUrl)) { this.showToast('提示', '请输入固件 URL 或点击获取最新固件', 'warning'); return; }
				if (!isValidUrl(this.firmwareUrl)) { this.showToast('提示', '固件 URL 格式不正确，请输入有效的 HTTP/HTTPS 地址', 'warning'); return; }
			if (this.updating) return;
			if (!this.staConnected) {
				this.showToast('提示', '设备当前在 AP 热点模式，无法实时跟进固件更新状态，请连接家庭 WiFi 再试', 'warning');
				return;
			}
			let domain = '';
			try { domain = new URL(this.firmwareUrl).hostname; } catch (e) { domain = this.firmwareUrl; }
			this.confirmModalContent = `将向 ${domain} 请求固件文件。升级完成后自动重启。确定继续吗？`;
			this.confirmModalVisible = true;
		},
		handleConfirmModalConfirm() { this.confirmModalVisible = false; this.performOtaUpdate(); },
		handleConfirmModalCancel() { this.confirmModalVisible = false; },

		// ===== OTA 进度追踪 =====
		_startSimProgress(targetPct, durationMs) {
			this._stopSimProgress();
			const startPct = this.otaProgress;
			const delta = targetPct - startPct;
			const tickMs = 200;
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
		_onProgressTargetReached() {
			if (this.otaPhase === 'connecting') {
				this.otaPhase = 'downloading';
				this._startSimProgress(constants.OTA_PROGRESS_MAX, 35000);
			} else if (this.otaPhase === 'downloading') {
				this.otaPhase = 'verifying';
				this._verifyStart = Date.now();
				this._startVerifyPoll();
			}
		},

		_startVerifyPoll() {
			this._stopVerifyPoll();
			this._pollTimer = setInterval(() => {
				if (Date.now() - this._verifyStart > constants.OTA_VERIFY_TIMEOUT) {
					this._onOtaFailed('验证超时，设备可能仍在重启中，请稍后手动确认');
					return;
				}
				apiService.getFirmwareVersion().then(res => {
					if (res && res.status === 'success' && res.data && res.data.firmware_version) {
						this._onOtaDone(res.data.firmware_version);
					}
				}).catch(() => {});
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
				const finalVersion = newVersion || this.currentVersion;
				if (finalVersion) this.currentVersion = finalVersion;
				// 同步 Bemfa 平台版本号到固件保存
				if (this.remoteVersion) {
					apiService.setDeviceInfo({ firmware_version: this.remoteVersion }).catch(() => {});
				}
				setTimeout(() => {
					this.otaPhase = 'idle';
					this.otaProgress = 0;
					this.showToast('升级成功', '固件已更新至 v' + (this.remoteVersion || finalVersion), 'success');
					// 刷新设备版本号
					apiService.getFirmwareVersion().then(res => {
						if (res && res.status === 'success' && res.data && res.data.firmware_version) {
							this.currentVersion = res.data.firmware_version;
						}
					}).catch(() => {});
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

				const modeRes = await apiService.otaStartMode();
				if (!modeRes || modeRes.status !== 'success') {
					this._onOtaFailed((modeRes && modeRes.data && modeRes.data.message) || '进入OTA模式失败');
					return;
				}

				const data = { firmware_url: this.firmwareUrl };
				if (this.wifiSsid) { data.wifi_ssid = this.wifiSsid; if (this.wifiPassword) data.wifi_password = this.wifiPassword; }
				const res = await apiService.otaUpdate(data);
				if (res && res.status === 'success') {
					uni.setStorageSync('otaUrl', this.firmwareUrl);
					if (this.wifiSsid) { uni.setStorageSync('wifiSsid', this.wifiSsid); uni.removeStorageSync('wifiPassword'); }
					else { uni.removeStorageSync('wifiSsid'); uni.removeStorageSync('wifiPassword'); }
					if (res.data.message === '正在连接WiFi') {
						this.otaPhase = 'connecting';
						this._startSimProgress(15, 5000);
					} else if (res.data.message === 'OTA升级开始') {
						this.otaPhase = 'downloading';
						this._startSimProgress(constants.OTA_PROGRESS_MAX, 40000);
					} else {
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
	.row-val.version-new { color: #FA541C; }

	.update-hint { padding: 12rpx 0 0; text-align: center; }
	.update-hint-new { font-size: $fs-label; color: #FA541C; font-weight: 500; }
	.update-hint-ok { font-size: $fs-label; color: $color-success; }

	.form-item { margin-bottom: 24rpx; }
	.form-item:last-child { margin-bottom: 0; }

	.pw-toggle {
		position: absolute; right: 12rpx; top: 50%; transform: translateY(-50%);
		padding: 8rpx 16rpx; border-radius: $radius-sm;
		background: $bg-subtle; z-index: 1;
	}
	.pw-toggle text { font-size: $fs-caption; color: $brand-primary; font-weight: 500; }

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
	.sta-hint.warn { background: $color-warning-bg; }
	.sta-hint-dot {
		width: 14rpx; height: 14rpx; border-radius: 50%;
		background: $color-success; flex-shrink: 0;
	}
	.sta-hint.warn .sta-hint-dot { background: $color-warning; }
	.sta-hint text { font-size: $fs-label; color: $color-success; line-height: 1.5; }
	.sta-hint.warn text { color: $color-warning-text; }

	.btn-row { display: flex; gap: 16rpx; margin-top: 16rpx; }
	.btn-small {
		flex: 1; padding: 16rpx 0; border-radius: $radius-md;
		background: $bg-subtle; text-align: center; transition: 150ms;
	}
	.btn-small:active { transform: scale(0.97); }
	.btn-small.off { opacity: 0.5; }
	.btn-small text { font-size: $fs-label; color: $text-regular; }
	.btn-small.primary { background: $brand-primary-bg; }
	.btn-small.primary text { color: $brand-primary; font-weight: 500; }

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
