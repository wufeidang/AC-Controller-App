/**
 * API服务模块
 * 实现与ESP8266设备的通信
 */

import constants from '../config/constants';

class ApiService {
  constructor() {
    // 从本地存储获取设备地址
    const device = uni.getStorageSync('connectedDevice');
    this.baseUrl = device ? `http://${device.address}:80` : '';
    // 连续失败计数，用于判定设备是否真正离线
    this._failCount = 0;
    // 连续失败多少次后判定离线
    this._maxFailCount = 3;
  }

  /**
   * 设置设备地址
   * @param {string} address - 设备IP地址
   */
  setDeviceAddress(address) {
    this.baseUrl = `http://${address}:80`;
    this._failCount = 0; // 切换设备时重置失败计数
  }

  /**
   * 重置连续失败计数（用于设备断开时清理状态）
   */
  resetFailCount() {
    this._failCount = 0;
  }

  /**
   * 通用请求方法
   * @param {Object} data - 请求数据
   * @param {number} [timeout=8000] - 超时时间(ms)
   * @returns {Promise} - 返回Promise对象
   */
  async request(data, timeout) {
    if (!this.baseUrl) {
      throw new Error('设备未连接，请先连接设备');
    }

    try {
      // 构建请求配置
      const config = {
        url: this.baseUrl,
        method: 'POST',
        data: data,
        timeout: timeout || constants.HTTP_TIMEOUT
      };

      const response = await uni.request(config);

      // 请求成功，重置失败计数
      this._failCount = 0;

      if (response.statusCode === 200) {
        const body = response.data;
        // 后端业务失败（status === 'error'）：把后端 message 包成可识别错误透传
        if (body && body.status === 'error') {
          const msg = (body.data && body.data.message) || '设备返回错误';
          const err = new Error(msg);
          err.deviceError = true;
          throw err;
        }
        return body;
      } else if (response.statusCode === 404) {
        throw new Error('设备未响应，请检查设备是否开机并连接到网络');
      } else {
        throw new Error(`HTTP错误: ${response.statusCode}`);
      }
    } catch (error) {
      // 将底层超时/网络错误转为用户友好提示
      if (!error.deviceError) {
        this._failCount++;
        const errMsg = error.errMsg || error.message || '';
        if (errMsg.indexOf('timeout') > -1) {
          error.message = '请求超时，设备响应过慢，请检查设备状态后重试';
        } else if (errMsg.indexOf('fail') > -1) {
          error.message = '网络连接失败，请检查设备是否在线';
        }
        console.error('API请求错误:', error.message, `(${this._failCount}/${this._maxFailCount})`);
        // 注意：不会自动擦 storage 里的 connectedDevice.connected
        // ——网络抖动不等于用户主动断开。
        // 如需让 UI 感知设备不可达，由调用方在连续失败时显式标记。
      }
      throw error;
    }
  }

  /**
   * 获取设备状态
   * @returns {Promise} - 返回设备状态数据
   */
  async getStatus() {
    return this.request({ cmd: 'get_status', data: {} });
  }

  /**
   * 设置温湿度阈值
   * @param {Object} settings - 温湿度设置
   * @returns {Promise} - 返回设置结果
   */
  async setTempHum(settings) {
    return this.request({
      cmd: 'set_temp_hum',
      data: {
        controlType: settings.controlType,
        temp_on_threshold: settings.tempOnThreshold,
        temp_off_threshold: settings.tempOffThreshold,
        hum_on_threshold: settings.humOnThreshold,
        hum_off_threshold: settings.humOffThreshold,
        check_interval: settings.checkInterval || 5
      }
    });
  }

  /**
   * 设置空调参数
   * @param {Object} params - 空调参数
   * @returns {Promise} - 返回设置结果
   */
  async setAcParams(params) {
    return this.request({
      cmd: 'set_ac_params',
      data: params
    });
  }

  /**
   * 控制空调开关机
   * @param {string} action - 动作（on/off）
   * @returns {Promise} - 返回控制结果
   */
  async controlAc(action) {
    return this.request({
      cmd: 'control_ac',
      data: { action }
    });
  }

