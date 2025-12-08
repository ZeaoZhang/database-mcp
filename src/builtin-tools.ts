/**
 * Built-in database tools that provide common utility functions
 * These tools wrap the underlying execute_sql tool to provide convenient shortcuts
 */

import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { PrebuiltDatabase } from './types.js';

export interface BuiltinTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (
    args: Record<string, unknown>,
    toolboxClient: Client,
    dbType?: PrebuiltDatabase
  ) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>;
}

/**
 * SQL templates for different database types
 */
/**
 * Helper to format table name with schema (for PostgreSQL/MSSQL)
 */
function formatTableWithSchema(table: string, schema?: string, dbType?: string): string {
  if (!schema || schema === 'public') {
    // Default schema, no need to prefix
    switch (dbType) {
      case 'postgres':
        return `"${table}"`;
      case 'mysql':
        return `\`${table}\``;
      case 'mssql':
        return `[${table}]`;
      default:
        return `"${table}"`;
    }
  }

  // Include schema prefix
  switch (dbType) {
    case 'postgres':
      return `"${schema}"."${table}"`;
    case 'mssql':
      return `[${schema}].[${table}]`;
    default:
      return `"${schema}"."${table}"`;
  }
}

const SQL_TEMPLATES = {
  // List all tables (with optional schema support)
  listTables: {
    postgres: (schema?: string) =>
      `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema || 'public'}' ORDER BY table_name`,
    mysql: () => 'SHOW TABLES',
    sqlite: () => "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    mssql: (schema?: string) =>
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'${schema ? ` AND TABLE_SCHEMA = '${schema}'` : ''} ORDER BY TABLE_NAME`,
    default: (schema?: string) =>
      `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema || 'public'}' ORDER BY table_name`,
  },

  // List all schemas (PostgreSQL/MSSQL specific)
  listSchemas: {
    postgres: "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast') ORDER BY schema_name",
    mysql: 'SHOW DATABASES', // MySQL uses databases as schemas
    sqlite: "SELECT 'main' as schema_name", // SQLite doesn't have schemas
    mssql: "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME NOT IN ('guest', 'INFORMATION_SCHEMA', 'sys') ORDER BY SCHEMA_NAME",
    default: 'SELECT schema_name FROM information_schema.schemata ORDER BY schema_name',
  },

  // List all databases
  listDatabases: {
    postgres: 'SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname',
    mysql: 'SHOW DATABASES',
    sqlite: 'PRAGMA database_list',
    mssql: 'SELECT name FROM sys.databases ORDER BY name',
    default: 'SELECT datname FROM pg_database ORDER BY datname',
  },

  // Describe table schema (with optional schema support)
  describeTable: {
    postgres: (table: string, schema?: string) =>
      `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = '${schema || 'public'}' AND table_name = '${table}' ORDER BY ordinal_position`,
    mysql: (table: string) => `DESCRIBE ${table}`,
    sqlite: (table: string) => `PRAGMA table_info(${table})`,
    mssql: (table: string, schema?: string) =>
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}'${schema ? ` AND TABLE_SCHEMA = '${schema}'` : ''} ORDER BY ORDINAL_POSITION`,
    default: (table: string, schema?: string) =>
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = '${schema || 'public'}' AND table_name = '${table}'`,
  },

  // Preview table (first N rows) - with schema support
  previewTable: {
    postgres: (table: string, limit: number, schema?: string) =>
      `SELECT * FROM ${formatTableWithSchema(table, schema, 'postgres')} LIMIT ${limit}`,
    mysql: (table: string, limit: number) => `SELECT * FROM \`${table}\` LIMIT ${limit}`,
    sqlite: (table: string, limit: number) => `SELECT * FROM "${table}" LIMIT ${limit}`,
    mssql: (table: string, limit: number, schema?: string) =>
      `SELECT TOP ${limit} * FROM ${formatTableWithSchema(table, schema, 'mssql')}`,
    default: (table: string, limit: number, schema?: string) =>
      `SELECT * FROM ${formatTableWithSchema(table, schema, 'postgres')} LIMIT ${limit}`,
  },

  // Count rows in table - with schema support
  countRows: {
    postgres: (table: string, schema?: string) =>
      `SELECT COUNT(*) as row_count FROM ${formatTableWithSchema(table, schema, 'postgres')}`,
    mysql: (table: string) => `SELECT COUNT(*) as row_count FROM \`${table}\``,
    sqlite: (table: string) => `SELECT COUNT(*) as row_count FROM "${table}"`,
    mssql: (table: string, schema?: string) =>
      `SELECT COUNT(*) as row_count FROM ${formatTableWithSchema(table, schema, 'mssql')}`,
    default: (table: string, schema?: string) =>
      `SELECT COUNT(*) as row_count FROM ${formatTableWithSchema(table, schema, 'postgres')}`,
  },

  // Get table statistics (columns count) - with schema support
  tableStats: {
    postgres: (table: string, schema?: string) =>
      `SELECT
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = '${schema || 'public'}' AND table_name = '${table}') as column_count,
        (SELECT COUNT(*) FROM ${formatTableWithSchema(table, schema, 'postgres')}) as row_count`,
    mysql: (table: string) =>
      `SELECT
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${table}') as column_count,
        (SELECT COUNT(*) FROM \`${table}\`) as row_count`,
    sqlite: (table: string) =>
      `SELECT
        (SELECT COUNT(*) FROM pragma_table_info('${table}')) as column_count,
        (SELECT COUNT(*) FROM "${table}") as row_count`,
    mssql: (table: string, schema?: string) =>
      `SELECT
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}'${schema ? ` AND TABLE_SCHEMA = '${schema}'` : ''}) as column_count,
        (SELECT COUNT(*) FROM ${formatTableWithSchema(table, schema, 'mssql')}) as row_count`,
    default: (table: string, schema?: string) =>
      `SELECT COUNT(*) as row_count FROM ${formatTableWithSchema(table, schema, 'postgres')}`,
  },

  // Get schema info (tables, views, functions count)
  schemaInfo: {
    postgres: (schema: string) =>
      `SELECT
        '${schema}' as schema_name,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '${schema}' AND table_type = 'BASE TABLE') as table_count,
        (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = '${schema}') as view_count,
        (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = '${schema}') as routine_count`,
    mssql: (schema: string) =>
      `SELECT
        '${schema}' as schema_name,
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '${schema}' AND TABLE_TYPE = 'BASE TABLE') as table_count,
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_SCHEMA = '${schema}') as view_count,
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = '${schema}') as routine_count`,
    default: (schema: string) =>
      `SELECT '${schema}' as schema_name, 0 as table_count, 0 as view_count, 0 as routine_count`,
  },
};

