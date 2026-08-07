/**
 * migrate.js — 将 JSON 文件数据迁移到 SQLite
 * 运行：node server/migrate.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

async function migrate() {
  console.log('🔄 开始迁移 JSON 数据到 SQLite...\n');

  const { getDb, readCollection, writeCollection, insert, exec } = require('./db');

  // 初始化数据库
  await getDb();
  console.log('✅ SQLite 数据库已初始化\n');

  const jsonFiles = fs.readdirSync(DATA_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'shanghai.db');

  let totalRecords = 0;

  for (const file of jsonFiles) {
    const collectionName = file.replace('.json', '');
    const filePath = path.join(DATA_DIR, file);

    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(raw);

      if (!Array.isArray(data) || data.length === 0) {
        console.log(`  ⏭️  ${collectionName}: 空文件，跳过`);
        continue;
      }

      // 清空已有数据（避免重复迁移）
      try { exec(`DELETE FROM "${collectionName}"`); } catch {}

      // 逐条插入
      for (const record of data) {
        insert(collectionName, record);
      }

      totalRecords += data.length;
      console.log(`  ✅ ${collectionName}: ${data.length} 条记录`);
    } catch (e) {
      console.error(`  ❌ ${collectionName}: 迁移失败 - ${e.message}`);
    }
  }

  console.log(`\n🎉 迁移完成！共导入 ${totalRecords} 条记录`);
  console.log(`📁 数据库文件: ${path.join(DATA_DIR, 'shanghai.db')}`);
}

migrate().catch(console.error);