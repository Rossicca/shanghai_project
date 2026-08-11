/**
 * 应用人工筛选结果。两种模式：
 *
 * ① 删除清单模式（审查页面 / review-delete.json）：
 *      node apply-workout-videos.js review-delete.json
 *   把第一个参数（.json，内容是 { videos: ["id", ...] } 或 ["id", ...]）当作要删除的 ID 清单。
 *
 * ② 保留清单模式（Excel / review-workout-videos.csv）：
 *      node apply-workout-videos.js
 *   把 CSV 里剩下的行当作保留清单，删除库中不在清单里的视频。
 *
 * 通用开关：
 *   --apply       真正删除（先自动备份 shanghai.db）
 *   --json        连 JSON 原始库（workout_videos.json）一起删，库重建也不会回来
 *   不加 --apply  为 dry-run，只打印将删除的条数+样例，不动数据
 *
 * 匹配逻辑：优先用 ID。Excel 可能把纯数字 ID（抖音）改成科学计数法，
 * 所以再拿“链接”列末尾的 ID 兜底匹配一次。
 */
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, 'data');
const CSV = path.join(__dirname, 'review-workout-videos.csv');
const DB_FILE = path.join(DATA_DIR, 'shanghai.db');
const JSON_FILE = path.join(DATA_DIR, 'workout_videos.json');

const args = process.argv.slice(2);
const doApply = args.includes('--apply');
const doJson = args.includes('--json');
// 第一个参数若是 .json 文件 → 删除清单模式
const deleteListArg = args.find((a) => !a.startsWith('-') && a.endsWith('.json'));

/** 从链接 URL 末尾解析视频 ID（bilibili → BVxxx；douyin → 纯数字串） */
function idFromUrl(url) {
  const m = String(url || '').trim().match(/\/([^\/?#]+)\s*$/);
  return m ? m[1] : null;
}

/** 简单 CSV 解析（处理 BOM、引号、换行） */
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', inQuotes = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell); cell = '';
    } else if (ch === '\n') {
      row.push(cell); rows.push(row); row = []; cell = '';
    } else if (ch !== '\r') {
      cell += ch;
    }
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const db = new DatabaseSync(DB_FILE);
const all = db.prepare('SELECT id, title, coach FROM workout_videos').all();

let toDelete;
if (deleteListArg) {
  // ① 删除清单模式：review-delete.json { videos: ["id", ...] }
  if (!fs.existsSync(deleteListArg)) {
    console.error('没找到 ' + deleteListArg + '。');
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(deleteListArg, 'utf8'));
  const ids = Array.isArray(raw) ? raw : (Array.isArray(raw.videos) ? raw.videos : []);
  const deleteIds = new Set(ids.map(String));
  console.log(`删除清单 ${deleteIds.size} 个 ID`);
  toDelete = all.filter((v) => deleteIds.has(String(v.id).trim()));
} else {
  // ② 保留清单模式：CSV 里剩下的行 = 保留
  if (!fs.existsSync(CSV)) {
    console.error('没找到 ' + CSV + '，请先运行 node export-workout-videos.js 生成，或传入 review-delete.json。');
    process.exit(1);
  }
  const rows = parseCsv(fs.readFileSync(CSV, 'utf8'));
  if (rows.length < 2) { console.error('CSV 只剩表头/为空，危险，已中止。'); process.exit(1); }
  const header = rows[0].map((h) => h.trim());
  const iId = header.indexOf('ID');
  const iUrl = header.indexOf('链接');
  if (iId < 0) { console.error('CSV 缺少 ID 列，可能表头被改，已中止。'); process.exit(1); }
  const keepIds = new Set();
  for (const r of rows.slice(1)) {
    const id = (r[iId] || '').trim();
    if (id) keepIds.add(id);
    if (iUrl >= 0) {
      const u = idFromUrl(r[iUrl]);
      if (u) keepIds.add(u);
    }
  }
  console.log(`CSV 保留清单 ${keepIds.size} 个 ID（去重后）`);
  toDelete = all.filter((v) => !keepIds.has(String(v.id).trim()));
}
const delSet = new Set(toDelete.map((v) => String(v.id).trim()));

console.log(`\n库内共 ${all.length} 条，将删除 ${toDelete.length} 条，保留 ${all.length - toDelete.length} 条。`);
if (toDelete.length) {
  console.log('\n--- 将删除的样例（最多 20 条）---');
  for (const v of toDelete.slice(0, 20)) {
    console.log(`  ${v.id} | ${v.coach || ''} | ${String(v.title).slice(0, 45)}`);
  }
  if (toDelete.length > 20) console.log(`  … 还有 ${toDelete.length - 20} 条`);
}

if (!doApply) {
  console.log('\n这是 dry-run，未改动任何数据。确认无误后运行：node apply-workout-videos.js --apply');
  process.exit(0);
}

// 备份
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const bak = DB_FILE + '.bak-' + stamp;
fs.copyFileSync(DB_FILE, bak);
console.log(`\n已备份 → ${path.basename(bak)}`);

// 删活库（node:sqlite 的 ? 占位符必须散参传，数组会被当成命名参数对象）
const del = db.prepare('DELETE FROM workout_videos WHERE id = ?');
for (const v of toDelete) del.run(v.id);
console.log(`SQLite 活库已删除 ${toDelete.length} 条，剩余 ${all.length - toDelete.length} 条。`);

// 可选：删 JSON 原始库
if (doJson) {
  if (fs.existsSync(JSON_FILE)) {
    const raw = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    const arr = Array.isArray(raw) ? raw : (raw.videos || []);
    const kept = arr.filter(
      (v) => !delSet.has(String(v.id).trim()) && !delSet.has(idFromUrl(v.sourceUrl) || '')
    );
    const removed = arr.length - kept.length;
    if (Array.isArray(raw)) fs.writeFileSync(JSON_FILE, JSON.stringify(kept, null, 2), 'utf8');
    else fs.writeFileSync(JSON_FILE, JSON.stringify({ ...raw, videos: kept }, null, 2), 'utf8');
    console.log(`JSON 原始库已删除 ${removed} 条，剩余 ${kept.length} 条。`);
  } else {
    console.log('未找到 JSON 原始库，跳过。');
  }
}

console.log('\n完成。下次启动后端时 seedAndSanitize 只会补 15 条精选，不会把删掉的加回来。');
