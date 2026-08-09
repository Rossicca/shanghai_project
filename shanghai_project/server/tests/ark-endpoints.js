const path = require('path');
const fs = require('fs');
const { getTextProvider, getVisionProvider } = require('../config');

function loadImageDataUrl() {
  const imagePath = path.join(__dirname, '..', '..', 'assets', 'images', 'icon.png');
  return `data:image/png;base64,${fs.readFileSync(imagePath).toString('base64')}`;
}

async function loadFoodImageDataUrl() {
  // CC0 食物照片：番茄炒鸡蛋。用真实图片验证视觉模型，而不只是验证接口能返回 200。
  const response = await fetch('https://upload.wikimedia.org/wikipedia/commons/5/56/Tomato_with_egg.jpg');
  if (!response.ok) throw new Error(`food fixture download failed: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  return `data:image/jpeg;base64,${bytes.toString('base64')}`;
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
  const foodImageDataUrl = await loadFoodImageDataUrl();
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
  const foodMessages = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: '\u8bc6\u522b\u56fe\u7247\u91cc\u7684\u98df\u6750\uff0c\u53ea\u8f93\u51fa JSON\uff1a{"ingredients":[{"name":"\u98df\u6750\u540d","amount":"\u4f30\u7b97\u7528\u91cf","confidence":0.9}]}',
        },
        { type: 'image_url', image_url: { url: foodImageDataUrl } },
      ],
    },
  ];
  results.push({ kind: 'vision-food', ...(await chat(getVisionProvider(), foodMessages)) });
  results.push({
    kind: 'text',
    ...(await chat(getTextProvider(), [{ role: 'user', content: '\u53ea\u56de\u590d OK' }])),
  });

  for (const result of results) console.log(JSON.stringify(result));
  if (results.some((result) => result.status !== 200)) process.exitCode = 1;
  const foodResult = results.find((result) => result.kind === 'vision-food');
  const parsedFood = JSON.parse(foodResult?.content || '{}');
  if (!Array.isArray(parsedFood.ingredients) || parsedFood.ingredients.length === 0) {
    throw new Error(`vision food recognition returned no ingredients: ${foodResult?.content}`);
  }

  // 本地后端正在运行时，再验证网页实际使用的兼容接口。
  try {
    const localHealth = await fetch('http://127.0.0.1:8787/health');
    if (localHealth.ok) {
      const localResponse = await fetch('http://127.0.0.1:8787/api/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Request-ID': 'local-live-recognition' },
        body: JSON.stringify({ image: foodImageDataUrl.replace(/^data:image\/[^;]+;base64,/, '') }),
      });
      const localData = await localResponse.json();
      if (!localResponse.ok || !Array.isArray(localData.ingredients) || localData.ingredients.length === 0) {
        throw new Error(`running backend recognition failed: ${localResponse.status} ${JSON.stringify(localData)}`);
      }
      console.log(JSON.stringify({
        kind: 'running-backend',
        status: localResponse.status,
        ingredients: localData.ingredients.map((item) => item.name),
      }));
    }
  } catch (error) {
    if (/running backend recognition failed/.test(error.message)) throw error;
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error.message }));
  process.exitCode = 1;
});
