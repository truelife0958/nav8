const express = require('express');
const db = require('../db');
const auth = require('./authMiddleware');
const router = express.Router();

// 获取友链
router.get('/', (req, res) => {
  const { page, pageSize } = req.query;
  if (!page && !pageSize) {
    db.all('SELECT * FROM friends', [], (err, rows) => {
      if (err) return res.status(500).json({error: err.message});
      res.json(rows);
    });
  } else {
    const pageNum = parseInt(page) || 1;
    const size = parseInt(pageSize) || 10;
    const offset = (pageNum - 1) * size;
    db.get('SELECT COUNT(*) as total FROM friends', [], (err, countRow) => {
      if (err) return res.status(500).json({error: err.message});
      db.all('SELECT * FROM friends LIMIT ? OFFSET ?', [size, offset], (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        res.json({
          total: countRow.total,
          page: pageNum,
          pageSize: size,
          data: rows
        });
      });
    });
  }
});
// 新增友链
router.post('/', auth, (req, res) => {
  const { title, url, logo } = req.body;
  
  // 输入验证
  if (!title || !url) {
    return res.status(400).json({ error: '请填写网站名和链接' });
  }
  if (typeof title !== 'string' || typeof url !== 'string') {
    return res.status(400).json({ error: '参数格式错误' });
  }
  
  db.run('INSERT INTO friends (title, url, logo) VALUES (?, ?, ?)', [title.trim(), url.trim(), logo || ''], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ id: this.lastID });
  });
});
// 修改友链
router.put('/:id', auth, (req, res) => {
  const { title, url, logo } = req.body;
  
  // 输入验证
  if (!title || !url) {
    return res.status(400).json({ error: '请填写网站名和链接' });
  }
  if (typeof title !== 'string' || typeof url !== 'string') {
    return res.status(400).json({ error: '参数格式错误' });
  }
  
  db.run('UPDATE friends SET title=?, url=?, logo=? WHERE id=?', [title.trim(), url.trim(), logo || '', req.params.id], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ changed: this.changes });
  });
});
// 删除友链
router.delete('/:id', auth, (req, res) => {
  db.run('DELETE FROM friends WHERE id=?', [req.params.id], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ deleted: this.changes });
  });
});

module.exports = router; 