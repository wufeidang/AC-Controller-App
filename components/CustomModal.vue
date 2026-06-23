<template>
	<view class="overlay" v-if="visible" @click="handleOverlayClick">
		<view class="modal" @click.stop :class="{ toast: !showButtons }">
			<!-- 图标区 -->
			<view class="modal-icon-wrap" v-if="type || customIcon">
				<view v-if="customIcon" class="modal-icon" :class="type">
					<image :src="customIcon" class="modal-icon-img" mode="aspectFit" />
				</view>
				<view v-else-if="type === 'success'" class="modal-icon success">
					<text class="modal-icon-text">✓</text>
				</view>
				<view v-else-if="type === 'error'" class="modal-icon error">
					<text class="modal-icon-text">✕</text>
				</view>
				<view v-else-if="type === 'warning'" class="modal-icon warning">
					<text class="modal-icon-text">!</text>
				</view>
				<view v-else-if="type === 'info'" class="modal-icon info">
					<text class="modal-icon-text">i</text>
				</view>
			</view>

			<!-- 标题 -->
			<text class="modal-title" v-if="title">{{ title }}</text>

			<!-- 内容 -->
			<text class="modal-text" v-if="content && !$slots.default">{{ content }}</text>
			<view class="modal-body" v-else-if="$slots.default"><slot></slot></view>

			<!-- 输入框 -->
			<view class="input-wrap" v-if="editable">
				<view class="input-row" :class="{ 'has-toggle': passwordInput }">
					<input
						v-model="inputValue"
						:type="passwordInput && !showPassword ? 'password' : 'text'"
						:placeholder="placeholderText"
						class="modal-input"
						:maxlength="passwordInput ? 16 : 50"
					/>
					<view v-if="passwordInput" class="pw-eye" @click="handleTogglePassword">
						<text>{{ showPassword ? '🙈' : '👁' }}</text>
					</view>
				</view>
				<text v-if="passwordInput" class="pw-hint">8-16 位字符</text>
			</view>

			<!-- 按钮 -->
			<view v-if="showButtons" class="btn-row">
				<view class="btn cancel" v-if="cancelText" @click="handleCancel">
					<text>{{ cancelText }}</text>
				</view>
				<view class="btn confirm" :class="type" @click="handleConfirm">
					<text>{{ confirmText }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'CustomModal',
	props: {
		visible:       { type: Boolean, default: false },
		title:         { type: String, default: '' },
		content:       { type: String, default: '' },
		confirmText:   { type: String, default: '确定' },
		cancelText:    { type: String, default: '' },
		editable:      { type: Boolean, default: false },
		placeholderText: { type: String, default: '' },
		closeOnClickOverlay: { type: Boolean, default: false },
		type:          { type: String, default: '', validator: v => ['success','error','warning','info',''].includes(v) },
		customIcon:    { type: String, default: '' },
		showButtons:   { type: Boolean, default: true },
		passwordInput: { type: Boolean, default: false },
		showPassword:  { type: Boolean, default: false }
	},
	data() { return { inputValue: '' }; },
	methods: {
		handleConfirm()   { this.$emit('confirm', this.inputValue); this.inputValue = ''; },
		handleCancel()    { this.$emit('cancel'); this.inputValue = ''; },
		handleOverlayClick() { if (this.closeOnClickOverlay) { this.$emit('cancel'); this.inputValue = ''; } },
		handleTogglePassword() { this.$emit('toggle-password'); }
	}
};
</script>

<style scoped>
/* ========== 遮罩 ========== */
.overlay {
	position: fixed; top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(0,0,0,0.45);
	display: flex; align-items: center; justify-content: center;
	z-index: 9999;
	animation: fadeIn 200ms ease-out;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

/* ========== 弹窗主体 ========== */
.modal {
	width: 85%; max-width: 560rpx;
	background: #FFFFFF;
	border-radius: 32rpx;
	padding: 48rpx 40rpx 40rpx;
	box-shadow: 0 16rpx 48rpx rgba(0,0,0,0.12);
	animation: popIn 250ms cubic-bezier(0.34, 1.56, 0.64, 1);
	display: flex; flex-direction: column; align-items: center;
}
.modal.toast {
	padding: 40rpx 36rpx;
}
@keyframes popIn {
	from { opacity: 0; transform: scale(0.92) translateY(16rpx); }
	to   { opacity: 1; transform: scale(1) translateY(0); }
}

/* ========== 图标 ========== */
.modal-icon-wrap { margin-bottom: 28rpx; }
.modal-icon {
	width: 88rpx; height: 88rpx; border-radius: 50%;
	display: flex; align-items: center; justify-content: center;
}
.modal-icon.success { background: #F0FFF4; }
.modal-icon.error   { background: #FFF1F0; }
.modal-icon.warning { background: #FFF7E6; }
.modal-icon.info    { background: #F0F5FF; }
.modal-icon-img { width: 48rpx; height: 48rpx; }
.modal-icon-text { font-size: 44rpx; font-weight: 700; }
.modal-icon.success .modal-icon-text { color: #00B96B; }
.modal-icon.error   .modal-icon-text { color: #FF4D4F; }
.modal-icon.warning .modal-icon-text { color: #FA8C16; }
.modal-icon.info    .modal-icon-text { color: #1677FF; }

/* ========== 标题 ========== */
.modal-title {
	font-size: 34rpx; font-weight: 600; color: #1A1A1A;
	text-align: center; margin-bottom: 16rpx;
}

/* ========== 内容文字 ========== */
.modal-text {
	font-size: 28rpx; color: #666;
	line-height: 1.7; text-align: center;
	word-break: break-all;
}

/* ========== 输入框 ========== */
.input-wrap { width: 100%; margin-top: 24rpx; }
.input-row { position: relative; }
.input-row.has-toggle { /* placeholder */ }
.modal-input {
	width: 100%; height: 80rpx; padding: 0 24rpx;
	border: 1rpx solid #E8E8E8; border-radius: 16rpx;
	font-size: 28rpx; color: #333; background: #FAFAFA;
	text-align: center; box-sizing: border-box;
}
.modal-input:focus { border-color: #FF6900; }
.pw-eye {
	position: absolute; right: 16rpx; top: 50%;
	transform: translateY(-50%); padding: 8rpx;
}
.pw-eye text { font-size: 28rpx; }
.pw-hint { font-size: 22rpx; color: #999; text-align: center; margin-top: 10rpx; }

/* ========== 按钮区 ========== */
.btn-row {
	display: flex; width: 100%; margin-top: 36rpx;
	border-top: 1rpx solid #F0F0F0; padding-top: 28rpx;
	gap: 16rpx;
}
.btn {
	flex: 1; padding: 22rpx 0; border-radius: 20rpx;
	text-align: center; transition: 150ms;
}
.btn:active { transform: scale(0.97); }
.btn.cancel { background: #F5F5F5; }
.btn.cancel text { font-size: 28rpx; color: #666; font-weight: 500; }
.btn.confirm { background: #FF6900; }
.btn.confirm text { font-size: 28rpx; color: #FFF; font-weight: 500; }
.btn.confirm.success { background: #00B96B; }
.btn.confirm.error   { background: #FF4D4F; }
.btn.confirm.warning { background: #FA8C16; }
.btn.confirm.info    { background: #1677FF; }
</style>
