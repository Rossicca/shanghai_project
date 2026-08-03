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
const configuredJwtSecret =
  process.env.JWT_SECRET || localSecrets.server?.jwtSecret;

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

if (!configuredJwtSecret) {
  console.warn('[config] 未配置 JWT_SECRET，本次演示进程将使用临时随机密钥。');
}

function isMockMode() {
  return (
    !config.ai.enabled ||
    !config.ai.apiKey ||
    !config.ai.visionModel ||
    !config.ai.textModel
  );
}

module.exports = { config, isMockMode };
