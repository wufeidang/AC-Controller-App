// 弹窗 mixin — 统一 showToast / showConfirm / showLoading / hideLoading
// 所有页面导入此 mixin 后，不再需要各自实现 modal 状态

export default {
	data() {
		return {
			loadingVisible: false,
			loadingText: ''
		};
	},
	methods: {
		/**
		 * 轻提示 — 1.5 秒后自动消失
		 * @param {string} title - 标题（如"成功"/"失败"/"提示"）
		 * @param {string} content - 内容
		 * @param {string} type - 图标类型: success | error | warning | info
		 */
		showToast(title, content, type = 'info') {
			this.$emit('show-toast', { title, content, type });
		},

		/**
		 * 确认弹窗 — 显示「确定」按钮，用户手动关闭
		 * @param {string} title - 标题
		 * @param {string} content - 内容
		 */
		showConfirm(title, content) {
			this.$emit('show-confirm', { title, content });
		},

		/**
		 * 显示 Loading 遮罩
		 * @param {string} text - 提示文字
		 */
		showLoading(text = '加载中...') {
			this.loadingVisible = true;
			this.loadingText = text;
		},

		/**
		 * 隐藏 Loading 遮罩
		 */
		hideLoading() {
			this.loadingVisible = false;
			this.loadingText = '';
		}
	}
};
