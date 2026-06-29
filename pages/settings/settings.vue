<template>
	<view class="page">
		<view class="body">
			<!-- 控制策略 -->
			<view class="section-label">控制策略</view>
			<view class="card">
				<SettingItem label="场景模式" icon="scene" :isSvgIcon="true" @click="go('scene')" />
				<SettingItem label="休眠开关" icon="sleep" :isSvgIcon="true" @click="go('sleep-settings')" />
				<SettingItem label="温湿度校准" icon="calibration" :isSvgIcon="true" @click="go('calibration')" />
			</view>

			<!-- 设备与网络 -->
			<view class="section-label">设备与网络</view>
			<view class="card">
				<SettingItem label="设备信息" icon="device" :isSvgIcon="true" @click="go('device-info')" />
				<SettingItem label="WiFi 设置" icon="wifi" :isSvgIcon="true" @click="go('wifi-settings')" />
				<SettingItem label="MQTT 配置" icon="cloud" :isSvgIcon="true" @click="go('mqtt-config')" />
				<SettingItem label="OTA 固件升级" icon="refresh" :isSvgIcon="true" @click="go('ota')" />
			</view>

			<!-- 维护 -->
			<view class="section-label">维护</view>
			<view class="card">
				<SettingItem label="重启设备" icon="reload" :isSvgIcon="true" @click="restartDevice" />
				<SettingItem label="深度睡眠" icon="moon" :isSvgIcon="true" @click="enterDeepSleep" />
			</view>
			<view class="card">
				<SettingItem label="恢复出厂设置" icon="warning" :isSvgIcon="true" @click="factoryReset" :danger="true" />
			</view>

			<!-- 其他 -->
			<view class="section-label">其他</view>
			<view class="card">
				<SettingItem label="清除缓存" icon="trash" :isSvgIcon="true" @click="clearCache" />
			</view>
			<view class="card">
				<SettingItem label="关于" icon="info" :isSvgIcon="true" :value="'v' + appVersion" @click="go('about')" />
			</view>
		</view>

		<CustomModal
			:visible="confirmModalVisible"
			:title="confirmModalTitle"
			:content="confirmModalContent"
			:confirm-text="confirmModalConfirmText"
			:cancel-text="confirmModalCancelText"
			:close-on-click-overlay="true"
			type="warning"
			@confirm="handleConfirmModalConfirm"
			@cancel="handleConfirmModalCancel"
		/>

		<CustomModal
			:visible="toastModalVisible"
			:content="toastModalContent"
			:show-buttons="false"
			:type="toastModalType"
		/>
	</view>
</template>

<script>
import SettingItem from '../../components/SettingItem';
import apiService from '../../services/api';
import CustomModal from '../../components/CustomModal';

export default {
	components: { SettingItem, CustomModal },
	data() {
		return {
			appVersion: '2.3.0',
			confirmModalVisible: false,
			confirmModalTitle: '', confirmModalContent: '',
			confirmModalConfirmText: '确定', confirmModalCancelText: '取消',
			confirmAction: '',
			toastModalVisible: false, toastModalContent: '', toastModalType: 'success',
			loading: false, loadingText: '执行中...'
		};
	},
	methods: {
		go(page) { uni.navigateTo({ url: '/pages/settings/' + page }); },
		restartDevice() {
			this.confirmModalTitle = '重启设备';
			this.confirmModalContent = '确定要重启设备吗？设备将暂时断开连接。';
			this.confirmModalConfirmText = '确定重启';
			this.confirmAction = 'restart'; this.confirmModalVisible = true;
		},
		enterDeepSleep() {
			this.confirmModalTitle = '进入深度睡眠';
			this.confirmModalContent = '确定要让设备进入深度睡眠模式吗？唤醒需要断电重启。';
			this.confirmModalConfirmText = '确定进入';
			this.confirmAction = 'deepSleep'; this.confirmModalVisible = true;
		},
		factoryReset() {
			this.confirmModalTitle = '恢复出厂设置';
			this.confirmModalContent = '警告：此操作将删除所有设置和数据，设备恢复为初始状态。确定要继续吗？';
			this.confirmModalConfirmText = '确定恢复';
			this.confirmAction = 'factoryReset'; this.confirmModalVisible = true;
		},
		clearCache() {
			this.confirmModalTitle = '清除缓存';
			this.confirmModalContent = '确定要清除所有缓存数据吗？';
			this.confirmModalConfirmText = '确定'; this.confirmModalCancelText = '取消';
			this.confirmAction = 'clearCache'; this.confirmModalVisible = true;
		},
		showToast(content, type = 'success') {
			this.toastModalContent = content; this.toastModalType = type;
			this.toastModalVisible = true;
			setTimeout(() => { this.toastModalVisible = false; }, 1500);
		},
		async handleConfirmModalConfirm() {
			this.confirmModalVisible = false;
			const d = uni.getStorageSync('connectedDevice');
			const connected = d && d.connected;
			if (!connected && this.confirmAction !== 'clearCache') {
				this.showToast('请先连接设备', 'warning'); return;
			}
			if (this.loading) return;
			try {
				this.loading = true;
				uni.showLoading({ title: this.loadingText, mask: true });
				switch (this.confirmAction) {
					case 'restart': await apiService.restartDevice(); this.showToast('重启命令已发送'); break;
					case 'deepSleep': await apiService.enterDeepSleep(); this.showToast('已进入深度睡眠'); break;
					case 'factoryReset': await apiService.factoryReset(); this.showToast('恢复出厂设置成功'); break;
					case 'clearCache': uni.clearStorageSync(); this.showToast('缓存已清除'); break;
				}
			} catch (e) {
				this.showToast(e.message || '操作失败', 'error');
			} finally { this.loading = false; uni.hideLoading(); }
		},
		handleConfirmModalCancel() { this.confirmModalVisible = false; }
	}
};
</script>

<style scoped>
.page { min-height: 100vh; background: #F5F5F5; }
.body { padding: 32rpx; }
.section-label { font-size: 26rpx; color: #999; padding: 8rpx 0 16rpx 4rpx; }
.card {
	background: #FFF;
	border-radius: 24rpx;
	box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04);
	overflow: hidden;
	margin-bottom: 24rpx;
}
</style>
