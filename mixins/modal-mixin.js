// 弹窗 mixin — 抽取 showToast() + showConfirm() + 弹窗相关 data
// 所有页面导入此 mixin 后，不再需要重复实现弹窗逻辑

export default {
	data() {
		return {
			modalVisible: false,
			modalTitle: '',
			modalContent: '',
			modalConfirmText: '确定',
			modalCancelText: '',
			modalHasCancel: false,
			modalShowButtons: true,
			_modalCallback: null
		};
	},
	methods: {
		/**
		 * 轻提示 — 1.5 秒后自动消失
		 */
		showToast(title, content) {
			this.modalTitle = title;
			this.modalContent = content;
			this.modalHasCancel = false;
			this.modalShowButtons = false;
			this.modalVisible = true;
			setTimeout(() => { this.modalVisible = false; }, 1500);
		},

		/**
		 * 确认弹窗 — 显示「确定」按钮，用户手动关闭
		 */
		showConfirm(title, content) {
			this.modalTitle = title;
			this.modalContent = content;
			this.modalHasCancel = false;
			this.modalShowButtons = true;
			this.modalConfirmText = '确定';
			this.modalVisible = true;
		},

		/**
		 * 弹窗确认回调
		 */
		handleModalConfirm() {
			this.modalVisible = false;
			if (this._modalCallback) {
				this._modalCallback();
				this._modalCallback = null;
			}
		},

		/**
		 * 弹窗取消回调
		 */
		handleModalCancel() {
			this.modalVisible = false;
			this._modalCallback = null;
		}
	}
};
