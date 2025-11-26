# Project Context

## Purpose
This project provides a Node.js MCP (Model Context Protocol) server wrapper for database operations. It wraps the Google GenAI Toolbox (genai-toolbox) binary to provide easy-to-use database connectivity and CRUD operations for AI assistants and agents.

### Goals
- **Easy Installation**: Install via npm/npx without manual binary downloads
- **Universal Database Support**: Support 40+ databases through genai-toolbox
- **Simple Configuration**: Straightforward YAML or JSON configuration
- **MCP Standard Compliance**: Full MCP protocol implementation for AI tool integration
- **Production Ready**: Connection pooling, authentication, and observability built-in

### Target Users
- AI agent developers needing database access
- IDE users (Cursor, Claude Code, Windsurf, VS Code) wanting database MCP tools
- Applications requiring multi-database support with unified interface

## Tech Stack
- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **MCP Protocol**: @modelcontextprotocol/sdk
- **Core Engine**: genai-toolbox (Go binary, wrapped)
- **Package Manager**: npm
- **Build Tool**: tsup or esbuild
- **Testing**: Vitest or Jest
- **Linting**: ESLint + Prettier

## Project Conventions

### Code Style
- **Language**: TypeScript with strict mode enabled
- **Formatting**: Prettier with 2-space indentation
- **Naming**:
  - Files: kebab-case (e.g., `database-manager.ts`)
  - Classes: PascalCase (e.g., `DatabaseManager`)
  - Functions/variables: camelCase (e.g., `getConnection`)
  - Constants: UPPER_SNAKE_CASE (e.g., `DEFAULT_PORT`)
- **Imports**: Use named imports, group by external/internal
- **Comments**: JSDoc for public APIs, inline comments for complex logic

### Architecture Patterns
- **Wrapper Pattern**: Wrap genai-toolbox binary as a managed subprocess
- **Binary Management**: Auto-download platform-specific binaries on install
- **Configuration**: Support both YAML and environment variables
- **Process Management**: Spawn, monitor, and gracefully shutdown toolbox process
- **Error Handling**: Structured error types, graceful degradation
- **Logging**: Structured logging with configurable levels

### Package Structure
```
mcp-database/
├── src/
│   ├── index.ts              # Main entry point
│   ├── server.ts             # MCP server implementation
│   ├── binary-manager.ts     # Download and manage toolbox binary
│   ├── config.ts             # Configuration handling
│   ├── tools/                # MCP tool definitions
│   └── types.ts              # TypeScript type definitions
├── bin/
│   └── mcp-database.js       # CLI entry point
├── binaries/                 # Downloaded toolbox binaries (gitignored)
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

### Testing Strategy
- **Unit Tests**: Test individual modules (config, binary-manager)
- **Integration Tests**: Test with local databases (SQLite, PostgreSQL)
- **E2E Tests**: Test full MCP protocol flow
- **CI/CD**: GitHub Actions for automated testing
- **Coverage**: Aim for 80%+ code coverage

### Git Workflow
- **Main Branch**: `main` - stable, production-ready code
- **Feature Branches**: `feature/description` or `feat/description`
- **Commit Convention**: Conventional Commits
  - `feat:` - New features
  - `fix:` - Bug fixes
  - `docs:` - Documentation changes
  - `chore:` - Maintenance tasks
  - `test:` - Test additions/changes
- **Pull Requests**: Required for all changes, 1 approval minimum

## Domain Context

### MCP Protocol
- **Model Context Protocol**: Open standard for connecting LLMs to data sources
- **Tools**: Function-like capabilities exposed to AI models
- **Resources**: Static/dynamic content (schemas, documentation)
- **Prompts**: Pre-defined prompt templates (optional for this project)

### Database Operations
- **CRUD**: Create, Read, Update, Delete operations
- **Schema Discovery**: List tables, describe schemas
- **Query Execution**: Execute SQL statements safely
- **Transaction Support**: Begin, commit, rollback (future enhancement)

### Supported Databases (via genai-toolbox)
**Relational Databases**:
- PostgreSQL, MySQL, SQL Server, SQLite, Oracle
- Cloud SQL (Postgres, MySQL, SQL Server)
- AlloyDB for PostgreSQL
- Spanner, TiDB, OceanBase, YugabyteDB

**NoSQL Databases**:
- MongoDB, Redis, Valkey, Firestore, Bigtable
- Cassandra, Couchbase, Neo4j, Dgraph

**Analytics & Warehouses**:
- BigQuery, ClickHouse, Trino, Serverless Spark
- Elasticsearch, SingleStore

**Cloud Services**:
- Looker, MindsDB, Dataplex
- Cloud Healthcare API, Cloud Monitoring

## Important Constraints

### Technical Constraints
- **Binary Dependency**: Requires genai-toolbox binary (auto-managed)
- **Platform Support**: Linux (amd64), macOS (arm64, amd64), Windows (amd64)
- **Node.js Version**: Minimum Node.js 18.0.0
- **Network**: Requires internet for initial binary download
- **Database Access**: Users must provide their own database credentials

### Security Constraints
- **Credential Storage**: Never log or expose database passwords
- **Environment Variables**: Sensitive data via env vars only
- **SQL Injection**: Use parameterized queries (handled by toolbox)
- **Least Privilege**: Encourage minimal database permissions

### Performance Constraints
- **Connection Pooling**: Handled by genai-toolbox
- **Binary Overhead**: ~50-100MB disk space per platform binary
- **Startup Time**: 1-3 seconds to spawn toolbox process

## External Dependencies

### Core Dependencies
- **@modelcontextprotocol/sdk**: MCP protocol implementation
- **genai-toolbox**: Core database connectivity engine (binary)
- **yaml**: YAML configuration parsing
- **zod**: Runtime type validation

### Development Dependencies
- **TypeScript**: Type safety and tooling
- **tsup/esbuild**: Fast TypeScript bundling
- **vitest**: Modern test framework
- **prettier**: Code formatting
- **eslint**: Linting

### External Services
- **genai-toolbox releases**: https://github.com/googleapis/genai-toolbox/releases
- **npm registry**: Package distribution
- **Database services**: User-provided database instances

## CLI Usage Examples

```bash
# Install globally
npm install -g mcp-database

# Or use with npx (no installation)
npx mcp-database --config tools.yaml

# With environment variables
POSTGRES_HOST=localhost \
POSTGRES_PORT=5432 \
POSTGRES_DATABASE=mydb \
POSTGRES_USER=user \
POSTGRES_PASSWORD=pass \
npx mcp-database --prebuilt postgres --stdio

# MCP configuration (for IDEs)
{
  "mcpServers": {
    "database": {
      "command": "npx",
      "args": ["mcp-database", "--prebuilt", "postgres", "--stdio"],
      "env": {
        "POSTGRES_HOST": "localhost",
        "POSTGRES_DATABASE": "mydb"
      }
    }
  }
}
```

## Development Principles
- **Simplicity First**: Minimize configuration complexity
- **Sensible Defaults**: Work out-of-box for common cases
- **Progressive Enhancement**: Basic features first, advanced later
- **Error Messages**: Clear, actionable error messages
- **Documentation**: Comprehensive README and examples
