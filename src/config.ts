/**
 * Configuration management for mcp-database
 */

import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import type { ToolsConfig, PrebuiltDatabase } from './types.js';

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
 * Generate a minimal tools.yaml config for prebuilt database types
 */
export function generatePrebuiltConfig(dbType: PrebuiltDatabase): ToolsConfig {
  const GLOBAL_DB_ENV = getGlobalDbEnv();
  const configs: Record<PrebuiltDatabase, ToolsConfig> = {
    postgres: {
      sources: {
        'postgres-db': {
          kind: 'postgres',
          host: GLOBAL_DB_ENV.host ?? 'localhost',
          port: toNumber(GLOBAL_DB_ENV.port, 5432),
          database: GLOBAL_DB_ENV.database ?? 'postgres',
          user: GLOBAL_DB_ENV.user ?? 'postgres',
          password: GLOBAL_DB_ENV.password ?? '',
        },
      },
    },
    mysql: {
      sources: {
        'mysql-db': {
          kind: 'mysql',
          host: GLOBAL_DB_ENV.host ?? 'localhost',
          port: toNumber(GLOBAL_DB_ENV.port, 3306),
          database: GLOBAL_DB_ENV.database ?? 'mysql',
          user: GLOBAL_DB_ENV.user ?? 'root',
          password: GLOBAL_DB_ENV.password ?? '',
        },
      },
    },
    sqlite: {
      sources: {
        'sqlite-db': {
          kind: 'sqlite',
          database: GLOBAL_DB_ENV.database ?? './database.db',
        },
      },
    },
    mongodb: {
      sources: {
        'mongo-db': {
          kind: 'mongodb',
          host: GLOBAL_DB_ENV.host ?? 'localhost',
          port: toNumber(GLOBAL_DB_ENV.port, 27017),
          database: GLOBAL_DB_ENV.database ?? 'test',
          user: GLOBAL_DB_ENV.user ?? '',
          password: GLOBAL_DB_ENV.password ?? '',
        },
      },
    },
    redis: {
      sources: {
        'redis-db': {
          kind: 'redis',
          host: GLOBAL_DB_ENV.host ?? 'localhost',
          port: toNumber(GLOBAL_DB_ENV.port, 6379),
          password: GLOBAL_DB_ENV.password ?? '',
        },
      },
    },
    mssql: {
      sources: {
        'mssql-db': {
          kind: 'mssql',
          host: GLOBAL_DB_ENV.host ?? 'localhost',
          port: toNumber(GLOBAL_DB_ENV.port, 1433),
          database: GLOBAL_DB_ENV.database ?? 'master',
          user: GLOBAL_DB_ENV.user ?? 'sa',
          password: GLOBAL_DB_ENV.password ?? '',
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
          database: GLOBAL_DB_ENV.database ?? 'postgres',
          user: GLOBAL_DB_ENV.user ?? 'postgres',
          password: GLOBAL_DB_ENV.password ?? '',
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
          database: GLOBAL_DB_ENV.database ?? 'mysql',
          user: GLOBAL_DB_ENV.user ?? 'root',
          password: GLOBAL_DB_ENV.password ?? '',
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
          database: GLOBAL_DB_ENV.database ?? 'postgres',
          user: GLOBAL_DB_ENV.user ?? 'postgres',
          password: GLOBAL_DB_ENV.password ?? '',
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
    postgres: [],
    mysql: [],
    sqlite: [],
    mongodb: [],
    redis: [],
    mssql: [],
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
