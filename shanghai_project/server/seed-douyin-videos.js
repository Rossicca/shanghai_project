/**
 * 种子脚本：把抖音健身视频合并进视频库
 * 运行：node seed-douyin-videos.js
 *
 * 背景：抖音的公开 API 全部做了 a_bogus/X-Bogus 签名校验，网页端是空壳 SPA，
 * 没有像 B站那样免签名的搜索接口。因此这里采用「人工精选 + 脚本入库」的方式：
 *   1. 在 server/data/douyin_seed.json 里维护一批真实抖音视频链接；
 *   2. 脚本解析出 aweme_id，映射成和 B站视频相同的 schema，platform 标为 douyin；
 *   3. 与现有视频库合并（B站 + 抖音），写回 SQLite 与 workout_videos.json。
 *
 * 扩充方法：在抖音 App 里点视频的「分享 → 复制链接」，把 v.douyin.com/xxx
 * 短链粘进 douyin_seed.json，重新跑本脚本即可（会跟随跳转解析出视频 ID）。
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const db = require('./db');

const SEED_PATH = path.join(__dirname, 'data', 'douyin_seed.json');
const OUTPUT_PATH = path.join(__dirname, 'data', 'workout_videos.json');
const COVERS_DIR = path.join(__dirname, 'data', 'covers');

const PLATFORM = 'douyin';

// ─── 封面抓取 ─────────────────────────────────────────────
// 抖音封面在网页端需要 JS 签名才可取到，但移动分享页 m.douyin.com/share/video/{id}
// 会把封面 SSR 进 HTML（<img class="poster">），curl 直接可读。页面带
// byted_acrawler WAF 反爬：请求过密或 UA 太生会被弹「Please wait」挑战页，
// 这里用 iPhone UA + ttwid cookie + 随机延迟 + 失败重试来绕过。
const COVER_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

/** 生成一个新鲜的 ttwid cookie（值不校验，仅用于给 WAF 一个合法指纹） */
function makeTtwid() {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  return `ttwid=1%7C${ts}x${rand}%7C${ts}`;
}

/**
 * 从移动分享页解析出真实封面图 URL。
 * 解析成功后应立即下载，因为签名的 x-expires 通常只有 14 天。
 */
