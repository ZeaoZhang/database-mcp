# 代码风格与规范

## TypeScript 配置
- **目标**: ES2022
- **模块**: ESNext (ESM)
- **严格模式**: 启用
- **强制规则**:
  - `noUnusedLocals`: true
  - `noUnusedParameters`: true
  - `noImplicitReturns`: true
  - `noFallthroughCasesInSwitch`: true

## Prettier 格式化规则
- **分号**: 启用 (`semi: true`)
- **尾逗号**: ES5 风格 (`trailingComma: "es5"`)
- **引号**: 单引号 (`singleQuote: true`)
- **行宽**: 100 字符
- **缩进**: 2 空格
- **箭头函数参数**: 始终括号 (`arrowParens: "always"`)
- **换行符**: LF

## 命名规范
- **类名**: PascalCase (如 `DatabaseMCPServer`)
- **函数/方法**: camelCase (如 `startServer`, `loadConfig`)
- **常量**: UPPER_SNAKE_CASE 或 camelCase
- **类型/接口**: PascalCase (如 `ToolsConfig`, `DatabaseSource`)
- **文件名**: kebab-case (如 `binary-manager.ts`)

## 导入/导出
- 使用 ESM 语法 (`import`/`export`)
- 文件导入需要 `.js` 扩展名 (ESM 规范)
- 公共 API 通过 `index.ts` 导出

## 类型定义
- 优先使用 `interface` 定义对象类型
- 使用 `type` 定义联合类型和工具类型
- 自定义错误类继承 `Error`

## 代码注释
- 代码注释使用中文
- JSDoc 风格用于公共 API 文档
