/**
 * 种子脚本：从 B站搜索真实健身视频并存入数据库
 * 运行：node seed-workout-videos.js
 *
 * 使用 B站公开搜索 API 抓取各分类下的健身视频，
 * 提取 BV号、标题、封面、时长、播放量等信息，
 * 存入 server/data/workout_videos.json 供推荐系统使用。
 */

const https = require('https');
const http = require('http');
const path = require('path');
const db = require('./db');

// ─── 分类与搜索关键词 ─────────────────────────────────────
const CATEGORY_SEARCHES = {
  '臀腿': [
    '周六野 臀腿训练', '帕梅拉 臀腿', '翘臀训练',
    '居家臀腿', '深蹲 翘臀', '臀腿 跟练',
  ],
  '全身燃脂': [
    '帕梅拉 全身燃脂', '周六野 全身燃脂', '刘畊宏 燃脂',
    'HIIT 全身燃脂', '居家燃脂操', '有氧燃脂 跟练',
  ],
  '核心': [
    '帕梅拉 核心训练', '腹肌训练 跟练', '周六野 核心',
    '马甲线 训练', '平板支撑 核心', '居家腹肌',
  ],
  '肩背': [
    '周六野 肩背', '韩小四 肩背', '圆肩驼背 改善',
    '少女背 训练', '肩背 跟练', '薄背 训练',
  ],
  '手臂': [
    '周六野 手臂', '拜拜肉 训练', '手臂紧致 跟练',
    '天鹅臂 训练', '瘦手臂 居家', '哑铃 手臂',
  ],
  '有氧': [
    '帕梅拉 有氧', '刘畊宏 有氧', '有氧操 跟练',
    '跳绳 有氧', '燃脂舞 有氧', '居家有氧运动',
  ],
  '拉伸': [
    '周六野 拉伸', '韩小四 拉伸', '全身拉伸 跟练',
    '睡前拉伸', '运动后拉伸', '瑜伽拉伸 放松',
  ],
};

// ─── HTTP 请求封装 ────────────────────────────────────────
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.bilibili.com/',
      'Accept': 'application/json, text/plain, */*',
    }}, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ code: -1, message: 'parse failed', raw: data.slice(0, 200) }); }
      });
    }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
  });
}

/** 解析时长 "mm:ss" → 秒数 */
function parseDuration(str) {
  if (!str) return 600;
  const parts = str.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 600;
}

/** 判断难度（根据时长和标题关键词） */
function guessDifficulty(title, durationSec) {
  const t = title.toLowerCase();
  const d = durationSec;
  if (t.includes('入门') || t.includes('新手') || t.includes('初学者') || d < 300) return '入门';
  if (t.includes('进阶') || t.includes('中级') || t.includes('挑战') || d > 1200) return '挑战';
  return '进阶';
}

/** 计算预估消耗（千卡/分钟） */
function guessCaloriesPerMin(category) {
  const map = {
    '全身燃脂': 10, '有氧': 8, '臀腿': 7,
    '核心': 6, '肩背': 5, '手臂': 5, '拉伸': 3,
  };
  return map[category] || 6;
}

// ─── 搜索 B站 ─────────────────────────────────────────────
async function searchBilibili(keyword, category, page = 1) {
  const url = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(keyword)}&page=${page}&page_size=20`;
  const result = await httpGet(url);
  if (result.code !== 0 || !result.data?.result) {
    console.warn(`  ⚠️ 搜索失败 [${keyword}]: ${result.message || 'unknown'}`);
    return [];
  }

  return result.data.result
    .filter((item) => item.type === 'video' && item.bvid)
    .map((item) => {
      const durationSec = parseDuration(item.duration);
      const difficulty = guessDifficulty(item.title, durationSec);
      const calPerMin = guessCaloriesPerMin(category);
      return {
        id: item.bvid,
        title: item.title.replace(/<\/?em[^>]*>/g, '').trim(),
        coach: item.author,
        duration: durationSec,
        difficulty,
        category,
        calories: Math.round(durationSec / 60 * calPerMin),
        coverColor: getCoverColor(category),
        sourceUrl: `https://www.bilibili.com/video/${item.bvid}`,
        platform: 'bilibili',
        coverUrl: item.pic ? `https:${item.pic}` : null,
        reason: `${item.author} 的「${item.title.replace(/<\/?em[^>]*>/g, '').trim()}」跟练视频，${difficulty}级别，播放 ${formatPlayCount(item.play)} 次`,
        tags: (item.tag || '').split(',').filter(Boolean).slice(0, 5),
        playCount: item.play || 0,
        fetchedAt: new Date().toISOString(),
      };
    });
}

function getCoverColor(category) {
  const map = {
    '臀腿': '#2ECC71', '全身燃脂': '#FF6B35', '核心': '#8E44AD',
    '肩背': '#4A90E2', '手臂': '#F39C12', '有氧': '#E74C3C', '拉伸': '#1ABC9C',
  };
  return map[category] || '#FF6B35';
}

function formatPlayCount(n) {
  if (!n) return '0';
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  return String(n);
}

// ─── 主流程 ────────────────────────────────────────────────
async function main() {
  console.log('══════════════════════════════════════════════');
  console.log('  B站健身视频爬虫');
  console.log('══════════════════════════════════════════════');
  console.log('');

  const allVideos = new Map(); // key: bvid

  for (const [category, keywords] of Object.entries(CATEGORY_SEARCHES)) {
    console.log(`\n📁 分类: ${category}`);
    for (const keyword of keywords) {
      console.log(`  🔍 搜索: "${keyword}"`);
      for (let page = 1; page <= 2; page++) {
        const videos = await searchBilibili(keyword, category, page);
        if (videos.length === 0) break;
        let added = 0;
        for (const v of videos) {
          if (!allVideos.has(v.id)) {
            allVideos.set(v.id, v);
            added++;
          }
        }
        console.log(`     第${page}页: 获取${videos.length}条，新增${added}条`);
        // 避免请求过快
        await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
      }
      // 关键词间隔
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // ─── 存入数据库 ──────────────────────────────────────────
  const videoArray = Array.from(allVideos.values());
  db.writeCollection('workout_videos', videoArray);

  console.log('\n══════════════════════════════════════════════');
  console.log(`  ✅ 完成！共抓取 ${videoArray.length} 个视频`);
  console.log('  已存入 server/workout_videos.json');
  console.log('');

  // 按分类统计
  const stats = {};
  for (const v of videoArray) {
    stats[v.category] = (stats[v.category] || 0) + 1;
  }
  for (const [cat, count] of Object.entries(stats)) {
    console.log(`  ${cat}: ${count} 个视频`);
  }
  console.log('');
}

main().catch((e) => {
  console.error('❌ 爬虫出错:', e);
  process.exit(1);
});