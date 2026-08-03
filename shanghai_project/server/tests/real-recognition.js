const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const port = 8793;
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['server.js'], {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, PORT: String(port) },
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

async function main() {
  const health = await waitForServer();
  if (health.mode !== 'real') throw new Error(`Expected real mode, got ${health.mode}`);

  const imagePath = path.join(__dirname, '..', '..', 'assets', 'images', 'icon.png');
  const image = fs.readFileSync(imagePath).toString('base64');
  const response = await fetch(`${baseUrl}/api/recognize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Request-ID': 'yan-real-ai-check' },
    body: JSON.stringify({ image }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Recognition failed: HTTP ${response.status} ${JSON.stringify(body)}`);
  if (!Array.isArray(body.ingredients)) throw new Error('ingredients must be an array');

  const fixedDemoNames = ['\u9e21\u80f8\u8089', '\u897f\u5170\u82b1', '\u9e21\u86cb', '\u7cd9\u7c73'];
  const names = body.ingredients.map((item) => item.name);
  if (JSON.stringify(names) === JSON.stringify(fixedDemoNames)) {
    throw new Error('Recognition still returned the fixed four demo ingredients');
  }

  const recipeResponse = await fetch(`${baseUrl}/api/recipe/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Request-ID': 'yan-real-recipe-check' },
    body: JSON.stringify({
      ingredients: [{ name: '\u9e21\u80f8\u8089', amount: '200g' }, { name: '\u897f\u5170\u82b1', amount: '150g' }],
      people: 1,
      cookTime: 20,
      difficulty: '\u7b80\u5355',
    }),
  });
  const recipeBody = await recipeResponse.json();
  if (!recipeResponse.ok || !recipeBody.recipe?.name || !Array.isArray(recipeBody.recipe.steps)) {
    throw new Error(`Recipe generation failed: HTTP ${recipeResponse.status} ${JSON.stringify(recipeBody)}`);
  }

  console.log(JSON.stringify({
    health,
    recognition: {
      status: response.status,
      requestId: response.headers.get('x-request-id'),
      ingredients: body.ingredients,
    },
    recipe: {
      status: recipeResponse.status,
      requestId: recipeResponse.headers.get('x-request-id'),
      name: recipeBody.recipe.name,
      stepCount: recipeBody.recipe.steps.length,
    },
  }));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ error: error.message }));
    process.exitCode = 1;
  })
  .finally(() => server.kill());
