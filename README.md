# mcp-database

A Node.js MCP (Model Context Protocol) server that provides database operations for AI assistants and agents. Supports 40+ databases through [genai-toolbox](https://github.com/googleapis/genai-toolbox).

## Features

- ✅ **Easy Installation**: Install via npm/npx - no manual binary downloads
- ✅ **Universal Database Support**: PostgreSQL, MySQL, MongoDB, Redis, SQLite, and 35+ more
- ✅ **Simple Configuration**: YAML config or environment variables
- ✅ **MCP Standard**: Full MCP protocol implementation
- ✅ **Production Ready**: Connection pooling, auth, and observability built-in

## Installation

Install from npm and pick the bundle that fits your environment:

- Core package (no bundled binaries, ~50KB): `npm install -g @adversity/mcp-database`
- Platform-specific (includes binary for one OS/CPU, ~15MB):
  - macOS ARM64: `npm install -g @adversity/mcp-database-darwin-arm64`
  - macOS Intel: `npm install -g @adversity/mcp-database-darwin-x64`
  - Linux x64: `npm install -g @adversity/mcp-database-linux-x64`
  - Windows x64: `npm install -g @adversity/mcp-database-win32-x64`
- No install: `npx @adversity/mcp-database --help`

## Quick Start

### Using Prebuilt Configurations

The easiest way to get started is with prebuilt database configurations:

```bash
# PostgreSQL
POSTGRES_HOST=localhost \
POSTGRES_DATABASE=mydb \
POSTGRES_USER=user \
POSTGRES_PASSWORD=password \
npx @adversity/mcp-database --prebuilt postgres

# MySQL
MYSQL_HOST=localhost \
MYSQL_DATABASE=mydb \
MYSQL_USER=root \
MYSQL_PASSWORD=password \
npx @adversity/mcp-database --prebuilt mysql

# SQLite (no credentials needed)
SQLITE_DATABASE=./my-database.db \
npx @adversity/mcp-database --prebuilt sqlite

# MongoDB
MONGODB_HOST=localhost \
MONGODB_DATABASE=mydb \
MONGODB_USER=user \
MONGODB_PASSWORD=password \
npx @adversity/mcp-database --prebuilt mongodb
```

### Using Custom Configuration

Create a `tools.yaml` file:

```yaml
sources:
  my-postgres:
    kind: postgres
    host: ${POSTGRES_HOST:localhost}
    port: ${POSTGRES_PORT:5432}
    database: ${POSTGRES_DATABASE:mydb}
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
        description: The user ID
    statement: SELECT * FROM users WHERE id = $1;
```

Run with custom config:

```bash
mcp-database --config tools.yaml
```

### SQLite Built-in Introspection Tools (Recommended for AI)

Designed for AI to explore unknown databases without schema knowledge:

```bash
SQLITE_DATABASE=./your-database.db \
npx @adversity/mcp-database --config prebuilt/sqlite-introspection.yaml
```

**15 Built-in Introspection Tools:**

| Tool Set | Tool Name | Function |
|----------|-----------|----------|
| **Basic Exploration** | `sqlite_list_tables` | List all tables and views |
| | `sqlite_describe_table` | View table structure (columns, types, keys) |
| | `sqlite_list_columns` | List all column information |
| | `sqlite_preview_table` | Preview first N rows of data |
| | `sqlite_database_summary` | Complete database summary (tables, indexes, views) |
| **Advanced Analysis** | `sqlite_list_indexes` | List all indexes |
| | `sqlite_list_table_indexes` | View indexes for a specific table |
| | `sqlite_describe_index` | View columns in an index |
| | `sqlite_list_foreign_keys` | View foreign key relationships |
| | `sqlite_get_table_schema` | Get table's CREATE statement |
| **Statistics** | `sqlite_count_rows` | Count total rows in a table |
| | `sqlite_table_stats` | Get statistics for all tables |
| | `sqlite_database_info` | Database basic information |
| | `sqlite_get_schema_version` | Get schema version number |

**Typical AI Workflow:**
```
1. sqlite_list_tables → Discover users, orders, products tables
2. sqlite_describe_table("users") → Understand column structure
3. sqlite_preview_table("users", 5) → See actual data format
4. sqlite_list_foreign_keys("orders") → Understand table relationships
5. Now AI can confidently construct complex queries!
```

**MCP Client Configuration Example:**
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

### SQLite Custom YAML Example

1. Copy the example: `cp tools.example.yaml tools.yaml`
2. Verify sample database exists: `ls sample.sqlite`
3. Run:
   ```bash
   SQLITE_DATABASE=$(pwd)/sample.sqlite \
   npx @adversity/mcp-database --config tools.yaml --verbose
   ```
4. The MCP client can access `sqlite_crud` toolset from `tools.example.yaml`:
   - `sqlite_list_recent_users`: List recent 20 user records
   - `sqlite_get_user_by_id`: Query by ID
   - `sqlite_find_user_by_email`: Search by email
   - `sqlite_create_user` / `sqlite_update_user_email` / `sqlite_delete_user`: Create/Update/Delete

Example YAML snippet (from `tools.example.yaml`):

```yaml
tools:
  sqlite_list_recent_users:
    kind: sqlite-sql
    source: my-sqlite
    description: List recent 20 users ordered by creation time
    statement: |
      SELECT id, name, email, created_at
      FROM users
      ORDER BY datetime(created_at) DESC
      LIMIT 20;

  sqlite_create_user:
    kind: sqlite-sql
    source: my-sqlite
    description: Create new user and return result
    parameters:
      - { name: name, type: string }
      - { name: email, type: string }
    statement: |
      INSERT INTO users (name, email, created_at)
      VALUES (?1, ?2, CURRENT_TIMESTAMP)
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

### Unified Environment Variables and CLI Override

All prebuilt databases parse connection parameters in the following priority:

1. Generic variables: `MCP_DATABASE_HOST/PORT/NAME/USER/PASSWORD`
2. Legacy variables: Database-specific variables like `POSTGRES_HOST`, `MYSQL_PORT`, etc.
3. Default values (e.g., host=localhost, port=5432)

也可以通过 CLI 覆盖，所有值会自动写入通用变量：

```bash
mcp-database --prebuilt postgres \
  --db-host prod-db.internal \
  --db-port 6543 \
  --db-name inventory \
  --db-user readonly
```

### 自定义 toolbox 端口

默认使用 STDIO 模式，不占用 TCP 端口；当需要切换到 HTTP（例如调试或远程访问）时，可指定传输方式与端口：

```bash
npx @adversity/mcp-database --prebuilt sqlite \
  --transport http \
  --toolbox-host 0.0.0.0 \
  --toolbox-port 5900
```

对应环境变量：

| 变量 | 说明 |
| --- | --- |
| `MCP_TOOLBOX_TRANSPORT` | `stdio`（默认）或 `http` |
| `MCP_TOOLBOX_HOST` | HTTP 监听地址，默认 `127.0.0.1` |
| `MCP_TOOLBOX_PORT` | HTTP 端口，默认 `5000` |

CLI 也保留 `--stdio`（布尔）用于兼容旧脚本；推荐使用 `--transport` 来切换模式。

## MCP Integration

### Claude Code / Claude Desktop

Add to your `.mcp.json` or `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "database": {
      "command": "npx",
      "args": ["@adversity/mcp-database", "--prebuilt", "postgres"],
      "env": {
        "POSTGRES_HOST": "localhost",
        "POSTGRES_PORT": "5432",
        "POSTGRES_DATABASE": "mydb",
        "POSTGRES_USER": "postgres",
        "POSTGRES_PASSWORD": "your-password"
      }
    }
  }
}
```

### Cursor IDE

Create `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "database": {
      "command": "npx",
      "args": ["@adversity/mcp-database", "--prebuilt", "mysql"],
      "env": {
        "MYSQL_HOST": "localhost",
        "MYSQL_DATABASE": "mydb",
        "MYSQL_USER": "root",
        "MYSQL_PASSWORD": "your-password"
      }
    }
  }
}
```

### VS Code (Copilot)

Create `.vscode/mcp.json`:

```json
{
  "servers": {
    "database": {
      "command": "npx",
      "args": ["@adversity/mcp-database", "--prebuilt", "postgres"],
      "env": {
        "POSTGRES_HOST": "localhost",
        "POSTGRES_DATABASE": "mydb"
      }
    }
  }
}
```

### Windsurf

Configure via the Cascade assistant's MCP settings with the same JSON format as Cursor.

## Supported Databases

### Relational Databases
- PostgreSQL
- MySQL
- SQL Server
- SQLite
- Oracle
- Cloud SQL (Postgres, MySQL, SQL Server)
- AlloyDB for PostgreSQL
- Spanner
- TiDB
- OceanBase
- YugabyteDB

### NoSQL Databases
- MongoDB
- Redis
- Valkey
- Firestore
- Bigtable
- Cassandra
- Couchbase
- Neo4j
- Dgraph

### Analytics & Warehouses
- BigQuery
- ClickHouse
- Trino
- Serverless Spark
- Elasticsearch
- SingleStore

### Cloud Services
- Looker
- MindsDB
- Dataplex
- Cloud Healthcare API
- Cloud Monitoring

See [genai-toolbox documentation](https://googleapis.github.io/genai-toolbox/resources/sources/) for complete list and configuration details.

## Available Tools

When connected via MCP, the following tools are available to AI assistants:

### `list_tables`
List all tables in the database with their descriptions.

**Example:**
```
Show me all tables in the database
```

### `execute_sql`
Execute any SQL statement on the database.

**Parameters:**
- `sql` (string, required): The SQL statement to execute

**Example:**
```
Get all users from the users table where age > 25
```

## Environment Variables

### PostgreSQL
- `POSTGRES_HOST` - Database host (default: localhost)
- `POSTGRES_PORT` - Database port (default: 5432)
- `POSTGRES_DATABASE` - Database name (required)
- `POSTGRES_USER` - Database user (default: postgres)
- `POSTGRES_PASSWORD` - Database password

### MySQL
- `MYSQL_HOST` - Database host (default: localhost)
- `MYSQL_PORT` - Database port (default: 3306)
- `MYSQL_DATABASE` - Database name (required)
- `MYSQL_USER` - Database user (default: root)
- `MYSQL_PASSWORD` - Database password

### MongoDB
- `MONGODB_HOST` - Database host (default: localhost)
- `MONGODB_PORT` - Database port (default: 27017)
- `MONGODB_DATABASE` - Database name (required)
- `MONGODB_USER` - Database user
- `MONGODB_PASSWORD` - Database password

### SQLite
- `SQLITE_DATABASE` - Path to SQLite database file (default: ./database.db)

See documentation for other database types.

## CLI Reference

```bash
mcp-database [OPTIONS]

