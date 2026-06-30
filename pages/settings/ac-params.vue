<template>
	<view class="page">
		<view class="body">
			<!-- 设定温度 -->
			<view class="temp-card">
				<text class="t-label">设定温度</text>
				<view class="t-row">
					<view class="t-btn" @click="decreaseTemp" @touchstart="startHold(decreaseTemp)" @touchend="stopHold" @touchcancel="stopHold" :class="{ off: temperature <= 16 }" role="button" aria-label="降低温度" :aria-disabled="temperature <= 16">
								<text class="t-btn-icon">−</text>
							</view>
							<view class="t-display" aria-label="当前温度" role="text">
								<text class="t-num">{{ temperature }}</text>
								<text class="t-unit">°C</text>
							</view>
							<view class="t-btn" @click="increaseTemp" @touchstart="startHold(increaseTemp)" @touchend="stopHold" @touchcancel="stopHold" :class="{ off: temperature >= 30 }" role="button" aria-label="升高温度" :aria-disabled="temperature >= 30">
						<text class="t-btn-icon">+</text>
					</view>
				</view>
			</view>

			<!-- 运行模式 -->
			<view class="card">
				<text class="card-title">运行模式</text>
				<view class="mode-grid" role="radiogroup" aria-label="运行模式">
						<view
							v-for="m in modes"
							:key="m.value"
							class="mode-item"
							:class="{ active: currentMode === m.value }"
							:style="m.value === currentMode ? { borderColor: m.color, background: m.bg } : {}"
							@click="setMode(m.value)"
							role="radio"
							:aria-checked="currentMode === m.value"
							:aria-label="m.label"
						>
						<image :src="'/static/icons/' + m.icon + '.svg'" class="mode-icon" mode="aspectFit" :style="m.value === currentMode ? { filter: m.filter } : {}" />
						<text class="mode-label" :style="m.value === currentMode ? { color: m.color } : {}">{{ m.label }}</text>
					</view>
				</view>
			</view>

			<!-- 风速 -->
				<view class="card">
					<text class="card-title">风速</text>
					<view class="seg-row" role="radiogroup" aria-label="风速">
						<view
							v-for="f in fanSpeeds"
							:key="f.value"
							class="seg-item"
							:class="{ active: currentFanSpeed === f.value }"
							@click="setFanSpeed(f.value)"
							role="radio"
							:aria-checked="currentFanSpeed === f.value"
							:aria-label="f.label"
						>
						<text class="seg-label">{{ f.label }}</text>
					</view>
				</view>
			</view>

			<!-- 摆风 -->
				<view class="card">
					<text class="card-title">摆风</text>
					<view class="seg-row" role="radiogroup" aria-label="摆风">
						<view
							v-for="s in swingModes"
							:key="s.value"
							class="seg-item"
							:class="{ active: currentSwing === s.value }"
							@click="setSwing(s.value)"
							role="radio"
							:aria-checked="currentSwing === s.value"
							:aria-label="s.label"
						>
						<text class="seg-label">{{ s.label }}</text>
					</view>
				</view>
			</view>

			<!-- 品牌 -->
			<view class="card">
				<text class="card-title">空调品牌</text>
				<text class="card-hint">选择您的空调品牌以匹配红外遥控编码</text>
				<view class="brand-grid">
					<view
						v-for="b in displayedBrands"
						:key="b.value"
						class="brand-item"
						:class="{ active: currentBrand === b.value }"
						@click="setBrand(b.value)"
					>
						<text class="brand-label">{{ b.label }}</text>
					</view>
				</view>
				<view class="brand-more" v-if="brands.length > 5" @click="brandExpanded = !brandExpanded">
					<text>{{ brandExpanded ? '收起 ▲' : '展开全部 ' + brands.length + ' 个品牌 ▼' }}</text>
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

