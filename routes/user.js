const express = require('express');
const bcrypt = require('../utils/bcrypt');
const db = require('../db');
const authMiddleware = require('./authMiddleware');
const config = require('../config');

const router = express.Router();

function requireAdmin(req, res, next) {
  if (req.user?.username !== config.admin.username) {
    return res.status(403).json({ error: '无权限' });
  }
  next();
}

// 获取当前用户信息
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    // 与后台首页展示保持一致：同时返回登录信息
    const user = await db.get(
      'SELECT id, username, last_login_time, last_login_ip FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    // 直接返回用户对象，避免前端出现 response.data.data 的二次解包
    res.json(user);
  } catch (err) {
    console.error('获取用户信息错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取当前用户详细信息（包括登录信息）
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await db.get('SELECT id, username, last_login_time, last_login_ip FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json({
      last_login_time: user.last_login_time,
      last_login_ip: user.last_login_ip
    });
  } catch (err) {
    console.error('获取用户详情错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 修改密码
router.put('/password', authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '请提供旧密码和新密码' });
  }

  if (typeof oldPassword !== 'string' || typeof newPassword !== 'string') {
    return res.status(400).json({ error: '参数格式错误' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: '新密码长度至少6位' });
  }

  try {
    // 验证旧密码
    const user = await db.get('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const isValidPassword = bcrypt.compareSync(oldPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: '旧密码错误' });
    }

    // 更新密码
    const newPasswordHash = bcrypt.hashSync(newPassword, 10);
    await db.run('UPDATE users SET password = ? WHERE id = ?', [newPasswordHash, req.user.id]);
    
    res.json({ message: '密码修改成功' });
  } catch (err) {
    console.error('修改密码错误:', err);
    res.status(500).json({ error: '密码更新失败' });
  }
});

// 获取所有用户（管理员功能）
router.get('/', authMiddleware, requireAdmin, async (req, res) => {
  const { page, pageSize } = req.query;
  
  try {
    if (!page && !pageSize) {
      const users = await db.all('SELECT id, username FROM users');
      res.json({ data: users });
    } else {
      const pageNum = parseInt(page, 10) || 1;
      const size = parseInt(pageSize, 10) || 10;
      const offset = (pageNum - 1) * size;

      const countRow = await db.get('SELECT COUNT(*) as total FROM users');
      const total = typeof countRow?.total === 'string' ? parseInt(countRow.total, 10) : (countRow?.total ?? 0);

      const users = await db.all('SELECT id, username FROM users LIMIT ? OFFSET ?', [size, offset]);
      
      res.json({
        total,
        page: pageNum,
        pageSize: size,
        data: users
      });
    }
  } catch (err) {
    console.error('获取用户列表错误:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
