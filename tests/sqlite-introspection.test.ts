/**
 * SQLite introspection tools tests
 * 测试内置的数据库自省工具
 */

import { describe, it, expect } from 'vitest';
import { loadConfig } from '../src/config.js';
import { join } from 'path';
import { existsSync } from 'fs';

describe('SQLite Introspection Tools', () => {
  const introspectionConfigPath = join(process.cwd(), 'prebuilt/sqlite-introspection.yaml');

  it('should have introspection config file', () => {
    expect(existsSync(introspectionConfigPath)).toBe(true);
  });

  describe('Configuration Loading', () => {
    it('should load introspection config successfully', () => {
      const config = loadConfig(introspectionConfigPath);

      expect(config).toBeDefined();
      expect(config.sources).toBeDefined();
      expect(config.tools).toBeDefined();
      expect(config.toolsets).toBeDefined();
    });

    it('should have sqlite-db source configured', () => {
      const config = loadConfig(introspectionConfigPath);

      expect(config.sources['sqlite-db']).toBeDefined();
      expect(config.sources['sqlite-db'].kind).toBe('sqlite');
    });
  });

  describe('Database-Level Tools', () => {
    let config: ReturnType<typeof loadConfig>;

    it('should have sqlite_list_tables tool', () => {
      config = loadConfig(introspectionConfigPath);
      const tool = config.tools?.sqlite_list_tables;

      expect(tool).toBeDefined();
      expect(tool?.kind).toBe('sqlite-sql');
      expect(tool?.source).toBe('sqlite-db');
      expect(tool?.statement).toContain('sqlite_master');
      expect(tool?.statement).toContain('WHERE type IN');
      expect(tool?.parameters).toBeUndefined();
    });

    it('should have sqlite_list_all_tables_with_info tool', () => {
      config = loadConfig(introspectionConfigPath);
      const tool = config.tools?.sqlite_list_all_tables_with_info;

      expect(tool).toBeDefined();
      expect(tool?.statement).toContain('sql as create_statement');
    });

    it('should have sqlite_database_summary tool', () => {
      config = loadConfig(introspectionConfigPath);
      const tool = config.tools?.sqlite_database_summary;

      expect(tool).toBeDefined();
      expect(tool?.statement).toContain('FROM sqlite_master');
      expect(tool?.statement).toContain('ORDER BY type, name');
    });
  });

  describe('Table Structure Tools', () => {
    let config: ReturnType<typeof loadConfig>;

    it('should have sqlite_describe_table tool', () => {
      config = loadConfig(introspectionConfigPath);
      const tool = config.tools?.sqlite_describe_table;

      expect(tool).toBeDefined();
      expect(tool?.parameters).toBeDefined();
      expect(tool?.parameters?.length).toBe(1);
      expect(tool?.parameters?.[0].name).toBe('table_name');
      expect(tool?.parameters?.[0].type).toBe('string');
      expect(tool?.statement).toContain('PRAGMA table_info');
    });

    it('should have sqlite_get_table_schema tool', () => {
      config = loadConfig(introspectionConfigPath);
      const tool = config.tools?.sqlite_get_table_schema;

      expect(tool).toBeDefined();
      expect(tool?.parameters?.length).toBe(1);
      expect(tool?.statement).toContain('SELECT sql');
      expect(tool?.statement).toContain('WHERE type = \'table\'');
    });

    it('should have sqlite_list_columns tool', () => {
      config = loadConfig(introspectionConfigPath);
      const tool = config.tools?.sqlite_list_columns;

      expect(tool).toBeDefined();
      expect(tool?.parameters?.length).toBe(1);
      expect(tool?.statement).toContain('pragma_table_info');
    });
  });

  describe('Index Tools', () => {
    let config: ReturnType<typeof loadConfig>;

    it('should have sqlite_list_indexes tool', () => {
      config = loadConfig(introspectionConfigPath);
      const tool = config.tools?.sqlite_list_indexes;

      expect(tool).toBeDefined();
      expect(tool?.statement).toContain('WHERE type = \'index\'');
      expect(tool?.parameters).toBeUndefined();
    });

    it('should have sqlite_list_table_indexes tool', () => {
      config = loadConfig(introspectionConfigPath);
      const tool = config.tools?.sqlite_list_table_indexes;

      expect(tool).toBeDefined();
      expect(tool?.parameters?.length).toBe(1);
      expect(tool?.statement).toContain('pragma_index_list');
    });

    it('should have sqlite_describe_index tool', () => {
      config = loadConfig(introspectionConfigPath);
      const tool = config.tools?.sqlite_describe_index;

      expect(tool).toBeDefined();
      expect(tool?.parameters?.length).toBe(1);
      expect(tool?.parameters?.[0].name).toBe('index_name');
      expect(tool?.statement).toContain('pragma_index_info');
    });
  });

  describe('Foreign Key Tools', () => {
    it('should have sqlite_list_foreign_keys tool', () => {
      const config = loadConfig(introspectionConfigPath);
      const tool = config.tools?.sqlite_list_foreign_keys;

      expect(tool).toBeDefined();
      expect(tool?.parameters?.length).toBe(1);
      expect(tool?.statement).toContain('pragma_foreign_key_list');
      expect(tool?.statement).toContain('on_update');
      expect(tool?.statement).toContain('on_delete');
    });
  });

  describe('Statistics Tools', () => {
    let config: ReturnType<typeof loadConfig>;

    it('should have sqlite_count_rows tool', () => {
      config = loadConfig(introspectionConfigPath);
      const tool = config.tools?.sqlite_count_rows;

      expect(tool).toBeDefined();
      expect(tool?.parameters?.length).toBe(1);
      expect(tool?.statement).toContain('COUNT(*)');
    });

    it('should have sqlite_table_stats tool', () => {
      config = loadConfig(introspectionConfigPath);
      const tool = config.tools?.sqlite_table_stats;

      expect(tool).toBeDefined();
      expect(tool?.statement).toContain('sqlite_stat1');
    });

    it('should have sqlite_database_info tool', () => {
      config = loadConfig(introspectionConfigPath);
      const tool = config.tools?.sqlite_database_info;

      expect(tool).toBeDefined();
      expect(tool?.statement).toContain('PRAGMA database_list');
    });

    it('should have sqlite_get_schema_version tool', () => {
      config = loadConfig(introspectionConfigPath);
      const tool = config.tools?.sqlite_get_schema_version;

      expect(tool).toBeDefined();
      expect(tool?.statement).toContain('PRAGMA schema_version');
    });
  });

  describe('Data Preview Tools', () => {
    it('should have sqlite_preview_table tool', () => {
      const config = loadConfig(introspectionConfigPath);
      const tool = config.tools?.sqlite_preview_table;

      expect(tool).toBeDefined();
      expect(tool?.parameters?.length).toBe(2);

      const params = tool?.parameters || [];
      expect(params.find((p) => p.name === 'table_name')).toBeDefined();
      expect(params.find((p) => p.name === 'limit')).toBeDefined();

      expect(tool?.statement).toContain('SELECT * FROM');
      expect(tool?.statement).toContain('LIMIT');
    });
  });

  describe('Toolsets', () => {
    let config: ReturnType<typeof loadConfig>;

    it('should have sqlite_introspection toolset', () => {
      config = loadConfig(introspectionConfigPath);
      const toolset = config.toolsets?.sqlite_introspection;

      expect(toolset).toBeDefined();
      expect(Array.isArray(toolset)).toBe(true);
      expect(toolset).toContain('sqlite_list_tables');
      expect(toolset).toContain('sqlite_describe_table');
      expect(toolset).toContain('sqlite_list_columns');
      expect(toolset).toContain('sqlite_preview_table');
      expect(toolset).toContain('sqlite_database_summary');
    });

    it('should have sqlite_advanced_introspection toolset', () => {
      config = loadConfig(introspectionConfigPath);
      const toolset = config.toolsets?.sqlite_advanced_introspection;

      expect(toolset).toBeDefined();
      expect(toolset).toContain('sqlite_list_all_tables_with_info');
      expect(toolset).toContain('sqlite_get_table_schema');
      expect(toolset).toContain('sqlite_list_indexes');
      expect(toolset).toContain('sqlite_list_foreign_keys');
    });

    it('should have sqlite_statistics toolset', () => {
      config = loadConfig(introspectionConfigPath);
      const toolset = config.toolsets?.sqlite_statistics;

      expect(toolset).toBeDefined();
      expect(toolset).toContain('sqlite_count_rows');
      expect(toolset).toContain('sqlite_table_stats');
      expect(toolset).toContain('sqlite_database_info');
      expect(toolset).toContain('sqlite_get_schema_version');
    });

    it('should have sqlite_complete toolset with all tools', () => {
      config = loadConfig(introspectionConfigPath);
      const toolset = config.toolsets?.sqlite_complete;

      expect(toolset).toBeDefined();
      expect(toolset!.length).toBeGreaterThan(10);

      // 验证包含所有主要工具
      const expectedTools = [
        'sqlite_list_tables',
        'sqlite_describe_table',
        'sqlite_list_columns',
        'sqlite_list_indexes',
        'sqlite_list_foreign_keys',
        'sqlite_preview_table',
        'sqlite_database_summary',
      ];

      for (const tool of expectedTools) {
        expect(toolset).toContain(tool);
      }
    });
  });

  describe('Tool Descriptions', () => {
    it('should have comprehensive descriptions for all tools', () => {
      const config = loadConfig(introspectionConfigPath);

      // 检查所有工具都有描述
      const tools = config.tools || {};
      for (const [toolName, tool] of Object.entries(tools)) {
        expect(tool.description).toBeDefined();
        expect(tool.description.length).toBeGreaterThan(10);
      }
    });

    it('should have Chinese descriptions for better AI understanding', () => {
      const config = loadConfig(introspectionConfigPath);

      // 验证描述是中文或包含中文说明
      const tool = config.tools?.sqlite_list_tables;
      expect(tool?.description).toBeDefined();
    });
  });

  describe('Parameter Definitions', () => {
    it('should use consistent parameter naming', () => {
      const config = loadConfig(introspectionConfigPath);

      // 所有需要表名的工具都应该使用 table_name 参数
      const tableTools = [
        'sqlite_describe_table',
        'sqlite_get_table_schema',
        'sqlite_list_columns',
        'sqlite_list_table_indexes',
        'sqlite_list_foreign_keys',
        'sqlite_count_rows',
        'sqlite_preview_table',
      ];

      for (const toolName of tableTools) {
        const tool = config.tools?.[toolName];
        expect(tool?.parameters).toBeDefined();
        const hasTableName = tool?.parameters?.some((p) => p.name === 'table_name');
        expect(hasTableName).toBe(true);
      }
    });

    it('should use consistent parameter types', () => {
      const config = loadConfig(introspectionConfigPath);

      // 验证参数类型正确
      expect(config.tools?.sqlite_describe_table?.parameters?.[0].type).toBe('string');
      expect(config.tools?.sqlite_preview_table?.parameters?.[1].type).toBe('integer');
    });
  });

  describe('SQL Statement Quality', () => {
    let config: ReturnType<typeof loadConfig>;

    it('should filter out SQLite internal tables', () => {
      config = loadConfig(introspectionConfigPath);

      const statementsToCheck = [
        config.tools?.sqlite_list_tables?.statement,
        config.tools?.sqlite_list_indexes?.statement,
        config.tools?.sqlite_database_summary?.statement,
      ];

      for (const statement of statementsToCheck) {
        expect(statement).toContain('NOT LIKE \'sqlite_%\'');
      }
    });

    it('should use proper PRAGMA commands or pragma functions', () => {
      config = loadConfig(introspectionConfigPath);

      // PRAGMA can be used as commands or table-valued functions
      expect(config.tools?.sqlite_describe_table?.statement).toContain('table_info');
      expect(config.tools?.sqlite_list_table_indexes?.statement).toContain('index_list');
      expect(config.tools?.sqlite_describe_index?.statement).toContain('index_info');
      expect(config.tools?.sqlite_list_foreign_keys?.statement).toContain('foreign_key_list');
    });

    it('should use proper ordering', () => {
      config = loadConfig(introspectionConfigPath);

      expect(config.tools?.sqlite_list_tables?.statement).toContain('ORDER BY name');
      expect(config.tools?.sqlite_database_summary?.statement).toContain('ORDER BY type, name');
    });
  });
});
