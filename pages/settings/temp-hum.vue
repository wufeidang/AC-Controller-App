<template>
	<view class="page">
		<view class="body">
			<!-- 控制类型 -->
			<view class="card">
				<text class="card-title">控制类型</text>
				<view class="seg-row">
					<view class="seg-item" :class="{ active: controlType === 'temperature' }" @click="controlType = 'temperature'">
						<image src="/static/icons/temperature.svg" class="seg-icon" mode="aspectFit" />
						<text class="seg-label">温度控制</text>
					</view>
					<view class="seg-item" :class="{ active: controlType === 'humidity' }" @click="controlType = 'humidity'">
						<image src="/static/icons/humidity.svg" class="seg-icon" mode="aspectFit" />
						<text class="seg-label">湿度控制</text>
					</view>
				</view>
			</view>

			<!-- 温度阈值 -->
			<view class="card" v-if="controlType === 'temperature'">
				<text class="card-title">温度阈值</text>
				<view class="slider-item">
					<view class="slider-head"><text class="slider-label">开机温度</text><text class="slider-val">{{ tempOnThreshold }}°C</text></view>
					<slider :value="tempOnThreshold" @changing="onTempOnChanging" @change="onTempOnChanging" :min="20" :max="50" :step="1" activeColor="#FF4D4F" backgroundColor="#F0F0F0" block-size="22" />
					<view class="range"><text>20°C</text><text>50°C</text></view>
						<view class="quick">
							<view class="q-btn" @click="adjust('tempOn', -5)"><text>-5</text></view>
							<view class="q-btn" @click="adjust('tempOn', -1)" @touchstart="startHold(() => adjust('tempOn', -1))" @touchend="stopHold" @touchcancel="stopHold"><text>-1</text></view>
							<view class="q-btn reset" @click="reset('tempOn', 28)"><text>重置</text></view>
							<view class="q-btn" @click="adjust('tempOn', 1)" @touchstart="startHold(() => adjust('tempOn', 1))" @touchend="stopHold" @touchcancel="stopHold"><text>+1</text></view>
							<view class="q-btn" @click="adjust('tempOn', 5)"><text>+5</text></view>
						</view>
				</view>
				<view class="slider-item">
					<view class="slider-head"><text class="slider-label">关机温度</text><text class="slider-val">{{ tempOffThreshold }}°C</text></view>
					<slider :value="tempOffThreshold" @changing="onTempOffChanging" @change="onTempOffChanging" :min="18" :max="35" :step="1" activeColor="#1677FF" backgroundColor="#F0F0F0" block-size="22" />
					<view class="range"><text>18°C</text><text>35°C</text></view>
						<view class="quick">
							<view class="q-btn" @click="adjust('tempOff', -3)"><text>-3</text></view>
							<view class="q-btn" @click="adjust('tempOff', -1)" @touchstart="startHold(() => adjust('tempOff', -1))" @touchend="stopHold" @touchcancel="stopHold"><text>-1</text></view>
							<view class="q-btn reset" @click="reset('tempOff', 26)"><text>重置</text></view>
							<view class="q-btn" @click="adjust('tempOff', 1)" @touchstart="startHold(() => adjust('tempOff', 1))" @touchend="stopHold" @touchcancel="stopHold"><text>+1</text></view>
							<view class="q-btn" @click="adjust('tempOff', 3)"><text>+3</text></view>
						</view>
				</view>
			</view>

			<!-- 湿度阈值 -->
				<view class="card" v-if="controlType === 'humidity'">
					<text class="card-title">湿度阈值</text>
					<view class="slider-item">
						<view class="slider-head"><text class="slider-label">开机湿度</text><text class="slider-val">{{ humOnThreshold }}%</text></view>
						<slider :value="humOnThreshold" @changing="onHumOnChanging" @change="onHumOnChanging" :min="40" :max="80" :step="1" activeColor="#FF4D4F" backgroundColor="#F0F0F0" block-size="22" />
						<view class="range"><text>40%</text><text>80%</text></view>
						<view class="quick">
							<view class="q-btn" @click="adjust('humOn', -10)"><text>-10</text></view>
							<view class="q-btn" @click="adjust('humOn', -5)" @touchstart="startHold(() => adjust('humOn', -5))" @touchend="stopHold" @touchcancel="stopHold"><text>-5</text></view>
							<view class="q-btn reset" @click="reset('humOn', 70)"><text>重置</text></view>
							<view class="q-btn" @click="adjust('humOn', 5)" @touchstart="startHold(() => adjust('humOn', 5))" @touchend="stopHold" @touchcancel="stopHold"><text>+5</text></view>
							<view class="q-btn" @click="adjust('humOn', 10)"><text>+10</text></view>
						</view>
					</view>
					<view class="slider-item">
						<view class="slider-head"><text class="slider-label">关机湿度</text><text class="slider-val">{{ humOffThreshold }}%</text></view>
						<slider :value="humOffThreshold" @changing="onHumOffChanging" @change="onHumOffChanging" :min="40" :max="80" :step="1" activeColor="#1677FF" backgroundColor="#F0F0F0" block-size="22" />
						<view class="range"><text>40%</text><text>80%</text></view>
						<view class="quick">
							<view class="q-btn" @click="adjust('humOff', -10)"><text>-10</text></view>
							<view class="q-btn" @click="adjust('humOff', -5)" @touchstart="startHold(() => adjust('humOff', -5))" @touchend="stopHold" @touchcancel="stopHold"><text>-5</text></view>
							<view class="q-btn reset" @click="reset('humOff', 60)"><text>重置</text></view>
							<view class="q-btn" @click="adjust('humOff', 5)" @touchstart="startHold(() => adjust('humOff', 5))" @touchend="stopHold" @touchcancel="stopHold"><text>+5</text></view>
							<view class="q-btn" @click="adjust('humOff', 10)"><text>+10</text></view>
						</view>
					</view>
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
				<view class="slider-item">
					<view class="slider-head"><text class="slider-label">间隔时间</text><text class="slider-val">{{ checkInterval }} 分钟</text></view>
					<slider :value="checkInterval" @changing="onCheckIntervalChanging" @change="onCheckIntervalChanging" :min="5" :max="180" :step="5" activeColor="#00B96B" backgroundColor="#F0F0F0" block-size="22" />
					<view class="range"><text>5分钟</text><text>180分钟</text></view>
						<view class="quick">
							<view class="q-btn" @click="adjust('check', -30)"><text>-30</text></view>
							<view class="q-btn" @click="adjust('check', -10)" @touchstart="startHold(() => adjust('check', -10))" @touchend="stopHold" @touchcancel="stopHold"><text>-10</text></view>
							<view class="q-btn reset" @click="reset('check', 5)"><text>重置</text></view>
							<view class="q-btn" @click="adjust('check', 10)" @touchstart="startHold(() => adjust('check', 10))" @touchend="stopHold" @touchcancel="stopHold"><text>+10</text></view>
							<view class="q-btn" @click="adjust('check', 30)"><text>+30</text></view>
						</view>
				</view>
			</view>

			<!-- 保存 -->
			<view class="btn btn-primary" @click="saveSettings" :class="{ off: !deviceConnected || saving }">
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
import apiService from '../../services/api';
import deviceMixin from '../../mixins/device-mixin';
import modalMixin from '../../mixins/modal-mixin';

