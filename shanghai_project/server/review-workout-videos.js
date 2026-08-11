/**
 * 健身视频库合规审查脚本（临时工具，不入推荐逻辑）。
 * 用法：node review-workout-videos.js [--all] [--limit 20]
 *   --all    同时扫 JSON 原始库；默认只扫 SQLite 活库
 *   --limit  N 每条违规类别最多打印 N 条样例（默认 20）
 *
 * 输出每个违规维度：命中条数 + 样例（id/title/category）。
 * 只打印，不修改数据。
 */
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, 'data');
const args = process.argv.slice(2);
const withJson = args.includes('--all');
const limit = Number(args[args.indexOf('--limit') + 1]) || 20;

function loadSqlite() {
  const db = new DatabaseSync(path.join(DATA_DIR, 'shanghai.db'));
  const rows = db.prepare('SELECT * FROM workout_videos').all();
  for (const r of rows) {
    try { r.tags = JSON.parse(r.tags || '[]'); } catch { r.tags = []; }
  }
  return rows;
}
function loadJson() {
  const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'workout_videos.json'), 'utf8'));
  return Array.isArray(raw) ? raw : (raw.videos || []);
}

// 现行规则
const { isSafeWorkoutVideo } = require('./workout-video-safety');

// 现行规则之外的补充审查维度（判断“不合规”的主观规则都在这，方便你改）
const EXTRA_CHECKS = [
  {
    name: '夸大效果宣传',
    regex: /(?:天|周|月)(?:瘦|见效|掉|练出|减|速成)|秒瘦|极速瘦|暴瘦|瘦成|狂瘦|一周瘦\d|瘦\d+斤|掉\d+斤|减\d+斤|永不反弹|一劳永逸|躺着瘦|轻松减\b/i,
  },
  {
    name: '医疗/矫正宣称',
    regex: /治疗|疗法|矫正|治愈|消炎|止痛|药|疾病|颈椎病|腰间盘|椎间盘|内分泌|代谢紊乱|科学减脂不反弹|告别亚健康/i,
  },
  {
    name: '夸大身材效果(瘦腿/翘臀/马甲线速成)',
    regex: /秒变|一夜|X天见效|三天见效|两天见效|立竿见影|效果惊人|疯狂燃脂|魔鬼|神级|终极减脂/i,
  },
  {
    name: '标题党/诱导点击',
    regex: /千万不要|后悔|惊了|震惊|别再|一定要看|不看后悔|99%|没人知道|秘密|绝招/i,
  },
];

function evaluate(video) {
  const flags = [];
  if (!isSafeWorkoutVideo(video)) flags.push('现行规则不过');
  const haystack = [video.title, ...(Array.isArray(video.tags) ? video.tags : [])].filter(Boolean).join(' ');
  for (const check of EXTRA_CHECKS) {
    if (check.regex.test(haystack)) flags.push(check.name);
  }
  return flags;
}

const videos = [...loadSqlite()];
console.log(`SQLite 活库 ${videos.length} 条`);

const sources = { sqlite: videos };
if (withJson) {
  sources.json = loadJson();
  console.log(`JSON 原始库 ${sources.json.length} 条`);
}

for (const [name, list] of Object.entries(sources)) {
  console.log(`\n===== ${name}（${list.length} 条）=====`);
  const buckets = {};
  for (const v of list) {
    for (const flag of evaluate(v)) (buckets[flag] = buckets[flag] || []).push(v);
  }
  const order = ['现行规则不过', ...EXTRA_CHECKS.map((c) => c.name)];
  let printedAny = false;
  for (const flag of order) {
    const hit = buckets[flag] || [];
    if (!hit.length) continue;
    printedAny = true;
    console.log(`\n◆ ${flag}：${hit.length} 条`);
    for (const v of hit.slice(0, limit)) {
      console.log(`   ${v.id} | ${String(v.category || '')}/${String(v.difficulty || '')} | ${String(v.coach || '')} | ${String(v.title).slice(0, 50)}`);
    }
    if (hit.length > limit) console.log(`   … 还有 ${hit.length - limit} 条`);
  }
  if (!printedAny) console.log('（无命中）');
}
