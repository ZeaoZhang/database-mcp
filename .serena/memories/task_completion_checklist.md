# 任务完成检查清单

## 代码变更后必须执行

### 1. 类型检查
```bash
npm run typecheck
```
确保没有 TypeScript 编译错误。

### 2. Lint 检查
```bash
npm run lint
```
确保代码符合 ESLint 规则。

### 3. 格式化
```bash
npm run format
```
或检查格式：
```bash
npm run format:check
```

### 4. 测试
```bash
npm test
```
确保所有测试通过。

### 5. 构建验证
```bash
npm run build
```
确保项目能够正常构建。

## 提交前检查
1. ✅ 类型检查通过
2. ✅ Lint 检查通过
3. ✅ 代码已格式化
4. ✅ 所有测试通过
5. ✅ 构建成功
6. ✅ 相关文档已更新 (如需要)

## 发布前额外检查
- [ ] 版本号已更新 (package.json)
- [ ] CHANGELOG 已更新
- [ ] README 已更新 (如有新功能)
- [ ] 二进制文件已下载/更新
