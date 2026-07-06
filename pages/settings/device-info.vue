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
			:type="modalType"
				:show-buttons="false" />
	</view>
</template>

<script>
import Loading from '../../components/Loading';
import CustomModal from '../../components/CustomModal';
import apiService from '../../services/api';
import deviceMixin from '../../mixins/device-mixin.js';
import modalMixin from '../../mixins/modal-mixin.js';
import { isNonEmpty, isLengthValid } from '../../utils/validator';

export default {
	components: { Loading, CustomModal },
	mixins: [deviceMixin, modalMixin],
	data() {
		return {
			deviceInfo: { device_name: '', device_location: '', wifi_name: '' },
					systemInfo: null,
				saving: false,
		};
	},
	onLoad() { this.checkDevice(); this.getInfo(); },
		methods: {
			async getInfo() {
			if (!this.deviceConnected) return;
			try {
				this.showLoading('获取中...');
				const res = await apiService.getStatus();
				if (res.status === 'success') {
					if (res.data.device_info) this.deviceInfo = res.data.device_info;
				}
				const sys = await apiService.getSystemInfo();
				if (sys.status === 'success') this.systemInfo = sys.data;
			} catch (e) { console.warn('[device-info] getInfo:', e.message); }
			finally { this.hideLoading(); }
		},
		formatUptime(s) {
			if (!s) return '-';
			const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
			return d > 0 ? d + '天' + h + 'h' : h > 0 ? h + 'h' + m + 'm' : m + '分钟';
		},
		async saveDeviceInfo() {
			if (!this.deviceConnected) { this.showToast('提示', '请先连接设备'); return; }
			if (this.saving) return;
			if (!isNonEmpty(this.deviceInfo.device_name)) { this.showToast('提示', '请输入设备名称'); return; }
			if (!isLengthValid(this.deviceInfo.device_name, 1, 32)) { this.showToast('提示', '设备名称不能超过 32 个字符'); return; }
			if (this.deviceInfo.device_location && !isLengthValid(this.deviceInfo.device_location, 1, 64)) { this.showToast('提示', '设备位置不能超过 64 个字符'); return; }
			try {
				this.saving = true;
				this.showLoading('保存中...');
				const r = await apiService.setDeviceInfo(this.deviceInfo);
				if (r.status === 'success') { this.showToast('成功', '保存成功'); await this.getInfo(); }
				else { this.showToast('失败', (r.data && r.data.message) || '保存失败'); }
			} catch (e) { this.showToast('失败', e.message || '保存失败'); }
			finally { this.saving = false; this.hideLoading(); }
		}
	}
};
</script>

<style lang="scss">
/* .page / .body / .card / .card-title / .btn / .input-wrap 均已全局化（App.vue） */

/* 本页 card-title 需要 24rpx 间距 */
.card-title { margin-bottom: 24rpx; }

.form-item { margin-bottom: 28rpx; }
.form-item:last-child { margin-bottom: 0; }
.hint { display: block; font-size: $fs-caption; color: $text-hint; margin-top: 8rpx; }

.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; }
.info-item { background: $bg-elevated; border-radius: $radius-md; padding: 20rpx; display: flex; flex-direction: column; gap: 6rpx; }
.info-label { font-size: $fs-caption; color: $text-hint; }
.info-value { font-size: 26rpx; color: $text-regular; font-weight: 500; }
.info-value.version { color: $brand-primary; }
</style>