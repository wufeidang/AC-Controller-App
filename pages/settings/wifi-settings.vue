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
				<text>· AP 热点 — 设备自身 WiFi ({{ defaultIp }})，始终可用</text>
				<text>· STA 客户端 — 连接家庭 WiFi，获取互联网访问</text>
				<text>· AP + STA 双模式共存，互不影响</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import SettingItem from '../../components/SettingItem';
	import constants from '../../config/constants';
	export default {
		components: { SettingItem },
		computed: {
			defaultIp() { return constants.DEFAULT_IP; }
		},
		methods: {
		go(p) { uni.navigateTo({ url: '/pages/settings/' + p }); }
	}
};
</script>

<style lang="scss">
/* .page / .body / .btn / .input-wrap 均已全局化（App.vue） */

/* 本页 .card 使用无 padding 形式（padding 在子元素里控制） */
.card { padding: 0; }
.card-title { padding: 32rpx 32rpx 0; margin-bottom: 0; }

.tips { padding: 20rpx 32rpx 32rpx; display: flex; flex-direction: column; gap: 12rpx; }
.tips text { font-size: $fs-label; color: $text-secondary; line-height: 1.6; }
</style>