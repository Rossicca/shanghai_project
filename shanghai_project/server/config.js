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

/** 文本 LLM（菜谱生成 / 运动推荐）是否已配置 OpenAI 兼容的密钥与模型 */
function isTextLlmReady() {
  return Boolean(config.ai.apiKey && config.ai.textModel && config.ai.baseURL);
}

function isMockMode() {
  if (process.env.AI_FORCE_DEMO === 'true') return true;
  if (!config.ai.enabled) return true;
  if (config.ai.provider === 'baidu') {
    return !config.ai.baidu?.apiKey || !config.ai.baidu?.secretKey;
  }
  return !config.ai.apiKey || !config.ai.visionModel || !config.ai.textModel;
}

module.exports = { config, isMockMode, isTextLlmReady };
