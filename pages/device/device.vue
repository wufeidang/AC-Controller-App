<template>
	<view class="page">
		<view class="body">
			<!-- 连接状态 -->
			<view class="card">
				<text class="card-title">连接状态</text>
				<view class="row"><text class="row-label">状态</text><view class="badge" :class="{ on: deviceConnected }"><view class="dot"></view><text>{{ connecting ? '连接中' : deviceConnected ? '已连接' : '未连接' }}</text></view></view>
				<view class="row" v-if="deviceConnected"><text class="row-label">设备 ID</text><text class="row-val">{{ deviceId }}</text></view>
				<view class="row"><text class="row-label">IP 地址</text><text class="row-val">{{ deviceAddress }}</text></view>
			</view>

			<!-- 连接控制 -->
			<view class="card">
				<text class="card-title">连接控制</text>
				<view class="form-item">
					<text class="label">设备 IP 地址</text>
					<input v-model="inputAddress" class="input" placeholder="192.168.4.1" :disabled="deviceConnected" />
				</view>
				<view class="btn-row">
					<view class="btn btn-primary" @click="handleConnect" :class="{ off: connecting || deviceConnected }">
						<text>{{ connecting ? '连接中...' : deviceConnected ? '已连接' : '连接设备' }}</text>
					</view>
					<view class="btn btn-danger" @click="handleDisconnect" :class="{ off: !deviceConnected }">
						<text>断开连接</text>
					</view>
				</view>
			</view>

			<!-- 连接引导 -->
			<view class="card" v-if="!deviceConnected">
				<text class="card-title">连接引导</text>
				<view class="tips">
					<text>1. 确保设备已通电并处于 AP 路由模式</text>
					<text>2. 手机连接到设备创建的 WiFi (默认名 ESP8266-AC)</text>
					<text>3. 输入设备 IP 地址（默认 192.168.4.1）</text>
					<text>4. 点击"连接设备"</text>
				</view>
			</view>
		</view>

		<Loading :visible="loadingVisible" :text="loadingText" />
		<CustomModal :visible="modalVisible" :title="modalTitle" :content="modalContent"
			:confirm-text="modalConfirmText" :cancel-text="modalHasCancel ? modalCancelText : ''"
			:close-on-click-overlay="false"
			:type="modalTitle === '失败' ? 'error' : (modalTitle === '成功' ? 'success' : 'info')"
			@confirm="handleModalConfirm" @cancel="handleModalCancel" />
	</view>
</template>

<script>
import Loading from '../../components/Loading';
import CustomModal from '../../components/CustomModal';
import apiService from '../../services/api';

