#!/usr/bin/env node

/**
 * CLI entry point for mcp-database (内网版本)
 */

import { parseArgs } from 'util';
import { existsSync } from 'fs';
import { ensureBinary, verifyBinary } from './binary-manager.js';
import { loadConfig, generatePrebuiltConfig, validatePrebuiltEnv } from './config.js';
import { startServer } from './server.js';
import type { PrebuiltDatabase } from './types.js';

const SUPPORTED_PREBUILT: PrebuiltDatabase[] = [
  'postgres',
  'mysql',
  'sqlite',
  'mongodb',
  'redis',
  'mssql',
  'cloud-sql-postgres',
  'cloud-sql-mysql',
  'alloydb-pg',
  'bigquery',
  'spanner',
  'firestore',
];

async function main() {
  try {
    const { values } = parseArgs({
      options: {
        config: {
          type: 'string',
          short: 'c',
        },
        prebuilt: {
          type: 'string',
          short: 'p',
        },
        'binary-path': {
          type: 'string',
          short: 'b',
        },
        stdio: {
          type: 'boolean',
          default: true,
        },
        'db-host': {
          type: 'string',
        },
        'db-port': {
          type: 'string',
        },
        'db-name': {
          type: 'string',
        },
        'db-user': {
          type: 'string',
        },
        'db-password': {
          type: 'string',
        },
        'toolbox-host': {
          type: 'string',
        },
        'toolbox-port': {
          type: 'string',
        },
        transport: {
          type: 'string',
        },
        version: {
          type: 'boolean',
          short: 'v',
        },
        help: {
          type: 'boolean',
          short: 'h',
        },
        verbose: {
          type: 'boolean',
        },
      },
      allowPositionals: false,
    });

    if (values.help) {
      printHelp();
      process.exit(0);
    }

    if (values.version) {
      console.log('mcp-database v0.1.0 (内网版本)');
      process.exit(0);
    }

    // 查找二进制文件
    console.error('正在查找 genai-toolbox 二进制文件...');
    let binaryPath: string;

    try {
      binaryPath = await ensureBinary({
        binaryPath: values['binary-path'],
      });
      console.error(`找到二进制文件: ${binaryPath}`);
    } catch (error) {
      console.error((error as Error).message);
      process.exit(1);
    }

    // 验证二进制文件
    try {
      const version = await verifyBinary(binaryPath);
      console.error(`genai-toolbox 版本: ${version}`);
    } catch (error) {
      console.error(`警告: 无法验证二进制文件版本: ${(error as Error).message}`);
    }

    // 加载或生成配置
    let config;
    let prebuiltType: PrebuiltDatabase | undefined;

    if (values.config) {
      if (!existsSync(values.config)) {
        console.error(`错误: 配置文件不存在: ${values.config}`);
        process.exit(1);
      }
      console.error(`加载配置文件: ${values.config}`);
      config = loadConfig(values.config);
    } else if (values.prebuilt) {
      const dbType = values.prebuilt as PrebuiltDatabase;

      if (!SUPPORTED_PREBUILT.includes(dbType)) {
        console.error(`错误: 不支持的数据库类型: ${dbType}`);
        console.error(`支持的类型: ${SUPPORTED_PREBUILT.join(', ')}`);
        process.exit(1);
      }

      console.error(`使用预设配置: ${dbType}`);
      validatePrebuiltEnv(dbType);
      config = generatePrebuiltConfig(dbType);
      prebuiltType = dbType;
    } else {
      console.error('错误: 必须指定 --config 或 --prebuilt 参数');
      printHelp();
      process.exit(1);
    }

    if (values.verbose) {
      console.error('配置信息:', JSON.stringify(config, null, 2));
    }

    if (values['db-host']) {
      process.env.MCP_DATABASE_HOST = values['db-host'];
    }
    if (values['db-port']) {
      process.env.MCP_DATABASE_PORT = values['db-port'];
    }
    if (values['db-name']) {
      process.env.MCP_DATABASE_NAME = values['db-name'];
    }
    if (values['db-user']) {
      process.env.MCP_DATABASE_USER = values['db-user'];
    }
    if (values['db-password']) {
      process.env.MCP_DATABASE_PASSWORD = values['db-password'];
    }
    if (values['toolbox-host']) {
      process.env.MCP_TOOLBOX_HOST = values['toolbox-host'];
    }
    if (values['toolbox-port']) {
      process.env.MCP_TOOLBOX_PORT = values['toolbox-port'];
    }

    const transportValue = (values.transport ?? process.env.MCP_TOOLBOX_TRANSPORT)?.toString().toLowerCase();
    const useStdio = transportValue ? transportValue !== 'http' : values.stdio !== false;

    // 启动 MCP 服务器
    console.error('正在启动 MCP 服务器...');
    await startServer({
      binaryPath,
      config,
      verbose: values.verbose,
      prebuiltType,
      stdio: useStdio,
      toolboxHost: values['toolbox-host'],
      toolboxPort:
        typeof values['toolbox-port'] === 'string'
          ? Number(values['toolbox-port'])
          : process.env.MCP_TOOLBOX_PORT
            ? Number(process.env.MCP_TOOLBOX_PORT)
            : undefined,
    });

    console.error('MCP 服务器已启动。按 Ctrl+C 停止。');
  } catch (error) {
    console.error('致命错误:', (error as Error).message);
    if (process.env.DEBUG) {
      console.error((error as Error).stack);
    }
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
mcp-database - 数据库 MCP 服务器 (内网版本)

用法:
  mcp-database [选项]

选项:
  -c, --config <path>        tools.yaml 配置文件路径
  -p, --prebuilt <type>      使用预设的数据库配置
  -b, --binary-path <path>   指定 genai-toolbox 二进制文件路径
      --stdio                使用 stdio 传输 (默认: true)
      --transport <mode>     传输模式: stdio 或 http (默认: stdio)
      --db-host <host>       数据库主机地址
      --db-port <port>       数据库端口
      --db-name <name>       数据库名称
      --db-user <user>       数据库用户
      --db-password <pass>   数据库密码
      --toolbox-host <host>  Toolbox HTTP 监听地址 (默认: 127.0.0.1)
      --toolbox-port <port>  Toolbox HTTP 端口 (默认: 5000)
  -v, --version              显示版本号
  -h, --help                 显示帮助信息
      --verbose              启用详细日志

支持的预设数据库类型:
  ${SUPPORTED_PREBUILT.join(', ')}

二进制文件查找顺序:
  1. --binary-path 参数指定的路径
  2. TOOLBOX_PATH 环境变量
  3. ./binaries/toolbox
  4. ~/.mcp-database/binaries/toolbox
  5. 系统 PATH

示例:
  # 使用自定义配置文件
  mcp-database --config tools.yaml

  # 使用预设配置并通过 CLI 指定连接参数
  mcp-database --prebuilt postgres \\
    --db-host localhost \\
    --db-port 5432 \\
    --db-name mydb \\
    --db-user postgres \\
    --db-password secret

  # 使用环境变量
  DATABASE_HOST=localhost \\
  DATABASE_NAME=mydb \\
  DATABASE_USER=postgres \\
  DATABASE_PASSWORD=secret \\
  mcp-database --prebuilt postgres

  # 切换到 HTTP 传输并自定义端口
  mcp-database --prebuilt sqlite \\
    --transport http \\
    --toolbox-host 0.0.0.0 \\
    --toolbox-port 5900

环境变量:
  数据库连接 (所有数据库通用):
    DATABASE_HOST      - 数据库主机 (默认: localhost)
    DATABASE_PORT      - 数据库端口 (根据类型自动设置)
    DATABASE_NAME      - 数据库名称或文件路径
    DATABASE_USER      - 数据库用户
    DATABASE_PASSWORD  - 数据库密码

  Toolbox 配置:
    MCP_TOOLBOX_TRANSPORT  - 传输模式: stdio 或 http (默认: stdio)
    MCP_TOOLBOX_HOST       - HTTP 监听地址 (默认: 127.0.0.1)
    MCP_TOOLBOX_PORT       - HTTP 端口 (默认: 5000)

  其他:
    TOOLBOX_PATH    - genai-toolbox 二进制文件路径

MCP 配置示例 (.mcp.json):
  {
    "mcpServers": {
      "database": {
        "command": "npx",
        "args": ["@adversity/mcp-database", "--prebuilt", "postgres"],
        "env": {
          "DATABASE_HOST": "localhost",
          "DATABASE_NAME": "mydb",
          "DATABASE_USER": "postgres",
          "DATABASE_PASSWORD": "your-password"
        }
      }
    }
  }
  `);
}

main();
