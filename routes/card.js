const express = require('express');
const db = require('../db');
const auth = require('./authMiddleware');
const { validateCard, validateIdArray, isPositiveInteger } = require('../utils/validator');
const router = express.Router();

// 获取指定菜单的卡片
router.get('/:menuId', (req, res) => {
  const menuId = req.params.menuId;
  const { subMenuId } = req.query;
  
  // 验证menuId
  if (!isPositiveInteger(menuId)) {
    return res.status(400).json({ error: '无效的菜单ID' });
  }
  
  let query, params;
  
  if (subMenuId) {
    if (!isPositiveInteger(subMenuId)) {
      return res.status(400).json({ error: '无效的子菜单ID' });
    }
    query = 'SELECT * FROM cards WHERE sub_menu_id = ? ORDER BY "order"';
    params = [Number(subMenuId)];
  } else {
    query = 'SELECT * FROM cards WHERE menu_id = ? AND sub_menu_id IS NULL ORDER BY "order"';
    params = [Number(menuId)];
  }
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('获取卡片失败:', err);
      return res.status(500).json({ error: '获取卡片失败' });
    }
    
    const cards = (rows || []).map(card => {
      let display_logo = '/default-favicon.png';
      try {
        if (card.custom_logo_path) {
          display_logo = '/uploads/' + card.custom_logo_path;
        } else if (card.logo_url) {
          display_logo = card.logo_url;
        } else if (card.url) {
          display_logo = card.url.replace(/\/+$/, '') + '/favicon.ico';
        }
      } catch (e) {
        // 保持默认图标
      }
      return { ...card, display_logo };
    });
    
    res.json(cards);
  });
});

// 新增卡片
router.post('/', auth, (req, res) => {
  const validation = validateCard(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  const { menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, order } = validation.data;
  
  db.run(
    'INSERT INTO cards (menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, "desc", "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, order],
    function(err) {
      if (err) {
        console.error('添加卡片失败:', err);
        // 检查是否是唯一约束冲突
        if (err.message && (err.message.includes('UNIQUE') || err.message.includes('unique') || err.message.includes('duplicate'))) {
          return res.status(409).json({ error: '该分类下已存在相同URL的卡片' });
        }
        return res.status(500).json({ error: '添加失败: ' + (err.message || '未知错误') });
      }
      res.json({ id: this.lastID, success: true });
    }
  );
});

// 修改卡片
router.put('/:id', auth, (req, res) => {
  const cardId = req.params.id;
  if (!isPositiveInteger(cardId)) {
    return res.status(400).json({ error: '无效的卡片ID' });
  }
  
  const validation = validateCard(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  const { menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, order } = validation.data;
  
  db.run(
    'UPDATE cards SET menu_id=?, sub_menu_id=?, title=?, url=?, logo_url=?, custom_logo_path=?, "desc"=?, "order"=? WHERE id=?',
    [menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, order, Number(cardId)],
    function(err) {
      if (err) {
        console.error('更新卡片失败:', err);
        // 检查是否是唯一约束冲突
        if (err.message && (err.message.includes('UNIQUE') || err.message.includes('unique') || err.message.includes('duplicate'))) {
          return res.status(409).json({ error: '该分类下已存在相同URL的卡片' });
        }
        return res.status(500).json({ error: '更新失败: ' + (err.message || '未知错误') });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: '卡片不存在' });
      }
      res.json({ changed: this.changes, success: true });
    }
  );
});

// 删除卡片
router.delete('/:id', auth, (req, res) => {
  const cardId = req.params.id;
  if (!isPositiveInteger(cardId)) {
    return res.status(400).json({ error: '无效的卡片ID' });
  }
  
  db.run('DELETE FROM cards WHERE id=?', [Number(cardId)], function(err) {
    if (err) {
      console.error('删除卡片失败:', err);
      return res.status(500).json({ error: '删除失败' });
    }
    res.json({ deleted: this.changes });
  });
});

// 批量删除卡片
router.post('/batch/delete', auth, (req, res) => {
  const validation = validateIdArray(req.body.ids, '卡片');
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  const placeholders = validation.ids.map(() => '?').join(',');
  db.run(`DELETE FROM cards WHERE id IN (${placeholders})`, validation.ids, function(err) {
    if (err) {
      console.error('批量删除卡片失败:', err);
      return res.status(500).json({ error: '删除失败' });
    }
    res.json({ deleted: this.changes });
  });
});

// 批量移动卡片
router.post('/batch/move', auth, (req, res) => {
  const { ids, menu_id, sub_menu_id } = req.body;
  
  const idsValidation = validateIdArray(ids, '卡片');
  if (!idsValidation.valid) {
    return res.status(400).json({ error: idsValidation.error });
  }
  
  if (!isPositiveInteger(menu_id)) {
    return res.status(400).json({ error: '请选择有效的目标菜单' });
  }
  
  const targetSubMenuId = sub_menu_id && isPositiveInteger(sub_menu_id) ? Number(sub_menu_id) : null;
  const placeholders = idsValidation.ids.map(() => '?').join(',');
  
  db.run(
    `UPDATE cards SET menu_id = ?, sub_menu_id = ? WHERE id IN (${placeholders})`,
    [Number(menu_id), targetSubMenuId, ...idsValidation.ids],
    function(err) {
      if (err) {
        console.error('批量移动卡片失败:', err);
        // 检查是否是唯一约束冲突
        if (err.message && (err.message.includes('UNIQUE') || err.message.includes('unique') || err.message.includes('duplicate'))) {
          return res.status(409).json({ error: '目标分类下已存在相同URL的卡片，无法移动' });
        }
        return res.status(500).json({ error: '移动失败: ' + (err.message || '未知错误') });
      }
      res.json({ moved: this.changes, success: true });
    }
  );
});

module.exports = router;
