const assert = require('assert/strict');

process.env.AI_FORCE_DEMO = 'true';

const { buildQueries, sanitizeSelectedDish } = require('../recipe-discovery');
const { mockRecipeRecommendations } = require('../demo-data');

const queries = buildQueries([
  { name: '牛奶' },
  { name: '核桃' },
  { name: '香蕉' },
]);
assert.ok(queries.some((query) => query.includes('牛奶') && query.includes('甜品')));
assert.ok(queries.some((query) => query.includes('牛奶 核桃 香蕉')));

const selected = sanitizeSelectedDish({
  name: '香蕉核桃燕麦杯',
  pantryLevel: 'explore',
  missingIngredients: ['燕麦', '酸奶'],
  sourceVideo: {
    id: 'BV1SAFE12345',
    title: '香蕉核桃燕麦杯做法',
    author: '测试厨房',
    sourceUrl: 'https://evil.example.com/forged',
    coverUrl: 'javascript:alert(1)',
  },
});
assert.equal(selected.sourceVideo.sourceUrl, 'https://www.bilibili.com/video/BV1SAFE12345');
assert.equal(selected.sourceVideo.coverUrl, null);
assert.equal(selected.pantryLevel, 'explore');

const douyinSelected = sanitizeSelectedDish({
  name: '番茄炒蛋',
  sourceVideo: { id: '7575053309933800713', platform: 'douyin' },
});
assert.equal(douyinSelected.sourceVideo.platform, 'douyin');
assert.equal(douyinSelected.sourceVideo.sourceUrl, 'https://www.douyin.com/video/7575053309933800713');

const expandedIngredients = sanitizeSelectedDish({
  name: '丰富配料测试',
  missingIngredients: Array.from({ length: 12 }, (_, index) => `食材${index + 1}`),
});
assert.equal(expandedIngredients.missingIngredients.length, 10);

const firstBatch = mockRecipeRecommendations({
  ingredients: [{ name: '鸡蛋' }, { name: '番茄' }],
  user: { goal: '减脂' },
});
assert.equal(firstBatch.length, 6);
const secondBatch = mockRecipeRecommendations({
  ingredients: [{ name: '鸡蛋' }, { name: '番茄' }],
  user: { goal: '减脂' },
  excludeDishNames: firstBatch.map((item) => item.name),
});
assert.equal(secondBatch.length, 6);
assert.equal(secondBatch.some((item) => firstBatch.some((first) => first.name === item.name)), false);

console.log('PASS: 视频证据驱动的菜谱发现测试通过');