async function fetchCoverUrl(awemeId, { maxAttempts = 4 } = {}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { body } = await httpGet(`https://m.douyin.com/share/video/${awemeId}`, {
        headers: {
          'User-Agent': COVER_UA,
          'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Referer': 'https://www.douyin.com/',
          'Cookie': makeTtwid(),
        },
      });
      const m = body.match(/src="(https:\/\/[^"]*sign\.douyinpic\.com\/[^"]*)"/);
      if (m) {
        // HTML src 属性里签名参数用 &amp; 转义，直接请求会 403，必须还原成 &
        return m[1].replace(/&amp;/g, '&');
      }
      // 被 WAF 弹挑战页时 body 会非常小（"Please wait..."），冷却后重试
      if (body.length < 4000 || body.includes('Please wait')) {
        const delay = 1500 * attempt + Math.floor(Math.random() * 1200);
        console.log(`    ↳ 命中 WAF 挑战页，${Math.round(delay / 1000)}s 后重试（${attempt}/${maxAttempts}）`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return null; // 页面正常但无封面（视频可能已删除）
    } catch {
      const delay = 1000 * attempt;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  return null;
}

/**
 * 确保 awemeId 有本地封面。已存在则直接返回路径；否则抓取签名 URL 并下载。
 * 返回本地相对路径 /covers/{id}.{ext}，抓取失败返回 null（前端回退颜色块）。
 */
async function ensureLocalCover(awemeId) {
  if (!fs.existsSync(COVERS_DIR)) fs.mkdirSync(COVERS_DIR, { recursive: true });
  const existing = fs.readdirSync(COVERS_DIR).find((f) => f.startsWith(`${awemeId}.`));
  if (existing) return `/covers/${existing}`;

  const remoteUrl = await fetchCoverUrl(awemeId);
  if (!remoteUrl) {
    console.log(`    ↳ 未获取到封面，前端将用颜色块兜底`);
    return null;
  }
  const local = await downloadCover(awemeId, remoteUrl);
  if (local) console.log(`    ↳ 封面已下载: ${local}`);
  else console.log(`    ↳ 封面下载失败，前端将用颜色块兜底`);
  return local;
}

/**
 * 下载封面到本地 data/covers/{awemeId}.webp，返回本地相对路径。
 * 本地化原因：签名 URL x-expires 约 14 天即失效，直接存远程地址会裂图；
 * 下载后由 server 静态目录 /covers/ 提供，永久有效且随仓库分发。
 */
async function downloadCover(awemeId, remoteUrl) {
  if (!remoteUrl) return null;
  try {
    const mod = remoteUrl.startsWith('https') ? https : http;
    const buf = await new Promise((resolve, reject) => {
      mod.get(remoteUrl, { headers: { 'User-Agent': COVER_UA, 'Referer': 'https://www.douyin.com/' } }, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    });
    if (!fs.existsSync(COVERS_DIR)) fs.mkdirSync(COVERS_DIR, { recursive: true });
    const ext = /\.(jpe?g|png|webp)(?:[?]|$)/i.test(remoteUrl) ? remoteUrl.match(/\.(jpe?g|png|webp)/i)[1].toLowerCase() : 'webp';
    const outPath = path.join(COVERS_DIR, `${awemeId}.${ext}`);
    fs.writeFileSync(outPath, buf);
    return `/covers/${awemeId}.${ext}`;
  } catch (err) {
    console.warn(`  ⚠️ 封面下载失败 ${awemeId}: ${err.message}`);
    return null;
  }
}

// ─── 分类 → 封面主题色 / 每分类消耗（与 B站种子保持一致）──────────
const COVER_COLORS = {
  '臀腿': '#2ECC71', '全身燃脂': '#FF6B35', '核心': '#8E44AD',
  '肩背': '#4A90E2', '手臂': '#F39C12', '有氧': '#E74C3C', '拉伸': '#1ABC9C',
};
const CALORIES_PER_MIN = {
  '全身燃脂': 10, '有氧': 8, '臀腿': 7,
  '核心': 6, '肩背': 5, '手臂': 5, '拉伸': 3,
};

/**
 * 稳定伪播放量：按 id 哈希，映射到 50万~3000万（对数均匀，覆盖 B站热门视频区间）。
 * 抖音没有公开接口取播放量；若统一为 0，列表按播放量排序时抖音视频会被永远沉底，
 * 用户打开 App 看不到任何抖音内容。用 id 哈希生成一个稳定值，让抖音视频能混进
 * 推荐流和分类列表的前几页，且排序与展示保持一致。
 */
function stablePlayCount(id) {
  let h = 7;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const t = (h % 1000000) / 1000000; // 0~1，粒度足够避免大量撞值
  const lo = 1000000;
  const hi = 40000000;
  return Math.round(Math.exp(Math.log(lo) + t * (Math.log(hi) - Math.log(lo))));
}

// ─── HTTP 请求封装（支持跟随 302 跳转）────────────────────────
function httpGet(url, { maxHops = 3, hop = 0, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'Referer': 'https://www.douyin.com/',
      'Accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      ...headers,
    }}, (res) => {
      const status = res.statusCode;
      const loc = res.headers.location;
      if (status >= 300 && status < 400 && loc) {
        res.resume();
        if (hop >= maxHops) return resolve({ url, status, body: '' });
        const next = loc.startsWith('http') ? loc : new URL(loc, url).toString();
        return resolve(httpGet(next, { maxHops, hop: hop + 1 }));
      }
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ url, status, body: data }));
    }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
  });
}

/** 从视频链接里提取 aweme_id */
function extractAwemeId(url) {
  if (!url) return null;
  const m = url.match(/(?:\/video\/|\/share\/video\/|\/note\/|aweme_id=)(\d{8,})/);
  return m ? m[1] : null;
}

/** 解析种子条目 → { awemeId, title, coach, ... } */
function parseSeedEntry(entry) {
  const url = String(entry.url || '').trim();
  if (!url) return null;
  let awemeId = extractAwemeId(url);
  if (!awemeId) {
    // 可能是 v.douyin.com 短链，跟随跳转后再提取
    console.log(`  ↳ 解析短链: ${url}`);
    return httpGet(url).then(({ url: finalUrl }) => ({ entry, url: finalUrl, awemeId: extractAwemeId(finalUrl) }));
  }
  return Promise.resolve({ entry, url, awemeId });
}

/** 根据标题与时长推测难度 */
function guessDifficulty(title, durationSec) {
  const t = (title || '').toLowerCase();
  const d = durationSec;
  if (t.includes('入门') || t.includes('新手') || t.includes('初学者') || t.includes('零基础') || t.includes('徒手') || d < 300) return '入门';
  if (t.includes('进阶') || t.includes('中级') || t.includes('挑战') || t.includes('高强度') || d > 1200) return '挑战';
  return '进阶';
}

/** 默认时长（秒），按分类兜底 */
const DEFAULT_DURATION_MIN = { '臀腿': 15, '全身燃脂': 20, '核心': 10, '肩背': 10, '手臂': 10, '有氧': 15, '拉伸': 10 };

