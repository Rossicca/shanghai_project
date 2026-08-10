/**
 * 一次性脚本：把健康饮食灵感里「多道菜共用同一张图」的菜品，
 * 换成对应视频的真实食物封面（B站封面 / 抖音封面下载到本地）。
 * 输出 /tmp/resolved-images.json：{ id: imageUrlOrNull }
 * 运行：node scripts/resolve-inspiration-covers.js
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const SRC = path.join(__dirname, '..', 'src', 'data', 'health-inspirations.ts');
const COVERS_DIR = path.join(__dirname, '..', 'server', 'data', 'covers');
const OUT = path.join(__dirname, 'resolved-images.json');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36';
const DOUYIN_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function httpGet(url, opts = {}, attempts = 3) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http;
    const doIt = (n) => {
      const req = lib.get(
        url,
        { headers: { 'User-Agent': opts.ua || UA, ...(opts.headers || {}) }, timeout: 20000 },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
        }
      );
      req.on('error', (e) => (n > 1 ? doIt(n - 1) : reject(e)));
      req.on('timeout', () => req.destroy(new Error('timeout')));
    };
    doIt(attempts);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, attempts = 4) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await httpGet(url);
      if (res.status !== 200) throw new Error('HTTP ' + res.status);
      return JSON.parse(res.body.toString('utf8'));
    } catch (e) {
      lastErr = e;
      await sleep(1200 * i);
    }
  }
  throw lastErr;
}

/** B站官方接口按 BV 取封面（稳定） */
async function bilibiliCover(bvid) {
  const d = await fetchJson(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`);
  if (d.code !== 0 || !d.data?.pic) throw new Error('bili view code ' + d.code);
  return normalizePicV2(d.data.pic);
}

/** 抖音分享页取封面（需 iPhone UA + ttwid），返回 sign.douyinpic.com 签名 URL */
async function douyinCoverUrl(awemeId) {
  const ts = Date.now();
  const cookie = `ttwid=1%7C${ts}x${Math.random().toString(36).slice(2, 10)}%7C${ts}`;
  const res = await httpGet(`https://m.douyin.com/share/video/${awemeId}`, {
    ua: DOUYIN_UA,
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      Referer: 'https://www.douyin.com/',
      Cookie: cookie,
    },
  });
  const body = res.body.toString('utf8');
  const m = body.match(/src="(https:\/\/[^"]*sign\.douyinpic\.com\/[^"]*)"/);
  if (!m) throw new Error('douyin cover not found');
  return m[1].replace(/&amp;/g, '&');
}

async function download(url, dest) {
  const res = await httpGet(url);
  if (res.status !== 200) throw new Error('download HTTP ' + res.status);
  fs.writeFileSync(dest, res.body);
}

/** B站搜索按菜名取封面（宽松，带重试） */
async function searchCover(dishName, aliases = []) {
  const queries = [...new Set([dishName, ...aliases, `${dishName} 做法`])];
  const candidates = [];
  for (const q of queries) {
    for (let i = 0; i < 3; i++) {
      try {
        const url =
          `https://api.bilibili.com/x/web-interface/search/type?search_type=video` +
          `&keyword=${encodeURIComponent(q)}&page=1&page_size=10`;
        const d = await fetchJson(url, 2);
        if (d.code !== 0 || !Array.isArray(d.data?.result)) throw new Error('search ' + d.code);
        const hits = d.data.result
          .filter((it) => it.type === 'video' && /^BV[0-9A-Za-z]+$/.test(it.bvid || '') && it.pic)
          .map((it) => ({
            title: it.title.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&'),
            pic: it.pic,
          }));
        const exact = hits.find(
          (h) => h.title.includes(dishName) || (dishName.length >= 3 && dishName.includes(h.title.trim().slice(0, 4)))
        );
        if (exact) return normalizePicV2(exact.pic);
        if (hits.length) candidates.push(...hits.map((h) => h.pic));
        break;
      } catch (e) {
        if (i === 2) console.warn(`  [search ${q}] ${e.message}`);
        await sleep(4000);
      }
    }
    if (candidates.length >= 3) break;
  }
  return candidates.length ? normalizePicV2(candidates[0]) : null;
}

function normalizePicV2(pic) {
  const s = String(pic || '');
  if (s.startsWith('//')) return 'https:' + s;
  if (s.startsWith('http://')) return 'https://' + s.slice(7);
  if (s.startsWith('https://')) return s;
  return 'https://' + s;
}

// ---- 解析数据文件 ----
const src = fs.readFileSync(SRC, 'utf8');
const entries = []; // { id, title, group, image, platform, vid }

