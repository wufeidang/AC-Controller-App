<template>
	<view class="app-container">
		<slot></slot>
		<!-- 全局错误提示 -->
		<view class="error-toast" v-if="error">
			<text class="error-text">{{ error }}</text>
			<view class="error-close" @click="clearError">×</view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				error: null
			};
		},
		onLaunch: function() {
			console.log('App Launch')
		},
		onShow: function() {
			console.log('App Show')
			
		},
		onHide: function() { 
			console.log('App Hide')
			uni.clearStorageSync();
		},
		
		methods: {
			clearError() {
				this.error = null;
			}
		}
	}
</script>

<style>
	/*每个页面公共css */
	.app-container {
		position: relative;
		min-height: 100vh;
	}

	.error-toast {
		position: fixed;
		bottom: 100rpx;
		left: 50%;
		transform: translateX(-50%);
		background-color: rgba(0, 0, 0, 0.7);
		color: #ffffff;
		padding: 20rpx 30rpx;
		border-radius: 12rpx;
		display: flex;
		align-items: center;
		gap: 20rpx;
		z-index: 9999;
		animation: slideUp 0.3s ease;
	}

	.error-text {
		font-size: 28rpx;
		max-width: 600rpx;
		word-break: break-word;
	}

	.error-close {
		font-size: 36rpx;
		font-weight: bold;
		cursor: pointer;
	}

	@keyframes slideUp {
		from {
			transform: translate(-50%, 100%);
			opacity: 0;
		}
		to {
			transform: translate(-50%, 0);
			opacity: 1;
		}
	}
</style>
