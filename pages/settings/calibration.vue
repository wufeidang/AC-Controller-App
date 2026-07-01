<template>
	<view class="page">
		<view class="body">
			<!-- 温度校准 -->
			<view class="card">
				<text class="card-title">温度校准</text>
				<SliderControl
					label="偏移值"
					:min="-5.0" :max="5.0" :step="0.1"
					activeColor="#1677FF"
					unit="°C"
					:value-decimals="1"
					:value="tempOffset"
					:range-min-label="'-5.0'"
					:range-max-label="'+5.0'"
					:quick-buttons="[
						{ label: '-1.0', delta: -1.0 },
						{ label: '-0.5', delta: -0.5 },
						{ label: '重置', reset: true, resetVal: 0 },
						{ label: '+0.5', delta: 0.5 },
						{ label: '+1.0', delta: 1.0 }
					]"
					@changing="(v) => tempOffset = v"
				/>
				<text class="hint">正值表示增加显示温度，用于校准传感器读数</text>
			</view>

			<!-- 湿度校准 -->
			<view class="card">
				<text class="card-title">湿度校准</text>
				<SliderControl
					label="偏移值"
					:min="-10" :max="10" :step="1"
					activeColor="#13C2C2"
					unit="%"
					:value="humOffset"
					:range-min-label="'-10'"
					:range-max-label="'+10'"
					:quick-buttons="[
						{ label: '-5', delta: -5 },
						{ label: '-1', delta: -1 },
						{ label: '重置', reset: true, resetVal: 0 },
						{ label: '+1', delta: 1 },
						{ label: '+5', delta: 5 }
					]"
					@changing="(v) => humOffset = v"
				/>
				<text class="hint">正值表示增加显示湿度，用于校准传感器读数</text>
			</view>

			<!-- 使用说明 -->
			<view class="card">
				<text class="card-title">校准说明</text>
				<view class="tips">
					<text>· 准备标准温度计和湿度计，确保已校准且精度可靠</text>
					<text>· 将标准设备与本设备放在同一环境，等待 30 分钟稳定</text>
					<text>· 偏移值 = 标准设备读数 - 本设备读数</text>
					<text>· 校准后等待 10-15 分钟再验证</text>
					<text>· 建议每月校准一次</text>
				</view>
			</view>

			<view class="btn btn-primary" @click="saveCalibration" :class="{ off: !deviceConnected || saving }" role="button" aria-label="保存校准">
				<text>{{ saving ? '保存中...' : '保存校准' }}</text>
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
import SliderControl from '../../components/SliderControl';
import apiService from '../../services/api';
import deviceMixin from '../../mixins/device-mixin.js';
import modalMixin from '../../mixins/modal-mixin';

export default {
	components: { Loading, CustomModal, SliderControl },
		mixins: [deviceMixin, modalMixin],
	data() {
		return {
			tempOffset: 0.0, humOffset: 0.0,
				saving: false,
		};
	},
	onLoad() { this.checkDevice(); this.getSettings(); },
		methods: {
			async getSettings() {
			if (!this.deviceConnected) return;
			try {
				this.showLoading('获取中...');
				const res = await apiService.getStatus();
				if (res.status === 'success' && res.data.calibration) {
					this.tempOffset = res.data.calibration.temp_offset || 0;
					this.humOffset = res.data.calibration.hum_offset || 0;
				}
			} catch (e) { /* 静默 */ }
			finally { this.hideLoading(); }
		},
		async saveCalibration() {
			if (!this.deviceConnected) { this.showToast('提示', '请先连接设备'); return; }
			if (this.saving) return;
			try {
				this.saving = true;
				this.showLoading('保存中...');
				const res = await apiService.setCalibration({ temp_offset: this.tempOffset, hum_offset: this.humOffset });
				if (res.status === 'success') { this.showToast('成功', '保存成功'); }
				else { this.showToast('失败', (res.data && res.data.message) || '保存失败'); }
			} catch (e) {
				this.showToast('失败', e.message || '保存失败');
			} finally {
				this.saving = false;
				this.hideLoading();
			}
		}
	}
};
</script>

<style lang="scss">
/* .page / .body / .card / .card-title / .btn 均已全局化（App.vue） */

.hint {
	font-size: $fs-caption; color: $text-hint;
	line-height: 1.5; display: block;
	margin-top: 12rpx;
}
.tips { display: flex; flex-direction: column; gap: 12rpx; }
.tips text { font-size: $fs-label; color: $text-secondary; line-height: 1.6; }
</style>
