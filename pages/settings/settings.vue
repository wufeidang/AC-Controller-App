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
				:close-on-click-overlay="true"
				:type="confirmType"
				@confirm="handleConfirmOk"
				@cancel="handleConfirmCancel"
			/>
		</view>
	</template>

	<script>
	import SettingItem from '../../components/SettingItem';
	import apiService from '../../services/api';
	import CustomModal from '../../components/CustomModal';
	import Loading from '../../components/Loading';
	import modalMixin from '../../mixins/modal-mixin';
	import constants from '../../config/constants';

	export default {
		components: { SettingItem, CustomModal, Loading },
		mixins: [modalMixin],
		data() {
			return {
				appVersion: '2.3.0',
				loading: false,
				confirmAction: ''  // 用于确认弹窗的动作路由
			};
		},
		methods: {
			go(page) { uni.navigateTo({ url: '/pages/settings/' + page }); },
			restartDevice() {
				this.confirmAction = 'restart';
				this.showConfirm('重启设备', '确定要重启设备吗？设备将暂时断开连接。', {
					confirmText: '确定重启',
					type: 'warning',
					onConfirm: () => this.executeAction('restart')
				});
			},
			enterDeepSleep() {
				this.confirmAction = 'deepSleep';
				this.showConfirm('进入深度睡眠', '确定要让设备进入深度睡眠模式吗？唤醒需要断电重启。', {
					confirmText: '确定进入',
					type: 'warning',
					onConfirm: () => this.executeAction('deepSleep')
				});
			},
			factoryReset() {
				this.confirmAction = 'factoryReset';
				this.showConfirm('恢复出厂设置', '警告：此操作将删除所有设置和数据，设备恢复为初始状态。确定要继续吗？', {
					confirmText: '确定恢复',
					type: 'error',
					onConfirm: () => this.executeAction('factoryReset')
				});
			},
			clearCache() {
				this.confirmAction = 'clearCache';
				this.showConfirm('清除缓存', '将删除本地缓存的阈值/场景等设置。\n设备连接信息将保留，不会断开当前设备。\n是否继续？', {
					confirmText: '确定清除',
					cancelText: '取消',
					type: 'warning',
					onConfirm: () => this.executeAction('clearCache')
				});
			},
		async executeAction(action) {
			const d = uni.getStorageSync('connectedDevice');
			const connected = d && d.connected;
			if (!connected && action !== 'clearCache') {
				this.showToast('提示', '请先连接设备', 'warning'); return;
			}
			if (this.loading) return;
			try {
				this.loading = true;
				this.showLoading('执行中...');
				switch (action) {
					case 'restart': await apiService.restartDevice(); this.showToast('成功', '重启命令已发送'); break;
					case 'deepSleep': await apiService.enterDeepSleep(); this.showToast('成功', '已进入深度睡眠'); break;
					case 'factoryReset': await apiService.factoryReset(); this.showToast('成功', '恢复出厂设置成功'); break;
					case 'clearCache': this.clearNonCriticalStorage(); this.showToast('成功', '缓存已清除', 'success'); break;
				}
			} catch (e) {
				this.showToast('失败', e.message || '操作失败', 'error');
			} finally { this.loading = false; this.hideLoading(); }
		},
		/** 清除缓存时保留关键 storage：连接信息 / 网络记忆 / 已连过设备的会话 */
		clearNonCriticalStorage() {
			const KEEP = ['connectedDevice', 'staNetwork'];
			const info = uni.getStorageInfoSync();
			info.keys.forEach(k => {
				if (!KEEP.includes(k)) {
					try { uni.removeStorageSync(k); } catch (e) { console.warn('[settings] removeStorage:', e.message); }
				}
			});
		},
		}
	};
	</script>

	<style lang="scss">
	/* .page / .body / .card / .card-title / .section-label / .btn 均已全局化（App.vue） */
	</style>
