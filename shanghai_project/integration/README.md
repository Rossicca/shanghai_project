# YAN 联调材料

## 快速执行

```bash
npm --prefix server run test:smoke
npm run verify
npm --prefix server run test:ai-quality
node server/tests/real-recognition.js
```

`yan-test-data.json` 包含四组用户资料和八类图片用例。`test:ai-quality` 对同一菜谱输入连续生成三次并校验结构、食材一致性、营养、目标匹配、可执行性和中文表达；测试不会打印 API Key。

## 人工验证顺序

1. 启动后端并确认 `/health` 的 `mode`。
2. 完成注册或登录。
3. 使用相机及相册分别上传图片。
4. 修改食材名称、克数并确认。
5. 生成菜谱并核对份数、热量、营养和步骤。
6. 根据四组用户资料检查视频推荐差异。
7. 验证断网、超时、错误格式、超大图片、重复提交和空数据。

## 证据要求

只有同时保存以下信息，测试项才能标记为通过：

- 测试编号与环境；
- 脱敏请求和响应；
- `X-Request-ID` 响应头；
- 页面截图或日志；
- 实际结果、预期结果和回归日期。
