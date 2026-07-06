import { describe, it, expect } from 'vitest';
import { isValidAddress, isValidPort, isValidUrl, isNonEmpty } from '../../utils/validator';

describe('validator', () => {
  it('isValidAddress 验证合法 IP', () => {
    expect(isValidAddress('192.168.1.1')).toBe(true);
    expect(isValidAddress('0.0.0.0')).toBe(true);
    expect(isValidAddress('255.255.255.255')).toBe(true);
  });

  it('isValidAddress 拒绝非法 IP', () => {
    expect(isValidAddress('999.999.999.999')).toBe(false);
    expect(isValidAddress('256.0.0.1')).toBe(false);
    expect(isValidAddress('abc.def.ghi.jkl')).toBe(false);
  });

  it('isValidAddress 验证域名', () => {
    expect(isValidAddress('esp8266-ac.local')).toBe(true);
    expect(isValidAddress('example.com')).toBe(true);
  });

  it('isValidPort 验证端口', () => {
    expect(isValidPort(8080)).toBe(true);
    expect(isValidPort(1)).toBe(true);
    expect(isValidPort(65535)).toBe(true);
    expect(isValidPort(0)).toBe(false);
    expect(isValidPort(70000)).toBe(false);
  });

  it('isValidUrl 验证 URL', () => {
    expect(isValidUrl('http://example.com/firmware.bin')).toBe(true);
    expect(isValidUrl('https://bin.example.com/ota/1.0.0/firmware.bin')).toBe(true);
    expect(isValidUrl('')).toBe(false);
    expect(isValidUrl('not-a-url')).toBe(false);
  });

  it('isNonEmpty 验证非空', () => {
    expect(isNonEmpty('hello')).toBe(true);
    expect(isNonEmpty('')).toBe(false);
    expect(isNonEmpty('  ')).toBe(false);
  });
});
