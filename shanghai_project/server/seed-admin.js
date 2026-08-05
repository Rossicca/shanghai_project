/**
 * seed-admin.js — 创建管理员账号
 * 运行：node server/seed-admin.js
 */

const db = require('./db');
const { hashPassword } = require('./auth');

const ADMIN_EMAIL = 'admin@shanghai.app';
const ADMIN_PASSWORD = 'admin123456';
const ADMIN_NICKNAME = '管理员';

async function seed() {
  const { getDb } = db;
  await getDb();

  const existing = db.find('users', { email: ADMIN_EMAIL });
  if (existing.length > 0) {
    // 更新为管理员角色
    db.update('users', existing[0].id, { role: 'admin', nickname: ADMIN_NICKNAME });
    console.log(`✅ 管理员账号已更新: ${ADMIN_EMAIL}`);
    console.log(`   密码: ${ADMIN_PASSWORD}`);
    return;
  }

  db.insert('users', {
    email: ADMIN_EMAIL,
    passwordHash: hashPassword(ADMIN_PASSWORD),
    nickname: ADMIN_NICKNAME,
    role: 'admin',
    gender: 'male',
  });

  console.log(`✅ 管理员账号已创建: ${ADMIN_EMAIL}`);
  console.log(`   密码: ${ADMIN_PASSWORD}`);
  console.log(`   请登录后访问个人中心 → 管理后台`);
}

seed().catch(console.error);