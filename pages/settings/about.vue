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
				<view class="cl-toggle" @click="showHistory = !showHistory">
					<text>{{ showHistory ? '收起历史版本 ▲' : '展开历史版本 ▼' }}</text>
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
				appVersion: '2.3.0', appVersionCode: '230', firmwareVersion: '',
				showHistory: false,
			changelogRaw: [
				{ ver: 'v2.3.0', date: '2026-06-29', title: '设备连接优化 + P0 统一状态管理', lines: [
					'· WiFi 扫描改用动态轮询（每 100ms 检查，最多 2s），告别固定 300ms 等待',
					'· AP/家庭 WiFi 切换时自动更新 IP 地址，无需手动刷新',
					'· 连接成功后自动清空 STA IP，避免 AP 模式显示旧地址',
					'· 统一设备状态管理：所有页面接入 device-mixin，消除重复 checkDevice 逻辑',
					'· 统一弹窗组件：所有页面使用 CustomModal 替代手写 showToast',
					'· 修复首页 onShow 轮询竞态（移除 onShow 中的重复 fetchStatus）',
					'· 修复首页 fetchStatus 并发竞态（statusPending 标志位）',
					'· 新增 errorHandler 服务，统一错误分类和用户提示'
				]},
				{ ver: 'v2.2.0', date: '2026-06-24', title: '连接流程重构', lines: [
					'· 首页与设备连接页面完全分离，首页自动跳转连接页',
					'· 新增 WiFi 扫描功能，自动检测附近设备热点',
					'· 连接页面显示 STA 网络 IP，支持家庭 WiFi 远程连接',
					'· 首页新增断开连接按钮，设备离线时自动跳转连接页',
					'· API 超时优化（8s 超时，连续 3 次失败才判定离线）',
					'· 场景切换弹窗 1.5s 自动消失，显示切换到的场景名称',
					'· STA 配置保存后轮询状态，最多 30 秒实时更新',
					'· 修复 5 个页面弹窗不自动消失的 Bug',
					'· WiFi 设置页移除重复的 MQTT 入口'
				]},
				{ ver: 'v2.0.0', date: '2026-06-23', title: '界面全面升级', lines: [
					'· 全新设计语言：Ant Design 蓝 + 小米风格弹窗，统一 24rpx 卡片体系',
					'· 首页改造为自动温控看板：大温度/湿度 C 位展示，根据控制类型自动切换',
					'· 首页新增场景快捷切换（睡眠/舒适/节能/快速）+ 空调品牌显示',
					'· 空调遥控器页：模式卡片五色区分（制冷蓝/制热橙/除湿青/送风灰）',
					'· 设置页按功能域分组，危险操作红色降权',
					'· 温湿度阈值页新增快速调节按钮，滑动+点选双模式',
					'· 所有弹窗升级为小米风格（橙主色/大圆角/弹簧动画）',
					'· 设置图标统一灰底 Pill 容器，未连接页丰富引导'
				]},
				{ ver: 'v1.2.1', date: '2026-06-23', lines: [
					'· 修复输入框无法输入、风速换行、滑块不响应、格力不响应等 Bug',
					'· 全页面错误信息透传后端 message，精准排障',
					'· OTA 固件 URL 预设、触觉震动反馈等体验优化'
				]},
				{ ver: 'v1.2.0', date: '2026-06-22', lines: [
					'· 新增 STA 客户端 WiFi 配网、MQTT 配置',
					'· 空调品牌扩展至 15 个，补全运行模式和风速选项',
					'· 新增深度睡眠功能入口，品牌选择器折叠展开'
				]},
				{ ver: 'v1.1.0', date: '2025-03', lines: [
					'· 新增 MQTT 集成（Home Assistant）、STA 双模共存',
					'· 新增休眠开关、EEPROM 结构体化管理'
				]},
				{ ver: 'v1.0.0', date: '初始版本', lines: [
					'· 温湿度实时监测 + TCL/美的/海尔/格力红外控制 + Web API'
				]}
			]
		};
	},
	computed: {
		changelogData() {
			const first = this.changelogRaw[0];
			const others = this.showHistory ? this.changelogRaw.slice(1) : [];
			return [{ ...first, expanded: true }, ...others.map(o => ({ ...o, expanded: false }))];
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

<style scoped>
.page { min-height: 100vh; background: #F5F5F5; }
.body { padding: 32rpx; padding-bottom: 60rpx; }

.hero { background: #FFF; border-radius: 24rpx; padding: 48rpx 32rpx; margin-bottom: 24rpx; display: flex; flex-direction: column; align-items: center; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.hero-icon { width: 120rpx; height: 120rpx; background: linear-gradient(135deg, #1677FF, #69B1FF); border-radius: 28rpx; display: flex; align-items: center; justify-content: center; margin-bottom: 24rpx; box-shadow: 0 8rpx 24rpx rgba(22,119,255,0.25); }
.hero-img { width: 64rpx; height: 64rpx; filter: brightness(0) invert(1); }
.hero-name { font-size: 36rpx; font-weight: 700; color: #1A1A1A; margin-bottom: 8rpx; }
.hero-desc { font-size: 26rpx; color: #999; }

.card { background: #FFF; border-radius: 24rpx; padding: 32rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.card-title { font-size: 30rpx; font-weight: 600; color: #1A1A1A; margin-bottom: 20rpx; display: block; }

.row { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #F5F5F5; }
.row:last-child { border-bottom: none; }
.row-label { font-size: 26rpx; color: #666; }
.row-val { font-size: 26rpx; color: #333; font-weight: 500; }
.badge { background: #E6F4FF; padding: 6rpx 16rpx; border-radius: 16rpx; }
.badge text { font-size: 24rpx; color: #1677FF; font-weight: 600; }
.badge.fw { background: #F6FFED; }
.badge.fw text { color: #00B96B; }

.changelog { display: flex; flex-direction: column; gap: 20rpx; }
.cl-item { background: #FAFAFA; border-radius: 12rpx; padding: 20rpx; }
.cl-ver { font-size: 28rpx; font-weight: 700; color: #1677FF; display: block; margin-bottom: 4rpx; }
.cl-date { font-size: 22rpx; color: #999; margin-bottom: 12rpx; display: block; }
.cl-title { font-size: 26rpx; color: #333; font-weight: 600; margin-bottom: 8rpx; display: block; }
.cl-line { font-size: 24rpx; color: #666; line-height: 1.8; display: block; }
.cl-toggle { text-align: center; padding: 20rpx 0 0; }
.cl-toggle text { font-size: 24rpx; color: #1677FF; }

/* 底部 */
.footer { display: flex; flex-direction: column; align-items: center; padding: 48rpx 32rpx 40rpx; gap: 8rpx; }
.footer-author { font-size: 28rpx; color: #333; font-weight: 600; }
.footer-email { font-size: 24rpx; color: #999; margin-bottom: 16rpx; }
.footer-copy { font-size: 22rpx; color: #C0C0C0; }
.footer-tech { font-size: 20rpx; color: #D9D9D9; }
</style>
