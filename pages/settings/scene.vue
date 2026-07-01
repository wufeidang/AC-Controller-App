<template>
	<view class="page">
		<view class="body">
			<view class="desc">选择适合您的空调运行模式</view>

			<view class="notice">
				<image src="/static/icons/info.svg" class="notice-icon" mode="aspectFit" />
				<text class="notice-text">以下为设备内置场景，参数由固件预设，仅可选用、不可自定义编辑</text>
			</view>

			<view class="scene-list">
				<view
					v-for="scene in scenes"
					:key="scene.value"
					class="scene-card"
					:class="{ active: currentScene === scene.value }"
					@click="selectScene(scene.value)"
				>
					<view class="scene-top">
						<image :src="'/static/icons/' + scene.icon + '.svg'" class="scene-icon" mode="aspectFit" />
						<view class="scene-info">
							<text class="scene-name">{{ scene.label }}</text>
							<text class="scene-desc">{{ scene.description }}</text>
						</view>
						<view class="scene-check" v-if="currentScene === scene.value">
							<view class="check-mark">✓</view>
						</view>
					</view>
					<view class="scene-params" v-if="currentScene === scene.value">
						<view class="param"><image src="/static/icons/temperature.svg" class="param-icon" mode="aspectFit" /><text>{{ scene.temp }}°C</text></view>
						<view class="param"><image src="/static/icons/fan.svg" class="param-icon" mode="aspectFit" /><text>{{ scene.fanSpeed }}</text></view>
						<view class="param"><image src="/static/icons/wind.svg" class="param-icon" mode="aspectFit" /><text>{{ scene.swing }}</text></view>
					</view>
				</view>
			</view>

			<view class="btn btn-primary" @click="saveScene" :class="{ off: !currentScene || !deviceConnected || saving }">
				<text>{{ saving ? '保存中...' : '保存设置' }}</text>
			</view>
		</view>

		<Loading :visible="loadingVisible" :text="loadingText" />
		<CustomModal :visible="modalVisible" :title="modalTitle" :content="modalContent" :close-on-click-overlay="false"
			:type="modalType" :show-buttons="false" />
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
			currentScene: '',
				saving: false,
			scenes: [
				{ value: 'sleep', label: '睡眠', icon: 'moon', description: '低风速，静音运行', temp: '26', fanSpeed: '低速', swing: '固定' },
				{ value: 'energy_saving', label: '节能', icon: 'lightning', description: '降低功耗，环保省电', temp: '28', fanSpeed: '自动', swing: '自动' },
				{ value: 'comfort', label: '舒适', icon: 'smile', description: '适宜温度，体感最佳', temp: '24', fanSpeed: '中速', swing: '自动' },
				{ value: 'quick', label: '快速', icon: 'light', description: '强力制冷/制热', temp: '20', fanSpeed: '高速', swing: '自动' }
			]
		};
	},
	onLoad() {
		this.checkDevice();
		this.getCurrentScene();
	},
		methods: {
			selectScene(scene) { this.currentScene = scene; },
		async getCurrentScene() {
			if (!this.deviceConnected) return;
			try {
				this.showLoading('获取中...');
				const res = await apiService.getScene();
				if (res.status === 'success') {
					const d = res.data;
					this.scenes.forEach(s => {
						if (d[s.value]) {
							s.temp = String(d[s.value].temperature || s.temp);
							s.fanSpeed = d[s.value].fan_speed === 'low' ? '低速' : d[s.value].fan_speed === 'medium' ? '中速' : d[s.value].fan_speed === 'high' ? '高速' : d[s.value].fan_speed === 'quiet' ? '静音' : '自动';
							s.swing = d[s.value].swing === 'auto' ? '自动' : '固定';
						}
					});
				}
			} catch (e) { /* 静默 */ }
			finally { this.hideLoading(); }
		},
		async saveScene() {
			if (!this.currentScene) { this.showToast('提示', '请选择场景模式'); return; }
			if (!this.deviceConnected) { this.showToast('提示', '请先连接设备'); return; }
			if (this.saving) return;
			try {
				this.saving = true;
				this.showLoading('保存中...');
				const res = await apiService.setScene(this.currentScene);
				if (res.status === 'success') {
					this.showToast('成功', '场景已切换');
					await this.getCurrentScene();
				}
				else { this.showToast('失败', (res.data && res.data.message) || '保存失败'); }
			} catch (e) { this.showToast('失败', e.message || '保存失败'); }
			finally { this.saving = false; this.hideLoading(); }
		}
	}
};
</script>

	<style lang="scss">
	/* .page / .body / .card / .card-title / .btn 均已全局化（App.vue） */

	.desc {
		font-size: 26rpx; color: $text-hint;
		margin-bottom: 24rpx;
	}

	.notice {
		display: flex; align-items: flex-start; gap: 10rpx;
		padding: 20rpx 24rpx; background: $brand-primary-bg;
		border-radius: $radius-lg; margin-bottom: 24rpx;
	}
	.notice-icon { width: 28rpx; height: 28rpx; flex-shrink: 0; }
	.notice-text { font-size: $fs-label; color: $brand-primary-hover; line-height: 1.5; }

	.scene-list {
		display: flex; flex-direction: column; gap: 16rpx;
		margin-bottom: 32rpx;
	}
	.scene-card {
		background: $bg-card; border-radius: $radius-xl;
		padding: 28rpx 32rpx;
		border: 2rpx solid transparent;
		transition: 150ms; box-shadow: $shadow-sm;
	}
	.scene-card:active { transform: scale(0.98); }
	.scene-card.active { border-color: $brand-primary; }
	.scene-top { display: flex; align-items: center; gap: 16rpx; }
	.scene-icon { width: 48rpx; height: 48rpx; }
	.scene-info { flex: 1; }
	.scene-name { font-size: $fs-title; font-weight: 600; color: $text-primary; display: block; }
	.scene-desc { font-size: $fs-label; color: $text-hint; margin-top: 4rpx; display: block; }
	.scene-check {
		width: 44rpx; height: 44rpx; border-radius: 50%;
		background: $brand-primary;
		display: flex; align-items: center; justify-content: center;
	}
	.check-mark { color: $bg-card; font-size: $fs-label; font-weight: 700; }
	.scene-params {
		display: flex; gap: 24rpx;
		margin-top: 20rpx; padding-top: 20rpx;
		border-top: 1rpx solid $bg-subtle;
	}
	.param { display: flex; align-items: center; gap: 6rpx; }
	.param-icon { width: 24rpx; height: 24rpx; }
	.param text { font-size: $fs-label; color: $text-secondary; }
	</style>
