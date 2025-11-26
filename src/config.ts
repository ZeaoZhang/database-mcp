/**
 * Configuration management for mcp-database
 */

import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import type { ToolsConfig, PrebuiltDatabase } from './types.js';

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
 * Generate a minimal tools.yaml config for prebuilt database types
 */
export function generatePrebuiltConfig(dbType: PrebuiltDatabase): ToolsConfig {
  const configs: Record<PrebuiltDatabase, ToolsConfig> = {
    postgres: {
      sources: {
        'postgres-db': {
          kind: 'postgres',
          host: process.env.POSTGRES_HOST ?? 'localhost',
          port: Number(process.env.POSTGRES_PORT ?? '5432'),
          database: process.env.POSTGRES_DATABASE ?? 'postgres',
          user: process.env.POSTGRES_USER ?? 'postgres',
          password: process.env.POSTGRES_PASSWORD ?? '',
        },
      },
    },
    mysql: {
      sources: {
        'mysql-db': {
          kind: 'mysql',
          host: process.env.MYSQL_HOST ?? 'localhost',
          port: Number(process.env.MYSQL_PORT ?? '3306'),
          database: process.env.MYSQL_DATABASE ?? 'mysql',
          user: process.env.MYSQL_USER ?? 'root',
          password: process.env.MYSQL_PASSWORD ?? '',
        },
      },
    },
    sqlite: {
      sources: {
        'sqlite-db': {
          kind: 'sqlite',
          database: process.env.SQLITE_DATABASE ?? './database.db',
        },
      },
    },
    mongodb: {
      sources: {
        'mongo-db': {
          kind: 'mongodb',
          host: process.env.MONGODB_HOST ?? 'localhost',
          port: Number(process.env.MONGODB_PORT ?? '27017'),
          database: process.env.MONGODB_DATABASE ?? 'test',
          user: process.env.MONGODB_USER ?? '',
          password: process.env.MONGODB_PASSWORD ?? '',
        },
      },
    },
    redis: {
      sources: {
        'redis-db': {
          kind: 'redis',
          host: process.env.REDIS_HOST ?? 'localhost',
          port: Number(process.env.REDIS_PORT ?? '6379'),
          password: process.env.REDIS_PASSWORD ?? '',
        },
      },
    },
    mssql: {
      sources: {
        'mssql-db': {
          kind: 'mssql',
          host: process.env.MSSQL_HOST ?? 'localhost',
          port: Number(process.env.MSSQL_PORT ?? '1433'),
          database: process.env.MSSQL_DATABASE ?? 'master',
          user: process.env.MSSQL_USER ?? 'sa',
          password: process.env.MSSQL_PASSWORD ?? '',
        },
      },
    },
    'cloud-sql-postgres': {
      sources: {
        'cloud-sql-pg': {
          kind: 'cloud-sql-postgres',
          project: process.env.GCP_PROJECT ?? '',
          region: process.env.GCP_REGION ?? 'us-central1',
          instance: process.env.CLOUD_SQL_INSTANCE ?? '',
          database: process.env.POSTGRES_DATABASE ?? 'postgres',
          user: process.env.POSTGRES_USER ?? 'postgres',
          password: process.env.POSTGRES_PASSWORD ?? '',
        },
      },
    },
    'cloud-sql-mysql': {
      sources: {
        'cloud-sql-mysql': {
          kind: 'cloud-sql-mysql',
          project: process.env.GCP_PROJECT ?? '',
          region: process.env.GCP_REGION ?? 'us-central1',
          instance: process.env.CLOUD_SQL_INSTANCE ?? '',
          database: process.env.MYSQL_DATABASE ?? 'mysql',
          user: process.env.MYSQL_USER ?? 'root',
          password: process.env.MYSQL_PASSWORD ?? '',
        },
      },
    },
    'alloydb-pg': {
      sources: {
        'alloydb-pg': {
          kind: 'alloydb-pg',
          project: process.env.GCP_PROJECT ?? '',
          region: process.env.GCP_REGION ?? 'us-central1',
          cluster: process.env.ALLOYDB_CLUSTER ?? '',
          instance: process.env.ALLOYDB_INSTANCE ?? '',
          database: process.env.POSTGRES_DATABASE ?? 'postgres',
          user: process.env.POSTGRES_USER ?? 'postgres',
          password: process.env.POSTGRES_PASSWORD ?? '',
        },
      },
    },
    bigquery: {
      sources: {
        bigquery: {
          kind: 'bigquery',
          project: process.env.GCP_PROJECT ?? '',
          dataset: process.env.BIGQUERY_DATASET ?? '',
        },
      },
    },
    spanner: {
      sources: {
        spanner: {
          kind: 'spanner',
          project: process.env.GCP_PROJECT ?? '',
          instance: process.env.SPANNER_INSTANCE ?? '',
          database: process.env.SPANNER_DATABASE ?? '',
        },
      },
    },
    firestore: {
      sources: {
        firestore: {
          kind: 'firestore',
          project: process.env.GCP_PROJECT ?? '',
          database: process.env.FIRESTORE_DATABASE ?? '(default)',
        },
      },
    },
  };

  return configs[dbType];
}

/**
 * Validate that required environment variables are set for a prebuilt database
 */
export function validatePrebuiltEnv(dbType: PrebuiltDatabase): void {
  const requiredVars: Record<PrebuiltDatabase, string[]> = {
    postgres: ['POSTGRES_HOST', 'POSTGRES_DATABASE'],
    mysql: ['MYSQL_HOST', 'MYSQL_DATABASE'],
    sqlite: [],
    mongodb: ['MONGODB_HOST', 'MONGODB_DATABASE'],
    redis: ['REDIS_HOST'],
    mssql: ['MSSQL_HOST', 'MSSQL_DATABASE'],
    'cloud-sql-postgres': ['GCP_PROJECT', 'CLOUD_SQL_INSTANCE'],
    'cloud-sql-mysql': ['GCP_PROJECT', 'CLOUD_SQL_INSTANCE'],
    'alloydb-pg': ['GCP_PROJECT', 'ALLOYDB_CLUSTER', 'ALLOYDB_INSTANCE'],
    bigquery: ['GCP_PROJECT'],
    spanner: ['GCP_PROJECT', 'SPANNER_INSTANCE', 'SPANNER_DATABASE'],
    firestore: ['GCP_PROJECT'],
  };

  const missing = requiredVars[dbType]?.filter((varName) => !process.env[varName]) ?? [];

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables for ${dbType}: ${missing.join(', ')}\n` +
        `Please set these variables or provide a custom config file.`
    );
  }
}
