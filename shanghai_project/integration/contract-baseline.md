# 当前可执行接口基线

> 基线提交：`c8a8975`；YAN 联调分支：`codex/yan-integration`。字段命名统一以当前代码的 `camelCase` 为准。

## App 当前主流程（兼容接口）

| 方法 | 路径 | 认证 | 当前用途 | 状态 |
|------|------|------|----------|------|
| POST | `/api/recognize` | 否 | 相机/相册 Base64 食材识别 | Mock 已通过 |
| POST | `/api/recipe/generate` | 否 | 生成菜谱 | Mock 已通过 |
| POST | `/api/workout/recommend` | 否 | 按身体数据推荐视频 | Mock 已通过 |
| POST | `/api/workout/list` | 否 | 静态分类视频 | Mock 已通过 |
| GET | `/api/workout/categories` | 否 | 视频分类 | Mock 已通过 |

这些接口仍被现有页面和 Zustand Store 调用。删除前必须先迁移前端，否则 Demo 主流程会中断。

## v1 主链路

| 方法 | 路径 | 认证 | 关键输入 | 关键输出 | 状态 |
|------|------|------|----------|----------|------|
| GET | `/health` | 否 | 无 | `ok/mode/timestamp` | 已通过 |
| POST | `/api/v1/auth/register` | 否 | `email/password/nickname` | `accessToken/refreshToken` | 已通过 |
| POST | `/api/v1/auth/login` | 否 | `email/password` | `accessToken/refreshToken` | 已通过 |
| POST | `/api/v1/auth/refresh` | 否 | `refreshToken` | 新 `accessToken/refreshToken` | 已通过，拒绝 Access Token 冒充 |
| POST | `/api/v1/recognition/upload` | 是 | JSON `image` Base64，或 multipart `image` 文件 | `imageId/ingredients/totalNutrition` | 两种格式已通过 |
| POST | `/api/v1/recognition/confirm` | 是 | `imageId/ingredients[]` | `sessionId/totalNutrition` | 已通过 |
| POST | `/api/v1/recipes/generate` | 是 | `sessionId/ingredients/servings/maxCookTime` | `recipeId/nutrition/steps` | 已通过 |
| GET | `/api/v1/recipes/saved/list` | 是 | 无 | 收藏菜谱列表 | 收藏/取消收藏已通过 |
| GET | `/api/v1/workouts/feed` | 是 | `category/page/pageSize` | `items/total/hasMore` | 已通过 |
| GET | `/api/v1/workouts/saved/list` | 是 | 无 | 收藏视频列表 | 收藏/取消收藏已通过 |
| GET | `/api/v1/stats/dashboard` | 是 | 无 | 用户统计 | 已通过 |

## 通用约定

- JSON 字段使用 `camelCase`。
- 前端为每次请求生成 `X-Request-ID`，后端在响应头中透传。
- 没有完整 `config.toml` 时 `/health` 必须返回 `mode: "demo"`。
- `mode: "real"` 时 AI 供应商失败必须返回错误，不得静默降级为 Mock。
- 图片必填、最大 10MB；multipart 只接受 JPEG、PNG、WebP。
- AI 类请求前端超时为 60 秒；写操作失败后由用户主动重试。
- API Key 和本地 JWT Secret 只存放在被忽略的 `server/config.toml`。

## 尚未决策

1. 是否将 App 主流程从兼容接口迁移到需要登录的 v1 接口。
2. 是否保留初始需求中的“结构化健身计划 + 文字提醒”；当前产品仅实现视频推荐。
3. 真实 AI 的模型 ID、调用额度和验收环境由后端负责人提供，不进入 Git。