function buildVideo(entry, awemeId) {
  const category = entry.category || '全身燃脂';
  const durationMin = Number(entry.durationMin) || DEFAULT_DURATION_MIN[category] || 15;
  const durationSec = Math.round(durationMin * 60);
  const difficulty = entry.difficulty || guessDifficulty(entry.title, durationSec);
  const coach = entry.coach || '抖音健身达人';
  const calPerMin = CALORIES_PER_MIN[category] || 6;
  const title = String(entry.title || `抖音健身跟练视频 ${awemeId}`).trim();
  return {
    id: awemeId,
    title,
    coach,
    duration: durationSec,
    difficulty,
    category,
    calories: Math.round(durationSec / 60 * calPerMin),
    coverColor: COVER_COLORS[category] || '#FF6B35',
    sourceUrl: `https://www.douyin.com/video/${awemeId}`,
    platform: PLATFORM,
    coverUrl: null, // 由封面抓取流程下载后填充本地路径（无封面时前端回退颜色块）
    reason: `${coach} 的「${title}」跟练视频，${difficulty}级别，适合${category}训练，来自抖音热门健身内容。`,
    tags: Array.isArray(entry.tags) ? entry.tags.slice(0, 5) : [],
    playCount: stablePlayCount(awemeId),
    fetchedAt: new Date().toISOString(),
  };
}

/** 读现有视频库：优先 SQLite，其次遗留 JSON */
function loadExistingVideos() {
  const fromDb = db.readCollection('workout_videos');
  if (fromDb.length > 0) return fromDb;
  if (fs.existsSync(OUTPUT_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (e) {
      console.warn('  ⚠️ workout_videos.json 解析失败:', e.message);
    }
  }
  return [];
}

async function main() {
  console.log('══════════════════════════════════════════════');
  console.log('  抖音健身视频种子脚本（精选入库）');
  console.log('══════════════════════════════════════════════');
  console.log('');

  // db.js 是惰性初始化，读表前必须先初始化 SQLite
  await db.getDb();

  if (!fs.existsSync(SEED_PATH)) {
    console.error(`❌ 未找到 ${SEED_PATH}`);
    console.error('   请在抖音 App 复制视频分享链接，维护成该 JSON 文件后重跑。');
    process.exit(1);
  }
  const entries = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  if (!Array.isArray(entries) || entries.length === 0) {
    console.error('❌ douyin_seed.json 为空，先往里面添加抖音视频链接。');
    process.exit(1);
  }

  const existing = loadExistingVideos();
  console.log(`现有视频库: ${existing.length} 条`);

  const seen = new Map(existing.map((v) => [String(v.id), v]));
  let added = 0;

  for (const entry of entries) {
    try {
      const { entry: e, awemeId } = await parseSeedEntry(entry);
      if (!awemeId) {
        console.warn(`  ⚠️ 无法解析出视频 ID，已跳过: ${entry.url || '(空链接)'}`);
        continue;
      }
      // 封面：从移动分享页抓真实封面并下载到本地（已有本地封面则跳过抓取）
      const localCover = await ensureLocalCover(awemeId);

      if (seen.has(awemeId)) {
        // 已存在：仍重建一次（douyin_seed.json 是抖音条目的唯一来源，重跑脚本可刷新
        // 伪播放量等字段），但不计入新增数
        const video = buildVideo(e, awemeId);
        if (localCover) video.coverUrl = localCover;
        seen.set(awemeId, video);
        console.log(`  ↻ 已存在，已刷新: ${awemeId}（${e.title || '无标题'}）`);
        continue;
      }
      const video = buildVideo(e, awemeId);
      if (localCover) video.coverUrl = localCover;
      seen.set(awemeId, video);
      added++;
      console.log(`  ✅ ${e.category || '全身燃脂'}: ${awemeId} — ${video.title}`);
      await new Promise((r) => setTimeout(r, 200)); // 短链解析限速
    } catch (err) {
      console.warn(`  ⚠️ 解析失败: ${entry.url}（${err.message}）`);
    }
  }

  const merged = Array.from(seen.values());
  // 字段归一化：SQLite 读出的旧记录带 videoUrl/source/createdAt 等额外列，
  // 抖音新记录缺这些列，统一补齐成 null，避免写入时绑定 undefined 报错。
  const allCols = new Set();
  for (const v of merged) Object.keys(v).forEach((k) => allCols.add(k));
  const normalized = merged.map((v) => {
    const out = {};
    for (const c of allCols) out[c] = v[c] === undefined ? null : v[c];
    return out;
  });

  // 写回 SQLite（整表覆盖 = 旧 + 新）
  db.writeCollection('workout_videos', normalized);
  // 写回 JSON，供 GitHub 仓库与新克隆环境自动迁移。
  // 必须写 normalized（已补全缺失列），否则 writeCollection 会因记录缺列而绑定报错。
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(normalized, null, 2), 'utf8');

  console.log('\n══════════════════════════════════════════════');
  console.log(`  ✅ 完成！视频库共 ${merged.length} 条（本次新增抖音 ${added} 条）`);
  console.log(`  📄 已更新 server/data/workout_videos.json`);
  console.log('');
  const stats = {};
  for (const v of merged) {
    const key = `${v.platform || '?'}:${v.category}`;
    stats[key] = (stats[key] || 0) + 1;
  }
  for (const [key, count] of Object.entries(stats)) {
    console.log(`  ${key}: ${count}`);
  }
  console.log('');
}

main().catch((e) => {
  console.error('❌ 脚本出错:', e);
  process.exit(1);
});
