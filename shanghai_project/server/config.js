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

const config = {
  ...publicConfig,
  port: Number(process.env.PORT || publicConfig.port || 8787),
  // 未配置时仅生成本次进程有效的随机密钥，避免仓库内出现可预测密钥。
  jwtSecret: configuredJwtSecret || randomBytes(48).toString('hex'),
  ai: {
    ...publicConfig.ai,
    ...(localSecrets.ai || {}),
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
  const visionReady = Boolean(config.ai.apiKey && config.ai.visionModel);
  const textReady = isTextLlmReady();
  return !visionReady && !textReady;
}

/** 仅视觉模型是否可用 */
function isVisionReady() {
  return Boolean(config.ai.enabled && config.ai.apiKey && config.ai.visionModel);
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