// 各 slider 的范围配置
const RANGES = {
	tempOn:  { min: 20, max: 50, def: 28 },
	tempOff: { min: 18, max: 35, def: 26 },
	humOn:   { min: 40, max: 80, def: 70 },
	humOff:  { min: 40, max: 80, def: 60 },
	check:   { min: 5,  max: 180, def: 5 }
};

export default {
	components: { Loading, CustomModal },
		mixins: [deviceMixin, modalMixin],
	data() {
		return {
			controlType: 'temperature',
			tempOnThreshold: 28, tempOffThreshold: 26,
			humOnThreshold: 70, humOffThreshold: 60,
			checkInterval: 5,
			saving: false,
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
			} catch (e) { /* 静默 */ }
			finally { this.hideLoading(); }
		},
		// slider 拖拽
		onTempOnChanging(e)  { this.tempOnThreshold = parseInt(e.detail.value); },
		onTempOffChanging(e) { this.tempOffThreshold = parseInt(e.detail.value); },
		onHumOnChanging(e)   { this.humOnThreshold = parseInt(e.detail.value); },
		onHumOffChanging(e)  { this.humOffThreshold = parseInt(e.detail.value); },
		onCheckIntervalChanging(e) { this.checkInterval = parseInt(e.detail.value); },
			// 快速调整按钮
			adjust(field, delta) {
				const r = RANGES[field];
				if (!r) { this.stopHold(); return; }
				const key = field === 'tempOn' ? 'tempOnThreshold' : field === 'tempOff' ? 'tempOffThreshold' : field === 'humOn' ? 'humOnThreshold' : field === 'humOff' ? 'humOffThreshold' : 'checkInterval';
				let v = this[key] + delta;
				v = Math.max(r.min, Math.min(r.max, v));
				if (v === this[key]) { this.stopHold(); return; } // 到达边界，停止长按
				this[key] = v;
			},
		reset(field, defVal) {
			const key = field === 'tempOn' ? 'tempOnThreshold' : field === 'tempOff' ? 'tempOffThreshold' : field === 'humOn' ? 'humOnThreshold' : field === 'humOff' ? 'humOffThreshold' : 'checkInterval';
			this[key] = defVal;
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
					uni.setStorageSync('tempHumSettings', {
						controlType: this.controlType, tempOnThreshold: this.tempOnThreshold,
						tempOffThreshold: this.tempOffThreshold, humOnThreshold: this.humOnThreshold,
						humOffThreshold: this.humOffThreshold, checkInterval: this.checkInterval
					});
					this.showToast('成功', '保存成功', 'success');
				} else { this.showToast('失败', (res.data && res.data.message) || '保存失败', 'error'); }
			} catch (e) { this.showToast('失败', e.message || '保存失败', 'error'); }
			finally { this.saving = false; this.hideLoading(); }
		}
	}
};
</script>

