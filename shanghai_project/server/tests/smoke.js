const assert = require('assert/strict');
const path = require('path');
const { spawn } = require('child_process');
const yanTestData = require('../../integration/yan-test-data.json');

const PORT = Number(process.env.TEST_PORT || 8791);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const serverDir = path.resolve(__dirname, '..');

function startServer() {
  const child = spawn(process.execPath, ['server.js'], {
    cwd: serverDir,
    env: { ...process.env, PORT: String(PORT), AI_FORCE_DEMO: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  child.stdout.on('data', (chunk) => (output += chunk));
  child.stderr.on('data', (chunk) => (output += chunk));
  child.getOutput = () => output;
  return child;
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${BASE_URL}/health`);
      if (response.ok) return;
    } catch {
      // 服务仍在启动。
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('测试服务启动超时');
}

async function request(pathname, { method = 'GET', token, body, form, status = 200 } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${BASE_URL}${pathname}`, {
    method,
    headers,
    body: form || (body === undefined ? undefined : JSON.stringify(body)),
  });
  const data = await response.json();
  assert.equal(response.status, status, `${method} ${pathname}: ${JSON.stringify(data)}`);
  return { data, headers: response.headers };
}

async function run() {
  const server = startServer();

  try {
    await waitForServer();

    const health = await request('/health');
    assert.equal(health.data.ok, true);
    assert.equal(health.data.mode, 'demo', '没有本地 AI 密钥时必须明确标记为 demo');
    assert.ok(health.headers.get('x-request-id'), '响应必须包含 X-Request-ID');
    await request('/api/media/bilibili-cover?url=https%3A%2F%2Fevil.example.com%2Fcover.jpg', { status: 400 });

    const unauthenticated = await request('/api/v1/recognition/history', { status: 401 });
    assert.ok(unauthenticated.data.error.requestId, '\u9519\u8bef\u54cd\u5e94\u5fc5\u987b\u5305\u542b requestId');
    await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'missing@example.com', password: 'wrong' },
      status: 401,
    });

    const email = `yan-${Date.now()}@example.com`;
    const register = await request('/api/v1/auth/register', {
      method: 'POST',
      body: { email, password: 'TestPass123!', nickname: 'YAN联调' },
      status: 201,
    });
    const token = register.data.data.accessToken;
    const refreshToken = register.data.data.refreshToken;
    assert.ok(token);
    assert.ok(refreshToken);

    await request('/api/v1/auth/refresh', {
      method: 'POST',
      body: { refreshToken: token },
      status: 401,
    });
    const refreshed = await request('/api/v1/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
    assert.ok(refreshed.data.data.accessToken);
    assert.ok(refreshed.data.data.refreshToken);

    await request('/api/v1/users/me/body-data', {
      method: 'POST',
      token,
      body: { height: 168, weight: 60, age: 24, gender: '女', bodyFat: 24 },
    });
    await request('/api/v1/users/me/goal', {
      method: 'PUT',
      token,
      body: { goalType: 'lose_fat', targetWeight: 55, activityLevel: 'moderate' },
    });
    await request('/api/v1/users/me/body-data', {
      method: 'POST', token,
      body: { height: 0, weight: -1, age: 0, gender: 'unknown' },
      status: 400,
    });
    await request('/api/v1/users/me/preferences', {
      method: 'PUT', token,
      body: { dietType: 'balanced', allergies: ['\u867e'], workoutLocation: 'home', hasEquipment: false },
    });
    await request('/api/v1/recipes/generate', {
      method: 'POST', token, status: 422,
      body: { ingredients: [{ name: '\u867e', amount: '200g' }], servings: 1 },
    });

    const workoutPlan = await request('/api/v1/workout-plans/generate', {
      method: 'POST',
      token,
      body: {
        goalType: 'lose_fat', weeklyFrequency: 4, sessionDurationMinutes: 30,
        workoutLocation: 'home', hasEquipment: false, fitnessLevel: 'beginner',
        limitations: ['\u819d\u5173\u8282\u907f\u514d\u9ad8\u51b2\u51fb'],
      },
    });
    assert.equal(workoutPlan.data.data.weeklySchedule.length, 4);
    assert.ok(workoutPlan.data.data.weeklySchedule.every((day) => Array.isArray(day.exercises) && day.exercises.length > 0));
    assert.ok(workoutPlan.data.data.weeklySchedule.flatMap((day) => day.exercises)
      .every((exercise) => exercise.videoUrl === null || /^https:\/\/(www\.|search\.)?bilibili\.com\//.test(exercise.videoUrl)));
    const latestPlan = await request('/api/v1/workout-plans/latest', { token });
    assert.equal(latestPlan.data.data.planId, workoutPlan.data.data.planId);
    for (const profile of yanTestData.profiles.slice(1)) {
      const profilePlan = await request('/api/v1/workout-plans/generate', {
        method: 'POST', token,
        body: {
          goalType: profile.goal.type,
          weeklyFrequency: profile.goal.weeklyFrequency,
          sessionDurationMinutes: profile.preferences.maxCookTime || 30,
          workoutLocation: profile.preferences.workoutLocation,
          hasEquipment: profile.preferences.hasEquipment,
          fitnessLevel: 'beginner', limitations: [],
        },
      });
      assert.ok(profilePlan.data.data.weeklySchedule.length >= 1);
      assert.ok(profilePlan.data.data.weeklySchedule.every((day) => day.durationMinutes >= 10));
    }
    await request('/api/v1/workout-plans/generate', {
      method: 'POST', token, status: 422,
      body: {
        goalType: 'maintain', weeklyFrequency: 2, sessionDurationMinutes: 20,
        workoutLocation: 'home', hasEquipment: false, fitnessLevel: 'beginner',
        limitations: ['\u6000\u5b55\u671f\u95f4\u6709\u80f8\u75db'],
      },
    });

    const recognition = await request('/api/v1/recognition/upload', {
      method: 'POST',
      token,
      body: { image: 'c21va2UtaW1hZ2U=' },
    });
    const ingredients = recognition.data.data.ingredients;
    assert.ok(Array.isArray(ingredients) && ingredients.length > 0);

    await request('/api/v1/recognition/upload', {
      method: 'POST',
      token,
      body: {},
      status: 400,
    });

    const form = new FormData();
    form.append('image', new Blob([Buffer.from('smoke-image')], { type: 'image/jpeg' }), 'test.jpg');
    const multipartRecognition = await request('/api/v1/recognition/upload', {
      method: 'POST',
      token,
      form,
    });
    assert.ok(multipartRecognition.data.data.ingredients.length > 0);

    const invalidForm = new FormData();
    invalidForm.append('image', new Blob(['not-an-image'], { type: 'text/plain' }), 'test.txt');
    await request('/api/v1/recognition/upload', {
      method: 'POST',
      token,
      form: invalidForm,
      status: 400,
    });

    const oversizedForm = new FormData();
    oversizedForm.append(
      'image',
      new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: 'image/jpeg' }),
      'oversized.jpg'
    );
    await request('/api/v1/recognition/upload', {
      method: 'POST',
      token,
      form: oversizedForm,
      status: 400,
    });

    await request('/api/v1/recognition/confirm', {
      method: 'POST',
      token,
      body: {},
      status: 400,
    });

    const confirmedIngredients = ingredients.map((item) => ({
      name: item.name,
      amount: item.estimatedAmount,
      unit: item.unit,
    }));
    const confirmation = await request('/api/v1/recognition/confirm', {
      method: 'POST',
      token,
      body: { imageId: recognition.data.data.imageId, ingredients: confirmedIngredients },
    });
    assert.ok(confirmation.data.data.sessionId);

    const recipeBody = {
      sessionId: confirmation.data.data.sessionId,
      mealType: 'lunch',
      servings: 1,
      maxCookTime: 30,
      difficulty: 'easy',
      includeNutritionTarget: true,
    };
    let generatedRecipeId;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const recipe = await request('/api/v1/recipes/generate', {
        method: 'POST',
        token,
        body: recipeBody,
      });
      assert.ok(recipe.data.data.recipeId);
      assert.ok(recipe.data.data.name);
      assert.ok(recipe.data.data.nutritionTarget.targetCalories >= 300 && recipe.data.data.nutritionTarget.targetCalories <= 900);
      assert.equal(recipe.data.data.servings, 1);
      assert.ok(Number.isFinite(recipe.data.data.nutrition.calories));
      generatedRecipeId = recipe.data.data.recipeId;
    }
    await request('/api/v1/recipes/generate', {
      method: 'POST',
      token,
      body: recipeBody,
      status: 429,
    });

    await request(`/api/v1/recipes/${generatedRecipeId}`, { token });
    const secondAccount = await request('/api/v1/auth/register', {
      method: 'POST',
      body: {
        email: `yan-other-${Date.now()}@example.com`,
        password: 'TestPass123!',
        nickname: 'YAN其他账号',
      },
      status: 201,
    });
    const secondToken = secondAccount.data.data.accessToken;
    await request(`/api/v1/recipes/${generatedRecipeId}`, { token: secondToken, status: 404 });
    await request(`/api/v1/recipes/${generatedRecipeId}/save`, { method: 'POST', token: secondToken, status: 404 });
    await request(`/api/v1/recipes/${generatedRecipeId}/reimagine`, {
      method: 'POST', token: secondToken, body: { style: 'steam' }, status: 404,
    });
    await request(`/api/v1/recipes/${generatedRecipeId}/save`, { method: 'POST', token });
    const savedRecipes = await request('/api/v1/recipes/saved/list', { token });
    assert.ok(savedRecipes.data.data.some((item) => item.recipeId === generatedRecipeId));
    const recipeHistory = await request('/api/v1/recipes/history/list', { token });
    assert.ok(recipeHistory.data.data.length >= 3);
    const reimaginedRecipe = await request(`/api/v1/recipes/${generatedRecipeId}/reimagine`, {
      method: 'POST',
      token,
      body: { style: 'steam' },
    });
    assert.notEqual(reimaginedRecipe.data.data.recipeId, generatedRecipeId);
    await request(`/api/v1/recipes/${generatedRecipeId}/save`, { method: 'DELETE', token });
    const recipesAfterUnsave = await request('/api/v1/recipes/saved/list', { token });
    assert.ok(!recipesAfterUnsave.data.data.some((item) => item.recipeId === generatedRecipeId));

    const feed = await request('/api/v1/workouts/feed?page=1&pageSize=3', { token });
    assert.equal(feed.data.data.items.length, 3);
    const secondFeedPage = await request('/api/v1/workouts/feed?page=2&pageSize=3', { token });
    assert.equal(secondFeedPage.data.data.items.length, 3);
    assert.equal(
      feed.data.data.items.some((first) => secondFeedPage.data.data.items.some((second) => first.id === second.id)),
      false
    );
    const workoutId = feed.data.data.items[0].id;
    await request(`/api/v1/workouts/${workoutId}/complete`, { method: 'POST', token, status: 201 });
    const workoutHistory = await request('/api/v1/workouts/history/list', { token });
    assert.equal(workoutHistory.data.data.length, 1);
    await request(`/api/v1/workouts/${workoutId}/save`, { method: 'POST', token });
    const savedWorkouts = await request('/api/v1/workouts/saved/list', { token });
    assert.ok(savedWorkouts.data.data.some((item) => item.id === workoutId));
    await request(`/api/v1/workouts/${workoutId}/save`, { method: 'DELETE', token });
    const workoutsAfterUnsave = await request('/api/v1/workouts/saved/list', { token });
    assert.ok(!workoutsAfterUnsave.data.data.some((item) => item.id === workoutId));
    const dashboard = await request('/api/v1/stats/dashboard', { token });
    assert.ok(dashboard.data.data.totalRecipes >= 3);
    assert.equal(dashboard.data.data.totalWorkouts, 1);
    assert.ok(dashboard.data.data.totalCaloriesBurned > 0);
    await request('/api/v1/workouts/not-found', { token, status: 404 });

    const legacyRecognition = await request('/api/recognize', {
      method: 'POST',
      body: { image: 'dGVzdA==' },
    });
    assert.ok(legacyRecognition.data.ingredients.length > 0);
    const recommendations = await request('/api/recipe/recommendations', {
      method: 'POST',
      body: {
        ingredients: [{ name: '牛奶', amount: '500ml' }, { name: '核桃', amount: '50g' }],
        people: 1,
        cookTime: 30,
        user: { goal: '保持健康', caloriesTarget: 450 },
      },
    });
    assert.ok(recommendations.data.data.recommendations.length >= 5);
    assert.ok(recommendations.data.data.recommendations.some((item) => ['甜品', '早餐', '饮品'].includes(item.category)));
    assert.ok(recommendations.data.data.recommendations.every((item) =>
      Array.isArray(item.availableIngredients) && Array.isArray(item.missingIngredients)
    ));
    const selectedDish = recommendations.data.data.recommendations[0];
    const legacyRecipe = await request('/api/recipe/generate', {
      method: 'POST',
      body: {
        ingredients: legacyRecognition.data.ingredients,
        people: 1,
        cookTime: 20,
        selectedDish: { name: selectedDish.name, missingIngredients: selectedDish.missingIngredients },
      },
    });
    assert.equal(legacyRecipe.data.recipe.name, selectedDish.name);
    const legacyWorkout = await request('/api/workout/recommend', {
      method: 'POST',
      body: {
        bodyData: { height: 170, weight: 65, age: 25, gender: '女' },
        goal: { type: 'lose_fat' },
        limit: 6,
      },
    });
    assert.ok(legacyWorkout.data.videos.length > 0);

    console.log('PASS: 后端演示模式冒烟测试全部通过');
  } finally {
    server.kill();
  }
}

run().catch((error) => {
  console.error('FAIL:', error.stack || error.message);
  process.exitCode = 1;
});
