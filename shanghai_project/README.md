# Shanghai Project

健身食材识别 + 运动视频推荐平台（Expo / React Native）

## 快速启动

**方式一（推荐，Windows）：** 双击项目根目录的 `start-dev.bat`
- 自动启动后端 API（localhost:8787）+ Expo Web（localhost:8081）

**方式二（手动）：**
```bash
# 1. 启动后端（真 AI / mock 自动切换）
node server/server.js

# 2. 启动 App（Web 演示）
npm run web

# 手机演示：用 Expo Go 扫码
npx expo start
```

## 连接真实 AI（可选）

复制本地密钥模板（`config.toml` 已加入 `.gitignore`，不会被提交）：

```powershell
Copy-Item server/config.toml.example server/config.toml
```

然后编辑 `server/config.toml`，填写本机的 API Key、视觉模型和文本模型。非敏感的服务地址及开关保存在 `server/config.json`。支持火山方舟及其他 OpenAI 兼容协议；配置不完整时后端使用内置演示数据，配置完整后若真实 AI 调用失败则明确返回错误，不会用 Mock 伪装成功。

> 不要把 API Key、真实测试账号密码或 JWT Secret 写进 `config.json`，也不要提交 `config.toml`。

可通过健康检查确认当前模式：

```powershell
Invoke-RestMethod http://localhost:8787/health
```

返回 `mode: "demo"` 表示演示数据，`mode: "real"` 才表示本地真实 AI 配置完整。

## 本地检查

```bash
# 前端类型检查与 lint
npm run typecheck
npm run lint

# 前端 Web 构建
npm run build:web

# 后端接口冒烟测试（自动启动测试端口，不需要真实 AI 密钥）
npm --prefix server run test:smoke
```

## 目录结构

```
src/app/            Expo Router 路由（Tab 导航 + 各功能页）
src/components/     UI 组件（Button/Card/Input/相机/菜谱/运动/看板）
src/services/       API 服务层（对接后端）
src/store/          Zustand 状态（用户/菜谱/运动）
src/types/          类型定义
server/             本地后端（AI 代理 + mock 数据）
```

## 两条核心闭环

1. **拍照 → 菜谱**：`首页/菜谱 → 拍照识别 → 食材确认 → 生成条件 → AI 菜谱（营养环图/热量对比）`
2. **身体数据 → 运动视频**：`我的 → 身体数据 → 练 → 为你推荐（按 BMI/目标/年龄推荐）`

> 健康建议仅供参考，非医疗用途。
