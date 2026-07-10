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

			<!-- 检查更新 -->
			<view class="card">
				<view class="update-row" @click="checkUpdate" :class="{ checking: updateChecking }">
					<text class="update-label">{{ updateChecking ? '检查中...' : updateResult || '检查更新' }}</text>
					<text class="update-arrow" v-if="!updateChecking && !updateResult">›</text>
				</view>
			</view>

		<!-- 更新日志 -->
		<view class="card">
			<text class="card-title">更新内容</text>
			<view class="changelog" v-if="!changelogLoading && changelogData.length > 0">
				<view class="cl-item" v-for="(item, idx) in changelogData" :key="idx">
					<text class="cl-ver">{{ item.ver }}</text>
					<text class="cl-date">{{ item.date }}</text>
					<text class="cl-title" v-if="item.title">{{ item.title }}</text>
					<text class="cl-line" v-for="(line, li) in item.lines" :key="li">{{ line }}</text>
</view>
		</view>
		<view class="changelog-empty" v-else-if="changelogLoading">
			<text class="empty-text">加载中...</text>
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
	import constants from '../../config/constants';

	export default {
		components: { Loading },
		mixins: [modalMixin],
		data() {
			return {
				appName: '空调温控系统', appDesc: '广通电梯机房智能温控管理',
			appVersion: '2.4.0', appVersionCode: '240', firmwareVersion: '',
			updateChecking: false, updateResult: '',
			changelogRaw: [], changelogLoading: true
		};
	},
	computed: {
		changelogData() {
			return this.changelogRaw;
		}
	},
	onLoad() {
		this.getFw();
		this._readAppVersion();
		this._fetchChangelog();
	},
	methods: {
		_readAppVersion() {
			try {
				if (typeof plus !== 'undefined') {
					this.appVersion = plus.runtime.version || '2.4.0';
					this.appVersionCode = String(plus.runtime.versionCode || 240);
				}
			} catch (e) { }
		},
		async _fetchChangelog() {
			try {
				const res = await uni.request({
					url: constants.CHANGELOG_URL,
					method: 'GET',
					timeout: 8000
				});
				if (res.statusCode === 200 && Array.isArray(res.data)) {
					this.changelogRaw = res.data;
				}
			} catch (e) { /* 静默失败，保持空数组 */ }
			finally { this.changelogLoading = false; }
		},
		async getFw() {
				const d = uni.getStorageSync('connectedDevice');
				if (!d || !d.connected) { this.firmwareVersion = '未连接'; return; }
				api.setDeviceAddress(d.address);
				try {
					const res = await api.getFirmwareVersion();
					if (res.status === 'success') this.firmwareVersion = res.data.firmware_version || '未知';
				} catch (e) {
					this.firmwareVersion = '获取失败';
				}
			},
		async checkUpdate() {
			if (this.updateChecking) return;
			this.updateChecking = true;
			this.updateResult = '';
			try {
				const res = await uni.request({
					url: constants.APP_VERSION_CHECK_URL,
					method: 'GET',
					timeout: 10000
				});
				if (res.statusCode !== 200) throw new Error('无法访问更新服务器');
				const remote = res.data;
				const currentCode = parseInt(this.appVersionCode, 10) || 0;
				const remoteCode = parseInt(remote.versionCode, 10) || 0;

				if (remoteCode <= currentCode) {
					this.updateResult = '已是最新版本';
					return;
				}

				uni.showModal({
					title: '发现新版本',
					content: `v${remote.version} 可用，${remote.changelog || ''}\n\n是否立即更新？`,
					success: (r) => {
						if (r.confirm) this._downloadWgt(remote.wgtUrl);
					}
				});
				this.updateResult = `发现 v${remote.version}`;
			} catch (e) {
				this.updateResult = '检查失败，请检查网络';
			} finally {
				this.updateChecking = false;
			}
		},
		_downloadWgt(url) {
			this.showLoading('下载更新包...');
			const task = plus.downloader.createDownload(url, {
				filename: '_doc/update/'
			}, (d, status) => {
				this.hideLoading();
				if (status !== 200) {
					this.showToast('更新失败', '下载失败，请重试', 'error');
					return;
				}
				this._installWgt(d.filename);
			});
			task.start();
		},
		_installWgt(path) {
			this.showLoading('安装中...');
			plus.runtime.install(path, { force: true }, () => {
				this.hideLoading();
				uni.showModal({
					title: '更新完成',
					content: '应用已更新，是否立即重启？',
					success: (r) => { if (r.confirm) plus.runtime.restart(); }
				});
			}, (e) => {
				this.hideLoading();
				this.showToast('更新失败', e.message || '安装失败', 'error');
			});
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

.update-row {
	display: flex; justify-content: space-between; align-items: center;
	padding: 24rpx 0; cursor: pointer; border-bottom: 1rpx solid $bg-page;
}
.update-row:active { opacity: 0.6; }
.update-row.checking { opacity: 0.5; pointer-events: none; }
.update-label { font-size: 28rpx; color: $brand-primary; font-weight: 500; }
.update-arrow { font-size: 36rpx; color: $text-hint; }

.changelog { display: flex; flex-direction: column; gap: 20rpx; }
.cl-item { background: $bg-elevated; border-radius: $radius-md; padding: 20rpx; }
.cl-ver { font-size: $fs-body; font-weight: 700; color: $brand-primary; display: block; margin-bottom: 4rpx; }
.cl-date { font-size: $fs-caption; color: $text-hint; margin-bottom: 12rpx; display: block; }
.cl-title { font-size: 26rpx; color: $text-regular; font-weight: 600; margin-bottom: 8rpx; display: block; }
.cl-line { font-size: $fs-label; color: $text-secondary; line-height: 1.8; display: block; }
.cl-toggle { text-align: center; padding: 20rpx 0 0; }
.cl-toggle text { font-size: $fs-label; color: $brand-primary; }
.changelog-empty { padding: 32rpx 0; text-align: center; }
.changelog-empty .empty-text { font-size: $fs-label; color: $text-hint; }

/* 底部 */
.footer { display: flex; flex-direction: column; align-items: center; padding: 48rpx 32rpx 40rpx; gap: 8rpx; }
.footer-author { font-size: $fs-body; color: $text-regular; font-weight: 600; }
.footer-email { font-size: $fs-label; color: $text-hint; margin-bottom: 16rpx; }
.footer-copy { font-size: $fs-caption; color: $text-disabled; }
.footer-tech { font-size: $fs-caption; color: $border-normal; }
</style>
