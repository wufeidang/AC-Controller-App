<template>
	<view class="item" @click="handleClick" :class="[{ disabled: disabled }, danger ? 'danger' : '']">
		<view class="item-left">
			<view class="item-icon-box" v-if="icon">
				<image v-if="isSvgIcon" :src="'/static/icons/' + icon + '.svg'" class="item-icon-img" mode="aspectFit" />
				<text v-else>{{ icon }}</text>
			</view>
			<text class="item-label" :class="{ 'label-danger': danger }">{{ label }}</text>
		</view>
		<view class="item-right">
			<text class="item-value" v-if="value">{{ value }}</text>
			<text class="item-arrow" v-if="!disabled">›</text>
		</view>
	</view>
</template>

<script>
export default {
	name: 'SettingItem',
	emits: ['click'],
	props: {
		label: { type: String, required: true },
		icon: { type: String, default: '' },
		value: { type: String, default: '' },
		disabled: { type: Boolean, default: false },
		isSvgIcon: { type: Boolean, default: false },
		danger: { type: Boolean, default: false }
	},
	methods: {
		handleClick() {
			if (!this.disabled) this.$emit('click');
		}
	}
};
</script>

<style scoped>
.item {
	padding: 28rpx 32rpx;
	border-bottom: 1rpx solid #F5F5F5;
	display: flex;
	justify-content: space-between;
	align-items: center;
	transition: background 150ms;
}
.item:last-child { border-bottom: none; }
.item:active:not(.disabled) { background: #FAFAFA; }
.item.disabled { opacity: 0.5; }

.item-left { display: flex; align-items: center; gap: 16rpx; }
.item-icon-box { width: 56rpx; height: 56rpx; border-radius: 14rpx; background: #F5F5F5; display: flex; align-items: center; justify-content: center; }
.item-icon-img { width: 36rpx; height: 36rpx; opacity: 0.6; }
.danger .item-icon-img { opacity: 0.9; }
.item-label { font-size: 28rpx; color: #333; }

.item-right { display: flex; align-items: center; gap: 12rpx; }
.item-value { font-size: 26rpx; color: #999; }
.item-arrow { font-size: 28rpx; color: #C0C0C0; font-weight: 300; }

/* 危险操作 */
.danger .item-icon-box { background: #FFF1F0; }
.label-danger { color: #FF4D4F !important; }
</style>
