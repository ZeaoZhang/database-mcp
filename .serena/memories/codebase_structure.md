# 代码库结构

```
mcp-database/
├── src/                          # 源代码目录
│   ├── index.ts                  # 公共 API 入口点
│   ├── server.ts                 # MCP 服务器实现 (DatabaseMCPServer)
│   ├── cli.ts                    # CLI 命令行入口
│   ├── config.ts                 # 配置加载和预置配置生成
│   ├── binary-manager.ts         # genai-toolbox 二进制管理
│   ├── types.ts                  # TypeScript 类型定义
│   └── builtin-tools.ts          # 内置工具定义
│
├── tests/                        # 测试文件
│   ├── binary-manager.test.ts    # 二进制管理测试
│   ├── config.test.ts            # 配置测试
│   ├── sqlite.test.ts            # SQLite 测试
│   ├── sqlite-introspection.test.ts  # SQLite 内省工具测试
│   └── sqlite-integration.test.ts    # SQLite 集成测试
│
├── prebuilt/                     # 预置配置文件
│   └── sqlite-introspection.yaml # SQLite 内省工具配置
│
├── packages/                     # 平台特定包
│   ├── darwin-arm64/             # macOS ARM64
│   ├── darwin-x64/               # macOS Intel
│   ├── linux-x64/                # Linux x64
│   └── win32-x64/                # Windows x64
│
├── scripts/                      # 构建和发布脚本
│   ├── download-binaries.sh      # 下载二进制文件
│   ├── publish-packages.sh       # 发布包
│   └── postinstall.cjs           # 安装后脚本
│
├── openspec/                     # OpenSpec 规范文件
│   ├── AGENTS.md                 # AI 代理指南
│   └── project.md                # 项目规范
│
├── .claude/                      # Claude Code 配置
│   └── commands/openspec/        # OpenSpec 命令
│
├── dist/                         # 构建输出 (gitignored)
├── node_modules/                 # 依赖 (gitignored)
│
├── package.json                  # 项目配置
├── tsconfig.json                 # TypeScript 配置
├── vitest.config.ts              # Vitest 测试配置
├── .prettierrc                   # Prettier 格式化配置
├── CLAUDE.md                     # Claude 助手指南
├── README.md                     # 项目文档
└── LICENSE                       # MIT 许可证
```

## 核心模块关系

```
CLI (cli.ts)
    ↓
Server (server.ts) ← Config (config.ts)
    ↓
Binary Manager (binary-manager.ts)
    ↓
genai-toolbox (外部二进制)
```

## 公共 API (index.ts 导出)

- `DatabaseMCPServer` - MCP 服务器类
- `startServer` - 启动服务器函数
- `loadConfig` - 加载配置
- `generatePrebuiltConfig` - 生成预置配置
- `ensureBinary` - 确保二进制文件存在
- 各种类型定义和错误类
