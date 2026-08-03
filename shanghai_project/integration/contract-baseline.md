# 当前可执行接口基线

> 基线提交：`abd6020`；YAN 完整验收分支：`codex/yan-contract-completion`。字段命名统一以当前代码的 `camelCase` 为准。

## App 游客兼容路径

| 方法 | 路径 | 认证 | 当前用途 | 状态 |
|------|------|------|----------|------|
| POST | `/api/recognize` | 否 | 相机/相册 Base64 食材识别 | Mock 已通过 |
| POST | `/api/recipe/generate` | 否 | 生成菜谱 | Mock 已通过 |
| POST | `/api/workout/recommend` | 否 | 按身体数据推荐视频 | Mock 已通过 |
| POST | `/api/workout/list` | 否 | 静态分类视频 | Mock 已通过 |
| GET | `/api/workout/categories` | 否 | 视频分类 | Mock 已通过 |

登录用户的识图、食材确认、菜谱、视频和训练计划主流程均使用 v1；上述接口仅供游客演示兼容，删除前仍需明确取消游客模式。

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
| POST | `/api/v1/workout-plans/generate` | 是 | `goalType/weeklyFrequency/sessionDurationMinutes/location/equipment/limitations` | `planId/weeklySchedule/reminders` | Mock 与真实 AI 已通过 |
| GET | `/api/v1/workout-plans/latest` | 是 | 无 | 最近一份结构化训练计划 | 已通过 |
| GET | `/api/v1/recipes/saved/list` | 是 | 无 | 收藏菜谱列表 | 收藏/取消收藏已通过 |
| GET | `/api/v1/workouts/feed` | 是 | `category/page/pageSize` | `items/total/hasMore` | 已通过 |
| GET | `/api/v1/workouts/saved/list` | 是 | 无 | 收藏视频列表 | 收藏/取消收藏已通过 |
| GET | `/api/v1/stats/dashboard` | 是 | 无 | 用户统计 | 已通过 |

## 通用约定

- JSON 字段使用 `camelCase`。
- 前端为每次请求生成 `X-Request-ID`，后端在响应头中透传。
- 所有结构化错误体包含同一个 `requestId`；5xx 前端会展示该编号。
- 没有完整 `config.toml` 时 `/health` 必须返回 `mode: "demo"`。
- `mode: "real"` 时 AI 供应商失败必须返回错误，不得静默降级为 Mock。
- 图片必填、最大 10MB；multipart 只接受 JPEG、PNG、WebP。
- 普通请求超时为 30 秒，AI 类请求为 60 秒；写操作失败后由用户主动重试。
- 非食物图片返回 422 `NO_INGREDIENTS_FOUND`，允许重拍或手动输入，不生成固定演示食材。
- 训练计划中的视频 URL 只能由后端从 B 站白名单数据关联；高风险身体限制返回 422。
- API Key 和本地 JWT Secret 只存放在被忽略的 `server/config.toml`。

## 仍需人工/上游处理

1. 真机相机、相册权限和局域网 HTTP 策略需在实际设备回归。
2. 八类真实图片素材需由团队准备并确认演示授权；仓库只记录用例，不虚构素材结果。
3. Expo 依赖链的中等级别审计告警等待兼容的上游版本，不执行破坏性强制升级。
