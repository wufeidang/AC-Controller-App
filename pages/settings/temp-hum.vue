<template>
	<view class="page">
		<view class="body">
			<!-- 控制类型 -->
			<view class="card">
				<text class="card-title">控制类型</text>
				<view class="seg-row">
					<view class="seg-item" :class="{ active: controlType === 'temperature' }" @click="controlType = 'temperature'" role="radio" :aria-checked="controlType === 'temperature'">
						<image src="/static/icons/temperature.svg" class="seg-icon" mode="aspectFit" />
						<text class="seg-label">温度控制</text>
					</view>
					<view class="seg-item" :class="{ active: controlType === 'humidity' }" @click="controlType = 'humidity'" role="radio" :aria-checked="controlType === 'humidity'">
						<image src="/static/icons/humidity.svg" class="seg-icon" mode="aspectFit" />
						<text class="seg-label">湿度控制</text>
					</view>
				</view>
			</view>

			<!-- 温度阈值 -->
			<view class="card" v-if="controlType === 'temperature'">
				<text class="card-title">温度阈值</text>
				<SliderControl
					label="开机温度"
					:min="20" :max="50" :step="1"
					activeColor="#FF4D4F"
					unit="°C"
					:value="tempOnThreshold"
					range-min-label="20°C"
					range-max-label="50°C"
					:quick-buttons="quickConfig.tempOn"
					@changing="(v) => tempOnThreshold = v"
				/>
				<SliderControl
					label="关机温度"
					:min="18" :max="35" :step="1"
					activeColor="#1677FF"
					unit="°C"
					:value="tempOffThreshold"
					range-min-label="18°C"
					range-max-label="35°C"
					:quick-buttons="quickConfig.tempOff"
					@changing="(v) => tempOffThreshold = v"
				/>
			</view>

			<!-- 湿度阈值 -->
				<view class="card" v-if="controlType === 'humidity'">
					<text class="card-title">湿度阈值</text>
					<SliderControl
						label="开机湿度"
						:min="40" :max="80" :step="1"
						activeColor="#FF4D4F"
						unit="%"
						:value="humOnThreshold"
						range-min-label="40%"
						range-max-label="80%"
						:quick-buttons="quickConfig.humOn"
						@changing="(v) => humOnThreshold = v"
					/>
					<SliderControl
						label="关机湿度"
						:min="40" :max="80" :step="1"
						activeColor="#1677FF"
						unit="%"
						:value="humOffThreshold"
						range-min-label="40%"
						range-max-label="80%"
						:quick-buttons="quickConfig.humOff"
						@changing="(v) => humOffThreshold = v"
					/>
				</view>

			<!-- 规则说明 -->
			<view class="card rule-card">
				<image src="/static/icons/lightbulb.svg" class="rule-icon" mode="aspectFit" />
				<text class="rule-text" v-if="controlType === 'temperature'">温度升至 {{ tempOnThreshold }}°C 时自动开启空调，降至 {{ tempOffThreshold }}°C 时自动关闭</text>
				<text class="rule-text" v-else>湿度升至 {{ humOnThreshold }}% 时自动开启空调，降至 {{ humOffThreshold }}% 时自动关闭</text>
			</view>

			<!-- 检查间隔 -->
			<view class="card">
				<text class="card-title">检查间隔</text>
				<SliderControl
					label="间隔时间"
					:min="5" :max="180" :step="5"
					activeColor="#00B96B"
					unit=" 分钟"
					:value="checkInterval"
					range-min-label="5分钟"
					range-max-label="180分钟"
					:quick-buttons="quickConfig.check"
					@changing="(v) => checkInterval = v"
				/>
			</view>

			<!-- 保存 -->
			<view class="btn btn-primary" @click="saveSettings" :class="{ off: !deviceConnected || saving }" role="button" aria-label="保存设置">
				<text>{{ saving ? '保存中...' : '保存设置' }}</text>
			</view>
		</view>

		<Loading :visible="loadingVisible" :text="loadingText" />
			<CustomModal :visible="modalVisible" :title="modalTitle" :content="modalContent" :close-on-click-overlay="false" :type="modalType" :show-buttons="false" />
	</view>
</template>

<script>
import Loading from '../../components/Loading';
import CustomModal from '../../components/CustomModal';
import SliderControl from '../../components/SliderControl';
import apiService from '../../services/api';
import constants from '../../config/constants';
import deviceMixin from '../../mixins/device-mixin';
import modalMixin from '../../mixins/modal-mixin';

/**
 * 各 slider 的快捷按钮配置
 * - reset=true：不触发长按
 * - 其他按钮由 SliderControl 统一处理长按连续触发
 */
