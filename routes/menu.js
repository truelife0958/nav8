const express = require('express');
const db = require('../db');
const auth = require('./authMiddleware');
const router = express.Router();

// 获取所有菜单（包含子菜单）
router.get('/', (req, res) => {
  const { page, pageSize } = req.query;
  if (!page && !pageSize) {
    // 获取主菜单
    db.all('SELECT * FROM menus ORDER BY "order"', [], (err, menus) => {
      if (err) return res.status(500).json({error: err.message});
      
      // 为每个主菜单获取子菜单
      const getSubMenus = (menu) => {
        return new Promise((resolve, reject) => {
          db.all('SELECT * FROM sub_menus WHERE parent_id = ? ORDER BY "order"', [menu.id], (err, subMenus) => {
            if (err) reject(err);
            else resolve(subMenus);
          });
        });
      };
      
      Promise.all(menus.map(async (menu) => {
        try {
          const subMenus = await getSubMenus(menu);
          return { ...menu, subMenus };
        } catch (err) {
          console.error('获取子菜单失败:', err);
          return { ...menu, subMenus: [] };
        }
      })).then(menusWithSubMenus => {
        res.json(menusWithSubMenus);
      }).catch(err => {
        res.status(500).json({error: err.message});
      });
    });
  } else {
    const pageNum = parseInt(page) || 1;
    const size = parseInt(pageSize) || 10;
    const offset = (pageNum - 1) * size;
    db.get('SELECT COUNT(*) as total FROM menus', [], (err, countRow) => {
      if (err) return res.status(500).json({error: err.message});
      db.all('SELECT * FROM menus ORDER BY "order" LIMIT ? OFFSET ?', [size, offset], (err, rows) => {
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

// 获取指定菜单的子菜单
router.get('/:id/submenus', (req, res) => {
  db.all('SELECT * FROM sub_menus WHERE parent_id = ? ORDER BY "order"', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({error: err.message});
    res.json(rows);
  });
});

// 新增、修改、删除菜单需认证
router.post('/', auth, (req, res) => {
  const { name, order } = req.body;
  
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: '请填写菜单名称' });
  }
  
  db.run('INSERT INTO menus (name, "order") VALUES (?, ?)', [name.trim(), order || 0], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ id: this.lastID });
  });
});

router.put('/:id', auth, (req, res) => {
  const { name, order } = req.body;
  
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: '请填写菜单名称' });
  }
  
  db.run('UPDATE menus SET name=?, "order"=? WHERE id=?', [name.trim(), order || 0, req.params.id], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ changed: this.changes });
  });
});

router.delete('/:id', auth, (req, res) => {
  const menuId = req.params.id;
  // 先删除关联的卡片和子菜单
  db.serialize(() => {
    db.run('DELETE FROM cards WHERE menu_id = ?', [menuId]);
    db.run('DELETE FROM cards WHERE sub_menu_id IN (SELECT id FROM sub_menus WHERE parent_id = ?)', [menuId]);
    db.run('DELETE FROM sub_menus WHERE parent_id = ?', [menuId]);
    db.run('DELETE FROM menus WHERE id = ?', [menuId], function(err) {
      if (err) return res.status(500).json({ error: '删除失败' });
      res.json({ deleted: this.changes });
    });
  });
});

// 子菜单相关API
router.post('/:id/submenus', auth, (req, res) => {
  const { name, order } = req.body;
  
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: '请填写子菜单名称' });
  }
  
  db.run('INSERT INTO sub_menus (parent_id, name, "order") VALUES (?, ?, ?)',
    [req.params.id, name.trim(), order || 0], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ id: this.lastID });
  });
});

router.put('/submenus/:id', auth, (req, res) => {
  const { name, order } = req.body;
  
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: '请填写子菜单名称' });
  }
  
  db.run('UPDATE sub_menus SET name=?, "order"=? WHERE id=?', [name.trim(), order || 0, req.params.id], function(err) {
    if (err) return res.status(500).json({error: err.message});
    res.json({ changed: this.changes });
  });
});

router.delete('/submenus/:id', auth, (req, res) => {
  const subMenuId = req.params.id;
  // 先删除关联的卡片
  db.serialize(() => {
    db.run('DELETE FROM cards WHERE sub_menu_id = ?', [subMenuId]);
    db.run('DELETE FROM sub_menus WHERE id = ?', [subMenuId], function(err) {
      if (err) return res.status(500).json({ error: '删除失败' });
      res.json({ deleted: this.changes });
    });
  });
});

module.exports = router; 