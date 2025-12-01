# mcp-database

Node.js MCP（Model Context Protocol）数据库服务器，为智能体提供 40+ 数据源访问能力，底层封装 genai-toolbox。

## 特性
- 开箱即用：预置配置一键连接常见数据库
- 覆盖广泛：PostgreSQL / MySQL / SQLite / MongoDB / Redis 等 40+ 数据源
- 标准 MCP：通过 MCP 协议暴露工具，易于接入各类 IDE/助手
- 生产就绪：连接池、认证、日志与观测能力

## 安装

- `npm install -g @adversity/mcp-database`

## 快速开始
### 预置配置（推荐）
```bash
# PostgreSQL
POSTGRES_HOST=localhost \
POSTGRES_DATABASE=mydb \
POSTGRES_USER=postgres \
POSTGRES_PASSWORD=your-password \
npx @adversity/mcp-database --prebuilt postgres

# SQLite（无需凭证）
SQLITE_DATABASE=./my.db \
npx @adversity/mcp-database --prebuilt sqlite
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

### SQLite 内置自省工具（AI 推荐）
专为 AI 设计的数据库探索工具集，无需提前了解 schema，让 AI 自主探索数据库结构：

```bash
SQLITE_DATABASE=./your-database.db \
npx @adversity/mcp-database --config prebuilt/sqlite-introspection.yaml
```

**内置 15 个自省工具**：

| 工具集 | 工具名 | 功能 |
|--------|--------|------|
| **基础探索** | `sqlite_list_tables` | 列出所有表和视图 |
| | `sqlite_describe_table` | 查看表的完整结构（字段、类型、主键） |
| | `sqlite_list_columns` | 列出表的所有字段信息 |
| | `sqlite_preview_table` | 预览表的前 N 行数据 |
| | `sqlite_database_summary` | 数据库完整摘要（表、索引、视图） |
| **高级分析** | `sqlite_list_indexes` | 列出所有索引 |
| | `sqlite_list_table_indexes` | 查看指定表的索引 |
| | `sqlite_describe_index` | 查看索引包含的字段 |
| | `sqlite_list_foreign_keys` | 查看表的外键关系 |
| | `sqlite_get_table_schema` | 获取表的 CREATE 语句 |
| **统计分析** | `sqlite_count_rows` | 统计表的总行数 |
| | `sqlite_table_stats` | 获取所有表的统计信息 |
| | `sqlite_database_info` | 数据库基本信息 |
| | `sqlite_get_schema_version` | 获取 schema 版本号 |

**AI 典型工作流：**
```
1. sqlite_list_tables → 发现有 users, orders, products 表
2. sqlite_describe_table("users") → 了解字段结构
3. sqlite_preview_table("users", 5) → 查看实际数据格式
4. sqlite_list_foreign_keys("orders") → 理解表关系
5. 现在 AI 可以自信地构造复杂查询！
```

**MCP 客户端配置示例：**
```json
{
  "mcpServers": {
    "database": {
      "command": "npx",
      "args": ["@adversity/mcp-database", "--config", "prebuilt/sqlite-introspection.yaml"],
      "env": {
        "SQLITE_DATABASE": "./your-database.db"
      }
    }
  }
}
```

### SQLite 自定义 YAML 示例
1. 复制示例：`cp tools.example.yaml tools.yaml`
2. 确认示例数据库存在：`ls sample.sqlite`
3. 启动：
   ```bash
   SQLITE_DATABASE=$(pwd)/sample.sqlite \
   npx @adversity/mcp-database --config tools.yaml --verbose
   ```
4. MCP 客户端即可调用 `sqlite_crud` 工具集（位于 `tools.example.yaml`）：
   - `sqlite_list_recent_users`：列出最近 20 条用户记录
   - `sqlite_get_user_by_id`：通过 ID 精确查询
   - `sqlite_find_user_by_email`：邮箱模糊搜索
   - `sqlite_create_user` / `sqlite_update_user_email` / `sqlite_delete_user`

示例 YAML 片段：
```yaml
tools:
  sqlite_list_recent_users:
    kind: sqlite-sql
    source: my-sqlite
    description: 按创建时间倒序列出最近 20 个用户
    statement: |
      SELECT id, name, email, created_at
      FROM users
      ORDER BY datetime(created_at) DESC
      LIMIT 20;

  sqlite_update_user_email:
    kind: sqlite-sql
    source: my-sqlite
    description: 更新指定用户的邮箱
    parameters:
      - { name: user_id, type: number }
      - { name: email, type: string }
    statement: |
      UPDATE users SET email = ?2 WHERE id = ?1
      RETURNING id, name, email, created_at;

toolsets:
  sqlite_crud:
    - sqlite_list_recent_users
    - sqlite_get_user_by_id
    - sqlite_find_user_by_email
    - sqlite_create_user
    - sqlite_update_user_email
    - sqlite_delete_user
```

### 统一环境变量与 CLI 覆盖

所有预置数据库都会按以下顺序读取连接信息：

1. 通用变量 `MCP_DATABASE_HOST/PORT/NAME/USER/PASSWORD`
2. 传统变量（如 `POSTGRES_HOST`、`MYSQL_PORT` 等）
3. 内置默认值

也可以直接通过 CLI 指定并写入通用变量：

```bash
mcp-database --prebuilt mysql \
  --db-host staging-db.internal \
  --db-port 33306 \
  --db-name orders \
  --db-user readonly
```

### 自定义 toolbox 端口

默认使用 STDIO，不占用端口；若需要 HTTP 监听（例如远程调试），可指定传输方式：

```bash
npx @adversity/mcp-database --prebuilt sqlite \
  --transport http \
  --toolbox-host 0.0.0.0 \
  --toolbox-port 5900
```

相关环境变量：

| 变量 | 说明 |
| --- | --- |
| `MCP_TOOLBOX_TRANSPORT` | `stdio`（默认）或 `http` |
| `MCP_TOOLBOX_HOST` | HTTP 模式监听地址，默认 `127.0.0.1` |
| `MCP_TOOLBOX_PORT` | HTTP 模式端口，默认 `5000` |

CLI 仍支持 `--stdio` 选项，但推荐使用 `--transport=http` 来切换模式。

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
      --db-host <value>  覆盖 MCP_DATABASE_HOST
      --db-port <value>  覆盖 MCP_DATABASE_PORT
      --db-name <value>  覆盖 MCP_DATABASE_NAME
      --db-user <value>  覆盖 MCP_DATABASE_USER
      --db-password <value> 覆盖 MCP_DATABASE_PASSWORD
      --transport <mode> 选择与 toolbox 的通信方式：`stdio` / `http`
      --toolbox-host <value> HTTP 模式监听地址（默认 127.0.0.1）
      --toolbox-port <value> HTTP 模式端口（默认 5000）
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

## 测试

项目包含完整的测试套件，特别是 SQLite 功能：

```bash
# 运行所有测试
npm test

# 仅运行 SQLite 测试
npm test -- sqlite

# 查看测试覆盖率
npm run test:coverage
```

**SQLite 测试覆盖：**
- ✅ 63 个测试用例，100% 通过
- ✅ 配置加载和环境变量处理
- ✅ 15 个内置自省工具完整性验证
- ✅ CRUD 操作和参数化查询
- ✅ 工具集集成测试

## 开发
```bash
npm install
npm run build
npm test
npm run lint
npm run format
```

## 工作原理
包装 genai-toolbox 二进制，通过 MCP 服务器暴露工具；自动解析配置、替换环境变量，并以 stdio 传输处理工具调用。