// 1) 每条 extra seed 是一整行
const extraStart = src.indexOf('const EXTRA_INSPIRATION_SEEDS');
const extraBlock = src.slice(extraStart, src.indexOf('\n];', extraStart));
for (const line of extraBlock.split(/\r?\n/)) {
  if (!line.includes("{ id: '")) continue;
  const id = (line.match(/id:\s*'([^']+)'/) || [])[1];
  const group = (line.match(/group:\s*'([^']+)'/) || [])[1];
  const title = (line.match(/title:\s*'([^']+)'/) || [])[1];
  const sv = line.match(/sourceVideo:\s*(bilibili|douyin)Video\('([^']+)'/);
  const aliases = (line.match(/videoSearchAliases:\s*\[([^\]]*)\]/) || [])[1]?.match(/'[^']+'/g)?.map((a) => a.slice(1, -1)) || [];
  entries.push({ id, title, group, image: `EXTRA:${group}`, platform: sv ? sv[1] : null, vid: sv ? sv[2] : null, aliases });
}

// 2) hero 条目（多行块）：id + image
const heroStart = src.indexOf('export const HEALTH_INSPIRATIONS: HealthInspiration[] = [');
const heroEnd = src.indexOf('...EXTRA_INSPIRATION_SEEDS.map', heroStart);
const heroBlock = src.slice(heroStart, heroEnd);
const heroRe = /id:\s*'([^']+)'[\s\S]*?image:\s*'([^']+)'/g;
let hm;
while ((hm = heroRe.exec(heroBlock))) {
  const title = (hm[0].match(/title:\s*'([^']+)'/) || [])[1];
  const sv = hm[0].match(/sourceVideo:\s*(bilibili|douyin)Video\('([^']+)'/);
  const aliases = (hm[0].match(/videoSearchAliases:\s*\[([^\]]*)\]/) || [])[1]?.match(/'[^']+'/g)?.map((a) => a.slice(1, -1)) || [];
  entries.push({ id: hm[1], title: title || hm[1], group: 'hero', image: hm[2], platform: sv ? sv[1] : null, vid: sv ? sv[2] : null, aliases });
}

// 3) 找出共享/重复图片的菜
const byImage = new Map();
for (const e of entries) byImage.set(e.image, (byImage.get(e.image) || 0) + 1);
const dupIds = new Set(entries.filter((e) => byImage.get(e.image) > 1).map((e) => e.id));
console.log(`entries: ${entries.length}, duplicate-image dishes: ${dupIds.size}`);

// ---- 解析封面（支持断点续跑：已写入 OUT 的不再请求）----
const resolved = {};
if (fs.existsSync(OUT)) Object.assign(resolved, JSON.parse(fs.readFileSync(OUT, 'utf8')));
let ok = Object.keys(resolved).length;
let fail = 0;

async function main() {
  for (const e of entries) {
    if (!dupIds.has(e.id)) continue; // 已有独立图的不动
    if (resolved[e.id]) {
      console.log(`- ${e.id} (${e.title})... SKIP (已解析)`);
      continue;
    }
    if (e.platform === 'douyin' && e.vid && fs.existsSync(path.join(COVERS_DIR, `${e.vid}.webp`))) {
      resolved[e.id] = `/covers/${e.vid}.webp`;
      console.log(`- ${e.id} (${e.title})... SKIP (封面已下载)`);
      continue;
    }
    process.stdout.write(`- ${e.id} (${e.title})... `);
    try {
      let img = null;
      if (e.platform === 'bilibili' && e.vid) {
        img = await bilibiliCover(e.vid);
      } else if (e.platform === 'douyin' && e.vid) {
        const coverUrl = await douyinCoverUrl(e.vid);
        const dest = path.join(COVERS_DIR, `${e.vid}.webp`);
        await download(coverUrl, dest);
        img = `/covers/${e.vid}.webp`;
      } else {
        img = await searchCover(e.title, e.aliases || []);
      }
      if (!img) throw new Error('no cover found');
      resolved[e.id] = img;
      ok++;
      console.log('OK', img.slice(0, 80));
    } catch (err) {
      fail++;
      console.log('FAIL', err.message);
    }
    await sleep(700); // 防止限流
  }
  fs.writeFileSync(OUT, JSON.stringify(resolved, null, 2));
  console.log(`\nresolved: ${ok}, failed this run: ${fail} -> ${OUT}`);
}

main().catch((e) => {
  console.error('fatal:', e.message);
  process.exit(1);
});
