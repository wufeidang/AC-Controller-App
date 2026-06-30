<template>
		<view class="loading-container" v-if="visible" role="alert" aria-live="polite">
		<view class="loading-content">
			<view class="loading-spinner"></view>
			<text class="loading-text" v-if="text">{{ text }}</text>
		</view>
	</view>
</template>

<script>
export default {
	name: 'Loading',
	props: {
		/**
		 * 是否显示加载状态
		 */
		visible: {
			type: Boolean,
			default: false
		},
		/**
		 * 加载文本
		 */
		text: {
			type: String,
			default: '加载中...'
		}
	}
};
</script>

<style scoped>
.loading-container {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 9999;
	animation: fadeIn 0.3s ease;
}

.loading-content {
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 40rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 20rpx;
	min-width: 200rpx;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
	animation: scaleIn 0.3s ease;
}

.loading-spinner {
	width: 60rpx;
	height: 60rpx;
	border: 4rpx solid #f3f3f3;
		border-top: 4rpx solid #1677FF;
	border-radius: 50%;
	animation: spin 1s linear infinite;
}

.loading-text {
	font-size: 28rpx;
	color: #333333;
}

@keyframes fadeIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}

@keyframes scaleIn {
	from {
		transform: scale(0.8);
		opacity: 0;
	}
	to {
		transform: scale(1);
		opacity: 1;
	}
}

@keyframes spin {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}
</style>
