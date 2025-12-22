const express = require('express');
const db = require('../db');
const auth = require('./authMiddleware');
const { validateAd, isPositiveInteger } = require('../utils/validator');
const router = express.Router();

// 获取广告
router.get('/', async (req, res) => {
  const { page, pageSize } = req.query;
  
  try {
    if (!page && !pageSize) {
      const rows = await db.all('SELECT * FROM ads');
      res.json(rows || []);
    } else {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const size = Math.min(100, Math.max(1, parseInt(pageSize) || 10));
      const offset = (pageNum - 1) * size;
      
      const countRow = await db.get('SELECT COUNT(*) as total FROM ads');
      const total = countRow?.total || 0;
      
      const rows = await db.all('SELECT * FROM ads LIMIT ? OFFSET ?', [size, offset]);
      
      res.json({
        total: total,
        page: pageNum,
        pageSize: size,
        data: rows || []
      });
    }
  } catch (err) {
    console.error('获取广告失败:', err);
    res.status(500).json({ error: '获取广告失败' });
  }
});

// 新增广告
router.post('/', auth, async (req, res) => {
  const validation = validateAd(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  const { position, img, url } = validation.data;
  
  try {
    const result = await db.run('INSERT INTO ads (position, img, url) VALUES (?, ?, ?)', [position, img, url]);
    res.json({ id: result.lastID });
  } catch (err) {
    console.error('添加广告失败:', err);
    res.status(500).json({ error: '添加失败' });
  }
});

// 修改广告
router.put('/:id', auth, async (req, res) => {
  const adId = req.params.id;
  if (!isPositiveInteger(adId)) {
    return res.status(400).json({ error: '无效的广告ID' });
  }
  
  const validation = validateAd(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  const { position, img, url } = validation.data;
  
  try {
    const result = await db.run('UPDATE ads SET position=?, img=?, url=? WHERE id=?', [position, img, url, Number(adId)]);
    if (result.changes === 0) {
      return res.status(404).json({ error: '广告不存在' });
    }
    res.json({ changed: result.changes });
  } catch (err) {
    console.error('更新广告失败:', err);
    res.status(500).json({ error: '更新失败' });
  }
});

// 删除广告
router.delete('/:id', auth, async (req, res) => {
  const adId = req.params.id;
  if (!isPositiveInteger(adId)) {
    return res.status(400).json({ error: '无效的广告ID' });
  }
  
  try {
    const result = await db.run('DELETE FROM ads WHERE id=?', [Number(adId)]);
    res.json({ deleted: result.changes });
  } catch (err) {
    console.error('删除广告失败:', err);
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;
