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

编辑 `server/config.json`：
```json
{
  "ai": {
    "enabled": true,
    "baseURL": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "apiKey": "你的key",
    "visionModel": "qwen-vl-plus",
    "textModel": "qwen-plus"
  }
}
```
支持任何 OpenAI 兼容协议（通义/DeepSeek/Moonshot 等）。未配置时后端自动使用内置演示数据，页面已标注"演示数据"。

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
