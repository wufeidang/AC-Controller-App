<template>
	<view class="page">
		<view class="body">
			<view class="card">
				<text class="card-title">AP 热点设置</text>
				<view class="form-item">
					<text class="label">热点名称 (SSID)</text>
					<input v-model="apSsid" class="input" placeholder="ESP8266-AC" maxlength="32" />
				</view>
				<view class="form-item">
					<text class="label">热点密码</text>
					<input v-model="apPassword" class="input" :password="!showPassword" placeholder="至少8位字符" maxlength="16" />
					<view class="pw-toggle" @click="showPassword = !showPassword">
						<text>{{ showPassword ? '隐藏' : '显示' }}</text>
					</view>
				</view>
			</view>

			<view class="card">
				<text class="card-title">说明</text>
				<view class="tips">
					<text>· AP 热点用于手机直连设备进行本地管理</text>
					<text>· 默认 IP 地址：192.168.4.1</text>
					<text>· 热点始终开启，修改后需重新连接</text>
				</view>
			</view>

			<view class="btn btn-primary" @click="saveSettings" :class="{ off: !deviceConnected || saving }">
				<text>{{ saving ? '保存中...' : '保存设置' }}</text>
			</view>
		</view>

		<Loading :visible="loadingVisible" :text="loadingText" />
		<CustomModal :visible="modalVisible" :title="modalTitle" :content="modalContent"
			:close-on-click-overlay="false" :type="modalType" :show-buttons="false" />
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
				loadingVisible: false, loadingText: '',
				apSsid: '', apPassword: '', showPassword: false, saving: false,
				modalVisible: false, modalTitle: '', modalContent: '', modalType: 'info'
			};
		},
		onLoad() { this.checkDevice(); this.loadSettings(); },
		onShow() { this.checkDevice(); },
		methods: {
			async loadSettings() {
				if (!this.deviceConnected) return;
				try { this.showLoading('加载中...'); const res = await api.getStatus(); if (res.status === 'success' && res.data.device_info) this.apSsid = res.data.device_info.wifi_name || ''; } catch (e) { /* 静默 */ } finally { this.hideLoading(); }
			},
			showToast(title, content, type = 'info') {
				this.modalTitle = title; this.modalContent = content; this.modalType = type;
				this.modalVisible = true;
				setTimeout(() => { this.modalVisible = false; }, 1500);
			},
			async saveSettings() {
				if (!this.deviceConnected) { this.showToast('提示', '请先连接设备', 'warning'); return; }
				if (!this.apSsid) { this.showToast('提示', '请输入热点名称', 'warning'); return; }
				if (this.saving) return;
				try {
					this.saving = true;
					this.showLoading('保存中...');
					await api.setSsid({ ssid: this.apSsid });
					if (this.apPassword && this.apPassword.length >= 8) await api.setWifiPassword({ password: this.apPassword });
					this.showToast('成功', '已保存', 'success');
					this.apPassword = '';
				} catch (e) { this.showToast('失败', e.message || '保存失败', 'error'); }
				finally { this.saving = false; this.hideLoading(); }
			}
	}
};
</script>

<style scoped>
.page { min-height: 100vh; background: #F5F5F5; }
.body { padding: 32rpx; }

.card { background: #FFF; border-radius: 24rpx; padding: 32rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.04); }
.card-title { font-size: 30rpx; font-weight: 600; color: #1A1A1A; margin-bottom: 24rpx; display: block; }

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