<style scoped lang="scss">
.page { min-height: 100vh; background: $bg-page; }
.body { padding: 32rpx; }

.card { background: $bg-card; border-radius: $radius-xl; padding: 32rpx; margin-bottom: 24rpx; box-shadow: $shadow-sm; }
.card-title { font-size: $fs-title; font-weight: 600; color: $text-primary; margin-bottom: 24rpx; display: block; }

.seg-row { display: flex; gap: 16rpx; }
.seg-item { flex: 1; padding: 24rpx; border: 2rpx solid $bg-subtle; border-radius: $radius-lg; display: flex; flex-direction: column; align-items: center; gap: 12rpx; transition: 150ms; }
.seg-item:active { transform: scale(0.97); }
.seg-item.active { border-color: $brand-primary; background: $brand-primary-bg; }
.seg-icon { width: 40rpx; height: 40rpx; opacity: 0.4; }
.seg-item.active .seg-icon { opacity: 1; }
.seg-label { font-size: 26rpx; color: $text-hint; }
.seg-item.active .seg-label { color: $brand-primary; font-weight: 500; }

.slider-item { margin-bottom: 32rpx; }
.slider-item:last-child { margin-bottom: 0; }
.slider-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.slider-label { font-size: 26rpx; color: $text-regular; font-weight: 500; }
.slider-val { font-size: $fs-title; color: $brand-primary; font-weight: 700; }

.range { display: flex; justify-content: space-between; margin-bottom: 16rpx; }
.range text { font-size: $fs-caption; color: $text-disabled; }

.quick { display: flex; gap: 12rpx; }
.q-btn { flex: 1; padding: 14rpx 4rpx; border-radius: $radius-md; background: $bg-page; text-align: center; transition: 150ms; }
.q-btn:active { transform: scale(0.96); background: $border-light; }
.q-btn text { font-size: $fs-label; color: $text-regular; font-weight: 500; }
.q-btn.reset text { color: $text-hint; }

.rule-card { display: flex; align-items: flex-start; gap: 16rpx; padding: 24rpx 32rpx; background: #FFFBE6; border: 1rpx solid $color-warning-border; border-radius: $radius-lg; box-shadow: none; }
.rule-icon { width: 36rpx; height: 36rpx; flex-shrink: 0; }
.rule-text { font-size: $fs-label; color: $color-warning-text; line-height: 1.6; flex: 1; }

.btn { padding: 28rpx 32rpx; border-radius: $radius-xl; text-align: center; margin-top: 8rpx; margin-bottom: 32rpx; transition: 150ms; }
.btn:active { transform: scale(0.98); }
.btn-primary { background: $brand-primary; }
.btn-primary text { color: $bg-card; font-size: $fs-title; font-weight: 500; }
.btn.off { opacity: 0.5; }
</style>
