# mcp-database 项目概览

## 项目目的
mcp-database 是一个 Node.js MCP (Model Context Protocol) 服务器，为 AI 助手和代理提供数据库操作能力。通过封装 [genai-toolbox](https://github.com/googleapis/genai-toolbox) 二进制文件，支持 40+ 种数据库。

## 技术栈
- **语言**: TypeScript (ES2022, ESNext modules)
- **运行时**: Node.js 18+
- **构建工具**: tsup
- **测试框架**: Vitest
- **代码规范**: ESLint + Prettier
- **包管理**: npm
- **模块类型**: ESM (type: module)

## 核心架构
项目分为以下核心模块：
- `src/index.ts` - 公共 API 入口
- `src/server.ts` - MCP 服务器实现 (DatabaseMCPServer 类)
- `src/cli.ts` - 命令行入口
- `src/config.ts` - 配置加载与预置配置生成
- `src/binary-manager.ts` - 二进制文件管理
- `src/types.ts` - TypeScript 类型定义
- `src/builtin-tools.ts` - 内置工具定义

## 支持的数据库类型
- **关系型**: PostgreSQL, MySQL, SQLite, SQL Server, Oracle 等
- **NoSQL**: MongoDB, Redis, Firestore, Neo4j 等
- **云服务**: BigQuery, Cloud SQL, AlloyDB, Spanner 等

## 预置配置
- `prebuilt/sqlite-introspection.yaml` - SQLite 内省工具集

## 平台支持
通过 optional dependencies 提供平台特定的二进制文件：
- darwin-arm64 (macOS Apple Silicon)
- darwin-x64 (macOS Intel)
- linux-x64
- win32-x64
