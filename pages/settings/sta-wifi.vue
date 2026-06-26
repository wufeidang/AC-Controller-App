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

export default {
	components: { Loading, CustomModal },
		mixins: [deviceMixin],
		data() {
			return {
				loadingVisible: false, loadingText: '',
			staInfo: null, staSsid: '', staPassword: '', showPassword: false, saving: false,
			modalVisible: false, modalTitle: '', modalContent: '', modalType: 'info'
		};
	},
		onLoad() { this.checkDevice(); if (this.deviceConnected) api.setDeviceAddress(this.deviceAddress); this.loadStatus(); },
			onShow() { this.checkDevice(); if (this.deviceConnected) { api.setDeviceAddress(this.deviceAddress); this.loadStatus(); } },
			methods: {
		async loadStatus() {
			if (!this.deviceConnected) return;
			try { this.loadingVisible = true; this.loadingText = '加载中...'; const res = await api.getStaWifi(); if (res.status === 'success') { this.staInfo = res.data; this.staSsid = res.data.ssid || ''; } } catch (e) { console.error(e); } finally { this.loadingVisible = false; }
		},
		showToast(title, content, type = 'info') { this.modalTitle = title; this.modalContent = content; this.modalType = type; this.modalVisible = true; setTimeout(() => { this.modalVisible = false; }, 1500); },
		async saveSettings() {
			if (!this.deviceConnected) { this.showToast('提示', '请先连接设备', 'warning'); return; }
			if (!this.staSsid || !this.staPassword) { this.showToast('提示', '请输入 WiFi 名称和密码', 'warning'); return; }
			if (this.saving) return;
			try {
				this.saving = true; this.loadingVisible = true; this.loadingText = '配置中...';
				await api.setStaWifi({ ssid: this.staSsid, password: this.staPassword });
				this.showToast('成功', '已保存，设备正在连接 WiFi...', 'success');
				// 轮询连接状态，最多尝试 10 次（30 秒）
				for (let i = 0; i < 10; i++) {
					await new Promise(r => setTimeout(r, 3000));
					if (!this.deviceConnected) break;
					this.loadingText = `等待连接...(${i + 1}/10)`;
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
			} finally { this.saving = false; this.loadingVisible = false; }
		}
	}
};
</script>

<style scoped>
.page { min-height: 100vh; background: #F5F5F5; }
.body { padding: 32rpx; }
.desc { font-size: 26rpx; color: #999; margin-bottom: 24rpx; }
.card { background: #FFF; border-radius: 24rpx; padding: 32rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.card-title { font-size: 30rpx; font-weight: 600; color: #1A1A1A; margin-bottom: 20rpx; display: block; }
.info-row { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #F5F5F5; }
.info-row:last-child { border-bottom: none; }
.info-label { font-size: 26rpx; color: #666; }
.info-value { font-size: 26rpx; color: #333; font-weight: 500; }
.badge { display: flex; align-items: center; gap: 8rpx; padding: 6rpx 16rpx; border-radius: 16rpx; background: #FFF1F0; }
.badge.on { background: #F6FFED; }
.dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: #FF4D4F; }
.badge.on .dot { background: #00B96B; }
.badge text { font-size: 22rpx; color: #FF4D4F; }
.badge.on text { color: #00B96B; }
.form-item { margin-bottom: 24rpx; position: relative; }
.form-item:last-child { margin-bottom: 0; }
.label { display: block; font-size: 26rpx; color: #333; font-weight: 500; margin-bottom: 12rpx; }
.input { width: 100%; height: 80rpx; padding: 0 20rpx; border: 1rpx solid #D9D9D9; border-radius: 12rpx; font-size: 28rpx; color: #333; background: #FFF; box-sizing: border-box; }
.pw-toggle { position: absolute; right: 16rpx; top: 44rpx; padding: 8rpx 12rpx; }
.pw-toggle text { font-size: 24rpx; color: #1677FF; }
.tips { display: flex; flex-direction: column; gap: 12rpx; }
.tips text { font-size: 24rpx; color: #666; line-height: 1.6; }
.btn { padding: 28rpx 32rpx; border-radius: 24rpx; text-align: center; margin-bottom: 32rpx; transition: 150ms; }
.btn:active { transform: scale(0.98); }
.btn-primary { background: #1677FF; }
.btn-primary text { color: #FFF; font-size: 30rpx; font-weight: 500; }
.btn.off { opacity: 0.5; }
</style>
