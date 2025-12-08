/**
 * MCP server implementation that wraps genai-toolbox
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StdioClientTransport as ToolboxStdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { spawn, type ChildProcess } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { Socket } from 'net';
import { tmpdir } from 'os';
import { join } from 'path';
import { setTimeout as delay } from 'timers/promises';
import { stringify as stringifyYaml } from 'yaml';
import type { ToolsConfig, PrebuiltDatabase } from './types.js';
import { getBuiltinToolDefinitions, findBuiltinTool } from './builtin-tools.js';

/**
 * Map unified DATABASE_* environment variables to toolbox-specific format
 * This allows users to use a single set of environment variables regardless of database type
 */
function mapEnvForToolbox(env: Record<string, string>, prebuiltType?: PrebuiltDatabase): Record<string, string> {
  const result = { ...env };

  // Get unified environment variables
  const dbHost = env.DATABASE_HOST;
  const dbPort = env.DATABASE_PORT;
  const dbName = env.DATABASE_NAME;
  const dbUser = env.DATABASE_USER;
  const dbPassword = env.DATABASE_PASSWORD;

  // Map to toolbox-specific environment variables based on database type
  if (prebuiltType) {
    const upperType = prebuiltType.toUpperCase().replace(/-/g, '_');

    // Map DATABASE_NAME to {TYPE}_DATABASE (e.g., SQLITE_DATABASE, POSTGRES_DATABASE)
    if (dbName && !env[`${upperType}_DATABASE`]) {
      result[`${upperType}_DATABASE`] = dbName;
    }

    // Map DATABASE_HOST to {TYPE}_HOST
    if (dbHost && !env[`${upperType}_HOST`]) {
      result[`${upperType}_HOST`] = dbHost;
    }

    // Map DATABASE_PORT to {TYPE}_PORT
    if (dbPort && !env[`${upperType}_PORT`]) {
      result[`${upperType}_PORT`] = dbPort;
    }

    // Map DATABASE_USER to {TYPE}_USER
    if (dbUser && !env[`${upperType}_USER`]) {
      result[`${upperType}_USER`] = dbUser;
    }

    // Map DATABASE_PASSWORD to {TYPE}_PASSWORD
    if (dbPassword && !env[`${upperType}_PASSWORD`]) {
      result[`${upperType}_PASSWORD`] = dbPassword;
    }
  }

  return result;
}

export interface ServerOptions {
  binaryPath: string;
  config: ToolsConfig;
  verbose?: boolean;
  prebuiltType?: PrebuiltDatabase;
  stdio?: boolean;
  toolboxHost?: string;
  toolboxPort?: number;
}

/**
 * MCP Server that wraps genai-toolbox process
 */
export class DatabaseMCPServer {
  private server: Server;
  private configPath: string | null = null;
  private toolboxClient: Client | null = null;
  private toolboxTransport: ToolboxStdioClientTransport | StreamableHTTPClientTransport | null = null;
  private toolboxProcess: ChildProcess | null = null;

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
    // List available tools (toolbox tools + built-in tools)
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const toolboxClient = this.getToolboxClient();
      const toolboxResult = await toolboxClient.listTools();

      // Add built-in tools to the list
      const builtinTools = getBuiltinToolDefinitions();
      const allTools = [...(toolboxResult.tools || []), ...builtinTools];

      return { tools: allTools };
    });

    // Execute tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const safeArgs = args && typeof args === 'object' ? (args as Record<string, unknown>) : {};

      try {
        // Check if this is a built-in tool
        const builtinTool = findBuiltinTool(name);
        if (builtinTool) {
          const toolboxClient = this.getToolboxClient();
          return await builtinTool.handler(safeArgs, toolboxClient, this.options.prebuiltType);
        }

        // Otherwise, forward to toolbox
        const toolboxClient = this.getToolboxClient();
        return await toolboxClient.callTool({
          name,
          arguments: safeArgs,
        });
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

    await this.startToolboxClient();

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
    if (this.toolboxClient) {
      await this.toolboxClient.close();
      this.toolboxClient = null;
    }

    if (this.toolboxTransport) {
      await this.toolboxTransport.close();
      this.toolboxTransport = null;
    }

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

  private async startToolboxClient(): Promise<void> {
    if (!this.configPath) {
      throw new Error('Config path not initialized');
    }

    const sanitizedEnv = Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    );

    // Map unified DATABASE_* env vars to toolbox-specific format
    const toolboxEnv = mapEnvForToolbox(sanitizedEnv, this.options.prebuiltType);

    const baseArgs = this.options.prebuiltType
      ? ['--prebuilt', this.options.prebuiltType]
      : ['--tools-file', this.configPath];

    if (this.options.stdio !== false) {
      const transport = new ToolboxStdioClientTransport({
        command: this.options.binaryPath,
        args: [...baseArgs, '--stdio'],
        env: toolboxEnv,
      });

      const client = new Client({
        name: 'genai-toolbox-proxy',
        version: '0.1.0',
      });

      await client.connect(transport);
      this.toolboxTransport = transport;
      this.toolboxClient = client;

      if (this.options.verbose) {
        console.error('Connected to toolbox via stdio');
      }
      return;
    }

    const host = this.options.toolboxHost ?? process.env.MCP_TOOLBOX_HOST ?? '127.0.0.1';
    const port = this.options.toolboxPort ?? Number(process.env.MCP_TOOLBOX_PORT ?? '5000');

    const toolboxArgs = [...baseArgs, '--address', host, '--port', String(port)];
    const toolboxProcess = spawn(this.options.binaryPath, toolboxArgs, {
      env: toolboxEnv,
      stdio: this.options.verbose ? 'inherit' : 'ignore',
    });

    this.toolboxProcess = toolboxProcess;

    await this.waitForHttpServer(host, port);

    const httpTransport = new StreamableHTTPClientTransport(new URL(`http://${host}:${port}/mcp`));
    const client = new Client({
      name: 'genai-toolbox-proxy',
      version: '0.1.0',
    });
    await client.connect(httpTransport);

    this.toolboxTransport = httpTransport;
    this.toolboxClient = client;

    if (this.options.verbose) {
      console.error(`Connected to toolbox via HTTP on ${host}:${port}`);
    }
  }

  private getToolboxClient(): Client {
    if (!this.toolboxClient) {
      throw new Error('Toolbox client not connected');
    }
    return this.toolboxClient;
  }

  private async waitForHttpServer(host: string, port: number): Promise<void> {
    const maxAttempts = 20;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const isOpen = await new Promise<boolean>((resolve) => {
        const socket = new Socket();
        socket.once('connect', () => {
          socket.destroy();
          resolve(true);
        });
        socket.once('error', () => {
          resolve(false);
        });
        socket.connect(port, host);
      });

      if (isOpen) {
        return;
      }
      await delay(250);
    }

    throw new Error(`Toolbox HTTP server not reachable on ${host}:${port}`);
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
