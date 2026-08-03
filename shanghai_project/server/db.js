/**
 * db.js — JSON 文件数据库
 * 轻量持久化，无需安装数据库引擎。生产环境应替换为 PostgreSQL/MySQL。
 * 数据存储在 server/data/ 目录下，以 JSON 文件形式保存。
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/** 读取一个集合 */
function readCollection(name) {
  const file = path.join(DATA_DIR, `${name}.json`);
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** 写入一个集合 */
function writeCollection(name, data) {
  const file = path.join(DATA_DIR, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

/** 插入一条记录，自动生成 id */
function insert(name, record) {
  const col = readCollection(name);
  const doc = { id: generateId(), ...record, createdAt: new Date().toISOString() };
  col.push(doc);
  writeCollection(name, col);
  return doc;
}

/** 根据 id 查询 */
function findById(name, id) {
  const col = readCollection(name);
  return col.find((item) => item.id === id) || null;
}

/** 查询所有，支持过滤和排序 */
function find(name, filter = {}) {
  let col = readCollection(name);
  const keys = Object.keys(filter);
  if (keys.length > 0) {
    col = col.filter((item) => keys.every((k) => item[k] === filter[k]));
  }
  return col;
}

/** 更新一条记录 */
function update(name, id, updates) {
  const col = readCollection(name);
  const idx = col.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  col[idx] = { ...col[idx], ...updates, updatedAt: new Date().toISOString() };
  writeCollection(name, col);
  return col[idx];
}

/** 删除一条记录 */
function remove(name, id) {
  const col = readCollection(name);
  const idx = col.findIndex((item) => item.id === id);
  if (idx === -1) return false;
  col.splice(idx, 1);
  writeCollection(name, col);
  return true;
}

/** 删除匹配条件的所有记录 */
function removeMany(name, filter) {
  const col = readCollection(name);
  const keys = Object.keys(filter);
  const remaining = col.filter(
    (item) => !keys.every((k) => item[k] === filter[k])
  );
  writeCollection(name, remaining);
  return col.length - remaining.length;
}

/** 生成唯一 ID */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** 分页查询 */
function paginate(name, { page = 1, pageSize = 20, filter = {}, sort } = {}) {
  let col = readCollection(name);
  const keys = Object.keys(filter);
  if (keys.length > 0) {
    col = col.filter((item) => keys.every((k) => item[k] === filter[k]));
  }
  if (sort) {
    const [field, order] = sort.split(':');
    col.sort((a, b) => {
      const va = a[field] || 0;
      const vb = b[field] || 0;
      return order === 'desc' ? vb - va : va - vb;
    });
  }
  const total = col.length;
  const start = (page - 1) * pageSize;
  const items = col.slice(start, start + pageSize);
  return {
    items,
    total,
    page,
    pageSize,
    hasMore: start + pageSize < total,
  };
}

module.exports = {
  readCollection,
  writeCollection,
  insert,
  findById,
  find,
  update,
  remove,
  removeMany,
  paginate,
  generateId,
};