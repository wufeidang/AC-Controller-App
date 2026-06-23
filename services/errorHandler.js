/**
 * 错误处理模块
 * 处理网络错误和设备异常
 */

class ErrorHandler {
  /**
   * 处理错误
   * @param {Error} error - 错误对象
   * @returns {void}
   */
  static handleError(error) {
    console.error('错误:', error);

    let message = '操作失败，请重试';

    if (error.message.includes('Network')) {
      message = '网络连接失败';
    } else if (error.message.includes('Timeout')) {
      message = '请求超时';
    } else if (error.message.includes('404')) {
      message = '设备未找到';
    } else if (error.message.includes('设备未连接')) {
      message = '设备未连接';
    }

    uni.showToast({
      title: message,
      icon: 'error'
    });
  }

  /**
   * 处理成功
   * @param {string} message - 成功消息
   * @returns {void}
   */
  static handleSuccess(message) {
    uni.showToast({
      title: message,
      icon: 'success'
    });
  }

  /**
   * 显示加载中
   * @param {string} message - 加载消息
   * @returns {void}
   */
  static showLoading(message = '加载中...') {
    uni.showLoading({
      title: message
    });
  }

  /**
   * 隐藏加载中
   * @returns {void}
   */
  static hideLoading() {
    uni.hideLoading();
  }
}

export default ErrorHandler;