export default {
	components: { Loading, CustomModal },
		mixins: [deviceMixin, modalMixin],
	data() {
		return {
			temperature: 26,
			currentMode: 'cool',
			currentFanSpeed: 'medium',
			currentSwing: 'auto',
			currentBrand: 'tcl',
			brandExpanded: false,
			saving: false,
			modes: [
				{ label: '制冷', value: 'cool', icon: 'air-conditioner', color: '#1677FF', bg: '#E6F4FF', filter: '' },
				{ label: '制热', value: 'heat', icon: 'sun', color: '#FA541C', bg: '#FFF2E8', filter: '' },
				{ label: '除湿', value: 'dry', icon: 'water', color: '#13C2C2', bg: '#E6FFFB', filter: '' },
				{ label: '送风', value: 'fan', icon: 'fan', color: '#8C8C8C', bg: '#FAFAFA', filter: '' },
				{ label: '自动', value: 'auto', icon: 'sync', color: '#00B96B', bg: '#F6FFED', filter: '' }
			],
			fanSpeeds: [
				{ label: '自动', value: 'auto' }, { label: '静音', value: 'quiet' },
				{ label: '低速', value: 'low' }, { label: '中速', value: 'medium' },
				{ label: '高速', value: 'high' }
			],
			swingModes: [
				{ label: '摆风', value: 'auto' }, { label: '固定', value: 'fixed' }
			],
			brands: [
				{ label: 'TCL', value: 'tcl' }, { label: '美的', value: 'midea' },
				{ label: '海尔', value: 'haier' }, { label: '格力', value: 'gree' },
				{ label: '大金', value: 'daikin' }, { label: '三菱', value: 'mitsubishi' },
				{ label: '松下', value: 'panasonic' }, { label: '三星', value: 'samsung' },
				{ label: 'LG', value: 'lg' }, { label: '东芝', value: 'toshiba' },
				{ label: '日立', value: 'hitachi' }, { label: '富士通', value: 'fujitsu' },
				{ label: '夏普', value: 'sharp' }, { label: '开利', value: 'carrier' },
				{ label: '惠而浦', value: 'whirlpool' }
			]
		};
	},
	computed: {
		displayedBrands() {
			return this.brandExpanded ? this.brands : this.brands.slice(0, 5);
		}
	},
	onLoad() {
		this.checkDevice();
		this.loadSettings();
		this.getDeviceSettings();
	},
		methods: {
			loadSettings() {
			const s = uni.getStorageSync('acSettings');
			if (s) {
				this.temperature = s.temperature || 26;
				this.currentMode = s.mode || 'cool';
				this.currentFanSpeed = s.fan_speed || 'medium';
				this.currentSwing = s.swing || 'auto';
			}
		},
		async getDeviceSettings() {
			if (!this.deviceConnected) return;
			try {
				this.showLoading('获取设置...');
				const res = await apiService.getAcParams();
				if (res.status === 'success' && res.data) {
					const d = res.data;
					let t = d.temperature || 26;
					if (t < 16) t = 16; if (t > 30) t = 30;
					this.temperature = t;
					this.currentMode = d.mode || 'cool';
					this.currentFanSpeed = d.fan_speed || 'medium';
					this.currentSwing = d.swing || 'auto';
					this.currentBrand = d.brand || 'tcl';
				}
			} catch (e) {
				this.loadSettings();
			} finally { this.hideLoading(); }
		},
			decreaseTemp() { if (this.temperature > 16) this.temperature--; else this.stopHold(); },
			increaseTemp() { if (this.temperature < 30) this.temperature++; else this.stopHold(); },
		setMode(v)    { this.currentMode = v; },
		setFanSpeed(v) { this.currentFanSpeed = v; },
		setSwing(v)   { this.currentSwing = v; },
		setBrand(v)   { this.currentBrand = v; },
		saveToLocalStorage() {
			uni.setStorageSync('acSettings', {
				temperature: this.temperature, mode: this.currentMode,
				fan_speed: this.currentFanSpeed, swing: this.currentSwing
			});
		},
		async saveSettings() {
			if (!this.deviceConnected) { this.showToast('提示', '请先连接设备', 'warning'); return; }
			if (this.saving) return;
			try {
				this.saving = true;
				this.showLoading('保存中...');
				await apiService.setAcBrand(this.currentBrand);
				await apiService.setAcParams({
					temperature: this.temperature, mode: this.currentMode,
					fan_speed: this.currentFanSpeed, swing: this.currentSwing
				});
				this.saveToLocalStorage();
				this.showToast('成功', '已保存：' + this.temperature + '°C ' + (this.modes.find(m => m.value === this.currentMode) || { label: '' }).label + ' ' + (this.fanSpeeds.find(f => f.value === this.currentFanSpeed) || { label: '' }).label + ' ' + this.currentBrand.toUpperCase(), 'success');
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

<style scoped lang="scss">
.page { min-height: 100vh; background: $bg-page; }
.body { padding: 32rpx; }

/* 温度卡 */
.temp-card { background: $bg-card; border-radius: $radius-xl; padding: 40rpx 32rpx; text-align: center; margin-bottom: 24rpx; box-shadow: $shadow-sm; }
.t-label { font-size: 26rpx; color: $text-hint; }
.t-row { display: flex; justify-content: center; align-items: center; gap: 48rpx; margin-top: 24rpx; }
.t-btn { width: 80rpx; height: 80rpx; border-radius: 50%; background: $bg-subtle; display: flex; align-items: center; justify-content: center; transition: transform 150ms; }
.t-btn:active { transform: scale(0.92); }
.t-btn.off { opacity: 0.3; }
.t-btn-icon { font-size: 48rpx; color: $text-regular; font-weight: 500; }
.t-display { display: flex; align-items: baseline; }
.t-num { font-size: 96rpx; font-weight: 700; color: $text-primary; line-height: 1; }
.t-unit { font-size: 32rpx; color: $text-hint; margin-left: 4rpx; }

/* 卡片 */
.card { background: $bg-card; border-radius: $radius-xl; padding: 32rpx; margin-bottom: 24rpx; box-shadow: $shadow-sm; }
.card-title { font-size: $fs-title; font-weight: 600; color: $text-primary; margin-bottom: 20rpx; display: block; }
.card-hint { font-size: $fs-label; color: $text-hint; display: block; margin-top: -12rpx; margin-bottom: 20rpx; }

/* 模式网格 */
.mode-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.mode-item { width: calc(20% - 13rpx); box-sizing: border-box; border: 2rpx solid $bg-subtle; border-radius: $radius-lg; padding: 20rpx 8rpx; display: flex; flex-direction: column; align-items: center; transition: 150ms; }
.mode-item:active { transform: scale(0.96); }
.mode-icon { width: 48rpx; height: 48rpx; margin-bottom: 8rpx; opacity: 0.5; }
.mode-label { font-size: $fs-label; color: $text-hint; }

/* 分段 */
.seg-row { display: flex; flex-wrap: wrap; gap: 12rpx; }
.seg-item { padding: 16rpx 20rpx; border: 2rpx solid $bg-subtle; border-radius: 14rpx; transition: 150ms; }
.seg-item:active { transform: scale(0.96); }
.seg-item.active { border-color: $brand-primary; background: $brand-primary-bg; }
.seg-label { font-size: 26rpx; color: $text-secondary; }
.seg-item.active .seg-label { color: $brand-primary; font-weight: 500; }

/* 品牌 */
.brand-grid { display: flex; flex-wrap: wrap; gap: 16rpx; }
.brand-item { width: calc(20% - 13rpx); box-sizing: border-box; padding: 18rpx 6rpx; border: 1rpx solid $border-normal; border-radius: $radius-md; text-align: center; transition: 150ms; }
.brand-item:active { transform: scale(0.96); }
.brand-item.active { border-color: $brand-primary; background: $brand-primary-bg; }
.brand-label { font-size: $fs-label; color: $text-secondary; }
.brand-item.active .brand-label { color: $brand-primary; font-weight: 500; }
.brand-more { text-align: center; margin-top: 16rpx; padding: 12rpx; border-radius: $radius-md; background: $bg-elevated; }
.brand-more text { font-size: $fs-label; color: $brand-primary; }

/* 按钮 */
.btn { padding: 28rpx 32rpx; border-radius: $radius-xl; text-align: center; margin-bottom: 32rpx; transition: 150ms; }
.btn:active { transform: scale(0.98); }
.btn-primary { background: $brand-primary; }
.btn-primary text { color: $bg-card; font-size: $fs-title; font-weight: 500; }
.btn.off { opacity: 0.5; }
</style>
