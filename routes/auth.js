const express = require('express');
const db = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('../utils/bcrypt');
const config = require('../config');
const router = express.Router();

const JWT_SECRET = config.server.jwtSecret;

function getClientIp(req) {
  let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '';
  if (typeof ip === 'string' && ip.includes(',')) ip = ip.split(',')[0].trim();
  if (typeof ip === 'string' && ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
  return ip;
}

function getShanghaiTime() {
  const date = new Date();
  // 获取上海时区时间
  const shanghaiTime = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Shanghai"}));
  
  // 格式化为 YYYY-MM-DD HH:mm:ss
  const year = shanghaiTime.getFullYear();
  const month = String(shanghaiTime.getMonth() + 1).padStart(2, '0');
  const day = String(shanghaiTime.getDate()).padStart(2, '0');
  const hours = String(shanghaiTime.getHours()).padStart(2, '0');
  const minutes = String(shanghaiTime.getMinutes()).padStart(2, '0');
  const seconds = String(shanghaiTime.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // 输入验证
  if (!username || !password) {
    return res.status(400).json({ error: '请输入用户名和密码', message: '请输入用户名和密码' });
  }
  
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: '参数格式错误', message: '参数格式错误' });
  }
  
  db.get('SELECT * FROM users WHERE username=?', [username.trim()], (err, user) => {
    if (err) {
      console.error('数据库查询错误:', err);
      return res.status(500).json({ error: '服务器错误', message: '服务器错误' });
    }
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误', message: '用户名或密码错误' });
    }
    
    bcrypt.compare(password, user.password, (err, result) => {
      if (err) {
        console.error('密码验证错误:', err);
        return res.status(500).json({ error: '服务器错误', message: '服务器错误' });
      }
      
      if (result) {
        // 记录上次登录时间和IP
        const lastLoginTime = user.last_login_time;
        const lastLoginIp = user.last_login_ip;
        // 更新为本次登录（上海时间）
        const now = getShanghaiTime();
        const ip = getClientIp(req);
        db.run('UPDATE users SET last_login_time=?, last_login_ip=? WHERE id=?', [now, ip, user.id]);
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '2h' });
        res.json({ token, lastLoginTime, lastLoginIp });
      } else {
        res.status(401).json({ error: '用户名或密码错误', message: '用户名或密码错误' });
      }
    });
  });
});

module.exports = router;