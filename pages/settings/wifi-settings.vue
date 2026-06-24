<template>
	<view class="page">
		<view class="body">
			<view class="desc">管理设备的 AP 热点与客户端 WiFi 连接</view>

			<view class="card">
			<SettingItem label="AP 热点设置" icon="wifi" :isSvgIcon="true" @click="go('ap-wifi')" />
			<SettingItem label="STA 客户端 WiFi" icon="signal" :isSvgIcon="true" @click="go('sta-wifi')" />
			</view>

			<view class="card">
				<text class="card-title">网络架构说明</text>
				<view class="tips">
				<text>· AP 热点 — 设备自身 WiFi (192.168.4.1)，始终可用</text>
				<text>· STA 客户端 — 连接家庭 WiFi，获取互联网访问</text>
				<text>· AP + STA 双模式共存，互不影响</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import SettingItem from '../../components/SettingItem';
export default {
	components: { SettingItem },
	methods: {
		go(p) { uni.navigateTo({ url: '/pages/settings/' + p }); }
	}
};
</script>

<style scoped>
.page { min-height: 100vh; background: #F5F5F5; }
.body { padding: 32rpx; }
.desc { font-size: 26rpx; color: #999; margin-bottom: 24rpx; }
.card { background: #FFF; border-radius: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); overflow: hidden; margin-bottom: 24rpx; }
.card-title { font-size: 30rpx; font-weight: 600; color: #1A1A1A; padding: 32rpx 32rpx 0; display: block; }
.tips { padding: 20rpx 32rpx 32rpx; display: flex; flex-direction: column; gap: 12rpx; }
.tips text { font-size: 24rpx; color: #666; line-height: 1.6; }
</style>
