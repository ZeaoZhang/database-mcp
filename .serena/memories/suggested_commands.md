# 开发命令参考

## 构建与开发
```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 开发模式 (watch)
npm run dev
```

## 测试
```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- sqlite

# 测试覆盖率
npm run test:coverage
```

## 代码质量
```bash
# 类型检查
npm run typecheck

# Lint 检查
npm run lint

# 代码格式化
npm run format

# 检查格式 (CI)
npm run format:check
```

## 运行
```bash
# 使用预置配置运行
DATABASE_NAME=./test.db npx . --prebuilt sqlite

# 使用自定义配置
npx . --config tools.yaml --verbose

# 查看帮助
npx . --help
```

## 发布脚本
```bash
# 下载二进制文件
npm run download:binaries

# 发布包
npm run publish:packages
```

## Git 工作流
```bash
# 查看状态
git status

# 提交
git add . && git commit -m "message"

# 推送
git push origin main
```

## 系统命令 (Darwin/macOS)
```bash
# 文件搜索
find . -name "*.ts" -type f

# 内容搜索
grep -r "pattern" --include="*.ts" .

# 目录列表
ls -la

# 进程管理
ps aux | grep node
kill -9 <pid>
```
