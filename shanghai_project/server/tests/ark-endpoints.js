const fs = require('fs');
const path = require('path');
const toml = require('toml');

const configPath = path.join(__dirname, '..', 'config.toml');
const localConfig = toml.parse(fs.readFileSync(configPath, 'utf8'));
const ai = localConfig.ai || {};
const apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

function loadImageDataUrl() {
  const imagePath = path.join(__dirname, '..', '..', 'assets', 'images', 'icon.png');
  return `data:image/png;base64,${fs.readFileSync(imagePath).toString('base64')}`;
}

async function chat(model, messages) {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ai.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, max_tokens: 300, temperature: 0.1 }),
  });
  const data = await response.json();
  return {
    endpoint: model,
    status: response.status,
    actualModel: data.model || null,
    content: data.choices?.[0]?.message?.content || null,
    error: data.error ? { code: data.error.code, message: data.error.message } : null,
  };
}

async function main() {
  const visionMessages = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: '\u8bc6\u522b\u56fe\u7247\u91cc\u7684\u98df\u6750\uff1b\u5982\u679c\u6ca1\u6709\u98df\u6750\uff0c\u8fd4\u56de\u7a7a\u6570\u7ec4\u3002\u53ea\u8f93\u51fa JSON\uff1a{"ingredients":[{"name":"\u540d\u79f0"}]}',
        },
        { type: 'image_url', image_url: { url: loadImageDataUrl() } },
      ],
    },
  ];

  const results = [];
  for (const endpoint of [ai.visionModel, ai.visionModelCandidate].filter(Boolean)) {
    results.push({ kind: 'vision', ...(await chat(endpoint, visionMessages)) });
  }
  results.push({
    kind: 'text',
    ...(await chat(ai.textModel, [{ role: 'user', content: '\u53ea\u56de\u590d OK' }])),
  });

  for (const result of results) console.log(JSON.stringify(result));
  if (results.some((result) => result.status !== 200)) process.exitCode = 1;
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error.message }));
  process.exitCode = 1;
});
