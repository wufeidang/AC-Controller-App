<template>
	<view class="page">
		<view class="body">
			<view class="desc">让设备连接家庭 WiFi，实现互联网访问和 MQTT 通信</view>

			<!-- 连接状态 -->
			<view class="card" v-if="staInfo">
				<text class="card-title">连接状态</text>
				<view class="info-row"><text class="info-label">状态</text><view class="badge" :class="{ on: staInfo.connected }"><view class="dot"></view><text>{{ staInfo.connected ? '已连接' : '未连接' }}</text></view></view>
				<view class="info-row" v-if="staInfo.ssid"><text class="info-label">WiFi</text><text class="info-value">{{ staInfo.ssid }}</text></view>
				<view class="info-row" v-if="staInfo.local_ip"><text class="info-label">IP</text><text class="info-value">{{ staInfo.local_ip }}</text></view>
				<view class="info-row" v-if="staInfo.rssi !== undefined"><text class="info-label">信号</text><text class="info-value">{{ staInfo.rssi }} dBm</text></view>
			</view>

			<!-- 配置表单 -->
			<view class="card">
				<text class="card-title">WiFi 配置</text>
				<view class="form-item">
					<text class="label">WiFi 名称 (SSID)</text>
					<input v-model="staSsid" class="input" placeholder="请输入家庭 WiFi 名称" maxlength="32" />
				</view>
				<view class="form-item">
					<text class="label">WiFi 密码</text>
					<input v-model="staPassword" :password="!showPassword" class="input" placeholder="请输入 WiFi 密码" maxlength="64" />
					<view class="pw-toggle" @click="showPassword = !showPassword"><text>{{ showPassword ? '隐藏' : '显示' }}</text></view>
				</view>
			</view>

			<view class="card">
				<text class="card-title">说明</text>
				<view class="tips"><text>· STA 模式用于连接家庭路由器，实现互联网 OTA 和 MQTT</text><text>· 设备以 AP+STA 双模式运行，AP 始终可用</text><text>· 连接成功后可通过 STA IP 继续管理</text></view>
			</view>

			<view class="btn btn-primary" @click="saveSettings" :class="{ off: !deviceConnected || saving }">
				<text>{{ saving ? '连接中...' : '连接 WiFi' }}</text>
			</view>
		</view>

		<Loading :visible="loadingVisible" :text="loadingText" />
		<CustomModal :visible="modalVisible" :title="modalTitle" :content="modalContent" :close-on-click-overlay="false" :type="modalType" :show-buttons="false" />
	</view>
</template>

<script>
import Loading from '../../components/Loading';
import CustomModal from '../../components/CustomModal';
import api from '../../services/api';
import deviceMixin from '../../mixins/device-mixin.js';
import modalMixin from '../../mixins/modal-mixin.js';

export default {
	components: { Loading, CustomModal },
		mixins: [deviceMixin, modalMixin],
		data() {
			return {
				staInfo: null, staSsid: '', staPassword: '', showPassword: false, saving: false
			};
	},
	onLoad() { this.checkDevice(); this.loadStatus(true); },
	onShow() { this.checkDevice(); this.loadStatus(false); },
	methods: {
		async loadStatus(showLoading) {
			if (!this.deviceConnected) return;
			try {
				if (showLoading) this.showLoading('加载中...');
				const res = await api.getStaWifi();
				if (res.status === 'success') {
					this.staInfo = res.data;
					this.staSsid = res.data.ssid || '';
				}
			} catch (e) {
				console.warn('[sta-wifi] loadStatus:', e.message);
			} finally {
				if (showLoading) this.hideLoading();
			}
		},
			async saveSettings() {
			if (!this.deviceConnected) { this.showToast('提示', '请先连接设备', 'warning'); return; }
			if (!this.staSsid || !this.staPassword) { this.showToast('提示', '请输入 WiFi 名称和密码', 'warning'); return; }
			if (this.saving) return;
			try {
				this.saving = true;
				this.showLoading('配置中...');
				await api.setStaWifi({ ssid: this.staSsid, password: this.staPassword });
				this.showToast('成功', '已保存，设备正在连接 WiFi...', 'success');
				// 轮询连接状态，最多尝试 10 次（30 秒）
				for (let i = 0; i < 10; i++) {
					await new Promise(r => setTimeout(r, 3000));
					if (!this.deviceConnected) break;
					try {
						const res = await api.getStaWifi();
						if (res.status === 'success') {
							this.staInfo = res.data;
							if (res.data && res.data.connected) {
								this.showToast('成功', `已连接 ${res.data.ssid || ''}`, 'success');
								return;
							}
						}
					} catch (e) { /* 继续轮询 */ }
				}
				this.showToast('提示', '连接超时，请检查 WiFi 名称和密码是否正确', 'warning');
			} catch (e) {
				this.showToast('失败', e.message || '保存失败', 'error');
			} finally { this.saving = false; this.hideLoading(); }
		}
	}
};
</script>

<style lang="scss">
/* .page / .body / .card / .card-title / .btn / .input-wrap 均已全局化（App.vue） */

.desc { font-size: 26rpx; color: $text-hint; margin-bottom: 24rpx; }
.info-row { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid $bg-page; }
.info-row:last-child { border-bottom: none; }
.info-label { font-size: 26rpx; color: $text-secondary; }
.info-value { font-size: 26rpx; color: $text-regular; font-weight: 500; }
.badge { display: flex; align-items: center; gap: 8rpx; padding: 6rpx 16rpx; border-radius: $radius-lg; background: $color-danger-bg; }
.badge.on { background: $color-success-bg; }
.dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: $color-danger; }
.badge.on .dot { background: $color-success; }
.badge text { font-size: $fs-caption; color: $color-danger; }
.badge.on text { color: $color-success; }
.form-item { margin-bottom: 24rpx; position: relative; }
.form-item:last-child { margin-bottom: 0; }
.pw-toggle { position: absolute; right: 16rpx; top: 44rpx; padding: 8rpx 12rpx; }
.pw-toggle text { font-size: $fs-label; color: $brand-primary; }
.tips { display: flex; flex-direction: column; gap: 12rpx; }
.tips text { font-size: $fs-label; color: $text-secondary; line-height: 1.6; }
</style>
