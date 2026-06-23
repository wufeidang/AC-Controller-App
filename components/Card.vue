<template>
	<view class="card" :class="customClass">
		<view class="card-header" v-if="title || icon">
			<view class="card-header-left">
				<image v-if="icon && isSvgIcon" :src="'/static/icons/' + icon + '.svg'" class="card-icon" mode="aspectFit" />
				<text v-else-if="icon">{{ icon }}</text>
				<text class="card-title" v-if="title">{{ title }}</text>
			</view>
		</view>
		<view class="card-body">
			<slot></slot>
		</view>
	</view>
</template>

<script>
export default {
	name: 'Card',
	props: {
		title: { type: String, default: '' },
		icon: { type: String, default: '' },
		customClass: { type: String, default: '' },
		isSvgIcon: { type: Boolean, default: false }
	}
};
</script>

<style scoped>
.card {
	background: #FFFFFF;
	border-radius: 24rpx;
	margin-bottom: 24rpx;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
	overflow: hidden;
}

.card-header {
	padding: 28rpx 32rpx;
	border-bottom: 1rpx solid #F5F5F5;
}

.card-header-left {
	display: flex;
	align-items: center;
	gap: 16rpx;
}

.card-icon {
	width: 36rpx;
	height: 36rpx;
}

.card-title {
	font-size: 30rpx;
	font-weight: 600;
	color: #1A1A1A;
}

.card-body {
	padding: 32rpx;
}
</style>
