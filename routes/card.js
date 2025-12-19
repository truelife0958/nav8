const express = require('express');
const db = require('../db');
const auth = require('./authMiddleware');
const router = express.Router();

// 获取指定菜单的卡片
router.get('/:menuId', (req, res) => {
  const { subMenuId } = req.query;
  let query, params;
  
  if (subMenuId) {
    // 获取指定子菜单的卡片
    query = 'SELECT * FROM cards WHERE sub_menu_id = ? ORDER BY "order"';
    params = [subMenuId];
  } else {
    // 获取主菜单的卡片（不包含子菜单的卡片）
    query = 'SELECT * FROM cards WHERE menu_id = ? AND sub_menu_id IS NULL ORDER BY "order"';
    params = [req.params.menuId];
  }
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    rows.forEach(card => {
      if (!card.custom_logo_path) {
        card.display_logo = card.logo_url || (card.url.replace(/\/+$/, '') + '/favicon.ico');
      } else {
        card.display_logo = '/uploads/' + card.custom_logo_path;
      }
    });
    res.json(rows);
  });
});

// 新增、修改、删除卡片需认证
router.post('/', auth, (req, res) => {
  const { menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, order } = req.body;
  
  // 输入验证
  if (!menu_id || !title || !url) {
    return res.status(400).json({ error: '请填写菜单、标题和链接' });
  }
  if (typeof title !== 'string' || typeof url !== 'string') {
    return res.status(400).json({ error: '参数格式错误' });
  }
  
  db.run('INSERT INTO cards (menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [menu_id, sub_menu_id || null, title.trim(), url.trim(), logo_url || '', custom_logo_path || '', desc || '', order || 0], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ id: this.lastID });
  });
});

router.put('/:id', auth, (req, res) => {
  const { menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, order } = req.body;
  
  // 输入验证
  if (!menu_id || !title || !url) {
    return res.status(400).json({ error: '请填写菜单、标题和链接' });
  }
  if (typeof title !== 'string' || typeof url !== 'string') {
    return res.status(400).json({ error: '参数格式错误' });
  }
  
  db.run('UPDATE cards SET menu_id=?, sub_menu_id=?, title=?, url=?, logo_url=?, custom_logo_path=?, desc=?, "order"=? WHERE id=?',
    [menu_id, sub_menu_id || null, title.trim(), url.trim(), logo_url || '', custom_logo_path || '', desc || '', order || 0, req.params.id], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ changed: this.changes });
  });
});

router.delete('/:id', auth, (req, res) => {
  db.run('DELETE FROM cards WHERE id=?', [req.params.id], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ deleted: this.changes });
  });
});

// 批量删除卡片
router.post('/batch/delete', auth, (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: '请选择要删除的卡片' });
  }
  const placeholders = ids.map(() => '?').join(',');
  db.run(`DELETE FROM cards WHERE id IN (${placeholders})`, ids, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// 批量移动卡片
router.post('/batch/move', auth, (req, res) => {
  const { ids, menu_id, sub_menu_id } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: '请选择要移动的卡片' });
  }
  if (!menu_id) {
    return res.status(400).json({ error: '请选择目标菜单' });
  }
  const placeholders = ids.map(() => '?').join(',');
  db.run(`UPDATE cards SET menu_id = ?, sub_menu_id = ? WHERE id IN (${placeholders})`,
    [menu_id, sub_menu_id || null, ...ids], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ moved: this.changes });
  });
});

module.exports = router;