const express = require('express');
const db = require('../db');
const auth = require('./authMiddleware');
const router = express.Router();

// Get today's date YYYY-MM-DD
function getToday() {
  return new Date().toISOString().split('T')[0];
}

// Get date N days ago YYYY-MM-DD
function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

// Record card click (public API)
router.post('/click/:cardId', async (req, res) => {
  const cardId = parseInt(req.params.cardId);
  if (!cardId || isNaN(cardId)) {
    return res.status(400).json({ error: '无效的卡片ID' });
  }

  try {
    // Check if record exists
    const record = await db.get('SELECT * FROM card_clicks WHERE card_id = ?', [cardId]);

    if (!record) {
      await db.run('INSERT INTO card_clicks (card_id, clicks) VALUES (?, 1)', [cardId]);
    } else {
      await db.run('UPDATE card_clicks SET clicks = clicks + 1 WHERE card_id = ?', [cardId]);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('记录点击失败:', err);
    res.status(500).json({ error: '记录失败' });
  }
});

// Get click ranking (requires auth)
router.get('/clicks/ranking', auth, async (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

  try {
    const ranking = await db.all(`
      SELECT c.id, c.title, c.url, c.logo_url, c.custom_logo_path, cc.clicks
      FROM card_clicks cc
      JOIN cards c ON cc.card_id = c.id
      ORDER BY cc.clicks DESC
      LIMIT ?
    `, [limit]);

    res.json(ranking || []);
  } catch (err) {
    console.error('获取点击排行失败:', err);
    res.status(500).json({ error: '获取排行失败' });
  }
});

// Record visit (public API)
router.post('/visit', async (req, res) => {
  const today = getToday();

  try {
    // Check if today's record exists
    let record = await db.get('SELECT * FROM visits WHERE date = ?', [today]);

    // Check if this is a new visitor using cookie
    // req.cookies is now available thanks to cookie-parser middleware
    const lastVisitDate = req.cookies?.nav8_visited;
    const isNewVisitor = lastVisitDate !== today;

    if (!record) {
      await db.run('INSERT INTO visits (date, pv, uv) VALUES (?, 1, 1)', [today]);
    } else {
      await db.run(
        'UPDATE visits SET pv = pv + 1, uv = uv + ? WHERE date = ?',
        [isNewVisitor ? 1 : 0, today]
      );
    }

    // Set cookie to track visitor for UV calculation
    // Cookie expires at end of day (midnight)
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    res.cookie('nav8_visited', today, {
      expires: endOfDay,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });

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
    
    // 最近7天数据 (用JS算日期，兼容SQLite和PostgreSQL)
    const weekAgo = getDateDaysAgo(7);
    const weekData = await db.all(
      `SELECT date, pv, uv FROM visits WHERE date >= ? ORDER BY date DESC`,
      [weekAgo]
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