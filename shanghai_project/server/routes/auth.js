/**
 * 认证路由 — 注册 / 登录 / 刷新 Token
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { hashPassword, verifyPassword, generateAccessToken, generateRefreshToken, verifyToken } = require('../auth');

/**
 * POST /api/v1/auth/register — 注册
 */
router.post('/register', (req, res) => {
  try {
    const { email, password, nickname, gender, birthday } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: { code: 'INVALID_PARAMS', message: '邮箱和密码不能为空' },
      });
    }

    // 检查邮箱是否已注册
    const existing = db.find('users', { email });
    if (existing.length > 0) {
      return res.status(409).json({
        error: { code: 'EMAIL_EXISTS', message: '该邮箱已被注册' },
      });
    }

    const user = db.insert('users', {
      email,
      passwordHash: hashPassword(password),
      nickname: nickname || '健身新人',
      gender: gender || 'male',
      birthday: birthday || null,
      avatarUrl: null,
    });

    const payload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.status(201).json({
      data: {
        userId: user.id,
        email: user.email,
        nickname: user.nickname,
        accessToken,
        refreshToken,
        expiresIn: 7200,
      },
      message: '注册成功',
    });
  } catch (e) {
    console.error('[auth] register error:', e);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    });
  }
});

/**
 * POST /api/v1/auth/login — 登录
 */
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: { code: 'INVALID_PARAMS', message: '请输入邮箱和密码' },
      });
    }

    const users = db.find('users', { email });
    if (users.length === 0) {
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: '邮箱或密码错误' },
      });
    }

    const user = users[0];
    if (!verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: '邮箱或密码错误' },
      });
    }

    const payload = { userId: user.id, email: user.email };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    res.json({
      data: {
        userId: user.id,
        email: user.email,
        nickname: user.nickname,
        accessToken,
        refreshToken,
        expiresIn: 7200,
      },
      message: '登录成功',
    });
  } catch (e) {
    console.error('[auth] login error:', e);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    });
  }
});

/**
 * POST /api/v1/auth/refresh — 刷新 Token
 */
router.post('/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({
        error: { code: 'INVALID_PARAMS', message: '缺少 refreshToken' },
      });
    }

    const decoded = verifyToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({
        error: { code: 'TOKEN_EXPIRED', message: 'Refresh Token 已过期，请重新登录' },
      });
    }

    const user = db.findById('users', decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: { code: 'USER_NOT_FOUND', message: '用户不存在' },
      });
    }

    const payload = { userId: user.id, email: user.email };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    res.json({
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 7200,
      },
    });
  } catch (e) {
    console.error('[auth] refresh error:', e);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    });
  }
});

module.exports = router;