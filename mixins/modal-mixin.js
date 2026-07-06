// 弹窗 mixin — 统一 toast / confirm / loading 状态管理
// 所有页面导入此 mixin 后，自动获得 modal 状态属性和操作方法，无需各自重复声明

import constants from '../config/constants';

export default {
	data() {
		return {
			// Toast 状态
			modalVisible: false,
			modalTitle: '',
			modalContent: '',
			modalType: 'info',
			modalShowButtons: false,
			// Confirm 状态
			confirmVisible: false,
			confirmTitle: '',
			confirmContent: '',
			confirmText: '确定',
			cancelText: '取消',
			confirmType: 'warning',
			_confirmCallback: null,
			_toastTimer: null,
			// Loading 状态
			loadingVisible: false,
			loadingText: ''
		};
	},
	methods: {
		/**
		 * 轻提示 — 自动消失
		 * @param {string} title - 标题（如"成功"/"失败"/"提示"）
		 * @param {string} content - 内容
		 * @param {string} [type='info'] - 图标类型: success | error | warning | info
		 */
		showToast(title, content, type = 'info') {
			if (this._toastTimer) clearTimeout(this._toastTimer);
			this.modalTitle = title;
			this.modalContent = content;
			this.modalType = type;
			this.modalShowButtons = false;
			this.modalVisible = true;
			this._toastTimer = setTimeout(() => {
				this.modalVisible = false;
				this._toastTimer = null;
			}, constants.TOAST_DURATION);
		},

		/**
		 * 确认弹窗 — 用户手动确认/取消
		 * @param {string} title - 标题
		 * @param {string} content - 内容
		 * @param {Object} [options] - 选项
		 * @param {string} [options.confirmText='确定'] - 确认按钮文字
		 * @param {string} [options.cancelText='取消'] - 取消按钮文字
		 * @param {string} [options.type='warning'] - 图标类型
		 * @param {Function} [options.onConfirm] - 确认回调
		 */
		showConfirm(title, content, options = {}) {
			this.confirmTitle = title;
			this.confirmContent = content;
			this.confirmText = options.confirmText || '确定';
			this.cancelText = options.cancelText || '取消';
			this.confirmType = options.type || 'warning';
			this._confirmCallback = options.onConfirm || null;
			this.confirmVisible = true;
		},

		/** Toast 关闭（内部使用） */
		handleToastClose() { this.modalVisible = false; },

		/** Confirm 确认（内部使用） */
		handleConfirmOk() {
			this.confirmVisible = false;
			if (typeof this._confirmCallback === 'function') this._confirmCallback();
			this._confirmCallback = null;
		},

		/** Confirm 取消（内部使用） */
		handleConfirmCancel() {
			this.confirmVisible = false;
			this._confirmCallback = null;
		},

		/**
		 * 显示 Loading 遮罩
		 * @param {string} [text='加载中...'] - 提示文字
		 */
		showLoading(text = '加载中...') {
			this.loadingVisible = true;
			this.loadingText = text;
		},

		/** 隐藏 Loading 遮罩 */
			hideLoading() {
				this.loadingVisible = false;
			},

			// ===== 长按快增 =====
			/**
			 * 开始长按连续触发 — 500ms 后首次步进，之后间隔逐级加速
			 * @param {Function} stepFn - 每次步进执行的回调（如 decreaseTemp）
			 */
			startHold(stepFn) {
				this.stopHold(); // 防止重复触发
				let steps = 0;
				let interval = 300;
				this._holdTimer = setTimeout(() => {
					stepFn(); // 首次步进
					steps++;
					this._holdInterval = setInterval(() => {
						stepFn();
						steps++;
						// 动态加速：每 5 步减 50ms，最低 80ms
						if (steps % 5 === 0 && interval > 80) {
							interval -= 50;
							clearInterval(this._holdInterval);
							this._holdInterval = setInterval(stepFn, interval);
						}
					}, interval);
				}, 500);
			},
			/** 停止长按 */
			stopHold() {
				if (this._holdTimer) { clearTimeout(this._holdTimer); this._holdTimer = null; }
				if (this._holdInterval) { clearInterval(this._holdInterval); this._holdInterval = null; }
			}
		},
		beforeDestroy() {
			if (this._toastTimer) { clearTimeout(this._toastTimer); this._toastTimer = null; }
			this.stopHold();
		// 清理全局事件监听
		if (this._errorHandler) { uni.$off(constants.EVENTS.APP_ERROR, this._errorHandler); this._errorHandler = null; }
		if (this._appToastHandler) { uni.$off(constants.EVENTS.APP_TOAST, this._appToastHandler); this._appToastHandler = null; }
		if (this._appLoadingHandler) { uni.$off(constants.EVENTS.APP_LOADING, this._appLoadingHandler); this._appLoadingHandler = null; }
	},

	// 全局事件监听：errorHandler / 其他模块通过 uni.$emit 分发提示，由当前页面 CustomModal 展示
	onLoad() {
		this._errorHandler = (e) => this.showToast('错误', e.message, e.type || 'error');
		this._appToastHandler = (e) => this.showToast('提示', e.message, e.type || 'info');
		this._appLoadingHandler = (e) => {
			if (e.visible) this.showLoading(e.text);
			else this.hideLoading();
		};
		uni.$on(constants.EVENTS.APP_ERROR, this._errorHandler);
		uni.$on(constants.EVENTS.APP_TOAST, this._appToastHandler);
		uni.$on(constants.EVENTS.APP_LOADING, this._appLoadingHandler);
	},
	onUnload() {
		if (this._errorHandler) { uni.$off(constants.EVENTS.APP_ERROR, this._errorHandler); }
		if (this._appToastHandler) { uni.$off(constants.EVENTS.APP_TOAST, this._appToastHandler); }
		if (this._appLoadingHandler) { uni.$off(constants.EVENTS.APP_LOADING, this._appLoadingHandler); }
	}
};
