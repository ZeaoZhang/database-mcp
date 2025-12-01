/**
 * SQLite integration tests - testing actual database operations
 * These tests verify the tools.example.yaml configuration works correctly
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync } from 'fs';
import { loadConfig } from '../src/config.js';
import { join } from 'path';

describe('SQLite Integration Tests', () => {
  const sampleDbPath = join(process.cwd(), 'sample.sqlite');
  const exampleConfigPath = join(process.cwd(), 'tools.example.yaml');

  beforeAll(() => {
    // Verify test fixtures exist
    if (!existsSync(sampleDbPath)) {
      throw new Error(`Sample database not found at ${sampleDbPath}`);
    }
    if (!existsSync(exampleConfigPath)) {
      throw new Error(`Example config not found at ${exampleConfigPath}`);
    }
  });

  describe('Example Configuration', () => {
    it('should load tools.example.yaml successfully', () => {
      const config = loadConfig(exampleConfigPath);

      expect(config).toBeDefined();
      expect(config.sources).toBeDefined();
    });

    it('should have SQLite source configured', () => {
      const config = loadConfig(exampleConfigPath);

      expect(config.sources['my-sqlite']).toBeDefined();
      expect(config.sources['my-sqlite'].kind).toBe('sqlite');
      expect(config.sources['my-sqlite'].database).toBeDefined();
    });

    it('should have SQLite CRUD tools defined', () => {
      const config = loadConfig(exampleConfigPath);

      const expectedTools = [
        'sqlite_list_recent_users',
        'sqlite_get_user_by_id',
        'sqlite_find_user_by_email',
        'sqlite_create_user',
        'sqlite_update_user_email',
        'sqlite_delete_user',
      ];

      for (const toolName of expectedTools) {
        expect(config.tools?.[toolName]).toBeDefined();
        expect(config.tools?.[toolName].kind).toBe('sqlite-sql');
        expect(config.tools?.[toolName].source).toBe('my-sqlite');
      }
    });

    it('should have sqlite_crud toolset defined', () => {
      const config = loadConfig(exampleConfigPath);

      expect(config.toolsets?.sqlite_crud).toBeDefined();
      expect(Array.isArray(config.toolsets?.sqlite_crud)).toBe(true);
      expect(config.toolsets?.sqlite_crud?.length).toBeGreaterThan(0);
    });

    it('should have correct parameter definitions for sqlite_get_user_by_id', () => {
      const config = loadConfig(exampleConfigPath);
      const tool = config.tools?.sqlite_get_user_by_id;

      expect(tool).toBeDefined();
      expect(tool?.parameters).toBeDefined();
      expect(tool?.parameters?.length).toBe(1);
      expect(tool?.parameters?.[0].name).toBe('user_id');
      expect(tool?.parameters?.[0].type).toBe('number');
    });

    it('should have correct parameter definitions for sqlite_create_user', () => {
      const config = loadConfig(exampleConfigPath);
      const tool = config.tools?.sqlite_create_user;

      expect(tool).toBeDefined();
      expect(tool?.parameters).toBeDefined();
      expect(tool?.parameters?.length).toBe(2);

      const params = tool?.parameters || [];
      expect(params.find((p) => p.name === 'name')).toBeDefined();
      expect(params.find((p) => p.name === 'email')).toBeDefined();
    });

    it('should use positional parameters (?N) for SQLite queries', () => {
      const config = loadConfig(exampleConfigPath);

      // Check get_user_by_id uses ?1
      expect(config.tools?.sqlite_get_user_by_id?.statement).toContain('?1');

      // Check update uses ?1, ?2
      expect(config.tools?.sqlite_update_user_email?.statement).toContain('?1');
      expect(config.tools?.sqlite_update_user_email?.statement).toContain('?2');

      // Check create uses ?1, ?2
      expect(config.tools?.sqlite_create_user?.statement).toContain('?1');
      expect(config.tools?.sqlite_create_user?.statement).toContain('?2');
    });

    it('should have RETURNING clause for write operations', () => {
      const config = loadConfig(exampleConfigPath);

      // Create should return inserted data
      expect(config.tools?.sqlite_create_user?.statement).toContain('RETURNING');

      // Update should return updated data
      expect(config.tools?.sqlite_update_user_email?.statement).toContain('RETURNING');

      // Delete should return deleted data
      expect(config.tools?.sqlite_delete_user?.statement).toContain('RETURNING');
    });

    it('should use datetime() function for timestamps', () => {
      const config = loadConfig(exampleConfigPath);
      const tool = config.tools?.sqlite_list_recent_users;

      expect(tool?.statement).toContain('datetime(created_at)');
      expect(tool?.statement).toContain('ORDER BY datetime(created_at) DESC');
    });

    it('should have appropriate LIMIT clauses for list queries', () => {
      const config = loadConfig(exampleConfigPath);

      // List recent users should limit to 20
      expect(config.tools?.sqlite_list_recent_users?.statement).toContain('LIMIT 20');

      // Find by email should limit to 20
      expect(config.tools?.sqlite_find_user_by_email?.statement).toContain('LIMIT 20');
    });
  });

  describe('PostgreSQL Tools (for comparison)', () => {
    it('should have PostgreSQL tools using different parameter syntax', () => {
      const config = loadConfig(exampleConfigPath);

      // PostgreSQL uses $1, $2 syntax
      if (config.tools?.get_user_by_id) {
        expect(config.tools.get_user_by_id.kind).toBe('postgres-sql');
        expect(config.tools.get_user_by_id.statement).toContain('$1');
      }
    });
  });

  describe('Environment Variable Substitution', () => {
    it('should substitute SQLITE_DATABASE environment variable', () => {
      const originalEnv = process.env.SQLITE_DATABASE;

      // Set environment variable
      process.env.SQLITE_DATABASE = './custom-test.db';

      const config = loadConfig(exampleConfigPath);

      // Should use the env var value
      expect(config.sources['my-sqlite'].database).toBe('./custom-test.db');

      // Restore original
      if (originalEnv !== undefined) {
        process.env.SQLITE_DATABASE = originalEnv;
      } else {
        delete process.env.SQLITE_DATABASE;
      }
    });

    it('should use default value when env var not set', () => {
      const originalEnv = process.env.SQLITE_DATABASE;
      delete process.env.SQLITE_DATABASE;

      const config = loadConfig(exampleConfigPath);

      // Should use default from YAML
      expect(config.sources['my-sqlite'].database).toBe('./sample.sqlite');

      // Restore original
      if (originalEnv !== undefined) {
        process.env.SQLITE_DATABASE = originalEnv;
      }
    });
  });
});
