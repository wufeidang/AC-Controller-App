<template>
	<view class="page">
		<view class="body">
			<!-- 设备信息 -->
			<view class="card">
				<text class="card-title">设备信息</text>

				<view class="form-item">
					<text class="label">设备名称</text>
					<input v-model="deviceInfo.device_name" class="input" placeholder="请输入设备名称" maxlength="32" />
					<text class="hint">用于标识设备</text>
				</view>

			<view class="form-item">
				<text class="label">设备位置</text>
				<input v-model="deviceInfo.device_location" class="input" placeholder="请输入设备位置" maxlength="64" />
				<text class="hint">描述安装位置</text>
			</view>
		</view>

			<!-- 系统信息 -->
			<view class="card" v-if="systemInfo">
				<text class="card-title">系统信息</text>
				<view class="info-grid">
					<view class="info-item"><text class="info-label">设备ID</text><text class="info-value">{{ systemInfo.device_id || '-' }}</text></view>
					<view class="info-item"><text class="info-label">固件</text><text class="info-value version">{{ systemInfo.firmware_version || '-' }}</text></view>
					<view class="info-item"><text class="info-label">ESP版本</text><text class="info-value">{{ systemInfo.esp_version || '-' }}</text></view>
					<view class="info-item"><text class="info-label">Flash</text><text class="info-value">{{ systemInfo.flash_size ? systemInfo.flash_size + 'MB' : '-' }}</text></view>
					<view class="info-item"><text class="info-label">可用内存</text><text class="info-value">{{ systemInfo.free_heap ? Math.round(systemInfo.free_heap / 1024 * 10) / 10 + 'KB' : '-' }}</text></view>
					<view class="info-item"><text class="info-label">运行时间</text><text class="info-value">{{ formatUptime(systemInfo.uptime) }}</text></view>
				</view>
			</view>

			<view class="btn btn-primary" @click="saveDeviceInfo" :class="{ off: !deviceConnected || saving }">
				<text>{{ saving ? '保存中...' : '保存' }}</text>
			</view>
		</view>

		<Loading :visible="loadingVisible" :text="loadingText" />
		<CustomModal :visible="modalVisible" :title="modalTitle" :content="modalContent"
			:close-on-click-overlay="false"
			:type="modalTitle === '失败' ? 'error' : (modalTitle === '成功' ? 'success' : 'info')"
			:show-buttons="false" />
	</view>
</template>

<script>
import Loading from '../../components/Loading';
import CustomModal from '../../components/CustomModal';
import apiService from '../../services/api';
import deviceMixin from '../../mixins/device-mixin.js';
import { isNonEmpty, isLengthValid } from '../../utils/validator';

export default {
	components: { Loading, CustomModal },
	mixins: [deviceMixin],
	data() {
		return {
			deviceInfo: { device_name: '', device_location: '', wifi_name: '' },
				systemInfo: null,
			loadingVisible: false, loadingText: '', saving: false,
			modalVisible: false, modalTitle: '', modalContent: ''
		};
	},
	onLoad() { this.checkDevice(); if (this.deviceConnected) apiService.setDeviceAddress(this.deviceAddress); this.getInfo(); },
	methods: {
		showModal(title, content) {
			this.modalTitle = title; this.modalContent = content; this.modalVisible = true;
			setTimeout(() => { this.modalVisible = false; }, 1500);
		},
		async getInfo() {
			if (!this.deviceConnected) return;
			try {
				this.loadingVisible = true; this.loadingText = '获取中...';
				const res = await apiService.getStatus();
				if (res.status === 'success') {
				if (res.data.device_info) this.deviceInfo = res.data.device_info;
					}
				const sys = await apiService.getSystemInfo();
				if (sys.status === 'success') this.systemInfo = sys.data;
			} catch (e) { console.error(e); }
			finally { this.loadingVisible = false; }
		},
		formatUptime(s) {
			if (!s) return '-';
			const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
			return d > 0 ? d + '天' + h + 'h' : h > 0 ? h + 'h' + m + 'm' : m + '分钟';
		},
		async saveDeviceInfo() {
			if (!this.deviceConnected) { this.showModal('提示', '请先连接设备'); return; }
			if (this.saving) return;
			if (!isNonEmpty(this.deviceInfo.device_name)) { this.showModal('提示', '请输入设备名称'); return; }
			if (!isLengthValid(this.deviceInfo.device_name, 1, 32)) { this.showModal('提示', '设备名称不能超过 32 个字符'); return; }
			if (this.deviceInfo.device_location && !isLengthValid(this.deviceInfo.device_location, 1, 64)) { this.showModal('提示', '设备位置不能超过 64 个字符'); return; }
			try {
				this.saving = true; this.loadingVisible = true; this.loadingText = '保存中...';
				const r = await apiService.setDeviceInfo(this.deviceInfo);
				if (r.status === 'success') { this.showModal('成功', '保存成功'); await this.getInfo(); }
				else { this.showModal('失败', (r.data && r.data.message) || '保存失败'); }
			} catch (e) { this.showModal('失败', e.message || '保存失败'); }
			finally { this.saving = false; this.loadingVisible = false; }
		}
	}
};
</script>

<style scoped>
.page { min-height: 100vh; background: #F5F5F5; }
.body { padding: 32rpx; }

.card { background: #FFF; border-radius: 24rpx; padding: 32rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.card-title { font-size: 30rpx; font-weight: 600; color: #1A1A1A; margin-bottom: 24rpx; display: block; }

.form-item { margin-bottom: 28rpx; }
.form-item:last-child { margin-bottom: 0; }
.label { display: block; font-size: 26rpx; color: #333; font-weight: 500; margin-bottom: 12rpx; }
.input { width: 100%; height: 80rpx; padding: 0 20rpx; border: 1rpx solid #D9D9D9; border-radius: 12rpx; font-size: 28rpx; color: #333; background: #FFF; box-sizing: border-box; }
.hint { display: block; font-size: 22rpx; color: #999; margin-top: 8rpx; }

.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; }
.info-item { background: #FAFAFA; border-radius: 12rpx; padding: 20rpx; display: flex; flex-direction: column; gap: 6rpx; }
.info-label { font-size: 22rpx; color: #999; }
.info-value { font-size: 26rpx; color: #333; font-weight: 500; }
.info-value.version { color: #1677FF; }

.btn { padding: 28rpx 32rpx; border-radius: 24rpx; text-align: center; margin-bottom: 32rpx; transition: 150ms; }
.btn:active { transform: scale(0.98); }
.btn-primary { background: #1677FF; }
.btn-primary text { color: #FFF; font-size: 30rpx; font-weight: 500; }
.btn.off { opacity: 0.5; }
</style>
