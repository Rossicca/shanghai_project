const assert = require('assert/strict');

process.env.AI_FORCE_DEMO = 'true';

const { buildQueries, sanitizeSelectedDish } = require('../recipe-discovery');

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

const expandedIngredients = sanitizeSelectedDish({
  name: '丰富配料测试',
  missingIngredients: Array.from({ length: 12 }, (_, index) => `食材${index + 1}`),
});
assert.equal(expandedIngredients.missingIngredients.length, 10);

console.log('PASS: 视频证据驱动的菜谱发现测试通过');
