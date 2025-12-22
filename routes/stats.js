const express = require('express');
const db = require('../db');
const auth = require('./authMiddleware');
const router = express.Router();

// 获取今日日期 YYYY-MM-DD
function getToday() {
  return new Date().toISOString().split('T')[0];
}

// 记录访问（公开接口）
router.post('/visit', async (req, res) => {
  const today = getToday();
  const visitorId = req.headers['x-visitor-id'] || req.ip;
  
  try {
    // 检查今日记录是否存在
    let record = await db.get('SELECT * FROM visits WHERE date = ?', [today]);
    
    if (!record) {
      await db.run('INSERT INTO visits (date, pv, uv) VALUES (?, 1, 1)', [today]);
    } else {
      // 使用简单的 cookie/header 判断是否新访客
      const isNewVisitor = req.cookies?.visited !== today;
      await db.run(
        'UPDATE visits SET pv = pv + 1, uv = uv + ? WHERE date = ?',
        [isNewVisitor ? 1 : 0, today]
      );
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('记录访问失败:', err);
    res.status(500).json({ error: '记录失败' });
  }
});

// 获取统计数据（需要登录）
router.get('/summary', auth, async (req, res) => {
  try {
    const today = getToday();
    
    // 今日数据
    const todayStats = await db.get('SELECT pv, uv FROM visits WHERE date = ?', [today]) || { pv: 0, uv: 0 };
    
    // 总计数据
    const totalStats = await db.get('SELECT SUM(pv) as totalPv, SUM(uv) as totalUv FROM visits') || { totalPv: 0, totalUv: 0 };
    
    // 最近7天数据
    const weekData = await db.all(
      `SELECT date, pv, uv FROM visits WHERE date >= date('now', '-7 days') ORDER BY date DESC`
    ) || [];
    
    // 卡片总数
    const cardCount = await db.get('SELECT COUNT(*) as count FROM cards') || { count: 0 };
    
    res.json({
      today: { pv: todayStats.pv || 0, uv: todayStats.uv || 0 },
      total: { pv: totalStats.totalPv || 0, uv: totalStats.totalUv || 0 },
      weekData,
      cardCount: cardCount.count || 0
    });
  } catch (err) {
    console.error('获取统计失败:', err);
    res.status(500).json({ error: '获取统计失败' });
  }
});

module.exports = router;