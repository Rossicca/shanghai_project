/**
 * db.js — SQLite 数据库
 * 使用 sql.js（纯 JS SQLite，无需编译原生模块）
 * 数据存储在 server/data/shanghai.db
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DEFAULT_DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : path.join(DEFAULT_DATA_DIR, 'shanghai.db');
const DATA_DIR = path.dirname(DB_PATH);

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
  autoMigrateFromJson();
  seedAndSanitizeWorkoutVideos();
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

/**
 * 把人工核验的公开视频持久化进 SQLite，并清理旧数据中不符合健身/来源/内容安全规则的条目。
 * 推荐接口仍会再次过滤，形成“入库一次 + 输出一次”的双层防护。
 */
function seedAndSanitizeWorkoutVideos() {
  const { CURATED_WORKOUT_VIDEOS } = require('./curated-workout-videos');
  const { isSafeWorkoutVideo } = require('./workout-video-safety');
  const insertStatement = db.prepare(`
    INSERT OR IGNORE INTO workout_videos
      (id, title, category, duration, difficulty, coach, calories, coverColor, sourceUrl,
       platform, videoUrl, coverUrl, playCount, description, reason, tags, fetchedAt, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const video of CURATED_WORKOUT_VIDEOS) {
    insertStatement.run([
      video.id, video.title, video.category, video.duration || null, video.difficulty || null,
      video.coach || null, video.calories || null, video.coverColor || null, video.sourceUrl,
      video.platform, video.videoUrl || null, video.coverUrl || null, video.playCount || 0,
      video.description || null, video.reason || null, JSON.stringify(video.tags || []),
      video.fetchedAt || new Date().toISOString(), video.source || video.platform,
    ]);
  }
  insertStatement.free();

  const rows = [];
  const selectStatement = db.prepare('SELECT * FROM workout_videos');
  while (selectStatement.step()) {
    const row = selectStatement.getAsObject();
    try { row.tags = JSON.parse(row.tags || '[]'); } catch { row.tags = []; }
    rows.push(row);
  }
  selectStatement.free();
  const unsafeIds = rows.filter((video) => !isSafeWorkoutVideo(video)).map((video) => video.id);
  if (unsafeIds.length) {
    const deleteStatement = db.prepare('DELETE FROM workout_videos WHERE id = ?');
    for (const id of unsafeIds) deleteStatement.run([id]);
    deleteStatement.free();
    console.log(`[db] 已移除 ${unsafeIds.length} 条不符合健身内容安全规则的视频`);
  }
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
      chest REAL,
      waist REAL,
      hip REAL,
      upperArm REAL,
      thigh REAL,
      calf REAL,
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
        goalTypes TEXT DEFAULT '[]',
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
      sourceVideo TEXT,
      generationMode TEXT DEFAULT 'ai',
      generationWarning TEXT,
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
        goalTypes TEXT DEFAULT '[]',
        summary TEXT,
      weeklySchedule TEXT DEFAULT '[]',
      nutritionSummary TEXT,
      nutritionTargets TEXT,
        mealSuggestions TEXT DEFAULT '[]',
        dietPlan TEXT DEFAULT '[]',
        profileSnapshot TEXT,
        profileAnalysis TEXT,
        planConditions TEXT,
      evidence TEXT DEFAULT '[]',
      isSaved INTEGER DEFAULT 0,
      isFavorite INTEGER DEFAULT 0,
      reminders TEXT DEFAULT '[]',
        disclaimer TEXT,
        generationMode TEXT DEFAULT 'ai',
        generationWarning TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);
  // 社区动态：只存用户新发的帖子（种子动态作为常量视图，不入库）
  db.run(`
    CREATE TABLE IF NOT EXISTS community_posts (
      id TEXT PRIMARY KEY,
      authorName TEXT,
      authorAvatar TEXT,
      authorTag TEXT,
      timeLabel TEXT,
      category TEXT,
      content TEXT,
      imageEmoji TEXT,
      imageColor TEXT,
      imageUri TEXT,
      likes INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);
  // 社区点赞：按 (postId, userId) 记录，避免一个用户点赞让所有人看到 liked
  db.run(`
    CREATE TABLE IF NOT EXISTS community_post_likes (
      id TEXT PRIMARY KEY,
      postId TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);
  // 社区评论：只存用户新发的评论（种子评论作为常量视图）
  db.run(`
    CREATE TABLE IF NOT EXISTS community_comments (
      id TEXT PRIMARY KEY,
      postId TEXT NOT NULL,
      authorName TEXT,
      authorAvatar TEXT,
      timeLabel TEXT,
      content TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);
  // 时光阁照片墙：按用户隔离（自己的记忆只跟自己走）
  db.run(`
    CREATE TABLE IF NOT EXISTS community_photos (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      date TEXT,
      day INTEGER,
      weight REAL,
      bodyFat REAL,
      note TEXT,
      uri TEXT,
      emoji TEXT,
      color TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);
  // 社区关注：按用户隔离（我关注了谁）
  db.run(`
    CREATE TABLE IF NOT EXISTS community_following (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      followName TEXT,
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
  db.run('CREATE INDEX IF NOT EXISTS idx_community_post_likes_post ON community_post_likes(postId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments(postId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_community_photos_user ON community_photos(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_community_following_user ON community_following(userId)');

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
    { table: 'fitness_goals', column: 'goalTypes', type: "TEXT DEFAULT '[]'" },
  { table: 'preferences', column: 'updatedAt', type: 'TEXT' },
  { table: 'workout_videos', column: 'updatedAt', type: 'TEXT' },
  { table: 'recipes', column: 'updatedAt', type: 'TEXT' },
  { table: 'recipes', column: 'sourceVideo', type: 'TEXT' },
  { table: 'recipes', column: 'generationMode', type: "TEXT DEFAULT 'ai'" },
  { table: 'recipes', column: 'generationWarning', type: 'TEXT' },
  { table: 'recognition_sessions', column: 'updatedAt', type: 'TEXT' },
  { table: 'saved_workouts', column: 'updatedAt', type: 'TEXT' },
  { table: 'saved_recipes', column: 'updatedAt', type: 'TEXT' },
  { table: 'workout_history', column: 'updatedAt', type: 'TEXT' },
  { table: 'workout_plans', column: 'updatedAt', type: 'TEXT' },
    { table: 'workout_plans', column: 'nutritionSummary', type: 'TEXT' },
    { table: 'workout_plans', column: 'goalTypes', type: "TEXT DEFAULT '[]'" },
    { table: 'workout_plans', column: 'nutritionTargets', type: 'TEXT' },
    { table: 'workout_plans', column: 'mealSuggestions', type: "TEXT DEFAULT '[]'" },
    { table: 'workout_plans', column: 'dietPlan', type: "TEXT DEFAULT '[]'" },
    { table: 'workout_plans', column: 'profileSnapshot', type: 'TEXT' },
    { table: 'workout_plans', column: 'profileAnalysis', type: 'TEXT' },
    { table: 'workout_plans', column: 'planConditions', type: 'TEXT' },
    { table: 'workout_plans', column: 'generationMode', type: "TEXT DEFAULT 'ai'" },
    { table: 'workout_plans', column: 'generationWarning', type: 'TEXT' },
  { table: 'workout_plans', column: 'evidence', type: "TEXT DEFAULT '[]'" },
  { table: 'workout_plans', column: 'isSaved', type: 'INTEGER DEFAULT 0' },
  { table: 'workout_plans', column: 'isFavorite', type: 'INTEGER DEFAULT 0' },
  { table: 'body_data', column: 'chest', type: 'REAL' },
  { table: 'body_data', column: 'upperArm', type: 'REAL' },
  { table: 'body_data', column: 'thigh', type: 'REAL' },
  { table: 'body_data', column: 'calf', type: 'REAL' },
  // 识别流程「确认食材」写入的标记
  { table: 'recognition_sessions', column: 'confirmed', type: 'INTEGER DEFAULT 0' },
  // 「换做法」记录来源菜谱
  { table: 'recipes', column: 'reimaginedFrom', type: 'TEXT' },
  // 社区数据：update() 会自动写 updatedAt，所有社区表都需要这一列
  { table: 'community_posts', column: 'updatedAt', type: 'TEXT' },
  // 社区帖子配图：真实图片 uri（可选，无 uri 时用 emoji+色块占位）
  { table: 'community_posts', column: 'imageUri', type: 'TEXT' },
  { table: 'community_comments', column: 'updatedAt', type: 'TEXT' },
  { table: 'community_photos', column: 'updatedAt', type: 'TEXT' },
  { table: 'community_following', column: 'updatedAt', type: 'TEXT' },
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

/** 表是否存在 */
function tableExists(name) {
  const rows = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`, [name]);
  return rows.length > 0 && rows[0].values.length > 0;
}

/** 表中记录数 */
function countRows(name) {
  const rows = db.exec(`SELECT COUNT(*) FROM "${name}"`);
  return rows.length > 0 ? Number(rows[0].values[0][0]) : 0;
}

/**
 * 启动时自动把遗留 JSON 数据导入 SQLite。
 *
 * 背景：存储层从 JSON 文件迁移到 SQLite 后，老账号存在本地 data/*.json 里，
 * 若只拉新代码不手动跑 node server/migrate.js，新库是空的，老用户登录会提示
 * "邮箱或密码错误"，只能重新注册。这里在启动时自动补齐。
 *
 * 安全性（幂等）：
 * - 仅当对应表为空时才导入，已存在的库不会被旧 JSON 覆盖；
 * - 表有数据则整表跳过，重复启动不会重复导入。
 */
function autoMigrateFromJson() {
  if (!fs.existsSync(DATA_DIR)) return;
  let total = 0;
  const jsonFiles = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
  for (const file of jsonFiles) {
    const tableName = file.replace('.json', '');
    if (!tableExists(tableName)) continue;
    try {
      if (countRows(tableName) > 0) continue; // 表已有数据，不覆盖
      const raw = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
      const data = JSON.parse(raw);
      if (!Array.isArray(data) || data.length === 0) continue;
      for (const record of data) {
        const cols = Object.keys(record);
        const placeholders = cols.map(() => '?').join(',');
        const values = cols.map((c) => {
          const v = record[c];
          return typeof v === 'object' && v !== null ? JSON.stringify(v) : v;
        });
        // OR IGNORE：防止 JSON 内 id/email 撞车
        db.run(
          `INSERT OR IGNORE INTO "${tableName}" (${cols.map((c) => `"${c}"`).join(',')}) VALUES (${placeholders})`,
          values
        );
      }
      total += data.length;
      console.log(`[db] 自动迁移 JSON → SQLite: ${tableName} ${data.length} 条`);
    } catch (error) {
      console.warn(`[db] 自动迁移 ${tableName} 失败:`, error.message);
    }
  }
  if (total > 0) console.log(`[db] 自动迁移完成，共导入 ${total} 条（老数据已保留）`);
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
