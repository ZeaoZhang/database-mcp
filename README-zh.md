# mcp-database

Node.js MCP（Model Context Protocol）数据库服务器，为智能体提供 40+ 数据源访问能力，底层封装 genai-toolbox。

## 特性
- 开箱即用：预置配置一键连接常见数据库
- 覆盖广泛：PostgreSQL / MySQL / SQLite / MongoDB / Redis 等 40+ 数据源
- 标准 MCP：通过 MCP 协议暴露工具，易于接入各类 IDE/助手
- 生产就绪：连接池、认证、日志与观测能力

## 安装
选择最合适的包：
- 单平台二进制（~15MB，推荐）：  
  - macOS ARM64: `npm install -g @adversity/mcp-database-darwin-arm64`  
  - macOS Intel: `npm install -g @adversity/mcp-database-darwin-x64`  
  - Linux x64: `npm install -g @adversity/mcp-database-linux-x64`  
  - Windows x64: `npm install -g @adversity/mcp-database-win32-x64`
- 全量包（含全部平台二进制，~60MB）：`npm install -g @adversity/mcp-database-full`
- 无需安装：`npx --help`

## 快速开始
### 预置配置（推荐）
```bash
# PostgreSQL
POSTGRES_HOST=localhost \
POSTGRES_DATABASE=mydb \
POSTGRES_USER=postgres \
POSTGRES_PASSWORD=your-password \
npx --prebuilt postgres

# SQLite（无需凭证）
SQLITE_DATABASE=./my.db \
npx --prebuilt sqlite
```

### 自定义配置
创建 `tools.yaml`：
```yaml
sources:
  my-postgres:
    kind: postgres
    host: ${POSTGRES_HOST:localhost}
    port: ${POSTGRES_PORT:5432}
    database: ${POSTGRES_DATABASE:postgres}
    user: ${POSTGRES_USER:postgres}
    password: ${POSTGRES_PASSWORD}

tools:
  get_user_by_id:
    kind: postgres-sql
    source: my-postgres
    description: Get user by ID
    parameters:
      - name: user_id
        type: number
    statement: SELECT * FROM users WHERE id = $1;
```
运行：`mcp-database --config tools.yaml`

## MCP 集成示例
### Claude Code / Claude Desktop
```json
{
  "mcpServers": {
    "database": {
      "command": "npx",
      "args": ["@adversity/mcp-database", "--prebuilt", "postgres"],
      "env": {
        "POSTGRES_HOST": "localhost",
        "POSTGRES_DATABASE": "mydb",
        "POSTGRES_USER": "postgres",
        "POSTGRES_PASSWORD": "your-password"
      }
    }
  }
}
```

### VS Code (Copilot)
`.vscode/mcp.json`
```json
{
  "servers": {
    "database": {
      "command": "npx",
      "args": ["@adversity/mcp-database", "--prebuilt", "sqlite"],
      "env": {
        "SQLITE_DATABASE": "./my.db"
      }
    }
  }
}
```

## CLI 参考
```
mcp-database [OPTIONS]
  -c, --config <path>    指定 tools.yaml
  -p, --prebuilt <type>  使用预置配置（postgres/mysql/sqlite/mongodb/redis/mssql 等）
      --stdio            使用 stdio 传输（默认）
  -v, --version          显示版本
  -h, --help             帮助
      --verbose          详细日志
```

## 常用环境变量
- PostgreSQL: `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DATABASE`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- MySQL: `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`
- MongoDB: `MONGODB_HOST`, `MONGODB_PORT`, `MONGODB_DATABASE`, `MONGODB_USER`, `MONGODB_PASSWORD`
- SQLite: `SQLITE_DATABASE`（文件路径）

## 开发
```bash
npm install
npm run build
npm test
npm run lint
npm run format
```

## 工作原理
包装 genai-toolbox 二进制，通过 MCP 服务器暴露工具；自动解析配置、替换环境变量，并以 stdio 传输处理工具调用。***