/**
 * Get SQL for a specific database type
 */
function getSQL(
  templateName: keyof typeof SQL_TEMPLATES,
  dbType?: PrebuiltDatabase,
  ...args: unknown[]
): string {
  const templates = SQL_TEMPLATES[templateName];
  const normalizedType = normalizeDbType(dbType);
  const template = (templates as Record<string, unknown>)[normalizedType] ?? templates.default;

  if (typeof template === 'function') {
    return template(...args);
  }
  return template as string;
}

/**
 * Normalize database type to a common key
 */
function normalizeDbType(dbType?: PrebuiltDatabase): string {
  if (!dbType) return 'default';

  if (dbType.includes('postgres') || dbType.includes('alloydb')) return 'postgres';
  if (dbType.includes('mysql')) return 'mysql';
  if (dbType === 'sqlite') return 'sqlite';
  if (dbType === 'mssql' || dbType.includes('mssql')) return 'mssql';

  return 'default';
}

/**
 * Execute SQL through the toolbox client
 */
async function executeSQL(
  toolboxClient: Client,
  sql: string
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    const result = await toolboxClient.callTool({
      name: 'execute_sql',
      arguments: { sql },
    });
    return result as { content: Array<{ type: string; text: string }>; isError?: boolean };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error executing SQL: ${(error as Error).message}` }],
      isError: true,
    };
  }
}

/**
 * Built-in tools definitions
 */
export const BUILTIN_TOOLS: BuiltinTool[] = [
  {
    name: 'list_databases',
    description: 'List all databases available on the server',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async (_args, toolboxClient, dbType) => {
      const sql = getSQL('listDatabases', dbType);
      return executeSQL(toolboxClient, sql);
    },
  },
  {
    name: 'list_schemas',
    description: 'List all schemas in the current database (PostgreSQL/MSSQL). For MySQL, this lists databases.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async (_args, toolboxClient, dbType) => {
      const sql = getSQL('listSchemas', dbType);
      return executeSQL(toolboxClient, sql);
    },
  },
  {
    name: 'schema_info',
    description: 'Get detailed information about a schema including table count, view count, and routine count (PostgreSQL/MSSQL)',
    inputSchema: {
      type: 'object',
      properties: {
        schema: {
          type: 'string',
          description: 'Name of the schema to get info for (default: public)',
        },
      },
    },
    handler: async (args, toolboxClient, dbType) => {
      const schema = (args.schema as string) || 'public';
      const sql = getSQL('schemaInfo', dbType, schema);
      return executeSQL(toolboxClient, sql);
    },
  },
  {
    name: 'list_tables',
    description: 'List all tables in a schema (PostgreSQL/MSSQL) or database (MySQL/SQLite)',
    inputSchema: {
      type: 'object',
      properties: {
        schema: {
          type: 'string',
          description: 'Schema name (PostgreSQL/MSSQL only, default: public)',
        },
      },
    },
    handler: async (args, toolboxClient, dbType) => {
      const schema = args.schema as string;
      const sql = getSQL('listTables', dbType, schema);
      return executeSQL(toolboxClient, sql);
    },
  },
  {
    name: 'describe_table',
    description: 'Get the schema/structure of a specific table including column names, data types, and constraints',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Name of the table to describe',
        },
        schema: {
          type: 'string',
          description: 'Schema name (PostgreSQL/MSSQL only, default: public)',
        },
      },
      required: ['table'],
    },
    handler: async (args, toolboxClient, dbType) => {
      const table = args.table as string;
      const schema = args.schema as string;
      if (!table) {
        return {
          content: [{ type: 'text', text: 'Error: table name is required' }],
          isError: true,
        };
      }
      const sql = getSQL('describeTable', dbType, table, schema);
      return executeSQL(toolboxClient, sql);
    },
  },
  {
    name: 'preview_table',
    description: 'Preview the first few rows of a table (default: 5 rows)',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Name of the table to preview',
        },
        schema: {
          type: 'string',
          description: 'Schema name (PostgreSQL/MSSQL only, default: public)',
        },
        limit: {
          type: 'number',
          description: 'Number of rows to return (default: 5, max: 100)',
        },
      },
      required: ['table'],
    },
    handler: async (args, toolboxClient, dbType) => {
      const table = args.table as string;
      const schema = args.schema as string;
      if (!table) {
        return {
          content: [{ type: 'text', text: 'Error: table name is required' }],
          isError: true,
        };
      }
      const limit = Math.min(Math.max(1, (args.limit as number) || 5), 100);
      const sql = getSQL('previewTable', dbType, table, limit, schema);
      return executeSQL(toolboxClient, sql);
    },
  },
  {
    name: 'count_rows',
    description: 'Count the total number of rows in a table',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Name of the table to count rows',
        },
        schema: {
          type: 'string',
          description: 'Schema name (PostgreSQL/MSSQL only, default: public)',
        },
      },
      required: ['table'],
    },
    handler: async (args, toolboxClient, dbType) => {
      const table = args.table as string;
      const schema = args.schema as string;
      if (!table) {
        return {
          content: [{ type: 'text', text: 'Error: table name is required' }],
          isError: true,
        };
      }
      const sql = getSQL('countRows', dbType, table, schema);
      return executeSQL(toolboxClient, sql);
    },
  },
  {
    name: 'table_stats',
    description: 'Get statistics for a table including row count and column count',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Name of the table to get statistics for',
        },
        schema: {
          type: 'string',
          description: 'Schema name (PostgreSQL/MSSQL only, default: public)',
        },
      },
      required: ['table'],
    },
    handler: async (args, toolboxClient, dbType) => {
      const table = args.table as string;
      const schema = args.schema as string;
      if (!table) {
        return {
          content: [{ type: 'text', text: 'Error: table name is required' }],
          isError: true,
        };
      }
      const sql = getSQL('tableStats', dbType, table, schema);
      return executeSQL(toolboxClient, sql);
    },
  },
  {
    name: 'search_tables',
    description: 'Search for tables by name pattern',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Search pattern (e.g., "user" will match "users", "user_profiles")',
        },
        schema: {
          type: 'string',
          description: 'Schema name to search in (PostgreSQL/MSSQL only, default: public)',
        },
      },
      required: ['pattern'],
    },
    handler: async (args, toolboxClient, dbType) => {
      const pattern = args.pattern as string;
      const schema = (args.schema as string) || 'public';
      if (!pattern) {
        return {
          content: [{ type: 'text', text: 'Error: search pattern is required' }],
          isError: true,
        };
      }

      const normalizedType = normalizeDbType(dbType);
      let sql: string;

      switch (normalizedType) {
        case 'postgres':
          sql = `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema}' AND table_name ILIKE '%${pattern}%' ORDER BY table_name`;
          break;
        case 'mysql':
          sql = `SHOW TABLES LIKE '%${pattern}%'`;
          break;
        case 'sqlite':
          sql = `SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%${pattern}%' ORDER BY name`;
          break;
        case 'mssql':
          sql = `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_SCHEMA = '${schema}' AND TABLE_NAME LIKE '%${pattern}%' ORDER BY TABLE_NAME`;
          break;
        default:
          sql = `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema}' AND table_name LIKE '%${pattern}%' ORDER BY table_name`;
      }

      return executeSQL(toolboxClient, sql);
    },
  },
  {
    name: 'list_columns',
    description: 'List all column names for a specific table',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Name of the table',
        },
        schema: {
          type: 'string',
          description: 'Schema name (PostgreSQL/MSSQL only, default: public)',
        },
      },
      required: ['table'],
    },
    handler: async (args, toolboxClient, dbType) => {
      const table = args.table as string;
      const schema = (args.schema as string) || 'public';
      if (!table) {
        return {
          content: [{ type: 'text', text: 'Error: table name is required' }],
          isError: true,
        };
      }

      const normalizedType = normalizeDbType(dbType);
      let sql: string;

      switch (normalizedType) {
        case 'postgres':
          sql = `SELECT column_name FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = '${table}' ORDER BY ordinal_position`;
          break;
        case 'mysql':
          sql = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}' ORDER BY ORDINAL_POSITION`;
          break;
        case 'sqlite':
          sql = `SELECT name FROM pragma_table_info('${table}')`;
          break;
        case 'mssql':
          sql = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '${schema}' AND TABLE_NAME = '${table}' ORDER BY ORDINAL_POSITION`;
          break;
        default:
          sql = `SELECT column_name FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = '${table}'`;
      }

      return executeSQL(toolboxClient, sql);
    },
  },
  {
    name: 'sample_distinct',
    description: 'Get distinct values from a column (useful for understanding data distribution)',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Name of the table',
        },
        column: {
          type: 'string',
          description: 'Name of the column to sample',
        },
        schema: {
          type: 'string',
          description: 'Schema name (PostgreSQL/MSSQL only, default: public)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of distinct values to return (default: 20)',
        },
      },
      required: ['table', 'column'],
    },
    handler: async (args, toolboxClient, dbType) => {
      const table = args.table as string;
      const column = args.column as string;
      const schema = args.schema as string;
      if (!table || !column) {
        return {
          content: [{ type: 'text', text: 'Error: table and column names are required' }],
          isError: true,
        };
      }

      const limit = Math.min(Math.max(1, (args.limit as number) || 20), 100);
      const normalizedType = normalizeDbType(dbType);

      let sql: string;
      switch (normalizedType) {
        case 'postgres':
          sql = `SELECT DISTINCT "${column}" FROM ${formatTableWithSchema(table, schema, 'postgres')} LIMIT ${limit}`;
          break;
        case 'mysql':
          sql = `SELECT DISTINCT \`${column}\` FROM \`${table}\` LIMIT ${limit}`;
          break;
        case 'sqlite':
          sql = `SELECT DISTINCT "${column}" FROM "${table}" LIMIT ${limit}`;
          break;
        case 'mssql':
          sql = `SELECT DISTINCT TOP ${limit} [${column}] FROM ${formatTableWithSchema(table, schema, 'mssql')}`;
          break;
        default:
          sql = `SELECT DISTINCT "${column}" FROM ${formatTableWithSchema(table, schema, 'postgres')} LIMIT ${limit}`;
      }

      return executeSQL(toolboxClient, sql);
    },
  },
  {
    name: 'list_views',
    description: 'List all views in a schema (PostgreSQL/MSSQL) or database',
    inputSchema: {
      type: 'object',
      properties: {
        schema: {
          type: 'string',
          description: 'Schema name (PostgreSQL/MSSQL only, default: public)',
        },
      },
    },
    handler: async (args, toolboxClient, dbType) => {
      const schema = (args.schema as string) || 'public';
      const normalizedType = normalizeDbType(dbType);
      let sql: string;

      switch (normalizedType) {
        case 'postgres':
          sql = `SELECT table_name as view_name FROM information_schema.views WHERE table_schema = '${schema}' ORDER BY table_name`;
          break;
        case 'mysql':
          sql = `SELECT TABLE_NAME as view_name FROM INFORMATION_SCHEMA.VIEWS ORDER BY TABLE_NAME`;
          break;
        case 'sqlite':
          sql = `SELECT name as view_name FROM sqlite_master WHERE type='view' ORDER BY name`;
          break;
        case 'mssql':
          sql = `SELECT TABLE_NAME as view_name FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_SCHEMA = '${schema}' ORDER BY TABLE_NAME`;
          break;
        default:
          sql = `SELECT table_name as view_name FROM information_schema.views WHERE table_schema = '${schema}' ORDER BY table_name`;
      }

      return executeSQL(toolboxClient, sql);
    },
  },
  {
    name: 'list_indexes',
    description: 'List all indexes for a specific table',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Name of the table',
        },
        schema: {
          type: 'string',
          description: 'Schema name (PostgreSQL/MSSQL only, default: public)',
        },
      },
      required: ['table'],
    },
    handler: async (args, toolboxClient, dbType) => {
      const table = args.table as string;
      const schema = (args.schema as string) || 'public';
      if (!table) {
        return {
          content: [{ type: 'text', text: 'Error: table name is required' }],
          isError: true,
        };
      }

      const normalizedType = normalizeDbType(dbType);
      let sql: string;

      switch (normalizedType) {
        case 'postgres':
          sql = `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = '${schema}' AND tablename = '${table}' ORDER BY indexname`;
          break;
        case 'mysql':
          sql = `SHOW INDEX FROM \`${table}\``;
          break;
        case 'sqlite':
          sql = `SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='${table}' ORDER BY name`;
          break;
        case 'mssql':
          sql = `SELECT i.name as index_name, i.type_desc, i.is_unique, i.is_primary_key
                 FROM sys.indexes i
                 INNER JOIN sys.tables t ON i.object_id = t.object_id
                 INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
                 WHERE s.name = '${schema}' AND t.name = '${table}'
                 ORDER BY i.name`;
          break;
        default:
          sql = `SELECT indexname FROM pg_indexes WHERE schemaname = '${schema}' AND tablename = '${table}'`;
      }

      return executeSQL(toolboxClient, sql);
    },
  },
  {
    name: 'list_constraints',
    description: 'List all constraints (primary keys, foreign keys, unique, check) for a table',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Name of the table',
        },
        schema: {
          type: 'string',
          description: 'Schema name (PostgreSQL/MSSQL only, default: public)',
        },
      },
      required: ['table'],
    },
    handler: async (args, toolboxClient, dbType) => {
      const table = args.table as string;
      const schema = (args.schema as string) || 'public';
      if (!table) {
        return {
          content: [{ type: 'text', text: 'Error: table name is required' }],
          isError: true,
        };
      }

      const normalizedType = normalizeDbType(dbType);
      let sql: string;

      switch (normalizedType) {
        case 'postgres':
          sql = `SELECT con.conname as constraint_name,
                        con.contype as constraint_type,
                        pg_get_constraintdef(con.oid) as definition
                 FROM pg_constraint con
                 JOIN pg_class rel ON rel.oid = con.conrelid
                 JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                 WHERE nsp.nspname = '${schema}' AND rel.relname = '${table}'
                 ORDER BY con.conname`;
          break;
        case 'mysql':
          sql = `SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE
                 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
                 WHERE TABLE_NAME = '${table}'
                 ORDER BY CONSTRAINT_NAME`;
          break;
        case 'sqlite':
          // SQLite: foreign keys
          sql = `SELECT 'fk_' || id as constraint_name, 'FOREIGN KEY' as constraint_type,
                        'REFERENCES ' || "table" || '(' || "to" || ')' as definition
                 FROM pragma_foreign_key_list('${table}')`;
          break;
        case 'mssql':
          sql = `SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE
                 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
                 WHERE TABLE_SCHEMA = '${schema}' AND TABLE_NAME = '${table}'
                 ORDER BY CONSTRAINT_NAME`;
          break;
        default:
          sql = `SELECT constraint_name, constraint_type FROM information_schema.table_constraints WHERE table_schema = '${schema}' AND table_name = '${table}'`;
      }

      return executeSQL(toolboxClient, sql);
    },
  },
];

/**
 * Get all built-in tools as MCP tool definitions
 */
export function getBuiltinToolDefinitions(): Array<{
  name: string;
  description: string;
  inputSchema: BuiltinTool['inputSchema'];
}> {
  return BUILTIN_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  }));
}

/**
 * Find a built-in tool by name
 */
export function findBuiltinTool(name: string): BuiltinTool | undefined {
  return BUILTIN_TOOLS.find((tool) => tool.name === name);
}
