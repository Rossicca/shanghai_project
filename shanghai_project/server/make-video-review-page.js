/**
 * 生成可视化审查页面 review-workout-videos.html
 * 用法：node make-video-review-page.js
 *
 * 页面把 SQLite 活库的每条视频渲染成卡片（封面缩略图 + 标题 + 教练 + 播放量），
 * 勾选要删除的 → 下载 review-delete.json → 运行 apply-workout-videos.js 应用。
 * 数据是页面生成时内嵌的，改库后重新跑本脚本刷新。
 */
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { riskTags } = require('./video-review-checks');

const DATA_DIR = path.join(__dirname, 'data');
const OUT = path.join(__dirname, 'review-workout-videos.html');

const db = new DatabaseSync(path.join(DATA_DIR, 'shanghai.db'));
const videos = db.prepare('SELECT * FROM workout_videos').all().map((v) => ({
  id: v.id,
  title: v.title,
  coach: v.coach || '',
  category: v.category || '',
  difficulty: v.difficulty || '',
  playCount: v.playCount || 0,
  duration: v.duration || '',
  coverUrl: v.coverUrl || '',
  coverColor: v.coverColor || '#2ECC71',
  sourceUrl: v.sourceUrl || '',
  risk: riskTags(v),
}));

// 防 `</script>` 提前闭合：把 < 转义成 <
const dataJson = JSON.stringify(videos).replace(/</g, '\\u003c');

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>健身视频人工审查</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Microsoft YaHei", system-ui, sans-serif; background: #f3f4f6; color: #1f2937; }
  header { position: sticky; top: 0; z-index: 10; background: #fff; border-bottom: 1px solid #e5e7eb; padding: 10px 16px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  header h1 { font-size: 16px; margin: 0 12px 0 0; }
  .filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .filters input, .filters select { padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; }
  .filters input[type=text] { width: 220px; }
  .btn { padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; cursor: pointer; font-size: 13px; }
  .btn:hover { background: #f9fafb; }
  .btn.primary { background: #FF6B35; color: #fff; border-color: #FF6B35; font-weight: 600; }
  .btn.primary:hover { background: #e85a28; }
  .count { font-size: 13px; color: #6b7280; margin-left: auto; }
  .count b { color: #FF6B35; }
  #grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; padding: 16px; }
  .card { position: relative; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.08); display: flex; flex-direction: column; }
  .card.marked { outline: 3px solid #FF6B35; }
  .thumb { position: relative; display: block; aspect-ratio: 4 / 3; background: #e5e7eb; overflow: hidden; }
  .thumb img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .thumb .fb { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,.9); font-size: 40px; }
  .chk { position: absolute; top: 8px; left: 8px; z-index: 3; width: 20px; height: 20px; accent-color: #FF6B35; cursor: pointer; }
  .badge-del { position: absolute; top: 6px; right: 6px; z-index: 3; background: #FF6B35; color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 10px; opacity: 0; }
  .card.marked .badge-del { opacity: 1; }
  .body { padding: 8px 10px 10px; display: flex; flex-direction: column; gap: 5px; flex: 1; }
  .title { font-size: 13px; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .meta { font-size: 12px; color: #6b7280; }
  .risk { display: inline-block; font-size: 11px; padding: 1px 6px; border-radius: 9px; background: #fef3c7; color: #92400e; margin-right: 4px; }
  footer { position: sticky; bottom: 0; background: #fff; border-top: 1px solid #e5e7eb; padding: 10px 16px; display: flex; gap: 10px; align-items: center; justify-content: flex-end; }
  .hint { font-size: 12px; color: #9ca3af; }
  .hidden { display: none !important; }
</style>
</head>
<body>
<header>
  <h1>健身视频人工审查</h1>
  <div class="filters">
    <input type="text" id="q" placeholder="搜标题 / 教练…">
    <select id="fCat"><option value="">全部分类</option></select>
    <select id="fDiff"><option value="">全部难度</option></select>
    <label class="hint"><input type="checkbox" id="fRisk"> 只看风险项</label>
  </div>
  <div class="count"><b id="selCount">0</b> / <span id="total">0</span> 已选要删除 · 当前显示 <b id="visCount">0</b></div>
</header>
<main id="grid"></main>
<footer>
  <button class="btn" id="btnAll">全选当前</button>
  <button class="btn" id="btnClear">清空</button>
  <button class="btn primary" id="btnDown">⬇ 下载删除清单 review-delete.json</button>
  <span class="hint">点击封面可打开原视频核实</span>
</footer>

<script id="data" type="application/json">${dataJson}</script>
<script>
const DATA = JSON.parse(document.getElementById('data').textContent);
const grid = document.getElementById('grid');
const selected = new Set();
const catSel = document.getElementById('fCat');
const diffSel = document.getElementById('fDiff');
const q = document.getElementById('q');
const fRisk = document.getElementById('fRisk');

function fmt(n) { return n >= 10000 ? (n / 10000).toFixed(1) + '万' : String(n); }

const cats = [...new Set(DATA.map(v => v.category).filter(Boolean))].sort();
const diffs = [...new Set(DATA.map(v => v.difficulty).filter(Boolean))].sort();
catSel.innerHTML = '<option value="">全部分类</option>' + cats.map(c => '<option>' + c + '</option>').join('');
diffSel.innerHTML = '<option value="">全部难度</option>' + diffs.map(d => '<option>' + d + '</option>').join('');

DATA.forEach(v => {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = v.id;
  card.dataset.title = (v.title + ' ' + v.coach).toLowerCase();
  card.dataset.category = v.category;
  card.dataset.difficulty = v.difficulty;
  card.dataset.risk = String(v.risk.length > 0);

  const chk = document.createElement('input');
  chk.type = 'checkbox';
  chk.className = 'chk';
  chk.addEventListener('change', () => {
    if (chk.checked) selected.add(v.id); else selected.delete(v.id);
    card.classList.toggle('marked', chk.checked);
    updateCounts();
  });

  const fb = document.createElement('span');
  fb.className = 'fb';
  fb.style.background = v.coverColor;
  fb.textContent = (v.title || '?').charAt(0);

  const img = document.createElement('img');
  img.loading = 'lazy';
  img.alt = v.title;
  img.addEventListener('error', () => img.remove());   // 图挂了显示色块
  if (v.coverUrl) img.src = v.coverUrl;

  const link = document.createElement('a');
  link.className = 'thumb';
  link.href = v.sourceUrl || '#';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.appendChild(fb);
  link.appendChild(img);

  const badge = document.createElement('span');
  badge.className = 'badge-del';
  badge.textContent = '删除';

  const body = document.createElement('div');
  body.className = 'body';
  const t = document.createElement('div');
  t.className = 'title';
  t.textContent = v.title;
  const m = document.createElement('div');
  m.className = 'meta';
  m.textContent = [v.coach, v.category + '/' + v.difficulty, fmt(v.playCount), v.duration ? v.duration + '秒' : ''].filter(Boolean).join(' · ');
  body.appendChild(t);
  body.appendChild(m);
  v.risk.forEach(r => {
    const b = document.createElement('span');
    b.className = 'risk';
    b.textContent = r;
    body.appendChild(b);
  });

  card.appendChild(chk);
  card.appendChild(badge);
  card.appendChild(link);
  card.appendChild(body);
  grid.appendChild(card);
});

function matches(card) {
  const v = card.dataset;
  const query = q.value.trim().toLowerCase();
  if (query && !v.title.includes(query)) return false;
  if (catSel.value && v.category !== catSel.value) return false;
  if (diffSel.value && v.difficulty !== diffSel.value) return false;
  if (fRisk.checked && v.risk !== 'true') return false;
  return true;
}

function updateCounts() {
  let vis = 0;
  document.querySelectorAll('.card').forEach(c => {
    const ok = matches(c);
    c.classList.toggle('hidden', !ok);
    if (ok) vis++;
  });
  document.getElementById('total').textContent = DATA.length;
  document.getElementById('visCount').textContent = vis;
  document.getElementById('selCount').textContent = selected.size;
}
q.addEventListener('input', updateCounts);
catSel.addEventListener('change', updateCounts);
diffSel.addEventListener('change', updateCounts);
fRisk.addEventListener('change', updateCounts);

document.getElementById('btnClear').addEventListener('click', () => {
  document.querySelectorAll('.card.marked').forEach(c => c.querySelector('.chk').click());
  if (selected.size) selected.clear();
  updateCounts();
});
document.getElementById('btnAll').addEventListener('click', () => {
  document.querySelectorAll('.card:not(.hidden)').forEach(c => {
    const chk = c.querySelector('.chk');
    if (!chk.checked) chk.click();
  });
});
document.getElementById('btnDown').addEventListener('click', () => {
  const ids = [...selected];
  const blob = new Blob([JSON.stringify({ videos: ids }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'review-delete.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
updateCounts();
</script>
</body>
</html>`;

fs.writeFileSync(OUT, html, 'utf8');
console.log(`已生成 ${OUT}（${videos.length} 条）`);
console.log('浏览器打开后：勾选要删的视频 → 下载 review-delete.json → 运行 apply 脚本应用');
