<template>
	<view class="app-container">
		<slot></slot>
	</view>
</template>

<script>
	export default {
		onLaunch: function() {
			console.log('App Launch')
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style lang="scss">
	/*每个页面公共css */
	.app-container {
		position: relative;
		min-height: 100vh;
	}

	/* ============================================================
	 * 全局页面骨架（消除各页重复声明）
	 * ============================================================ */
	.page { min-height: 100vh; background: $bg-page; }
	.body { padding: 32rpx; }

	/* 卡片 */
	.card {
		background: $bg-card;
		border-radius: $radius-xl;
		padding: 32rpx;
		margin-bottom: 24rpx;
		box-shadow: $shadow-sm;
		overflow: hidden;
	}
	.card-title {
		font-size: $fs-title;
		font-weight: 600;
		color: $text-primary;
		margin-bottom: 20rpx;
		display: block;
	}
	.card-hint {
		font-size: $fs-label;
		color: $text-hint;
		display: block;
		margin-top: -12rpx;
		margin-bottom: 20rpx;
	}

	/* 分组小标题 */
	.section-label {
		font-size: 26rpx;
		color: $text-hint;
		padding: 8rpx 0 16rpx 4rpx;
	}

	/* 表单 label */
	.label {
		display: block;
		font-size: 26rpx;
		color: $text-regular;
		font-weight: 500;
		margin-bottom: 12rpx;
	}

	/* 按钮（紧凑标准主按钮——避免在大屏手机上像 CTA 大 banner 一样）
	   高度由 padding+内文字决定：4 处主页面（temp-hum/calibration/ac-params/scene）
	   都有底部提交按钮，原 28rpx 上下 padding 在小屏看上去过厚。 */
	.btn {
		padding: 22rpx 28rpx;
		border-radius: $radius-xl;
		text-align: center;
		margin-bottom: 20rpx;
		transition: transform 150ms, opacity 150ms;
	}
	.btn:active { transform: scale(0.98); }
	.btn-primary {
		background: $brand-primary;
		box-shadow: 0 6rpx 14rpx rgba(22, 119, 255, 0.18);
	}
	.btn-primary text {
		color: $bg-card;
		font-size: $fs-body;
		font-weight: 500;
	}
	.btn-danger-outline {
		background: $bg-card;
		border: 1rpx solid $color-danger;
		padding: 18rpx 28rpx;
		border-radius: $radius-xl;
		text-align: center;
	}
	.btn-danger-outline:active { background: $color-danger-bg; }
	.btn-danger-outline text { color: $color-danger; font-size: $fs-body; font-weight: 500; }
	.btn.off { opacity: 0.5; box-shadow: none; }

	/* 输入框（统一聚焦发光样式）*/
	.input-wrap {
		position: relative;
		height: 80rpx; padding: 0 24rpx;
		background: $bg-elevated; border-radius: $radius-md;
		border: 2rpx solid transparent;
		transition: all 200ms;
		display: flex; align-items: center;
	}
	.input-wrap.focus { background: $bg-card; border-color: $brand-primary; box-shadow: 0 0 0 6rpx rgba(22, 119, 255, 0.07); }
	.input { width: 100%; height: 80rpx; font-size: $fs-body; color: $text-primary; background: transparent; padding-right: 60rpx; }
	.ph { color: $text-disabled; }

	/* radio/segment 通用 */
	.seg-row { display: flex; flex-wrap: wrap; gap: 12rpx; }
	.seg-item {
		padding: 16rpx 20rpx; border: 2rpx solid $bg-subtle; border-radius: 14rpx;
		transition: 150ms; text-align: center;
	}
	.seg-item:active { transform: scale(0.96); }
	.seg-item.active { border-color: $brand-primary; background: $brand-primary-bg; }
	.seg-label { font-size: 26rpx; color: $text-secondary; }
	.seg-item.active .seg-label { color: $brand-primary; font-weight: 500; }

	/* 列表行（用于断开连接等独立项） */
	.row-action {
		display: flex; align-items: center; justify-content: center;
		padding: 24rpx; border-radius: $radius-xl;
		text-align: center;
	}
	.row-action.danger text { color: $color-danger; font-size: $fs-body; font-weight: 500; }
	.row-action:active { background: $color-danger-bg; }
</style>