OPTIONS:
  -c, --config <path>    Path to tools.yaml configuration file
  -p, --prebuilt <type>  Use prebuilt config for database type
      --db-host <value>  Override MCP_DATABASE_HOST（所有预置类型通用）
      --db-port <value>  Override MCP_DATABASE_PORT
      --db-name <value>  Override MCP_DATABASE_NAME（对应 database/schema）
      --db-user <value>  Override MCP_DATABASE_USER
      --db-password <value> Override MCP_DATABASE_PASSWORD
      --transport <mode> Transport between wrapper 与 toolbox：`stdio`(默认) / `http`
      --toolbox-host <value> 当 transport=http 时的监听地址（默认 127.0.0.1）
      --toolbox-port <value> 当 transport=http 时的端口（默认 5000）
      --stdio            Use stdio transport (default: true)
  -v, --version          Print version
  -h, --help             Print help
      --verbose          Enable verbose logging

PREBUILT TYPES:
  postgres, mysql, sqlite, mongodb, redis, mssql,
  cloud-sql-postgres, cloud-sql-mysql, alloydb-pg,
  bigquery, spanner, firestore
```

## Programmatic Usage

You can also use mcp-database programmatically:

```typescript
import { startServer, generatePrebuiltConfig } from '@adversity/mcp-database';

