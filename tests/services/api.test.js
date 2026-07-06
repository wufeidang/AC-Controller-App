import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRequest = vi.fn();
vi.stubGlobal('uni', {
  getStorageSync: () => null,
  request: mockRequest
});

// Dynamic import inside tests since module is singleton
let ApiService;

describe('ApiService.request', () => {
  beforeEach(async () => {
    mockRequest.mockReset();
    ApiService = (await import('../../services/api')).default;
    ApiService.setDeviceAddress('192.168.1.100');
    ApiService.resetFailCount();
  });

  it('returns resolved promise for 200 + success', async () => {
    mockRequest.mockResolvedValue({ statusCode: 200, data: { status: 'success', data: { temp: 25 } } });
    const res = await ApiService.getStatus();
    expect(res.status).toBe('success');
    expect(res.data.temp).toBe(25);
  });

  it('rejects with deviceError for 200 + error status', async () => {
    mockRequest.mockResolvedValue({ statusCode: 200, data: { status: 'error', data: { message: '参数错误' } } });
    try {
      await ApiService.getStatus();
    } catch (e) {
      expect(e.deviceError).toBe(true);
      expect(e.message).toBe('参数错误');
    }
  });

  it('rejects with friendly message for 404', async () => {
    mockRequest.mockResolvedValue({ statusCode: 404, data: {} });
    await expect(ApiService.getStatus()).rejects.toThrow('设备未响应');
  });

  it('rejects with timeout message on network timeout', async () => {
    mockRequest.mockRejectedValue({ errMsg: 'timeout', message: 'timeout' });
    await expect(ApiService.getStatus()).rejects.toThrow('请求超时');
  });

  it('changes baseUrl after setDeviceAddress', () => {
    ApiService.setDeviceAddress('10.0.0.1');
    expect(ApiService.baseUrl).toBe('http://10.0.0.1:80');
  });
});
