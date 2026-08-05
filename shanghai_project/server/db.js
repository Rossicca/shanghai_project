/**
 * db.js — SQLite 数据库
 * 使用 sql.js（纯 JS SQLite，无需编译原生模块）
 * 数据存储在 server/data/shanghai.db
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'shanghai.db');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db = null;

/** 获取数据库实例（惰性初始化） */
async function getDb() {
  if (db) return db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  initTables();
  saveDb();
  return db;
}

/** 保存到文件 */
function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/** 初始化表结构 */
function initTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      nickname TEXT DEFAULT '健身新人',
      gender TEXT DEFAULT 'male',
      birthday TEXT,
      avatarUrl TEXT,
      role TEXT DEFAULT 'user',
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS body_data (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      height REAL NOT NULL,
      weight REAL NOT NULL,
      age INTEGER,
      gender TEXT,
      bodyFat REAL,
      waist REAL,
      hip REAL,
      measuredAt TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS fitness_goals (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      goalType TEXT NOT NULL,
      targetWeight REAL,
      targetDate TEXT,
      activityLevel TEXT DEFAULT 'moderate',
      weeklyFrequency INTEGER DEFAULT 3,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS preferences (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      dietType TEXT DEFAULT 'balanced',
      allergies TEXT DEFAULT '[]',
      cuisinePreferences TEXT DEFAULT '[]',
      maxCookTime INTEGER DEFAULT 30,
      workoutLocation TEXT DEFAULT 'home',
      hasEquipment INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS workout_videos (
      id TEXT PRIMARY KEY,
      title TEXT,
      category TEXT,
      duration TEXT,
      difficulty TEXT,
      coach TEXT,
      calories TEXT,
      coverColor TEXT,
      sourceUrl TEXT,
      platform TEXT DEFAULT 'bilibili',
      videoUrl TEXT,
      coverUrl TEXT,
      playCount INTEGER DEFAULT 0,
      description TEXT,
      reason TEXT,
      tags TEXT DEFAULT '[]',
      fetchedAt TEXT,
      source TEXT DEFAULT 'bilibili',
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      userId TEXT,
      name TEXT,
      description TEXT,
      coverEmoji TEXT,
      calories REAL,
      protein REAL,
      carbs REAL,
      fat REAL,
      fiber REAL,
      ingredients TEXT DEFAULT '[]',
      steps TEXT DEFAULT '[]',
      cookTime INTEGER,
      difficulty TEXT,
      tips TEXT,
      mealType TEXT,
      servings INTEGER DEFAULT 1,
      isSaved INTEGER DEFAULT 0,
      imageUrl TEXT,
      nutrition TEXT DEFAULT '{}',
      reimaginedFrom TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS recognition_sessions (
      id TEXT PRIMARY KEY,
      userId TEXT,
      imageUrl TEXT,
      ingredients TEXT DEFAULT '[]',
      totalNutrition TEXT DEFAULT '{}',
      confirmed INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS saved_workouts (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      workoutId TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS saved_recipes (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      recipeId TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS workout_history (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      workoutId TEXT NOT NULL,
      duration REAL DEFAULT 0,
      calories REAL DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS workout_plans (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      goalType TEXT,
      summary TEXT,
      weeklySchedule TEXT DEFAULT '[]',
      reminders TEXT DEFAULT '[]',
      disclaimer TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  // 创建索引
  db.run('CREATE INDEX IF NOT EXISTS idx_body_data_userId ON body_data(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_fitness_goals_userId ON fitness_goals(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_preferences_userId ON preferences(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_workout_videos_category ON workout_videos(category)');
  db.run('CREATE INDEX IF NOT EXISTS idx_recipes_userId ON recipes(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_saved_workouts_userId ON saved_workouts(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_saved_recipes_userId ON saved_recipes(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_workout_history_userId ON workout_history(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_workout_plans_userId ON workout_plans(userId)');

  applyMigrations();
}

/**
 * 补齐已存在数据库缺失的列。
 *
 * CREATE TABLE IF NOT EXISTS 只对新建库生效，已存在的 shanghai.db 不会随
 * 上面的建表语句更新。新增列时在这里登记一条，老库和新库才能保持一致。
 */
const COLUMN_MIGRATIONS = [
  // update() 会自动写入 updatedAt，所有可更新的表都需要这一列
  { table: 'users', column: 'updatedAt', type: 'TEXT' },
  { table: 'body_data', column: 'updatedAt', type: 'TEXT' },
  { table: 'fitness_goals', column: 'updatedAt', type: 'TEXT' },
  { table: 'preferences', column: 'updatedAt', type: 'TEXT' },
  { table: 'workout_videos', column: 'updatedAt', type: 'TEXT' },
  { table: 'recipes', column: 'updatedAt', type: 'TEXT' },
  { table: 'recognition_sessions', column: 'updatedAt', type: 'TEXT' },
  { table: 'saved_workouts', column: 'updatedAt', type: 'TEXT' },
  { table: 'saved_recipes', column: 'updatedAt', type: 'TEXT' },
  { table: 'workout_history', column: 'updatedAt', type: 'TEXT' },
  { table: 'workout_plans', column: 'updatedAt', type: 'TEXT' },
  // 识别流程「确认食材」写入的标记
  { table: 'recognition_sessions', column: 'confirmed', type: 'INTEGER DEFAULT 0' },
  // 「换做法」记录来源菜谱
  { table: 'recipes', column: 'reimaginedFrom', type: 'TEXT' },
];

function applyMigrations() {
  for (const { table, column, type } of COLUMN_MIGRATIONS) {
    if (hasColumn(table, column)) continue;
    try {
      db.run(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${type}`);
      console.log(`[db] 迁移: ${table}.${column} 已补齐`);
    } catch (error) {
      console.warn(`[db] 迁移失败 ${table}.${column}:`, error.message);
    }
  }
}

/** 表中是否已有该列 */
function hasColumn(table, column) {
  try {
    const result = db.exec(`PRAGMA table_info("${table}")`);
    if (!result.length) return false;
    // PRAGMA table_info 的第 2 列（索引 1）是列名
    return result[0].values.some((row) => row[1] === column);
  } catch {
    return false;
  }
}

/** 生成唯一 ID */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** 读取一个集合（返回数组） */
function readCollection(name) {
  const tableName = name;
  // 检测表是否存在
  const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?");
  stmt.bind([tableName]);
  if (!stmt.step()) {
    stmt.free();
    return [];
  }
  stmt.free();

  const rows = db.exec(`SELECT * FROM "${tableName}"`);
  if (rows.length === 0) return [];
  const columns = rows[0].columns;
  return rows[0].values.map((row) => {
    const obj = {};
    columns.forEach((col, i) => {
      let val = row[i];
      // 尝试解析 JSON 字符串字段
      if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
        try { val = JSON.parse(val); } catch {}
      }
      obj[col] = val;
    });
    return obj;
  });
}

/** 写入整个集合（覆盖） */
function writeCollection(name, data) {
  // 清空表
  db.run(`DELETE FROM "${name}"`);
  if (data.length === 0) {
    saveDb();
    return;
  }

  const columns = Object.keys(data[0]);
  const placeholders = columns.map(() => '?').join(',');
  const stmt = db.prepare(
    `INSERT INTO "${name}" (${columns.map(c => `"${c}"`).join(',')}) VALUES (${placeholders})`
  );

  for (const item of data) {
    const values = columns.map((col) => {
      const val = item[col];
      return typeof val === 'object' && val !== null ? JSON.stringify(val) : val;
    });
    stmt.run(values);
  }
  stmt.free();
  saveDb();
}

/** 插入一条记录 */
function insert(name, record) {
  const doc = { id: generateId(), ...record, createdAt: new Date().toISOString() };
  const columns = Object.keys(doc);
  const placeholders = columns.map(() => '?').join(',');
  const values = columns.map((col) => {
    const val = doc[col];
    return typeof val === 'object' && val !== null ? JSON.stringify(val) : val;
  });

  db.run(
    `INSERT INTO "${name}" (${columns.map(c => `"${c}"`).join(',')}) VALUES (${placeholders})`,
    values
  );
  saveDb();
  return doc;
}

/** 根据 id 查询 */
function findById(name, id) {
  const rows = db.exec(`SELECT * FROM "${name}" WHERE id = ?`, [id]);
  if (rows.length === 0 || rows[0].values.length === 0) return null;
  return rowToObject(rows[0], rows[0].values[0]);
}

/** 查询所有，支持过滤 */
function find(name, filter = {}) {
  const rows = db.exec(`SELECT * FROM "${name}"`);
  if (rows.length === 0) return [];
  const columns = rows[0].columns;
  let results = rows[0].values.map((row) => rowToObject(rows[0], row));

  const keys = Object.keys(filter);
  if (keys.length > 0) {
    results = results.filter((item) => keys.every((k) => item[k] === filter[k]));
  }
  return results;
}

/** 更新一条记录 */
function update(name, id, updates) {
  updates.updatedAt = new Date().toISOString();
  const setClause = Object.keys(updates)
    .map((k) => `"${k}" = ?`)
    .join(',');
  const values = Object.values(updates).map((v) =>
    typeof v === 'object' && v !== null ? JSON.stringify(v) : v
  );

  db.run(`UPDATE "${name}" SET ${setClause} WHERE id = ?`, [...values, id]);
  saveDb();
  return findById(name, id);
}

/** 删除一条记录 */
function remove(name, id) {
  const existing = findById(name, id);
  if (!existing) return false;
  db.run(`DELETE FROM "${name}" WHERE id = ?`, [id]);
  saveDb();
  return true;
}

/** 删除匹配条件的所有记录 */
function removeMany(name, filter) {
  const all = find(name);
  const keys = Object.keys(filter);
  const toRemove = all.filter((item) => keys.every((k) => item[k] === filter[k]));

  for (const item of toRemove) {
    db.run(`DELETE FROM "${name}" WHERE id = ?`, [item.id]);
  }
  saveDb();
  return toRemove.length;
}

/** 分页查询 */
function paginate(name, { page = 1, pageSize = 20, filter = {}, sort } = {}) {
  let col = find(name, filter);
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
  return { items, total, page, pageSize, hasMore: start + pageSize < total };
}

/** 将 SQLite 行转为对象 */
function rowToObject(result, row) {
  const obj = {};
  result.columns.forEach((col, i) => {
    let val = row[i];
    if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
      try { val = JSON.parse(val); } catch {}
    }
    obj[col] = val;
  });
  return obj;
}

/** 执行原始 SQL（内部使用） */
function exec(sql, params = []) {
  return db.exec(sql, params);
}

/** 获取数据库文件大小 */
function getDbSize() {
  try {
    const stats = fs.statSync(DB_PATH);
    return stats.size;
  } catch {
    return 0;
  }
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
  exec,
  getDb,
  getDbSize,
  DB_PATH,
};