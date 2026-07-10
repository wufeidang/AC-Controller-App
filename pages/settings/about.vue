<template>
	<view class="page">
		<view class="body">
			<!-- 应用信息 -->
			<view class="hero">
				<view class="hero-icon">
					<image src="/static/icons/air-conditioner.svg" class="hero-img" mode="aspectFit" />
				</view>
				<text class="hero-name">{{ appName }}</text>
				<text class="hero-desc">{{ appDesc }}</text>
			</view>

			<!-- 版本 -->
			<view class="card">
				<text class="card-title">版本信息</text>
				<view class="row"><text class="row-label">应用版本</text><view class="badge"><text>v{{ appVersion }}</text></view></view>
				<view class="row"><text class="row-label">版本号</text><text class="row-val">{{ appVersionCode }}</text></view>
				<view class="row"><text class="row-label">固件版本</text><view class="badge fw" v-if="firmwareVersion"><text>v{{ firmwareVersion }}</text></view><text class="row-val" v-else>获取中...</text></view>
			</view>

		<!-- 更新日志 -->
		<view class="card">
			<text class="card-title">更新内容</text>
			<view class="changelog">
				<view class="cl-item" v-for="(item, idx) in changelogData" :key="idx">
					<text class="cl-ver">{{ item.ver }}</text>
					<text class="cl-date">{{ item.date }}</text>
					<text class="cl-title" v-if="item.title">{{ item.title }}</text>
					<text class="cl-line" v-for="(line, li) in item.lines" :key="li">{{ line }}</text>
</view>
		</view>
		</view>
		<!-- 底部信息 -->
		<view class="footer">
			<text class="footer-author">党武飞</text>
			<text class="footer-email">740812008@qq.com</text>
			<text class="footer-copy">© 2026 空调温控系统</text>
			<text class="footer-tech">ESP8266 + uni-app</text>
		</view>
		</view>

		<Loading :visible="loadingVisible" :text="loadingText" />
	</view>
</template>

<script>
	import Loading from '../../components/Loading';
	import api from '../../services/api';
	import modalMixin from '../../mixins/modal-mixin';

	export default {
		components: { Loading },
		mixins: [modalMixin],
		data() {
			return {
				appName: '空调温控系统', appDesc: '广通电梯机房智能温控管理',
			appVersion: '2.4.0', appVersionCode: '240', firmwareVersion: '',
			changelogRaw: [
				{ ver: 'v2.4.0', date: '2026-07-08', title: 'OTA 升级优化 + 休眠功能移除', lines: [
					'· OTA 升级接入 Bemfa 平台：自动获取最新固件、版本对比、升级后版本同步',
					'· OTA 页面 openID 输入支持密码隐藏/显示切换',
					'· 设备连接页已连接态移除：连接成功后直接跳转控制面板',
					'· 设备连接页 mDNS 列表精简：仅显示 chip-id + IP',
					'· 移除 ESP8266 休眠功能（固件 + App 全链路清理）',
					'· API 文档品牌表修正为实际 3 品牌，补充协议与温度范围说明'
				]}
				]
		};
	},
	computed: {
		changelogData() {
			return this.changelogRaw;
		}
	},
	onLoad() { this.getFw(); },
	methods: {
		async getFw() {
				const d = uni.getStorageSync('connectedDevice');
				if (!d || !d.connected) { this.firmwareVersion = '未连接'; return; }
				api.setDeviceAddress(d.address);
				try {
					this.showLoading('获取中...');
					const res = await api.getFirmwareVersion();
					if (res.status === 'success') this.firmwareVersion = res.data.firmware_version || '未知';
				} catch (e) {
					this.firmwareVersion = '获取失败';
				} finally { this.hideLoading(); }
			}
	}
};
</script>

<style lang="scss">
/* .page / .card / .card-title / .btn 均已全局化（App.vue） */

/* about 页底部需要更多 padding 适应底部安全区 */
.body { padding-bottom: 60rpx; }

.hero {
	background: $bg-card; border-radius: $radius-xl;
	padding: 48rpx 32rpx; margin-bottom: 24rpx;
	display: flex; flex-direction: column; align-items: center;
	box-shadow: $shadow-sm;
}
.hero-icon {
	width: 120rpx; height: 120rpx;
	background: linear-gradient(135deg, $brand-primary, #69B1FF);
	border-radius: 28rpx;
	display: flex; align-items: center; justify-content: center;
	margin-bottom: 24rpx;
	box-shadow: 0 8rpx 24rpx rgba(22, 119, 255, 0.25);
}
.hero-img { width: 64rpx; height: 64rpx; filter: brightness(0) invert(1); }
.hero-name { font-size: $fs-heading; font-weight: 700; color: $text-primary; margin-bottom: 8rpx; }
.hero-desc { font-size: 26rpx; color: $text-hint; }

.row { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid $bg-page; }
.row:last-child { border-bottom: none; }
.row-label { font-size: 26rpx; color: $text-secondary; }
.row-val { font-size: 26rpx; color: $text-regular; font-weight: 500; }
.badge { background: $brand-primary-bg; padding: 6rpx 16rpx; border-radius: $radius-lg; }
.badge text { font-size: $fs-label; color: $brand-primary; font-weight: 600; }
.badge.fw { background: $color-success-bg; }
.badge.fw text { color: $color-success; }

.changelog { display: flex; flex-direction: column; gap: 20rpx; }
.cl-item { background: $bg-elevated; border-radius: $radius-md; padding: 20rpx; }
.cl-ver { font-size: $fs-body; font-weight: 700; color: $brand-primary; display: block; margin-bottom: 4rpx; }
.cl-date { font-size: $fs-caption; color: $text-hint; margin-bottom: 12rpx; display: block; }
.cl-title { font-size: 26rpx; color: $text-regular; font-weight: 600; margin-bottom: 8rpx; display: block; }
.cl-line { font-size: $fs-label; color: $text-secondary; line-height: 1.8; display: block; }
.cl-toggle { text-align: center; padding: 20rpx 0 0; }
.cl-toggle text { font-size: $fs-label; color: $brand-primary; }

/* 底部 */
.footer { display: flex; flex-direction: column; align-items: center; padding: 48rpx 32rpx 40rpx; gap: 8rpx; }
.footer-author { font-size: $fs-body; color: $text-regular; font-weight: 600; }
.footer-email { font-size: $fs-label; color: $text-hint; margin-bottom: 16rpx; }
.footer-copy { font-size: $fs-caption; color: $text-disabled; }
.footer-tech { font-size: $fs-caption; color: $border-normal; }
</style>
