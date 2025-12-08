/**
 * SQLite database tests for mcp-database
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, generatePrebuiltConfig } from '../src/config.js';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

describe('SQLite Configuration', () => {
  describe('generatePrebuiltConfig', () => {
    it('should generate SQLite config without default database path when env not set', () => {
      // 清除环境变量
      const originalEnv = process.env.DATABASE_NAME;
      delete process.env.DATABASE_NAME;

      const config = generatePrebuiltConfig('sqlite');

      expect(config).toBeDefined();
      expect(config.sources).toBeDefined();
      expect(config.sources['sqlite-db']).toBeDefined();
      expect(config.sources['sqlite-db'].kind).toBe('sqlite');
      // 不再设置默认值，database 应为 undefined
      expect(config.sources['sqlite-db'].database).toBeUndefined();

      // 恢复环境变量
      if (originalEnv !== undefined) {
        process.env.DATABASE_NAME = originalEnv;
      }
    });

    it('should use DATABASE_NAME environment variable', () => {
      const originalEnv = process.env.DATABASE_NAME;
      process.env.DATABASE_NAME = './test.db';

      const config = generatePrebuiltConfig('sqlite');
      expect(config.sources['sqlite-db'].database).toBe('./test.db');

      if (originalEnv !== undefined) {
        process.env.DATABASE_NAME = originalEnv;
      } else {
        delete process.env.DATABASE_NAME;
      }
    });

    it('should only include database field when env is set', () => {
      // 清除环境变量
      const originalEnv = process.env.DATABASE_NAME;
      delete process.env.DATABASE_NAME;

      const config = generatePrebuiltConfig('sqlite');
      // 未设置环境变量时，database 字段不存在
      expect(config.sources['sqlite-db'].database).toBeUndefined();

      // 设置环境变量后，database 字段存在
      process.env.DATABASE_NAME = '/path/to/db.sqlite';
      const config2 = generatePrebuiltConfig('sqlite');
      expect(config2.sources['sqlite-db'].database).toBe('/path/to/db.sqlite');

      // 恢复环境变量
      if (originalEnv !== undefined) {
        process.env.DATABASE_NAME = originalEnv;
      } else {
        delete process.env.DATABASE_NAME;
      }
    });
  });

  describe('loadConfig with SQLite', () => {
    let tempConfigPath: string;

    beforeEach(() => {
      tempConfigPath = join(__dirname, `temp-config-${Date.now()}.yaml`);
    });

    afterEach(() => {
      if (existsSync(tempConfigPath)) {
        unlinkSync(tempConfigPath);
      }
    });

    it('should load SQLite configuration from YAML', () => {
      const yamlContent = `
sources:
  my-sqlite:
    kind: sqlite
    database: ./my-test.db
`;
      writeFileSync(tempConfigPath, yamlContent, 'utf-8');

      const config = loadConfig(tempConfigPath);
      expect(config.sources['my-sqlite']).toBeDefined();
      expect(config.sources['my-sqlite'].kind).toBe('sqlite');
      expect(config.sources['my-sqlite'].database).toBe('./my-test.db');
    });

    it('should replace environment variables in SQLite config', () => {
      const originalEnv = process.env.TEST_SQLITE_PATH;
      process.env.TEST_SQLITE_PATH = './env-test.db';

      const yamlContent = `
sources:
  my-sqlite:
    kind: sqlite
    database: \${TEST_SQLITE_PATH}
`;
      writeFileSync(tempConfigPath, yamlContent, 'utf-8');

      const config = loadConfig(tempConfigPath);
      expect(config.sources['my-sqlite'].database).toBe('./env-test.db');

      if (originalEnv !== undefined) {
        process.env.TEST_SQLITE_PATH = originalEnv;
      } else {
        delete process.env.TEST_SQLITE_PATH;
      }
    });

    it('should use default value when environment variable is not set', () => {
      const yamlContent = `
sources:
  my-sqlite:
    kind: sqlite
    database: \${NONEXISTENT_VAR:./default.db}
`;
      writeFileSync(tempConfigPath, yamlContent, 'utf-8');

      const config = loadConfig(tempConfigPath);
      expect(config.sources['my-sqlite'].database).toBe('./default.db');
    });

    it('should load SQLite tools configuration', () => {
      const yamlContent = `
sources:
  my-sqlite:
    kind: sqlite
    database: ./test.db

tools:
  get_users:
    kind: sqlite-sql
    source: my-sqlite
    description: Get all users
    statement: SELECT * FROM users;

  get_user_by_id:
    kind: sqlite-sql
    source: my-sqlite
    description: Get user by ID
    parameters:
      - name: user_id
        type: number
    statement: SELECT * FROM users WHERE id = ?1;
`;
      writeFileSync(tempConfigPath, yamlContent, 'utf-8');

      const config = loadConfig(tempConfigPath);
      expect(config.tools).toBeDefined();
      expect(config.tools?.get_users).toBeDefined();
      expect(config.tools?.get_users.kind).toBe('sqlite-sql');
      expect(config.tools?.get_users.source).toBe('my-sqlite');
      expect(config.tools?.get_user_by_id).toBeDefined();
      expect(config.tools?.get_user_by_id.parameters).toHaveLength(1);
    });

    it('should load SQLite toolsets configuration', () => {
      const yamlContent = `
sources:
  my-sqlite:
    kind: sqlite
    database: ./test.db

tools:
  list_users:
    kind: sqlite-sql
    source: my-sqlite
    description: List users
    statement: SELECT * FROM users LIMIT 20;

  create_user:
    kind: sqlite-sql
    source: my-sqlite
    description: Create user
    parameters:
      - name: name
        type: string
      - name: email
        type: string
    statement: INSERT INTO users (name, email) VALUES (?1, ?2) RETURNING *;

toolsets:
  user_crud:
    - list_users
    - create_user
`;
      writeFileSync(tempConfigPath, yamlContent, 'utf-8');

      const config = loadConfig(tempConfigPath);
      expect(config.toolsets).toBeDefined();
      expect(config.toolsets?.user_crud).toBeDefined();
      expect(config.toolsets?.user_crud).toHaveLength(2);
      expect(config.toolsets?.user_crud).toContain('list_users');
      expect(config.toolsets?.user_crud).toContain('create_user');
    });
  });
});

describe('SQLite Parameter Binding', () => {
  it('should use positional parameters with ?N syntax', () => {
    const yamlContent = `
sources:
  test-sqlite:
    kind: sqlite
    database: ./test.db

tools:
  update_user:
    kind: sqlite-sql
    source: test-sqlite
    description: Update user
    parameters:
      - name: user_id
        type: number
      - name: new_name
        type: string
      - name: new_email
        type: string
    statement: |
      UPDATE users
      SET name = ?2, email = ?3
      WHERE id = ?1
      RETURNING *;
`;
    const tempPath = join(__dirname, 'param-test.yaml');
    writeFileSync(tempPath, yamlContent, 'utf-8');

    const config = loadConfig(tempPath);
    const tool = config.tools?.update_user;

    expect(tool).toBeDefined();
    expect(tool?.parameters).toHaveLength(3);
    expect(tool?.statement).toContain('?1');
    expect(tool?.statement).toContain('?2');
    expect(tool?.statement).toContain('?3');

    unlinkSync(tempPath);
  });
});

describe('SQLite Edge Cases', () => {
  let tempConfigPath: string;

  beforeEach(() => {
    tempConfigPath = join(__dirname, `edge-case-${Date.now()}.yaml`);
  });

  afterEach(() => {
    if (existsSync(tempConfigPath)) {
      unlinkSync(tempConfigPath);
    }
  });

  it('should handle absolute paths for database', () => {
    const absolutePath = '/tmp/absolute-test.db';
    const yamlContent = `
sources:
  abs-sqlite:
    kind: sqlite
    database: ${absolutePath}
`;
    writeFileSync(tempConfigPath, yamlContent, 'utf-8');

    const config = loadConfig(tempConfigPath);
    expect(config.sources['abs-sqlite'].database).toBe(absolutePath);
  });

  it('should handle multiline SQL statements', () => {
    const yamlContent = `
sources:
  my-sqlite:
    kind: sqlite
    database: ./test.db

tools:
  complex_query:
    kind: sqlite-sql
    source: my-sqlite
    description: Complex query with multiple lines
    statement: |
      SELECT
        u.id,
        u.name,
        u.email,
        datetime(u.created_at) as created_at
      FROM users u
      WHERE u.id > 0
      ORDER BY u.created_at DESC
      LIMIT 10;
`;
    writeFileSync(tempConfigPath, yamlContent, 'utf-8');

    const config = loadConfig(tempConfigPath);
    const tool = config.tools?.complex_query;

    expect(tool).toBeDefined();
    expect(tool?.statement).toContain('SELECT');
    expect(tool?.statement).toContain('FROM users u');
    expect(tool?.statement).toContain('LIMIT 10');
  });

  it('should handle empty tools configuration', () => {
    const yamlContent = `
sources:
  my-sqlite:
    kind: sqlite
    database: ./test.db
`;
    writeFileSync(tempConfigPath, yamlContent, 'utf-8');

    const config = loadConfig(tempConfigPath);
    expect(config.sources['my-sqlite']).toBeDefined();
    expect(config.tools).toBeUndefined();
  });

  it('should handle special characters in database path', () => {
    const specialPath = './my-database (test) [2024].db';
    const yamlContent = `
sources:
  special-sqlite:
    kind: sqlite
    database: "${specialPath}"
`;
    writeFileSync(tempConfigPath, yamlContent, 'utf-8');

    const config = loadConfig(tempConfigPath);
    expect(config.sources['special-sqlite'].database).toBe(specialPath);
  });
});
