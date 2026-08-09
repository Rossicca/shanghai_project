const path = require('path');
const fs = require('fs');
const { getTextProvider, getVisionProvider } = require('../config');

function loadImageDataUrl() {
  const imagePath = path.join(__dirname, '..', '..', 'assets', 'images', 'icon.png');
  return `data:image/png;base64,${fs.readFileSync(imagePath).toString('base64')}`;
}

async function chat(provider, messages) {
  const response = await fetch(`${provider.baseURL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: provider.model, messages, max_tokens: 300, temperature: 0.1 }),
  });
  const data = await response.json();
  return {
    endpoint: provider.model,
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
  results.push({ kind: 'vision', ...(await chat(getVisionProvider(), visionMessages)) });
  results.push({
    kind: 'text',
    ...(await chat(getTextProvider(), [{ role: 'user', content: '\u53ea\u56de\u590d OK' }])),
  });

  for (const result of results) console.log(JSON.stringify(result));
  if (results.some((result) => result.status !== 200)) process.exitCode = 1;
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error.message }));
  process.exitCode = 1;
});