  /**
   * 设置温湿度校准参数
   * @param {Object} calibration - 校准参数
   * @returns {Promise} - 返回设置结果
   */
  async setCalibration(calibration) {
    return this.request({
      cmd: 'set_calibration',
      data: calibration
    });
  }

  /**
   * 设置设备信息
   * @param {Object} deviceInfo - 设备信息
   * @returns {Promise} - 返回设置结果
   */
  async setDeviceInfo(deviceInfo) {
    return this.request({
      cmd: 'set_device_info',
      data: deviceInfo
    });
  }

  /**
   * OTA升级
   * @param {Object} otaData - OTA升级数据
   * @returns {Promise} - 返回升级结果
   */
  async otaUpdate(otaData) {
    return this.request({
      cmd: 'ota_update',
      data: otaData
    }, constants.OTA_TIMEOUT); // OTA升级需要更长的超时时间
  }

  /**
   * 获取温湿度阈值
   * @returns {Promise} - 返回温湿度阈值设置
   */
  async getTempHumThreshold() {
    return this.request({ cmd: 'get_temp_hum_threshold', data: {} });
  }

  /**
   * 获取空调参数
   * @returns {Promise} - 返回空调参数设置
   */
  async getAcParams() {
    return this.request({ cmd: 'get_ac_params', data: {} });
  }

  /**
   * 获取温湿度校准参数
   * @returns {Promise} - 返回温湿度校准参数
   * @note 当前由 getStatus() 统一返回，保留此方法供独立查询场景使用
   */
  async getCalibration() {
    return this.request({ cmd: 'get_calibration', data: {} });
  }

  /**
   * 获取设备信息
   * @returns {Promise} - 返回设备信息
   * @note 当前由 getStatus() 统一返回，保留此方法供独立查询场景使用
   */
  async getDeviceInfo() {
    return this.request({ cmd: 'get_device_info', data: {} });
  }

  /**
   * 获取设备ID
   * @returns {Promise} - 返回设备ID
   */
  async getDeviceId() {
    return this.request({ cmd: 'get_device_id', data: {} });
  }

  /**
   * 设置设备SSID名称
   * @param {Object} data - SSID数据
   * @returns {Promise} - 返回设置结果
   */
  async setSsid(data) {
    return this.request({
      cmd: 'set_ssid',
      data: data
    });
  }

  /**
   * 设置设备WiFi密码
   * @param {Object} data - WiFi密码数据
   * @returns {Promise} - 返回设置结果
   */
  async setWifiPassword(data) {
    return this.request({
      cmd: 'set_wifi_password',
      data: data
    });
  }

  /**
   * 获取固件版本
   * @returns {Promise} - 返回固件版本信息
   */
  async getFirmwareVersion() {
    return this.request({ cmd: 'get_firmware_version', data: {} });
  }

  /**
   * 设置空调品牌
   * @param {string} brand - 空调品牌 (tcl/midea)
   * @returns {Promise} - 返回设置结果
   */
  async setAcBrand(brand) {
    return this.request({
      cmd: 'set_ac_brand',
      data: { brand }
    });
  }

  /**
   * 获取温湿度数据
   * @returns {Promise} - 返回温湿度数据
   */
  async getTempHum() {
    return this.request({ cmd: 'get_temp_hum', data: {} });
  }

  /**
   * 设置定时任务
   * @param {Object} timer - 定时任务参数
   * @param {number} timer.hour - 小时 (0-23)
   * @param {number} timer.minute - 分钟 (0-59)
   * @param {Array<boolean>} timer.repeat - 重复天数数组 (7个元素，对应周日到周六)
   * @param {string} timer.action - 动作 (on/off)
   * @returns {Promise} - 返回设置结果
   * @deprecated 定时器功能已丢弃，设备端未实现此接口，请勿调用
   */
  async setTimer(timer) {
    // 确保repeat数组长度为7，并且只包含布尔值
    const repeat = Array(7).fill(false);
    if (Array.isArray(timer.repeat)) {
      for (let i = 0; i < 7; i++) {
        repeat[i] = Boolean(timer.repeat[i]);
      }
    }
    
    return this.request({
      cmd: 'set_timer',
      data: {
        hour: timer.hour,
        minute: timer.minute,
        repeat: repeat,
        action: timer.action
      }
    });
  }

