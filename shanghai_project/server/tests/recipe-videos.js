const assert = require('assert/strict');

process.env.AI_FORCE_DEMO = 'true';

const originalFetch = global.fetch;
const fetchCalls = [];
global.fetch = async (url, options = {}) => {
  fetchCalls.push({ url, options });
  if (String(url).startsWith('https://search.bilibili.com/')) {
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'buvid3=test-buvid; Path=/, b_nut=12345; Path=/' },
    };
  }
  return {
    ok: true,
    status: 200,
    json: async () => ({
    code: 0,
    data: {
      result: [
        {
          type: 'video',
          bvid: 'BV1TEST12345',
          title: '<em class="keyword">香煎鸡胸肉</em>完整做法',
          author: '测试厨房',
          duration: '08:35',
          pic: '//i0.hdslb.com/test.jpg',
          play: 12000,
          pubdate: 1700000000,
          description: '鸡胸肉低脂做法',
        },
      ],
    },
    }),
  };
};

const { recommendRecipeVideos } = require('../recipe-videos');

async function main() {
  try {
    const result = await recommendRecipeVideos({
      name: '香煎鸡胸肉',
      ingredients: [{ name: '鸡胸肉' }, { name: '西兰花' }],
      steps: ['腌制鸡胸肉', '平底锅煎熟'],
    });
    assert.equal(result.rankingMode, 'search');
    assert.equal(result.videos.length, 1);
    assert.equal(result.videos[0].id, 'BV1TEST12345');
    assert.equal(result.videos[0].title, '香煎鸡胸肉完整做法');
    assert.equal(result.videos[0].duration, 515);
    assert.equal(result.videos[0].sourceUrl, 'https://www.bilibili.com/video/BV1TEST12345');
    assert.deepEqual(
      result.platformSearches.map((item) => item.platform),
      ['bilibili', 'douyin', 'xiaohongshu', 'youtube']
    );
    assert.ok(result.platformSearches.every((item) => item.url.startsWith('https://')));
    assert.equal(fetchCalls.length, 2);
    assert.match(fetchCalls[1].options.headers.Cookie, /buvid3=test-buvid/);
    console.log('PASS: 菜谱视频检索与多平台入口测试通过');
  } finally {
    global.fetch = originalFetch;
  }
}

main().catch((error) => {
  console.error('FAIL:', error.stack || error.message);
  process.exitCode = 1;
});
