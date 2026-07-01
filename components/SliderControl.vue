<template>
	<view class="slider-control">
		<view class="slider-head">
			<text class="slider-label">{{ label }}</text>
			<text class="slider-val" :style="{ color: activeColor }" :aria-label="label + value + unit">{{ valueStr }}{{ unit }}</text>
		</view>
		<slider
			:value="value"
			@changing="onChanging"
			@change="onChanging"
			:min="min"
			:max="max"
			:step="step"
			:activeColor="activeColor"
			backgroundColor="#F0F0F0"
			block-size="22"
		/>
		<view class="range" v-if="rangeMinLabel || rangeMaxLabel">
			<text>{{ rangeMinLabel || min }}</text>
			<text>{{ rangeMaxLabel || max }}</text>
		</view>
		<view class="quick" v-if="quickButtons && quickButtons.length">
			<view
				v-for="(q, idx) in quickButtons"
				:key="idx"
				class="q-btn"
				:class="{ reset: q.reset }"
				@click="onQuickClick(q)"
				@touchstart="onQuickTouchStart(q)"
				@touchend="stopHold"
				@touchcancel="stopHold"
				role="button"
				:aria-label="q.label + (q.reset ? '重置' : '')"
			>
				<text>{{ q.label }}</text>
			</view>
		</view>
	</view>
</template>

<script>
/**
 * SliderControl 通用滑动调节器（支持长按连续步进）
 * - 取代 temp-hum / calibration 等页面重复的 slider + 快捷按钮模板
 * - 通过 quickButtons 配置生成 [-N / -1 / reset / +1 / +N] 风格的快捷按钮
 * - 长按连续触发逻辑内嵌，无需外部 mixin
 */
export default {
	name: 'SliderControl',
	props: {
		label: { type: String, required: true },
		value: { type: [Number, String], required: true },
		min: { type: Number, required: true },
		max: { type: Number, required: true },
		step: { type: Number, default: 1 },
		activeColor: { type: String, default: '#1677FF' },
		unit: { type: String, default: '' },
		rangeMinLabel: { type: [String, Number], default: '' },
		rangeMaxLabel: { type: [String, Number], default: '' },
		valueDecimals: { type: Number, default: 0 },
		/** 快捷按钮列表 { label, delta, reset?: boolean } */
		quickButtons: { type: Array, default: () => [] }
	},
	data() {
		return {
			_holdTimer: null,
			_holdInterval: null
		};
	},
	computed: {
		valueStr() {
			const n = Number(this.value);
			if (this.valueDecimals > 0) return n.toFixed(this.valueDecimals);
			return Math.round(n).toString();
		}
	},
	beforeDestroy() {
		this.stopHold();
	},
	methods: {
		onChanging(e) {
			let v;
			if (this.valueDecimals > 0) v = parseFloat(e.detail.value);
			else v = parseInt(e.detail.value);
			this.$emit('changing', v);
		},
		applyDelta(delta) {
			let v = Number(this.value) + delta;
			// 边界
			v = Math.max(this.min, Math.min(this.max, v));
			if (this.step && this.valueDecimals === 0) {
				v = Math.round(v);
			}
			if (v === Number(this.value)) {
				this.stopHold();
				return;
			}
			this.$emit('changing', v);
		},
		/** 重置按钮：默认重置到范围内的中点（对称量程→0）；可通过按钮 resetVal 显式重写 */
		applyReset(resetVal) {
			let target = resetVal;
			if (typeof target !== 'number') {
				target = (this.min + this.max) === 0 ? 0 : this.min;
			}
			this.$emit('changing', target);
		},
		onQuickClick(q) {
			if (q.reset) this.applyReset(q.resetVal);
			else this.applyDelta(q.delta);
		},
		onQuickTouchStart(q) {
			if (q.reset) return; // 重置按钮不触发长按
			this.stopHold();
			this._holdTimer = setTimeout(() => {
				this.applyDelta(q.delta); // 首次触发
				let steps = 0;
				let interval = 300;
				this._holdInterval = setInterval(() => {
					this.applyDelta(q.delta);
					steps++;
					if (steps % 5 === 0 && interval > 80) {
						interval -= 50;
						clearInterval(this._holdInterval);
						this._holdInterval = setInterval(() => this.applyDelta(q.delta), interval);
					}
				}, interval);
			}, 500);
		},
		stopHold() {
			if (this._holdTimer) { clearTimeout(this._holdTimer); this._holdTimer = null; }
			if (this._holdInterval) { clearInterval(this._holdInterval); this._holdInterval = null; }
		}
	}
};
</script>

<style scoped lang="scss">
.slider-control { margin-bottom: 32rpx; }
.slider-control:last-child { margin-bottom: 0; }
.slider-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.slider-label { font-size: 26rpx; color: $text-regular; font-weight: 500; }
.slider-val { font-size: $fs-title; font-weight: 700; }
.range { display: flex; justify-content: space-between; margin-bottom: 16rpx; }
.range text { font-size: $fs-caption; color: $text-disabled; }
.quick { display: flex; gap: 12rpx; }
.q-btn { flex: 1; padding: 14rpx 4rpx; border-radius: $radius-md; background: $bg-page; text-align: center; transition: 150ms; }
.q-btn:active { transform: scale(0.96); background: $border-light; }
.q-btn text { font-size: $fs-label; color: $text-regular; font-weight: 500; }
.q-btn.reset text { color: $text-hint; }
</style>
