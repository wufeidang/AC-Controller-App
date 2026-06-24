<template>
	<view class="page">
		<view class="body">
			<!-- 温度校准 -->
			<view class="card">
				<text class="card-title">温度校准</text>
				<view class="val-row">
					<text class="val-label">偏移值</text>
					<text class="val-num" :class="{ plus: tempOffset > 0, minus: tempOffset < 0 }">{{ tempOffset > 0 ? '+' : '' }}{{ tempOffset.toFixed(1) }}°C</text>
				</view>
				<slider :value="tempOffset" @changing="onTempChanging" :min="-5.0" :max="5.0" :step="0.1"
					activeColor="#1677FF" backgroundColor="#F0F0F0" block-size="22" />
				<view class="range"><text>-5.0</text><text>+5.0</text></view>
				<view class="quick">
					<view class="q-btn" @click="adjustTemp(-1.0)"><text>-1.0</text></view>
					<view class="q-btn" @click="adjustTemp(-0.5)"><text>-0.5</text></view>
					<view class="q-btn reset" @click="resetTemp"><text>重置</text></view>
					<view class="q-btn" @click="adjustTemp(0.5)"><text>+0.5</text></view>
					<view class="q-btn" @click="adjustTemp(1.0)"><text>+1.0</text></view>
				</view>
				<text class="hint">正值表示增加显示温度，用于校准传感器读数</text>
			</view>

			<!-- 湿度校准 -->
			<view class="card">
				<text class="card-title">湿度校准</text>
				<view class="val-row">
					<text class="val-label">偏移值</text>
					<text class="val-num" :class="{ plus: humOffset > 0, minus: humOffset < 0 }">{{ humOffset > 0 ? '+' : '' }}{{ humOffset.toFixed(0) }}%</text>
				</view>
				<slider :value="humOffset" @changing="onHumChanging" :min="-10" :max="10" :step="1"
					activeColor="#13C2C2" backgroundColor="#F0F0F0" block-size="22" />
				<view class="range"><text>-10</text><text>+10</text></view>
				<view class="quick">
					<view class="q-btn" @click="adjustHum(-5)"><text>-5</text></view>
					<view class="q-btn" @click="adjustHum(-1)"><text>-1</text></view>
					<view class="q-btn reset" @click="resetHum"><text>重置</text></view>
					<view class="q-btn" @click="adjustHum(1)"><text>+1</text></view>
					<view class="q-btn" @click="adjustHum(5)"><text>+5</text></view>
				</view>
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

			<view class="btn btn-primary" @click="saveCalibration" :class="{ off: !deviceConnected || saving }">
				<text>{{ saving ? '保存中...' : '保存校准' }}</text>
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

export default {
	components: { Loading, CustomModal },
	data() {
		return {
			tempOffset: 0.0, humOffset: 0.0, deviceConnected: false,
			loadingVisible: false, loadingText: '', saving: false,
			modalVisible: false, modalTitle: '', modalContent: ''
		};
	},
	onLoad() { this.checkDevice(); this.getSettings(); },
	methods: {
		showModal(title, content) {
			this.modalTitle = title; this.modalContent = content; this.modalVisible = true;
			setTimeout(() => { this.modalVisible = false; }, 1500);
		},
		checkDevice() {
			const d = uni.getStorageSync('connectedDevice');
			this.deviceConnected = d && d.connected;
			if (d) apiService.setDeviceAddress(d.address);
		},
		async getSettings() {
			if (!this.deviceConnected) return;
			try {
				this.loadingVisible = true; this.loadingText = '获取中...';
				const res = await apiService.getStatus();
				if (res.status === 'success' && res.data.calibration) {
					this.tempOffset = res.data.calibration.temp_offset || 0;
					this.humOffset = res.data.calibration.hum_offset || 0;
				}
			} catch (e) { console.error(e); }
			finally { this.loadingVisible = false; }
		},
		onTempChanging(e) { this.tempOffset = parseFloat(e.detail.value); },
		onHumChanging(e) { this.humOffset = parseInt(e.detail.value); },
		adjustTemp(d) { this.tempOffset = Math.max(-5, Math.min(5, +(this.tempOffset + d).toFixed(1))); },
		adjustHum(d) { this.humOffset = Math.max(-10, Math.min(10, this.humOffset + d)); },
		resetTemp() { this.tempOffset = 0; },
		resetHum() { this.humOffset = 0; },
		async saveCalibration() {
			if (!this.deviceConnected) { this.showModal('提示', '请先连接设备'); return; }
			if (this.saving) return;
			try {
				this.saving = true; this.loadingVisible = true; this.loadingText = '保存中...';
				const res = await apiService.setCalibration({ temp_offset: this.tempOffset, hum_offset: this.humOffset });
				if (res.status === 'success') { this.showModal('成功', '保存成功'); }
				else { this.showModal('失败', (res.data && res.data.message) || '保存失败'); }
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

.val-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.val-label { font-size: 26rpx; color: #666; }
.val-num { font-size: 32rpx; font-weight: 700; color: #333; }
.val-num.plus { color: #FF4D4F; }
.val-num.minus { color: #1677FF; }

.range { display: flex; justify-content: space-between; margin-bottom: 20rpx; }
.range text { font-size: 20rpx; color: #C0C0C0; }

.quick { display: flex; gap: 16rpx; margin-bottom: 16rpx; }
.q-btn { flex: 1; padding: 14rpx 8rpx; border-radius: 12rpx; background: #F5F5F5; text-align: center; transition: 150ms; }
.q-btn:active { transform: scale(0.96); background: #F0F0F0; }
.q-btn text { font-size: 24rpx; color: #333; font-weight: 500; }
.q-btn.reset text { color: #999; }

.hint { font-size: 22rpx; color: #999; line-height: 1.5; display: block; }

.tips { display: flex; flex-direction: column; gap: 12rpx; }
.tips text { font-size: 24rpx; color: #666; line-height: 1.6; }

.btn { padding: 28rpx 32rpx; border-radius: 24rpx; text-align: center; margin-bottom: 32rpx; transition: 150ms; }
.btn:active { transform: scale(0.98); }
.btn-primary { background: #1677FF; }
.btn-primary text { color: #FFF; font-size: 30rpx; font-weight: 500; }
.btn.off { opacity: 0.5; }
</style>
