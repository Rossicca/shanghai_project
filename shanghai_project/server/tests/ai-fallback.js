const assert = require('assert/strict');

process.env.AI_FORCE_DEMO = 'true';

const { generateRecipe, generateWorkoutPlan } = require('../ai');

async function main() {
  const recipe = await generateRecipe({
    ingredients: [
      { name: '鸡胸肉', amount: '200g' },
      { name: '西兰花', amount: '150g' },
    ],
    people: 1,
    cookTime: 30,
    difficulty: '简单',
    user: { caloriesTarget: 520, goal: '减脂', allergies: ['花生'] },
  });

  assert.ok(recipe.name && recipe.description);
  assert.ok(Array.isArray(recipe.ingredients) && recipe.ingredients.length >= 2);
  assert.ok(recipe.ingredients.some((item) => item.name === '鸡胸肉'));
  assert.ok(recipe.ingredients.some((item) => item.name === '西兰花'));
  assert.ok(!recipe.ingredients.some((item) => item.name === '花生'));
  assert.ok(Array.isArray(recipe.steps) && recipe.steps.length >= 3);
  assert.ok(Array.isArray(recipe.tips) && recipe.tips.length > 0);
  assert.ok(Number.isFinite(Number(recipe.calories)) && Number(recipe.calories) > 0);
  assert.ok(Number.isFinite(Number(recipe.fiber)) && Number(recipe.fiber) > 0);
  assert.ok(Number(recipe.cookTime) <= 30);

  const plan = await generateWorkoutPlan({
    goalType: 'shape',
    goalTypes: ['shape'],
    weeklyFrequency: 3,
    sessionDurationMinutes: 30,
    workoutLocation: 'home',
    hasEquipment: false,
    fitnessLevel: 'beginner',
    limitations: [],
  });
  assert.equal(plan.weeklySchedule.length, 3);
  assert.ok(plan.weeklySchedule.every((day) => day.exercises.length > 0));
  assert.ok(Array.isArray(plan.reminders) && plan.reminders.length > 0);

  console.log('PASS: AI 不可用时的菜谱与训练计划返回结构完整');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
