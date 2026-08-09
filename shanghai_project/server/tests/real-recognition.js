const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const port = 8793;
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['server.js'], {
  cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverOutput = '';
server.stdout.on('data', (chunk) => (serverOutput += chunk));
server.stderr.on('data', (chunk) => (serverOutput += chunk));

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return response.json();
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Backend did not start. ${serverOutput}`);
}

async function request(pathname, { method = 'GET', token, body, requestId } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Request-ID': requestId || `yan-real-${Date.now()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { response, data: await response.json() };
}

async function main() {
  const health = await waitForServer();
  if (health.mode !== 'real') throw new Error(`Expected real mode, got ${health.mode}`);

  const registration = await request('/api/v1/auth/register', {
    method: 'POST',
    body: { email: `yan-real-${Date.now()}@example.com`, password: 'TestPass123!', nickname: 'YAN\u771f\u5b9e\u8054\u8c03' },
  });
  if (registration.response.status !== 201) throw new Error(`Registration failed: ${JSON.stringify(registration.data)}`);
  const token = registration.data.data.accessToken;

  const foodImageResponse = await fetch('https://upload.wikimedia.org/wikipedia/commons/5/56/Tomato_with_egg.jpg');
  if (!foodImageResponse.ok) throw new Error(`Food fixture download failed: ${foodImageResponse.status}`);
  const foodImage = Buffer.from(await foodImageResponse.arrayBuffer()).toString('base64');
  const food = await request('/api/v1/recognition/upload', {
    method: 'POST', token, requestId: 'yan-real-food',
    body: { image: foodImage },
  });
  if (!food.response.ok || !Array.isArray(food.data.data?.ingredients) || food.data.data.ingredients.length === 0) {
    throw new Error(`Food recognition failed: HTTP ${food.response.status} ${JSON.stringify(food.data)}`);
  }

  const imagePath = path.join(__dirname, '..', '..', 'assets', 'images', 'icon.png');
  const nonFood = await request('/api/v1/recognition/upload', {
    method: 'POST', token, requestId: 'yan-real-non-food',
    body: { image: fs.readFileSync(imagePath).toString('base64') },
  });
  if (nonFood.response.status !== 422 || nonFood.data.error?.code !== 'NO_INGREDIENTS_FOUND') {
    throw new Error(`Non-food contract failed: HTTP ${nonFood.response.status} ${JSON.stringify(nonFood.data)}`);
  }

  const confirmation = await request('/api/v1/recognition/confirm', {
    method: 'POST', token,
    body: { imageId: null, ingredients: [
      { name: '\u9e21\u80f8\u8089', amount: 200, unit: 'g' },
      { name: '\u897f\u5170\u82b1', amount: 150, unit: 'g' },
    ] },
  });
  if (!confirmation.response.ok || !confirmation.data.data?.sessionId) {
    throw new Error(`Confirmation failed: ${JSON.stringify(confirmation.data)}`);
  }

  const recipe = await request('/api/v1/recipes/generate', {
    method: 'POST', token, requestId: 'yan-real-recipe-v1',
    body: {
      sessionId: confirmation.data.data.sessionId,
      servings: 1, maxCookTime: 30, difficulty: '\u7b80\u5355', includeNutritionTarget: true,
    },
  });
  if (!recipe.response.ok || !recipe.data.data?.name || !Array.isArray(recipe.data.data.steps)) {
    throw new Error(`Recipe v1 failed: HTTP ${recipe.response.status} ${JSON.stringify(recipe.data)}`);
  }

  console.log(JSON.stringify({
    health,
    nonFood: {
      status: nonFood.response.status,
      code: nonFood.data.error.code,
      requestId: nonFood.data.error.requestId,
    },
    food: {
      status: food.response.status,
      ingredients: food.data.data.ingredients.map((item) => item.name),
    },
    recipe: {
      status: recipe.response.status,
      requestId: recipe.response.headers.get('x-request-id'),
      name: recipe.data.data.name,
      stepCount: recipe.data.data.steps.length,
      targetCalories: recipe.data.data.nutritionTarget?.targetCalories,
    },
  }));
}

main()
  .catch((error) => { console.error(JSON.stringify({ error: error.message })); process.exitCode = 1; })
  .finally(() => server.kill());
