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
					<input v-model="firmwareUrl" class="input" placeholder="http://example.com/firmware.bin" />
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
				</view>
			</view>

			<view class="btn btn-primary" @click="startUpdate" :class="{ off: !deviceConnected || updating }">
				<text>{{ updating ? '升级中...' : '开始升级' }}</text>
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

		<!-- 结果 -->
		<CustomModal :visible="resultModalVisible" :title="resultModalTitle" :content="resultModalContent"
			:show-buttons="true" confirm-text="确定" @confirm="handleResultModalConfirm" />

		<!-- 普通提示 -->
		<CustomModal :visible="modalVisible" :title="modalTitle" :content="modalContent"
			:close-on-click-overlay="false"
			:type="modalTitle === '警告' ? 'warning' : (modalTitle === '失败' ? 'error' : 'info')"
			:show-buttons="false" />
	</view>
</template>

<script>
import Loading from '../../components/Loading';
import CustomModal from '../../components/CustomModal';
import apiService from '../../services/api';

export default {
	components: { Loading, CustomModal },
	data() {
		return {
			deviceConnected: false, loadingVisible: false, loadingText: '',
			currentVersion: '', firmwareUrl: 'http://bin.bemfa.com/b/27002/3BcZGI1OTA5NDczM2FjYjkzMTg2N2Q1YWY5NGE1N2ZjNzg=FRESTEC.bin', wifiSsid: '', wifiPassword: '', showPassword: false,
			updating: false,
			confirmModalVisible: false, confirmModalContent: '设备将开始固件升级，升级完成后自动重启。确定继续吗？',
			validateModalVisible: false, validateModalTitle: '输入验证',
			validateModalContent: '请输入 "upgrade" 确认升级', validateModalPlaceholder: '请输入 upgrade',
			resultModalVisible: false, resultModalTitle: '', resultModalContent: '',
			modalVisible: false, modalTitle: '', modalContent: ''
		};
	},
	onLoad() { this.checkDevice(); this.loadSaved(); this.getFw(); },
	methods: {
		checkDevice() { const d = uni.getStorageSync('connectedDevice'); this.deviceConnected = d && d.connected; if (d) apiService.setDeviceAddress(d.address); },
		loadSaved() {
			const u = uni.getStorageSync('otaUrl'); if (u) this.firmwareUrl = u;
			const s = uni.getStorageSync('wifiSsid'); if (s) { this.wifiSsid = s; const p = uni.getStorageSync('wifiPassword'); if (p) this.wifiPassword = p; }
		},
		async getFw() { if (!this.deviceConnected) return; try { this.loadingVisible = true; this.loadingText = '获取中...'; const res = await apiService.getFirmwareVersion(); if (res.status === 'success') this.currentVersion = res.data.firmware_version || '未知'; } catch (e) { console.error(e); } finally { this.loadingVisible = false; } },
		togglePassword() { this.showPassword = !this.showPassword; },
		startUpdate() {
			if (!this.deviceConnected) { this.showModal('警告', '请先连接设备'); return; }
			if (!this.firmwareUrl) { this.showModal('提示', '请输入固件 URL'); return; }
			if (!this.wifiSsid) { this.showModal('提示', '请输入 WiFi 名称'); return; }
			if (this.updating) return;
			this.confirmModalVisible = true;
		},
		handleConfirmModalConfirm() { this.confirmModalVisible = false; this.validateModalVisible = true; },
		handleConfirmModalCancel() { this.confirmModalVisible = false; },
		handleValidateModalConfirm(inputValue) { this.validateModalVisible = false; if (inputValue === 'upgrade') this.performOtaUpdate(); },
		handleValidateModalCancel() { this.validateModalVisible = false; },
		handleResultModalConfirm() { this.resultModalVisible = false; },
		async performOtaUpdate() {
			try {
				this.updating = true; this.loadingVisible = true; this.loadingText = '正在升级...';
				const data = { firmware_url: this.firmwareUrl };
				if (this.wifiSsid) { data.wifi_ssid = this.wifiSsid; if (this.wifiPassword) data.wifi_password = this.wifiPassword; }
				const res = await apiService.otaUpdate(data);
				if (res && res.status === 'success') {
					uni.setStorageSync('otaUrl', this.firmwareUrl);
					if (this.wifiSsid) { uni.setStorageSync('wifiSsid', this.wifiSsid); if (this.wifiPassword) uni.setStorageSync('wifiPassword', this.wifiPassword); }
					else { uni.removeStorageSync('wifiSsid'); uni.removeStorageSync('wifiPassword'); }
					if (res.data.message === '正在连接WiFi') { this.resultModalTitle = '连接 WiFi'; this.resultModalContent = '正在连接 WiFi：' + res.data.wifi_ssid; }
					else if (res.data.message === 'OTA升级开始') { this.resultModalTitle = '升级开始'; this.resultModalContent = '固件升级已开始，设备将在升级完成后自动重启'; }
					else { this.resultModalTitle = '升级成功'; this.resultModalContent = '固件升级命令已发送，设备将开始升级'; }
					this.resultModalVisible = true;
				} else { this.showModal('失败', (res && res.data && res.data.message) || '升级失败'); }
			} catch (e) { this.showModal('失败', e.message || '升级失败'); }
			finally { this.updating = false; this.loadingVisible = false; }
		},
		showModal(title, content) { this.modalTitle = title; this.modalContent = content; this.modalVisible = true; }
	}
};
</script>

<style scoped>
.page { min-height: 100vh; background: #F5F5F5; }
.body { padding: 32rpx; }
.card { background: #FFF; border-radius: 24rpx; padding: 32rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.card-title { font-size: 30rpx; font-weight: 600; color: #1A1A1A; margin-bottom: 20rpx; display: block; }
.row { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #F5F5F5; }
.row:last-child { border-bottom: none; }
.row-label { font-size: 26rpx; color: #666; }
.row-val { font-size: 26rpx; color: #333; font-weight: 500; }
.row-val.version { color: #1677FF; font-weight: 600; }
.form-item { margin-bottom: 24rpx; position: relative; }
.form-item:last-child { margin-bottom: 0; }
.label { display: block; font-size: 26rpx; color: #333; font-weight: 500; margin-bottom: 12rpx; }
.input { width: 100%; height: 80rpx; padding: 0 20rpx; border: 1rpx solid #D9D9D9; border-radius: 12rpx; font-size: 28rpx; color: #333; background: #FFF; box-sizing: border-box; }
.pw-toggle { position: absolute; right: 16rpx; top: 44rpx; padding: 8rpx 12rpx; }
.pw-toggle text { font-size: 24rpx; color: #1677FF; }
.tips { display: flex; flex-direction: column; gap: 12rpx; }
.tips text { font-size: 24rpx; color: #666; line-height: 1.6; }
.btn { padding: 28rpx 32rpx; border-radius: 24rpx; text-align: center; margin-bottom: 32rpx; transition: 150ms; }
.btn:active { transform: scale(0.98); }
.btn-primary { background: #1677FF; }
.btn-primary text { color: #FFF; font-size: 30rpx; font-weight: 500; }
.btn.off { opacity: 0.5; }
</style>
