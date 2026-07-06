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
					<text>· 默认 IP 地址：{{ defaultIp }}</text>
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
	import constants from '../../config/constants';

	export default {
		components: { Loading, CustomModal },
			mixins: [deviceMixin, modalMixin],
				data() {
					return {
						apSsid: '', apPassword: '', showPassword: false, saving: false,
					};
			},
			computed: {
				defaultIp() { return constants.DEFAULT_IP; }
			},
		onLoad() { this.checkDevice(); this.loadSettings(); },
		onShow() { this.checkDevice(); },
		methods: {
			async loadSettings() {
				if (!this.deviceConnected) return;
				try { this.showLoading('加载中...'); const res = await api.getStatus(); if (res.status === 'success' && res.data.device_info) this.apSsid = res.data.device_info.wifi_name || ''; } catch (e) { console.warn('[ap-wifi] loadSettings:', e.message); } finally { this.hideLoading(); }
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

<style lang="scss">
/* .page / .body / .card / .card-title / .btn / .input-wrap 均已全局化（App.vue） */

/* .card-title 在本页面需要额外 24rpx 间距 */
.card-title { margin-bottom: 24rpx; }

.form-item { margin-bottom: 24rpx; position: relative; }
.form-item:last-child { margin-bottom: 0; }
.pw-toggle { position: absolute; right: 16rpx; top: 44rpx; padding: 8rpx 12rpx; }
.pw-toggle text { font-size: $fs-label; color: $brand-primary; }

.tips { display: flex; flex-direction: column; gap: 12rpx; }
.tips text { font-size: $fs-label; color: $text-secondary; line-height: 1.6; }
</style>