const config = generatePrebuiltConfig('postgres');

const server = await startServer({
  binaryPath: '/path/to/toolbox',
  config,
  verbose: true,
});

// Server is now running
```

## Testing

The project includes comprehensive test coverage, especially for SQLite features:

```bash
# Run all tests
npm test

# Run only SQLite tests
npm test -- sqlite

# Run with coverage
npm run test:coverage
```

**SQLite Test Coverage:**
- ✅ 63 test cases, 100% passing
- ✅ Configuration loading and environment variable handling
- ✅ 15 built-in introspection tools validation
- ✅ CRUD operations and parameterized queries
- ✅ Toolset integration tests

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run tests
npm test

# Lint
npm run lint

# Format
npm run format
```

## How It Works

This package wraps the [genai-toolbox](https://github.com/googleapis/genai-toolbox) binary and exposes it as an MCP server:

1. **Binary Management**: Automatically downloads the correct genai-toolbox binary for your platform
2. **Configuration**: Generates or loads YAML configuration with environment variable substitution
3. **MCP Protocol**: Implements MCP server protocol over stdio
4. **Tool Execution**: Proxies tool calls to genai-toolbox subprocess

## Requirements

- Node.js 18 or higher
- Internet connection (for initial binary download)
- Database credentials for your target database

## License

MIT

## Related Projects

- [genai-toolbox](https://github.com/googleapis/genai-toolbox) - The underlying database connectivity engine
- [Model Context Protocol](https://modelcontextprotocol.io/) - The protocol specification
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) - MCP SDK

## Contributing

Contributions are welcome! Please open an issue or pull request.

## Support

- GitHub Issues: [Report bugs or request features](https://github.com/yourusername/mcp-database/issues)
- Documentation: [genai-toolbox docs](https://googleapis.github.io/genai-toolbox/)
