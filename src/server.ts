/**
 * MCP server implementation that wraps genai-toolbox
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn, type ChildProcess } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { stringify as stringifyYaml } from 'yaml';
import type { ToolsConfig } from './types.js';

export interface ServerOptions {
  binaryPath: string;
  config: ToolsConfig;
  verbose?: boolean;
}

/**
 * MCP Server that wraps genai-toolbox process
 */
export class DatabaseMCPServer {
  private server: Server;
  private toolboxProcess: ChildProcess | null = null;
  private configPath: string | null = null;

  constructor(private options: ServerOptions) {
    this.server = new Server(
      {
        name: 'mcp-database',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'list_tables',
            description: 'List all tables in the database with their descriptions',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'execute_sql',
            description: 'Execute a SQL statement on the database',
            inputSchema: {
              type: 'object',
              properties: {
                sql: {
                  type: 'string',
                  description: 'The SQL statement to execute',
                },
              },
              required: ['sql'],
            },
          },
        ] as Tool[],
      };
    });

    // Execute tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result: string;

        switch (name) {
          case 'list_tables':
            result = await this.executeToolboxCommand(['list', 'tables']);
            break;

          case 'execute_sql':
            if (!args || typeof args !== 'object' || !('sql' in args)) {
              throw new Error('Missing required argument: sql');
            }
            result = await this.executeToolboxCommand(['execute', 'sql', String(args.sql)]);
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Execute a command via toolbox process
   */
  private async executeToolboxCommand(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.configPath) {
        reject(new Error('Server not started'));
        return;
      }

      const proc = spawn(this.options.binaryPath, ['--tools-file', this.configPath, ...args]);

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
        if (this.options.verbose) {
          console.error('Toolbox stderr:', data.toString());
        }
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Toolbox command failed (exit ${code}): ${stderr}`));
        }
      });

      proc.on('error', reject);
    });
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    // Write config to temporary file
    this.configPath = join(tmpdir(), `mcp-database-${Date.now()}.yaml`);
    const configYaml = stringifyYaml(this.options.config);
    writeFileSync(this.configPath, configYaml, 'utf-8');

    if (this.options.verbose) {
      console.error('Config file:', this.configPath);
      console.error('Config:', configYaml);
    }

    // Start MCP server with stdio transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    if (this.options.verbose) {
      console.error('MCP server started');
    }
  }

  /**
   * Stop the server and cleanup
   */
  async stop(): Promise<void> {
    if (this.toolboxProcess) {
      this.toolboxProcess.kill();
      this.toolboxProcess = null;
    }

    if (this.configPath) {
      try {
        unlinkSync(this.configPath);
      } catch {
        // Ignore cleanup errors
      }
      this.configPath = null;
    }

    await this.server.close();

    if (this.options.verbose) {
      console.error('MCP server stopped');
    }
  }
}

/**
 * Create and start MCP server
 */
export async function startServer(options: ServerOptions): Promise<DatabaseMCPServer> {
  const server = new DatabaseMCPServer(options);
  await server.start();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.stop();
    process.exit(0);
  });

  return server;
}
