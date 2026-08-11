/**
 * 导出健身视频清单供人工筛选。
 * 生成 review-workout-videos.csv（UTF-8 BOM，Excel/WPS 直接打开中文不乱码）。
 *
 * 用法：node export-workout-videos.js
 *   默认导 SQLite 活库（App 实际读这个）。
 *
 * 筛选流程：
 *   1) 运行本脚本 → 得到 review-workout-videos.csv
 *   2) Excel/WPS 打开，删掉不想要的行，Ctrl+S 保存（保留表头不动）
 *   3) 运行 node apply-workout-videos.js 应用（先 dry-run 预览再 --apply）
 *
 * 约定：CSV 里剩下的行 = 保留清单；不在 CSV 里的视频会被从库里删除。
 * 行序：带风险标记的排前面，同风险按播放量从高到低，方便优先过一遍。
 */
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { riskTags } = require('./video-review-checks');

const DATA_DIR = path.join(__dirname, 'data');
const OUT = path.join(__dirname, 'review-workout-videos.csv');

function loadSqlite() {
  const db = new DatabaseSync(path.join(DATA_DIR, 'shanghai.db'));
  return db.prepare('SELECT * FROM workout_videos').all();
}

function csvCell(v) {
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

const videos = loadSqlite();
videos.sort((a, b) => {
  const ar = riskTags(a).length;
  const br = riskTags(b).length;
  if (ar !== br) return br - ar;            // 有风险的排前面
  return (b.playCount || 0) - (a.playCount || 0);
});

const header = ['风险', '分类', '难度', '教练', '播放量', '时长(秒)', '标题', 'ID', '链接'];
const lines = [header.join(',')];
for (const v of videos) {
  lines.push([
    csvCell(riskTags(v).join('|')),
    csvCell(v.category),
    csvCell(v.difficulty),
    csvCell(v.coach),
    v.playCount || 0,
    csvCell(v.duration),
    csvCell(v.title),
    csvCell(v.id),
    csvCell(v.sourceUrl),
  ].join(','));
}

fs.writeFileSync(OUT, '﻿' + lines.join('\r\n'), 'utf8');
console.log(`已导出 ${videos.length} 条 → ${OUT}`);
console.log(`带风险标记 ${videos.filter((v) => riskTags(v).length).length} 条（列在表格最前面）`);
console.log('下一步：打开 CSV，删掉不要的行并保存，然后运行 node apply-workout-videos.js');
