/**
 * Main entry point for mcp-database
 * Exports public API for programmatic usage
 */

export { DatabaseMCPServer, startServer } from './server.js';
export { loadConfig, generatePrebuiltConfig, validatePrebuiltEnv } from './config.js';
export {
  ensureBinary,
  verifyBinary,
  getBinaryPath,
  getPlatform,
  getBinaryName,
  binaryExists,
  findBinary,
  getDownloadInstructions,
} from './binary-manager.js';
export type {
  PrebuiltDatabase,
  Platform,
  DatabaseSource,
  ToolDefinition,
  ToolParameter,
  ToolsConfig,
  CliOptions,
  BinaryManagerOptions,
} from './types.js';
export { BinaryDownloadError, ConfigurationError, ToolboxProcessError } from './types.js';
