/**
 * Configuration management for mcp-database
 */

import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import type { ToolsConfig, PrebuiltDatabase, DatabaseSource } from './types.js';

// Helper function to get current environment variables dynamically
function getGlobalDbEnv() {
  return {
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
  };
}

function toNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Parse YAML configuration file and replace environment variables
 */
export function loadConfig(configPath: string): ToolsConfig {
  try {
    const content = readFileSync(configPath, 'utf-8');
    const config = parseYaml(content) as ToolsConfig;
    return replaceEnvVars(config);
  } catch (error) {
    throw new Error(`Failed to load config from ${configPath}: ${(error as Error).message}`);
  }
}

/**
 * Recursively replace ${ENV_VAR} and ${ENV_VAR:default} patterns with environment variables
 */
function replaceEnvVars(obj: unknown): any {
  if (typeof obj === 'string') {
    return obj.replace(/\$\{([^:}]+)(?::([^}]*))?\}/g, (_match, envVar, defaultValue) => {
      return process.env[envVar] ?? defaultValue ?? '';
    });
  }

  if (Array.isArray(obj)) {
    return obj.map(replaceEnvVars);
  }

  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = replaceEnvVars(value);
    }
    return result;
  }

  return obj;
}

/**
 * 构建配置对象，只包含已设置的环境变量
 * 未设置的字段不会包含在配置中，让 genai-toolbox 自行处理和报错
 */
function buildSourceConfig(kind: string, env: ReturnType<typeof getGlobalDbEnv>): DatabaseSource {
  const config: DatabaseSource = { kind };

  // 只添加已设置的环境变量
  if (env.host) config.host = env.host;
  if (env.port) config.port = toNumber(env.port, 0);
  if (env.database) config.database = env.database;
  if (env.user) config.user = env.user;
  if (env.password) config.password = env.password;

  return config;
}

export function generatePrebuiltConfig(dbType: PrebuiltDatabase): ToolsConfig {
  const GLOBAL_DB_ENV = getGlobalDbEnv();

  const configs: Record<PrebuiltDatabase, ToolsConfig> = {
    postgres: {
      sources: {
        'postgres-db': buildSourceConfig('postgres', GLOBAL_DB_ENV),
      },
    },
    mysql: {
      sources: {
        'mysql-db': buildSourceConfig('mysql', GLOBAL_DB_ENV),
      },
    },
    sqlite: {
      sources: {
        'sqlite-db': buildSourceConfig('sqlite', GLOBAL_DB_ENV),
      },
    },
    mongodb: {
      sources: {
        'mongo-db': buildSourceConfig('mongodb', GLOBAL_DB_ENV),
      },
    },
    redis: {
      sources: {
        'redis-db': buildSourceConfig('redis', GLOBAL_DB_ENV),
      },
    },
    mssql: {
      sources: {
        'mssql-db': buildSourceConfig('mssql', GLOBAL_DB_ENV),
      },
    },
    'cloud-sql-postgres': {
      sources: {
        'cloud-sql-pg': {
          ...buildSourceConfig('cloud-sql-postgres', GLOBAL_DB_ENV),
          ...(process.env.GCP_PROJECT && { project: process.env.GCP_PROJECT }),
          ...(process.env.GCP_REGION && { region: process.env.GCP_REGION }),
          ...(process.env.CLOUD_SQL_INSTANCE && { instance: process.env.CLOUD_SQL_INSTANCE }),
        } as DatabaseSource,
      },
    },
    'cloud-sql-mysql': {
      sources: {
        'cloud-sql-mysql': {
          ...buildSourceConfig('cloud-sql-mysql', GLOBAL_DB_ENV),
          ...(process.env.GCP_PROJECT && { project: process.env.GCP_PROJECT }),
          ...(process.env.GCP_REGION && { region: process.env.GCP_REGION }),
          ...(process.env.CLOUD_SQL_INSTANCE && { instance: process.env.CLOUD_SQL_INSTANCE }),
        } as DatabaseSource,
      },
    },
    'alloydb-pg': {
      sources: {
        'alloydb-pg': {
          ...buildSourceConfig('alloydb-pg', GLOBAL_DB_ENV),
          ...(process.env.GCP_PROJECT && { project: process.env.GCP_PROJECT }),
          ...(process.env.GCP_REGION && { region: process.env.GCP_REGION }),
          ...(process.env.ALLOYDB_CLUSTER && { cluster: process.env.ALLOYDB_CLUSTER }),
          ...(process.env.ALLOYDB_INSTANCE && { instance: process.env.ALLOYDB_INSTANCE }),
        } as DatabaseSource,
      },
    },
    bigquery: {
      sources: {
        bigquery: {
          kind: 'bigquery',
          ...(process.env.GCP_PROJECT && { project: process.env.GCP_PROJECT }),
          ...(process.env.BIGQUERY_DATASET && { dataset: process.env.BIGQUERY_DATASET }),
        } as DatabaseSource,
      },
    },
    spanner: {
      sources: {
        spanner: {
          kind: 'spanner',
          ...(process.env.GCP_PROJECT && { project: process.env.GCP_PROJECT }),
          ...(process.env.SPANNER_INSTANCE && { instance: process.env.SPANNER_INSTANCE }),
          ...(process.env.SPANNER_DATABASE && { database: process.env.SPANNER_DATABASE }),
        } as DatabaseSource,
      },
    },
    firestore: {
      sources: {
        firestore: {
          kind: 'firestore',
          ...(process.env.GCP_PROJECT && { project: process.env.GCP_PROJECT }),
          ...(process.env.FIRESTORE_DATABASE && { database: process.env.FIRESTORE_DATABASE }),
        } as DatabaseSource,
      },
    },
  };

  return configs[dbType];
}

/**
 * Validate that required environment variables are set for a prebuilt database
 * 不再做校验，让 genai-toolbox 自行报错
 * @deprecated 保留此函数以保持向后兼容，但不再执行任何校验
 */
export function validatePrebuiltEnv(_dbType: PrebuiltDatabase): void {
  // 不做校验，让 genai-toolbox 自行处理和报错
}