  /**
   * 获取定时任务
   * @returns {Promise} - 返回定时任务列表
   * @deprecated 定时器功能已丢弃，设备端未实现此接口，请勿调用
   */
  async getTimer() {
    return this.request({ cmd: 'get_timer', data: {} });
  }

  /**
   * 删除定时任务
   * @param {string} id - 定时任务ID
   * @returns {Promise} - 返回删除结果
   * @deprecated 定时器功能已丢弃，设备端未实现此接口，请勿调用
   */
  async deleteTimer(id) {
    return this.request({
      cmd: 'delete_timer',
      data: { id }
    });
  }

  /**
   * 设置场景模式
   * @param {string} scene - 场景模式 (sleep/energy_saving/comfort/quick)
   * @returns {Promise} - 返回设置结果
   */
  async setScene(scene) {
    return this.request({
      cmd: 'set_scene',
      data: { scene }
    });
  }

  /**
   * 获取场景模式
   * @returns {Promise} - 返回场景模式设置
   */
  async getScene() {
    return this.request({ cmd: 'get_scene', data: {} });
  }

  /**
   * 重启设备
   * @returns {Promise} - 返回重启结果
   */
  async restartDevice() {
    return this.request({ cmd: 'restart_device', data: {} });
  }

  /**
   * 恢复出厂设置
   * @returns {Promise} - 返回恢复出厂设置结果
   */
  async factoryReset() {
    return this.request({ cmd: 'factory_reset', data: {} });
  }

  /**
   * 获取系统信息
   * @returns {Promise} - 返回系统信息
   */
  async getSystemInfo() {
    return this.request({ cmd: 'get_system_info', data: {} });
  }

  /**
   * 进入深度睡眠
   * @returns {Promise} - 返回深度睡眠结果
   */
  async enterDeepSleep() {
    return this.request({ cmd: 'enter_deep_sleep', data: {} });
  }

  /**
   * 设置休眠开关
   * @param {boolean} enabled - 休眠开关状态
   * @returns {Promise} - 返回设置结果
   */
  async setSleepEnabled(enabled) {
    return this.request({
      cmd: 'set_sleep_enabled',
      data: { enabled }
    });
  }

  /**
   * 获取休眠开关状态
   * @returns {Promise} - 返回休眠开关状态
   */
  async getSleepEnabled() {
    return this.request({ cmd: 'get_sleep_enabled', data: {} });
  }

  /**
   * 设置STA（客户端）WiFi
   * @param {Object} data - STA WiFi配置
   * @param {string} data.ssid - WiFi名称
   * @param {string} data.password - WiFi密码
   * @returns {Promise} - 返回设置结果
   */
  async setStaWifi(data) {
    return this.request({
      cmd: 'set_sta_wifi',
      data: {
        ssid: data.ssid,
        password: data.password
      }
    });
  }

  /**
   * 获取STA（客户端）WiFi状态
   * @returns {Promise} - 返回STA WiFi连接状态
   */
  async getStaWifi() {
    return this.request({ cmd: 'get_sta_wifi', data: {} });
  }

  /**
   * 设置MQTT配置
   * @param {Object} config - MQTT配置
   * @param {string} config.server - MQTT服务器地址
   * @param {number} config.port - MQTT服务器端口
   * @param {string} config.user - MQTT用户名（可选）
   * @param {string} config.pass - MQTT密码（可选）
   * @param {string} config.topic - MQTT主题前缀
   * @returns {Promise} - 返回设置结果
   */
  async setMqttConfig(config) {
    return this.request({
      cmd: 'set_mqtt_config',
      data: config
    });
  }

  /**
   * 获取MQTT配置
   * @returns {Promise} - 返回MQTT配置信息
   */
  async getMqttConfig() {
    return this.request({ cmd: 'get_mqtt_config', data: {} });
  }
}

// 导出单例实例
export default new ApiService();
