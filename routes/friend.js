const express = require('express');
const db = require('../db');
const auth = require('./authMiddleware');
const { validateFriend, isPositiveInteger } = require('../utils/validator');
const router = express.Router();

// 获取友链
router.get('/', (req, res) => {
  const { page, pageSize } = req.query;
  
  if (!page && !pageSize) {
    db.all('SELECT * FROM friends', [], (err, rows) => {
      if (err) {
        console.error('获取友链失败:', err);
        return res.status(500).json({ error: '获取友链失败' });
      }
      res.json(rows || []);
    });
  } else {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const size = Math.min(100, Math.max(1, parseInt(pageSize) || 10));
    const offset = (pageNum - 1) * size;
    
    db.get('SELECT COUNT(*) as total FROM friends', [], (err, countRow) => {
      if (err) {
        console.error('获取友链数量失败:', err);
        return res.status(500).json({ error: '获取友链失败' });
      }
      
      db.all('SELECT * FROM friends LIMIT ? OFFSET ?', [size, offset], (err, rows) => {
        if (err) {
          console.error('获取友链列表失败:', err);
          return res.status(500).json({ error: '获取友链失败' });
        }
        res.json({
          total: countRow?.total || 0,
          page: pageNum,
          pageSize: size,
          data: rows || []
        });
      });
    });
  }
});

// 新增友链
router.post('/', auth, (req, res) => {
  const validation = validateFriend(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  const { title, url, logo } = validation.data;
  
  db.run('INSERT INTO friends (title, url, logo) VALUES (?, ?, ?)', [title, url, logo], function(err) {
    if (err) {
      console.error('添加友链失败:', err);
      return res.status(500).json({ error: '添加失败' });
    }
    res.json({ id: this.lastID });
  });
});

// 修改友链
router.put('/:id', auth, (req, res) => {
  const friendId = req.params.id;
  if (!isPositiveInteger(friendId)) {
    return res.status(400).json({ error: '无效的友链ID' });
  }
  
  const validation = validateFriend(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  const { title, url, logo } = validation.data;
  
  db.run('UPDATE friends SET title=?, url=?, logo=? WHERE id=?', [title, url, logo, Number(friendId)], function(err) {
    if (err) {
      console.error('更新友链失败:', err);
      return res.status(500).json({ error: '更新失败' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '友链不存在' });
    }
    res.json({ changed: this.changes });
  });
});

// 删除友链
router.delete('/:id', auth, (req, res) => {
  const friendId = req.params.id;
  if (!isPositiveInteger(friendId)) {
    return res.status(400).json({ error: '无效的友链ID' });
  }
  
  db.run('DELETE FROM friends WHERE id=?', [Number(friendId)], function(err) {
    if (err) {
      console.error('删除友链失败:', err);
      return res.status(500).json({ error: '删除失败' });
    }
    res.json({ deleted: this.changes });
  });
});

module.exports = router;