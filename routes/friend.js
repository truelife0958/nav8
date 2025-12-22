const express = require('express');
const db = require('../db');
const auth = require('./authMiddleware');
const { validateFriend, isPositiveInteger } = require('../utils/validator');
const router = express.Router();

// 获取友链
router.get('/', async (req, res) => {
  const { page, pageSize } = req.query;
  
  try {
    if (!page && !pageSize) {
      const rows = await db.all('SELECT * FROM friends');
      res.json(rows || []);
    } else {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const size = Math.min(100, Math.max(1, parseInt(pageSize) || 10));
      const offset = (pageNum - 1) * size;
      
      const countRow = await db.get('SELECT COUNT(*) as total FROM friends');
      const total = countRow?.total || 0;
      
      const rows = await db.all('SELECT * FROM friends LIMIT ? OFFSET ?', [size, offset]);
      
      res.json({
        total: total,
        page: pageNum,
        pageSize: size,
        data: rows || []
      });
    }
  } catch (err) {
    console.error('获取友链失败:', err);
    res.status(500).json({ error: '获取友链失败' });
  }
});

// 新增友链
router.post('/', auth, async (req, res) => {
  const validation = validateFriend(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  const { title, url, logo } = validation.data;
  
  try {
    const result = await db.run('INSERT INTO friends (title, url, logo) VALUES (?, ?, ?)', [title, url, logo]);
    res.json({ id: result.lastID });
  } catch (err) {
    console.error('添加友链失败:', err);
    res.status(500).json({ error: '添加失败' });
  }
});

// 修改友链
router.put('/:id', auth, async (req, res) => {
  const friendId = req.params.id;
  if (!isPositiveInteger(friendId)) {
    return res.status(400).json({ error: '无效的友链ID' });
  }
  
  const validation = validateFriend(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  const { title, url, logo } = validation.data;
  
  try {
    const result = await db.run('UPDATE friends SET title=?, url=?, logo=? WHERE id=?', [title, url, logo, Number(friendId)]);
    if (result.changes === 0) {
      return res.status(404).json({ error: '友链不存在' });
    }
    res.json({ changed: result.changes });
  } catch (err) {
    console.error('更新友链失败:', err);
    res.status(500).json({ error: '更新失败' });
  }
});

// 删除友链
router.delete('/:id', auth, async (req, res) => {
  const friendId = req.params.id;
  if (!isPositiveInteger(friendId)) {
    return res.status(400).json({ error: '无效的友链ID' });
  }
  
  try {
    const result = await db.run('DELETE FROM friends WHERE id=?', [Number(friendId)]);
    res.json({ deleted: result.changes });
  } catch (err) {
    console.error('删除友链失败:', err);
    res.status(500).json({ error: '删除失败' });
  }
});

module.exports = router;
