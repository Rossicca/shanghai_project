const assert = require('assert/strict');
const { isMockMode } = require('../config');
const { generateRecipe, generateWorkoutPlan } = require('../ai');

function scoreRecipe(recipe) {
  const structureComplete = Boolean(
    recipe.name && recipe.description && Array.isArray(recipe.ingredients) && recipe.ingredients.length >= 2 &&
    Array.isArray(recipe.steps) && recipe.steps.length >= 3 && Number.isFinite(Number(recipe.calories)) &&
    Number.isFinite(Number(recipe.protein)) && Number.isFinite(Number(recipe.carbs)) && Number.isFinite(Number(recipe.fat))
  );
  const names = recipe.ingredients.map((item) => item.name).join('|');
  const ingredientConsistent = names.includes('\u9e21\u80f8\u8089') && names.includes('\u897f\u5170\u82b1');
  const calories = Number(recipe.calories);
  const macroCalories = Number(recipe.protein) * 4 + Number(recipe.carbs) * 4 + Number(recipe.fat) * 9;
  const nutritionConsistent = calories > 0 && Math.abs(macroCalories - calories) / calories <= 0.45;
  const targetMatched = calories >= 468 && calories <= 572 && Number(recipe.cookTime) <= 30;
  const executable = recipe.steps.every((step) => typeof step === 'string' && step.trim().length >= 4) &&
    Array.isArray(recipe.tips) && recipe.tips.length > 0;
  const naturalChinese = /[\u4e00-\u9fff]/.test(`${recipe.name}${recipe.description}`);
  return {
    structure: structureComplete ? 5 : 1,
    ingredientConsistency: ingredientConsistent ? 5 : 2,
    nutrition: nutritionConsistent ? 5 : 3,
    goalMatch: targetMatched ? 5 : 3,
    executability: executable ? 5 : 3,
    expression: naturalChinese ? 5 : 2,
  };
}

async function main() {
  assert.equal(isMockMode(), false, '\u9700\u8981\u672c\u5730 config.toml \u771f\u5b9e AI \u914d\u7f6e');
  const summaries = [];
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const recipe = await generateRecipe({
      ingredients: [{ name: '\u9e21\u80f8\u8089', amount: '200g' }, { name: '\u897f\u5170\u82b1', amount: '150g' }],
      people: 1, cookTime: 30, difficulty: '\u7b80\u5355',
      user: { caloriesTarget: 520, goal: '\u51cf\u8102', allergies: ['\u82b1\u751f'], dietType: 'balanced' },
    });
    const scores = scoreRecipe(recipe);
    assert.equal(scores.structure, 5, `\u7b2c ${attempt} \u6b21\u7ed3\u6784\u4e0d\u5b8c\u6574`);
    assert.ok(Object.entries(scores).filter(([key]) => key !== 'structure').every(([, value]) => value >= 4),
      `\u7b2c ${attempt} \u6b21\u8d28\u91cf\u8bc4\u5206\u672a\u8fbe\u6807: ${JSON.stringify(scores)}`);
    summaries.push({ attempt, name: recipe.name, calories: recipe.calories, cookTime: recipe.cookTime, scores });
  }

  const plan = await generateWorkoutPlan({
    goalType: 'shape', weeklyFrequency: 3, sessionDurationMinutes: 30,
    workoutLocation: 'home', hasEquipment: false, fitnessLevel: 'beginner',
    limitations: ['\u819d\u5173\u8282\u907f\u514d\u9ad8\u51b2\u51fb'],
  });
  assert.equal(plan.weeklySchedule.length, 3);
  assert.ok(plan.weeklySchedule.every((day) => Array.isArray(day.exercises) && day.exercises.length > 0));
  assert.ok(!JSON.stringify(plan).includes('http'), '\u6a21\u578b\u4e0d\u5f97\u76f4\u63a5\u751f\u6210\u89c6\u9891 URL');
  console.log(JSON.stringify({ recipes: summaries, workoutPlan: { days: plan.weeklySchedule.length, reminders: plan.reminders.length } }));
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error.message }));
  process.exitCode = 1;
});
