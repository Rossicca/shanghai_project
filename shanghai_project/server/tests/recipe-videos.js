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
      sourceVideo: {
        id: 'BV1SOURCE999',
        title: '用户选定的香煎鸡胸肉教程',
        author: '原教程作者',
        duration: 480,
        coverUrl: 'https://i0.hdslb.com/source.jpg',
        sourceUrl: 'https://evil.example.com/not-used',
        description: '香煎鸡胸肉教程',
      },
    });
    assert.equal(result.rankingMode, 'search');
    assert.ok(result.videos.length >= 2 && result.videos.length <= 4);
    assert.equal(result.videos[0].id, 'BV1SOURCE999');
    assert.equal(result.videos[0].sourceUrl, 'https://www.bilibili.com/video/BV1SOURCE999');
    assert.match(result.videos[0].reason, /原教程/);
    assert.ok(result.videos.some((video) => video.platform === 'douyin'));
    assert.ok(result.videos.every((video) => ['douyin', 'bilibili'].includes(video.platform)));
    assert.deepEqual(
      result.platformSearches.map((item) => item.platform),
      ['bilibili', 'douyin']
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