const QUICK_BTNS = {
	tempOn: [
		{ label: '-5', delta: -5 }, { label: '-1', delta: -1 },
		{ label: '重置', reset: true },
		{ label: '+1', delta: 1 }, { label: '+5', delta: 5 }
	],
	tempOff: [
		{ label: '-3', delta: -3 }, { label: '-1', delta: -1 },
		{ label: '重置', reset: true },
		{ label: '+1', delta: 1 }, { label: '+3', delta: 3 }
	],
	humOn: [
		{ label: '-10', delta: -10 }, { label: '-5', delta: -5 },
		{ label: '重置', reset: true },
		{ label: '+5', delta: 5 }, { label: '+10', delta: 10 }
	],
	humOff: [
		{ label: '-10', delta: -10 }, { label: '-1', delta: -1 },
		{ label: '重置', reset: true },
		{ label: '+1', delta: 1 }, { label: '+10', delta: 10 }
	],
	check: [
		{ label: '-30', delta: -30 }, { label: '-10', delta: -10 },
		{ label: '重置', reset: true },
		{ label: '+10', delta: 10 }, { label: '+30', delta: 30 }
	]
};

export default {
	components: { Loading, CustomModal, SliderControl },
		mixins: [deviceMixin, modalMixin],
	data() {
		return {
			controlType: 'temperature',
			tempOnThreshold: 28, tempOffThreshold: 26,
			humOnThreshold: 70, humOffThreshold: 60,
			checkInterval: 5,
			saving: false,
			quickConfig: QUICK_BTNS
		};
	},
	onLoad() { this.checkDevice(); this.getSettings(); },
	methods: {
		async getSettings() {
			if (!this.deviceConnected) return;
			try {
				this.showLoading('获取设置...');
				const res = await apiService.getTempHumThreshold();
				if (res.status === 'success') {
					const d = res.data;
					this.controlType = d.control_type || 'temperature';
					this.tempOnThreshold = d.temp_on_threshold ?? 28;
					this.tempOffThreshold = d.temp_off_threshold ?? 26;
					this.humOnThreshold = d.hum_on_threshold ?? 70;
					this.humOffThreshold = d.hum_off_threshold ?? 60;
					this.checkInterval = d.check_interval ?? 5;
				}
			} catch (e) { this.showToast('提示', '获取设置失败', 'warning'); console.warn('[temp-hum] getSettings:', e.message); }
			finally { this.hideLoading(); }
		},
		async saveSettings() {
			if (!this.deviceConnected) { this.showToast('提示', '请先连接设备', 'warning'); return; }
			if (this.saving) return;
			if (this.controlType === 'temperature' && this.tempOnThreshold <= this.tempOffThreshold) { this.showToast('提示', '开机温度应高于关机温度', 'warning'); return; }
			if (this.controlType === 'humidity' && this.humOnThreshold <= this.humOffThreshold) { this.showToast('提示', '开机湿度应高于关机湿度', 'warning'); return; }
			try {
				this.saving = true;
				this.showLoading('保存中...');
				const res = await apiService.setTempHum({
					controlType: this.controlType, tempOnThreshold: this.tempOnThreshold,
					tempOffThreshold: this.tempOffThreshold, humOnThreshold: this.humOnThreshold,
					humOffThreshold: this.humOffThreshold, checkInterval: this.checkInterval
				});
				if (res.status === 'success') {
					this.showToast('成功', '保存成功', 'success');
					uni.$emit(constants.EVENTS.SETTINGS_CHANGED, { type: 'temp_hum' });
				} else { this.showToast('失败', (res.data && res.data.message) || '保存失败', 'error'); }
			} catch (e) {
				this.showToast('失败', e.message || '保存失败', 'error');
			} finally {
				this.saving = false;
				this.hideLoading();
			}
		}
	}
};
</script>

<style lang="scss">
/* .page / .body / .card / .card-title / .seg-row / .seg-item / .btn 均已全局化（App.vue） */

/* 控制类型 seg 中带图标的版本 */
.seg-row .seg-item {
	flex: 1; padding: 24rpx;
	display: flex; flex-direction: column; align-items: center; gap: 12rpx;
}
.seg-icon { width: 40rpx; height: 40rpx; opacity: 0.4; }
.seg-item.active .seg-icon { opacity: 1; }

/* 规则说明卡 */
.rule-card {
	display: flex; align-items: flex-start; gap: 16rpx;
	padding: 24rpx 32rpx; background: #FFFBE6;
	border: 1rpx solid #FFE58F; border-radius: $radius-lg;
	box-shadow: none;
}
.rule-icon { width: 36rpx; height: 36rpx; flex-shrink: 0; }
.rule-text {
	font-size: $fs-label; color: $color-warning-text;
	line-height: 1.6; flex: 1;
}
</style>
