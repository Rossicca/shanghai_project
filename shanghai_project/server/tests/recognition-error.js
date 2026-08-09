const assert = require('assert/strict');
const { spawn } = require('child_process');
const path = require('path');

const port = 8794;
const baseUrl = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['server.js'], {
  cwd: path.join(__dirname, '..'),
  env: {
    ...process.env,
    PORT: String(port),
    AI_FORCE_DEMO: 'false',
    VOLCANO_ARK_API_KEY: 'test-key',
    VOLCANO_ARK_BASE_URL: 'http://127.0.0.1:1/api/v3',
    VOLCANO_VISION_MODEL: 'test-vision-model',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let output = '';
server.stdout.on('data', (chunk) => (output += chunk));
server.stderr.on('data', (chunk) => (output += chunk));

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Backend did not start. ${output}`);
}

async function main() {
  await waitForServer();
  const response = await fetch(`${baseUrl}/api/recognize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Request-ID': 'recognition-network-failure' },
    body: JSON.stringify({ image: Buffer.from('not-a-real-image').toString('base64') }),
  });
  const data = await response.json();
  assert.equal(response.status, 502);
  assert.equal(data.error?.code, 'AI_RECOGNITION_FAILED');
  assert.equal(data.error?.requestId, 'recognition-network-failure');
  assert.notEqual(data.error?.code, 'NO_INGREDIENTS_FOUND');
  console.log(JSON.stringify({ status: response.status, code: data.error.code, requestId: data.error.requestId }));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ error: error.message, output }));
    process.exitCode = 1;
  })
  .finally(() => server.kill());
