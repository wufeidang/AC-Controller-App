<template>
	<view 
		class="button" 
		:class="[type, { disabled: disabled }]"
		@click="handleClick"
	>
		<text class="button-text">{{ text }}</text>
	</view>
</template>

<script>
export default {
	name: 'Button',
	props: {
		/**
		 * 按钮文本
		 */
		text: {
			type: String,
			required: true
		},
		/**
		 * 按钮类型 (primary, secondary, danger)
		 */
		type: {
			type: String,
			default: 'primary',
			validator: (value) => ['primary', 'secondary', 'danger'].includes(value)
		},
		/**
		 * 是否禁用
		 */
		disabled: {
			type: Boolean,
			default: false
		}
	},
	methods: {
		/**
		 * 处理按钮点击
		 */
		handleClick() {
			if (!this.disabled) {
				this.$emit('click');
			}
		}
	}
};
</script>

<style scoped>
.button {
	padding: 24rpx;
	border-radius: 12rpx;
	text-align: center;
	transition: all 0.3s ease;
	cursor: pointer;
}

.button.primary {
	background-color: #007aff;
}

.button.secondary {
	background-color: #f5f5f5;
	border: 1rpx solid #e8e8e8;
}

.button.danger {
	background-color: #ff4d4f;
}

.button.disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.button-text {
	font-size: 28rpx;
	font-weight: 500;
}

.button.primary .button-text {
	color: #ffffff;
}

.button.secondary .button-text {
	color: #333333;
}

.button.danger .button-text {
	color: #ffffff;
}

.button:hover:not(.disabled) {
	transform: translateY(-2rpx);
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
}

.button.primary:hover:not(.disabled) {
	background-color: #0066cc;
}

.button.secondary:hover:not(.disabled) {
	background-color: #e8e8e8;
}

.button.danger:hover:not(.disabled) {
	background-color: #ff7875;
}
</style>
