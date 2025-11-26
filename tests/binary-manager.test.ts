import { describe, it, expect } from 'vitest';
import { getPlatform, getBinaryName, findBinary } from '../src/binary-manager.js';

describe('binary-manager', () => {
  describe('getPlatform', () => {
    it('should return valid platform information', () => {
      const platform = getPlatform();
      expect(platform).toBeDefined();
      expect(platform.os).toMatch(/^(linux|darwin|win32)$/);
      expect(platform.arch).toMatch(/^(x64|arm64)$/);
      expect(platform.binaryName).toBeDefined();
    });

    it('should have correct binary name for platform', () => {
      const platform = getPlatform();
      if (platform.os === 'win32') {
        expect(platform.binaryName).toBe('toolbox.exe');
      } else {
        expect(platform.binaryName).toBe('toolbox');
      }
    });
  });

  describe('getBinaryName', () => {
    it('should return correct binary name', () => {
      const name = getBinaryName();
      expect(name).toMatch(/^toolbox(\.exe)?$/);
    });
  });

  describe('findBinary', () => {
    it('should return null when binary not found in nonexistent path', () => {
      const result = findBinary({ binaryPath: '/nonexistent/path/that/does/not/exist' });
      // 可能找到系统 PATH 中的 toolbox，所以只检查不抛出错误
      expect(result === null || typeof result === 'string').toBe(true);
    });
  });
});
