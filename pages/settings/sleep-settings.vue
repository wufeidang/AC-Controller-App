<template>
	<view class="page">
		<view class="body">
			<view class="desc">控制设备是否进入休眠模式</view>

			<view class="card">
				<view class="switch-row">
					<view class="switch-info">
						<image src="/static/icons/sleep.svg" class="switch-icon" mode="aspectFit" />
						<view class="switch-text">
							<text class="switch-title">启用休眠功能</text>
							<text class="switch-sub">{{ sleepEnabled ? '休眠已开启，空闲时自动进入低功耗' : '休眠已关闭，设备保持运行' }}</text>
						</view>
					</view>
					<switch :checked="sleepEnabled" color="#1677FF" @change="toggleSleep" />
				</view>
			</view>

			<view class="card">
				<text class="card-title">功能说明</text>
				<view class="tips">
					<text>· 开启后设备在空闲时自动进入低功耗模式</text>
					<text>· 休眠状态响应速度会降低</text>
					<text>· 关闭可保持随时响应，但增加能耗</text>
					<text>· 建议需要频繁控制时关闭</text>
					<text>· 退出深度休眠需断电重启</text>
				</view>
			</view>

			<view class="btn btn-primary" @click="saveSettings" :class="{ off: !deviceConnected || saving }">
				<text>{{ saving ? '保存中...' : '保存设置' }}</text>
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
import apiService from '../../services/api';
import Loading from '../../components/Loading';
import CustomModal from '../../components/CustomModal';
import deviceMixin from '../../mixins/device-mixin';
import modalMixin from '../../mixins/modal-mixin';

export default {
	components: { Loading, CustomModal },
		mixins: [deviceMixin, modalMixin],
	data() {
		return {
			sleepEnabled: false, saving: false,
		};
	},
	onLoad() {
		this.checkDevice();
		this.getSleepStatus();
	},
		methods: {
			toggleSleep() { this.sleepEnabled = !this.sleepEnabled; },
		async getSleepStatus() {
			if (!this.deviceConnected) return;
			try {
				this.showLoading('获取中...');
				const res = await apiService.getSleepEnabled();
				if (res.status === 'success') this.sleepEnabled = !!res.data.sleep_enabled;
			} catch (e) { /* 静默 */ }
			finally { this.hideLoading(); }
		},
		async saveSettings() {
			if (!this.deviceConnected) { this.showToast('提示', '请先连接设备'); return; }
			if (this.saving) return;
			try {
				this.saving = true;
				this.showLoading('保存中...');
				const res = await apiService.setSleepEnabled(this.sleepEnabled);
				if (res.status === 'success') {
					this.showToast('成功', '保存成功');
					await this.getSleepStatus();
				}
				else { this.showToast('失败', (res.data && res.data.message) || '保存失败'); }
			} catch (e) { this.showToast('失败', e.message || '保存失败'); }
			finally { this.saving = false; this.hideLoading(); }
		}
	}
};
</script>

<style scoped>
.page { min-height: 100vh; background: #F5F5F5; }
.body { padding: 32rpx; }
.desc { font-size: 26rpx; color: #999; margin-bottom: 24rpx; }

.card { background: #FFF; border-radius: 24rpx; padding: 32rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.card-title { font-size: 30rpx; font-weight: 600; color: #1A1A1A; margin-bottom: 16rpx; display: block; }

.switch-row { display: flex; justify-content: space-between; align-items: center; }
.switch-info { display: flex; align-items: center; gap: 16rpx; flex: 1; }
.switch-icon { width: 48rpx; height: 48rpx; }
.switch-text { display: flex; flex-direction: column; }
.switch-title { font-size: 30rpx; font-weight: 600; color: #1A1A1A; }
.switch-sub { font-size: 24rpx; color: #999; margin-top: 6rpx; }

.tips { display: flex; flex-direction: column; gap: 12rpx; }
.tips text { font-size: 24rpx; color: #666; line-height: 1.6; }

.btn { padding: 28rpx 32rpx; border-radius: 24rpx; text-align: center; margin-bottom: 32rpx; transition: 150ms; }
.btn:active { transform: scale(0.98); }
.btn-primary { background: #1677FF; }
.btn-primary text { color: #FFF; font-size: 30rpx; font-weight: 500; }
.btn.off { opacity: 0.5; }
</style>