export default {
	components: { Loading, CustomModal },
	data() {
		return {
			deviceConnected: false, connecting: false,
			deviceAddress: '192.168.4.1', inputAddress: '192.168.4.1', deviceId: '',
			loadingVisible: false, loadingText: '',
			modalVisible: false, modalTitle: '', modalContent: '',
			modalConfirmText: '确定', modalCancelText: '', modalHasCancel: false,
			networkCheckTimer: null, _modalCallback: null
		};
	},
	onLoad() { this.checkStatus(); this.startCheck(); },
	onShow() { this.checkStatus(); },
	onUnload() { if (this.networkCheckTimer) { clearInterval(this.networkCheckTimer); this.networkCheckTimer = null; } },
	methods: {
		checkStatus() {
			const d = uni.getStorageSync('connectedDevice');
			if (d && d.connected) {
				this.deviceConnected = true; this.deviceAddress = d.address || '192.168.4.1';
				this.deviceId = d.deviceId || ''; apiService.setDeviceAddress(this.deviceAddress);
			} else { this.deviceConnected = false; this.deviceId = ''; }
		},
		startCheck() { this.networkCheckTimer = setInterval(() => { this.checkStatus(); }, 10000); },
		handleConnect() { if (this.connecting || this.deviceConnected) return; this.doConnect(); },
		handleDisconnect() {
			this.showModal('确认', '确定要断开设备连接吗？', true, '确定', '取消');
			this._modalCallback = () => { this.doDisconnect(); };
		},
		async doConnect() {
			if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(this.inputAddress)) {
				this.showModal('提示', '请输入有效的 IP 地址'); return;
			}
			try {
				this.connecting = true; this.loadingVisible = true; this.loadingText = '连接中...';
				apiService.setDeviceAddress(this.inputAddress);
				const res = await apiService.getDeviceId();
				if (res.status === 'success') {
					const did = res.data.device_id;
					this.deviceId = did; this.deviceAddress = this.inputAddress;
					const info = { address: this.inputAddress, deviceId: did, connected: true };
					uni.setStorageSync('connectedDevice', info);
					uni.$emit('deviceConnected', { connected: true, device: info });
					this.deviceConnected = true;
					this.showModal('成功', '设备连接成功');
				} else {
					this.showModal('失败', (res.data && res.data.message) || '获取设备 ID 失败');
				}
			} catch (e) {
				this.showModal('失败', e.message || '连接失败，请检查设备是否通电并处于 AP 模式');
			} finally { this.connecting = false; this.loadingVisible = false; }
		},
		doDisconnect() {
			uni.removeStorageSync('connectedDevice');
			uni.$emit('deviceConnected', { connected: false });
			this.deviceConnected = false; this.deviceId = ''; this.deviceAddress = this.inputAddress;
		},
		showModal(title, content, hasCancel = false, confirmText = '确定', cancelText = '取消') {
			this.modalTitle = title; this.modalContent = content;
			this.modalConfirmText = confirmText; this.modalCancelText = cancelText;
			this.modalHasCancel = hasCancel; this.modalVisible = true;
		},
		handleModalConfirm() {
			this.modalVisible = false;
			if (this._modalCallback) { this._modalCallback(); this._modalCallback = null; }
		},
		handleModalCancel() { this.modalVisible = false; this._modalCallback = null; }
	}
};
</script>

<style scoped>
.page { min-height: 100vh; background: #F5F5F5; }
.body { padding: 32rpx; }
.card { background: #FFF; border-radius: 24rpx; padding: 32rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.card-title { font-size: 30rpx; font-weight: 600; color: #1A1A1A; margin-bottom: 20rpx; display: block; }
.row { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #F5F5F5; }
.row:last-child { border-bottom: none; }
.row-label { font-size: 26rpx; color: #666; }
.row-val { font-size: 26rpx; color: #333; font-weight: 500; }
.badge { display: flex; align-items: center; gap: 8rpx; padding: 6rpx 16rpx; border-radius: 16rpx; background: #FFF1F0; }
.badge.on { background: #F6FFED; }
.dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: #FF4D4F; }
.badge.on .dot { background: #00B96B; }
.badge text { font-size: 22rpx; color: #FF4D4F; }
.badge.on text { color: #00B96B; }
.form-item { margin-bottom: 24rpx; }
.label { display: block; font-size: 26rpx; color: #333; font-weight: 500; margin-bottom: 12rpx; }
.input { width: 100%; height: 80rpx; padding: 0 20rpx; border: 1rpx solid #D9D9D9; border-radius: 12rpx; font-size: 28rpx; color: #333; background: #FFF; box-sizing: border-box; }
.btn-row { display: flex; gap: 16rpx; }
.btn { flex: 1; padding: 24rpx; border-radius: 24rpx; text-align: center; transition: 150ms; }
.btn:active { transform: scale(0.98); }
.btn-primary { background: #FF6900; }
.btn-primary text { color: #FFF; font-size: 28rpx; font-weight: 500; }
.btn-danger { background: #FFF1F0; border: 1rpx solid #FFCCC7; }
.btn-danger text { color: #FF4D4F; font-size: 28rpx; font-weight: 500; }
.btn.off { opacity: 0.5; }
.tips { display: flex; flex-direction: column; gap: 12rpx; }
.tips text { font-size: 24rpx; color: #666; line-height: 1.6; }
</style>
