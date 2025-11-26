import { describe, it, expect } from 'vitest';
import { generatePrebuiltConfig } from '../src/config.js';

describe('config', () => {
  describe('generatePrebuiltConfig', () => {
    it('should generate postgres config', () => {
      const config = generatePrebuiltConfig('postgres');
      expect(config.sources).toBeDefined();
      expect(config.sources['postgres-db']).toBeDefined();
      expect(config.sources['postgres-db'].kind).toBe('postgres');
    });

    it('should generate mysql config', () => {
      const config = generatePrebuiltConfig('mysql');
      expect(config.sources).toBeDefined();
      expect(config.sources['mysql-db']).toBeDefined();
      expect(config.sources['mysql-db'].kind).toBe('mysql');
    });

    it('should generate sqlite config', () => {
      const config = generatePrebuiltConfig('sqlite');
      expect(config.sources).toBeDefined();
      expect(config.sources['sqlite-db']).toBeDefined();
      expect(config.sources['sqlite-db'].kind).toBe('sqlite');
    });

    it('should use environment variables', () => {
      process.env.POSTGRES_HOST = 'test-host';
      process.env.POSTGRES_PORT = '5433';

      const config = generatePrebuiltConfig('postgres');
      expect(config.sources['postgres-db'].host).toBe('test-host');
      expect(config.sources['postgres-db'].port).toBe(5433);

      delete process.env.POSTGRES_HOST;
      delete process.env.POSTGRES_PORT;
    });
  });
});
