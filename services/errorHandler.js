/**
 * 错误处理模块
 * 统一错误分类、用户提示、Loading 管理
 */

import constants from '../config/constants';

class ErrorHandler {
  /**
   * 根据错误内容返回用户友好的消息
   * @param {Error|string} error - 错误对象或消息字符串
   * @returns {string} 用户友好的错误提示
   */
  static getMessage(error) {
    const msg = (error && error.message) || String(error);

    if (msg.indexOf('timeout') > -1 || msg.indexOf('Timeout') > -1) {
      return constants.ERROR_MESSAGES.TIMEOUT;
    }
    if (msg.indexOf('fail') > -1 || msg.indexOf('Network') > -1) {
      return constants.ERROR_MESSAGES.NETWORK_ERROR;
    }
    if (msg.indexOf('离线') > -1 || msg.indexOf('offline') > -1) {
      return constants.ERROR_MESSAGES.OFFLINE;
    }
    if (msg.indexOf('设备未连接') > -1) {
      return '请先连接设备';
    }
    if (msg.indexOf('设备未响应') > -1 || msg.indexOf('404') > -1) {
      return '设备未找到，请检查设备是否开机并连接到网络';
    }
    if (msg.indexOf('busy') > -1 || msg.indexOf('忙') > -1) {
      return constants.ERROR_MESSAGES.DEVICE_BUSY;
    }
    return constants.ERROR_MESSAGES.UNKNOWN;
  }

  /**
   * 处理错误：记录日志 + 用户提示
   * @param {Error} error - 错误对象
   * @param {Object} options - 选项
   * @param {boolean} options.silent - 是否静默（不弹 toast）
   */
  static handleError(error, options = {}) {
    console.error('错误:', error.message || error);

    if (options.silent) return;

    const message = this.getMessage(error);
    uni.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    });
  }

  /**
   * 处理成功
   * @param {string} message - 成功消息
   */
  static handleSuccess(message) {
    uni.showToast({
      title: message,
      icon: 'success',
      duration: 1500
    });
  }

  /**
   * 显示加载中
   * @param {string} message - 加载消息
   */
  static showLoading(message = '加载中...') {
    uni.showLoading({
      title: message,
      mask: true
    });
  }

  /**
   * 隐藏加载中
   */
  static hideLoading() {
    uni.hideLoading();
  }

  /**
   * 包装异步操作：自动处理 loading + 错误
   * @param {Function} fn - 异步函数
   * @param {string} loadingText - 加载提示
   * @returns {Promise} 原始返回值
   */
  static async withLoading(fn, loadingText = '处理中...') {
    this.showLoading(loadingText);
    try {
      const result = await fn();
      return result;
    } catch (error) {
      this.handleError(error);
      throw error;
    } finally {
      this.hideLoading();
    }
  }
}

export default ErrorHandler;
