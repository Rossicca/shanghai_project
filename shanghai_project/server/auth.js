/**
 * auth.js — JWT 认证中间件和工具函数
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { config } = require('./config');

const JWT_SECRET = config.jwtSecret;
const ACCESS_TOKEN_EXPIRES = '2h';
const REFRESH_TOKEN_EXPIRES = '7d';

/** 密码加密 */
function hashPassword(password) {
  return bcrypt.hashSync(password, 12);
}

/** 验证密码 */
function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

/** 生成 Access Token */
function generateAccessToken(payload) {
  return jwt.sign({ ...payload, tokenType: 'access' }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
}

/** 生成 Refresh Token */
function generateRefreshToken(payload) {
  return jwt.sign({ ...payload, tokenType: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES });
}

/** 验证 Token */
function verifyToken(token, expectedType) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (expectedType && decoded.tokenType !== expectedType) return null;
    return decoded;
  } catch {
    return null;
  }
}

/** Express 认证中间件 */
function authMiddleware(req, res, next) {
  // 公开路径跳过认证
  const publicPaths = [
    '/api/v1/auth/register',
    '/api/v1/auth/login',
    '/api/v1/auth/refresh',
    '/health',
    '/api/recognize',
    '/api/recipe/generate',
    '/api/workout/recommend',
    '/api/workout/list',
    '/api/workout/categories',
    '/api/v1/workouts/categories',
  ];
  if (publicPaths.includes(req.path) || req.method === 'OPTIONS') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'TOKEN_MISSING', message: '请先登录' },
    });
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token, 'access');
  if (!decoded) {
    return res.status(401).json({
      error: { code: 'TOKEN_INVALID', message: '登录已过期，请重新登录' },
    });
  }

  req.user = decoded;
  next();
}

/** 管理员认证中间件（需在 authMiddleware 之后使用） */
function adminMiddleware(req, res, next) {
  const db = require('./db');
  const user = db.findById('users', req.user.userId);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: '仅管理员可执行此操作' },
    });
  }
  req.userData = user;
  next();
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  authMiddleware,
  adminMiddleware,
};
