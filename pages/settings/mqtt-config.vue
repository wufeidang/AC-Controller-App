<template>
	<view class="page">
		<view class="body">
			<view class="desc">对接 Home Assistant 等智能家居平台，实现远程监控与控制</view>

			<!-- 当前配置 -->
			<view class="card" v-if="hasConfig">
				<text class="card-title">当前配置</text>
				<view class="info-row" v-if="mqttServer"><text class="info-label">服务器</text><text class="info-value">{{ mqttServer }}:{{ mqttPort }}</text></view>
				<view class="info-row" v-if="mqttUser"><text class="info-label">用户名</text><text class="info-value">{{ mqttUser }}</text></view>
				<view class="info-row" v-if="mqttTopic"><text class="info-label">主题前缀</text><text class="info-value">{{ mqttTopic }}</text></view>
			</view>
			<view class="card" v-else>
				<text class="card-title">当前配置</text>
				<text style="font-size:26rpx;color:#999;">尚未配置 MQTT，请填写下方参数</text>
			</view>

			<!-- 参数设置 -->
			<view class="card">
				<text class="card-title">参数设置</text>
				<view class="form-item">
					<text class="label">服务器地址</text>
					<input v-model="mqttServer" class="input" placeholder="mqtt.example.com 或 IP" maxlength="128" />
					<text class="hint">MQTT Broker 地址</text>
				</view>
				<view class="form-item">
					<text class="label">端口号</text>
					<input v-model="mqttPort" class="input" placeholder="1883" maxlength="5" />
					<text class="hint">默认 1883</text>
				</view>
				<view class="form-item">
					<text class="label">用户名（可选）</text>
					<input v-model="mqttUser" class="input" placeholder="MQTT 用户名" maxlength="64" />
				</view>
				<view class="form-item">
					<text class="label">密码（可选）</text>
					<input v-model="mqttPass" :password="!showPassword" class="input" placeholder="MQTT 密码" maxlength="64" />
					<view class="pw-toggle" @click="showPassword = !showPassword"><text>{{ showPassword ? '隐藏' : '显示' }}</text></view>
				</view>
				<view class="form-item">
					<text class="label">主题前缀</text>
					<input v-model="mqttTopic" class="input" placeholder="home/ac" maxlength="64" />
					<text class="hint">状态主题为 {前缀}/status，控制主题为 {前缀}/cmd</text>
				</view>
			</view>

			<view class="card">
				<text class="card-title">MQTT 主题说明</text>
				<view class="tips">
					<text>· {topic}/status — 设备状态定时推送（温度/湿度/空调状态）</text>
					<text>· {topic}/cmd — 接收控制指令（开关/调温/场景）</text>
					<text>· {topic}/threshold — 温湿度阈值信息推送</text>
					<text>· 可配合 Home Assistant MQTT Discovery 自动发现设备</text>
				</view>
			</view>

			<view class="btn btn-primary" @click="saveSettings" :class="{ off: !deviceConnected || saving }">
				<text>{{ saving ? '保存中...' : '保存 MQTT 配置' }}</text>
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

export default {
	components: { Loading, CustomModal },
	data() {
		return {
			deviceConnected: false, loadingVisible: false, loadingText: '',
			mqttServer: '', mqttPort: '1883', mqttUser: '', mqttPass: '', mqttTopic: '',
			showPassword: false, saving: false,
			modalVisible: false, modalTitle: '', modalContent: '', modalType: 'info'
		};
	},
	computed: { hasConfig() { return !!(this.mqttServer || this.mqttTopic); } },
	onLoad() { this.checkDevice(); this.loadConfig(); },
	onShow() { this.checkDevice(); },
	methods: {
		checkDevice() { const d = uni.getStorageSync('connectedDevice'); this.deviceConnected = d && d.connected; if (d) api.setDeviceAddress(d.address); },
		async loadConfig() { if (!this.deviceConnected) return; try { this.loadingVisible = true; this.loadingText = '加载中...'; const res = await api.getMqttConfig(); if (res.status === 'success') { const d = res.data; this.mqttServer = d.server || ''; this.mqttPort = d.port ? String(d.port) : '1883'; this.mqttUser = d.user || ''; this.mqttPass = d.pass || ''; this.mqttTopic = d.topic || ''; } } catch (e) { console.error(e); } finally { this.loadingVisible = false; } },
		showToast(title, content, type = 'info') { this.modalTitle = title; this.modalContent = content; this.modalType = type; this.modalVisible = true; setTimeout(() => { this.modalVisible = false; }, 1500); },
		async saveSettings() {
			if (!this.deviceConnected) { this.showToast('提示', '请先连接设备', 'warning'); return; }
			if (this.saving) return;
			try { this.saving = true; this.loadingVisible = true; this.loadingText = '保存中...'; const cfg = {}; if (this.mqttServer) cfg.server = this.mqttServer; if (this.mqttPort) cfg.port = parseInt(this.mqttPort) || 1883; if (this.mqttUser) cfg.user = this.mqttUser; if (this.mqttPass) cfg.pass = this.mqttPass; if (this.mqttTopic) cfg.topic = this.mqttTopic; await api.setMqttConfig(cfg); this.showToast('成功', 'MQTT 配置已保存', 'success'); } catch (e) { this.showToast('失败', e.message || '保存失败', 'error'); } finally { this.saving = false; this.loadingVisible = false; }
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
.form-item { margin-bottom: 24rpx; position: relative; }
.form-item:last-child { margin-bottom: 0; }
.label { display: block; font-size: 26rpx; color: #333; font-weight: 500; margin-bottom: 12rpx; }
.input { width: 100%; height: 80rpx; padding: 0 20rpx; border: 1rpx solid #D9D9D9; border-radius: 12rpx; font-size: 28rpx; color: #333; background: #FFF; box-sizing: border-box; }
.hint { display: block; font-size: 22rpx; color: #999; margin-top: 8rpx; }
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
