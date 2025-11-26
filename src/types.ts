/**
 * Type definitions for mcp-database
 */

/**
 * Supported database types that can be used with --prebuilt flag
 */
export type PrebuiltDatabase =
  | 'postgres'
  | 'mysql'
  | 'sqlite'
  | 'mongodb'
  | 'redis'
  | 'mssql'
  | 'cloud-sql-postgres'
  | 'cloud-sql-mysql'
  | 'alloydb-pg'
  | 'bigquery'
  | 'spanner'
  | 'firestore';

/**
 * Platform information for binary downloads
 */
export interface Platform {
  os: 'linux' | 'darwin' | 'win32';
  arch: 'x64' | 'arm64';
  binaryName: string;
}

/**
 * Configuration for database source
 */
export interface DatabaseSource {
  kind: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  [key: string]: unknown;
}

/**
 * Tool definition in YAML config
 */
export interface ToolDefinition {
  kind: string;
  source: string;
  description: string;
  parameters?: ToolParameter[];
  statement?: string;
  [key: string]: unknown;
}

/**
 * Tool parameter definition
 */
export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  description: string;
  required?: boolean;
}

/**
 * Complete tools.yaml configuration
 */
export interface ToolsConfig {
  sources: Record<string, DatabaseSource>;
  tools?: Record<string, ToolDefinition>;
  toolsets?: Record<string, string[]>;
}

/**
 * CLI options
 */
export interface CliOptions {
  config?: string;
  prebuilt?: PrebuiltDatabase;
  stdio?: boolean;
  version?: boolean;
  help?: boolean;
  verbose?: boolean;
}

/**
 * Binary manager options
 */
export interface BinaryManagerOptions {
  /** 直接指定二进制文件路径或包含二进制的目录 */
  binaryPath?: string;
  /** @deprecated 使用 binaryPath 代替 */
  binaryDir?: string;
}

/**
 * Error types
 */
export class BinaryDownloadError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'BinaryDownloadError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class ToolboxProcessError extends Error {
  constructor(message: string, public exitCode?: number, public cause?: Error) {
    super(message);
    this.name = 'ToolboxProcessError';
  }
}
