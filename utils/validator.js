/**
 * 输入验证工具
 * 集中管理所有输入字段的验证规则
 */

/**
 * 验证 IP 地址或域名
 * @param {string} addr - 地址字符串
 * @returns {boolean}
 */
export function isValidAddress(addr) {
	if (!addr) return false;
	const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
	if (ipRegex.test(addr)) return true;
	// 域名格式
	const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
	return domainRegex.test(addr);
}

/**
 * 验证端口号
 * @param {string|number} port - 端口号
 * @returns {boolean}
 */
export function isValidPort(port) {
	const p = parseInt(port);
	return !isNaN(p) && p >= 1 && p <= 65535;
}

/**
 * 验证 URL
 * @param {string} url - URL 字符串
 * @returns {boolean}
 */
export function isValidUrl(url) {
	if (!url) return false;
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}

/**
 * 验证非空字符串
 * @param {string} str - 字符串
 * @returns {boolean}
 */
export function isNonEmpty(str) {
	return str && str.trim().length > 0;
}

/**
 * 验证字符串长度范围
 * @param {string} str - 字符串
 * @param {number} min - 最小长度
 * @param {number} max - 最大长度
 * @returns {boolean}
 */
export function isLengthValid(str, min, max) {
	if (!str) return false;
	const len = str.trim().length;
	return len >= min && len <= max;
}