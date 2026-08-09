const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');
const toml = require('toml');

const publicConfig = require('./config.json');

function loadLocalSecrets() {
  const configPath = path.join(__dirname, 'config.toml');
  if (!fs.existsSync(configPath)) return {};

  try {
    return toml.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.warn('[config] config.toml 读取失败，将使用演示模式:', error.message);
    return {};
  }
}

const localSecrets = loadLocalSecrets();
const jwtSecretPath = path.join(__dirname, '.jwt-secret');

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
}

function readBoolean(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(String(value).trim().toLowerCase());
}

function loadOrCreateJwtSecret() {
  const configured = process.env.JWT_SECRET || localSecrets.server?.jwtSecret;
  if (configured) return configured;
  try {
    if (fs.existsSync(jwtSecretPath)) {
      const stored = fs.readFileSync(jwtSecretPath, 'utf8').trim();
      if (stored) return stored;
    }
    const generated = randomBytes(48).toString('hex');
    fs.writeFileSync(jwtSecretPath, generated, { encoding: 'utf8', mode: 0o600 });
    return generated;
  } catch {
    return randomBytes(48).toString('hex');
  }
}

const configuredJwtSecret = loadOrCreateJwtSecret();
const fileAiConfig = {
  ...publicConfig.ai,
  ...(localSecrets.ai || {}),
};

// 本地开发优先使用 config.toml；服务器部署可用环境变量覆盖，避免把密钥提交到 Git。
const configuredAi = {
  ...fileAiConfig,
  enabled: readBoolean(process.env.AI_ENABLED, fileAiConfig.enabled),
  provider: firstDefined(process.env.AI_PROVIDER, fileAiConfig.provider),
  apiKey: firstDefined(
    process.env.VOLCANO_ARK_API_KEY,
    process.env.ARK_API_KEY,
    process.env.AI_API_KEY,
    fileAiConfig.apiKey
  ),
  baseURL: firstDefined(
    process.env.VOLCANO_ARK_BASE_URL,
    process.env.ARK_BASE_URL,
    process.env.AI_BASE_URL,
    fileAiConfig.baseURL
  ),
  visionModel: firstDefined(
    process.env.VOLCANO_VISION_MODEL,
    process.env.ARK_VISION_MODEL,
    process.env.AI_VISION_MODEL,
    fileAiConfig.visionModel
  ),
  textApiKey: firstDefined(
    process.env.DEEPSEEK_API_KEY,
    process.env.AI_TEXT_API_KEY,
    fileAiConfig.textApiKey
  ),
  textBaseURL: firstDefined(
    process.env.DEEPSEEK_BASE_URL,
    process.env.AI_TEXT_BASE_URL,
    fileAiConfig.textBaseURL
  ),
  textModel: firstDefined(
    process.env.DEEPSEEK_MODEL,
    process.env.AI_TEXT_MODEL,
    fileAiConfig.textModel
  ),
};

const config = {
  ...publicConfig,
  port: Number(process.env.PORT || publicConfig.port || 8787),
  // 未配置时仅生成本次进程有效的随机密钥，避免仓库内出现可预测密钥。
  jwtSecret: configuredJwtSecret || randomBytes(48).toString('hex'),
  ai: {
    ...configuredAi,
  },
};

if (!process.env.JWT_SECRET && !localSecrets.server?.jwtSecret) {
  console.warn('[config] 未显式配置 JWT_SECRET，正在使用本机持久化随机密钥。');
}

/** 文本 LLM（菜谱生成 / 运动推荐）是否已配置可用模型 */
function isTextLlmReady() {
  const textKey = config.ai.textApiKey || config.ai.apiKey;
  const textUrl = config.ai.textBaseURL || config.ai.baseURL;
  return Boolean(textKey && config.ai.textModel && textUrl);
}

/** 获取文本模型专用的 API Key / Base URL（独立于视觉通道） */
function getTextProvider() {
  return {
    apiKey: config.ai.textApiKey || config.ai.apiKey,
    baseURL: config.ai.textBaseURL || config.ai.baseURL,
    model: config.ai.textModel,
  };
}

/** 获取视觉模型的专用配置 */
function getVisionProvider() {
  return {
    apiKey: config.ai.apiKey,
    baseURL: config.ai.baseURL,
    model: config.ai.visionModel,
  };
}

function isMockMode() {
  if (process.env.AI_FORCE_DEMO === 'true') return true;
  if (!config.ai.enabled) return true;
  if (config.ai.provider === 'baidu') {
    return !config.ai.baidu?.apiKey || !config.ai.baidu?.secretKey;
  }
  // 至少有一种AI可用（视觉或文本），否则进演示模式
  const visionReady = isVisionReady();
  const textReady = isTextLlmReady();
  return !visionReady && !textReady;
}

/** 仅视觉模型是否可用 */
function isVisionReady() {
  return Boolean(config.ai.enabled && config.ai.apiKey && config.ai.baseURL && config.ai.visionModel);
}

function getAiStatus() {
  return {
    vision: isVisionReady(),
    text: Boolean(config.ai.enabled && isTextLlmReady()),
    visionProvider: config.ai.provider || 'volcano',
    textProvider: config.ai.textBaseURL ? 'deepseek' : (config.ai.provider || 'volcano'),
  };
}

module.exports = { config, isMockMode, isTextLlmReady, isVisionReady, getTextProvider, getVisionProvider, getAiStatus };
