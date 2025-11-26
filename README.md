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

- Platform-specific (includes binary for one OS/CPU, ~15MB):
  - macOS ARM64: `npm install -g @adversity/mcp-database-darwin-arm64`
  - macOS Intel: `npm install -g @adversity/mcp-database-darwin-x64`
  - Linux x64: `npm install -g @adversity/mcp-database-linux-x64`
  - Windows x64: `npm install -g @adversity/mcp-database-win32-x64`
- Full bundle (all binaries, ~60MB): `npm install -g @adversity/mcp-database-full`
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
