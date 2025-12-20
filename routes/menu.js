const express = require('express');
const db = require('../db');
const auth = require('./authMiddleware');
const { validateMenuName, isPositiveInteger, isNonNegativeInteger } = require('../utils/validator');
const router = express.Router();

// 获取所有菜单（包含子菜单）
router.get('/', (req, res) => {
  const { page, pageSize } = req.query;
  
  if (!page && !pageSize) {
    db.all('SELECT * FROM menus ORDER BY "order"', [], (err, menus) => {
      if (err) {
        console.error('获取菜单失败:', err);
        return res.status(500).json({ error: '获取菜单失败' });
      }
      
      if (!menus || menus.length === 0) {
        return res.json([]);
      }
      
      const getSubMenus = (menu) => {
        return new Promise((resolve, reject) => {
          db.all('SELECT * FROM sub_menus WHERE parent_id = ? ORDER BY "order"', [menu.id], (err, subMenus) => {
            if (err) reject(err);
            else resolve(subMenus || []);
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
        console.error('处理菜单数据失败:', err);
        res.status(500).json({ error: '获取菜单失败' });
      });
    });
  } else {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const size = Math.min(100, Math.max(1, parseInt(pageSize) || 10));
    const offset = (pageNum - 1) * size;
    
    db.get('SELECT COUNT(*) as total FROM menus', [], (err, countRow) => {
      if (err) {
        console.error('获取菜单数量失败:', err);
        return res.status(500).json({ error: '获取菜单失败' });
      }
      
      db.all('SELECT * FROM menus ORDER BY "order" LIMIT ? OFFSET ?', [size, offset], (err, rows) => {
        if (err) {
          console.error('获取菜单列表失败:', err);
          return res.status(500).json({ error: '获取菜单失败' });
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

// 获取指定菜单的子菜单
router.get('/:id/submenus', (req, res) => {
  const menuId = req.params.id;
  if (!isPositiveInteger(menuId)) {
    return res.status(400).json({ error: '无效的菜单ID' });
  }
  
  db.all('SELECT * FROM sub_menus WHERE parent_id = ? ORDER BY "order"', [Number(menuId)], (err, rows) => {
    if (err) {
      console.error('获取子菜单失败:', err);
      return res.status(500).json({ error: '获取子菜单失败' });
    }
    res.json(rows || []);
  });
});

// 新增菜单
router.post('/', auth, (req, res) => {
  const validation = validateMenuName(req.body.name);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  const order = isNonNegativeInteger(req.body.order) ? Number(req.body.order) : 0;
  
  db.run('INSERT INTO menus (name, "order") VALUES (?, ?)', [validation.value, order], function(err) {
    if (err) {
      console.error('添加菜单失败:', err);
      return res.status(500).json({ error: '添加失败' });
    }
    res.json({ id: this.lastID });
  });
});

// 修改菜单
router.put('/:id', auth, (req, res) => {
  const menuId = req.params.id;
  if (!isPositiveInteger(menuId)) {
    return res.status(400).json({ error: '无效的菜单ID' });
  }
  
  const validation = validateMenuName(req.body.name);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  const order = isNonNegativeInteger(req.body.order) ? Number(req.body.order) : 0;
  
  db.run('UPDATE menus SET name=?, "order"=? WHERE id=?', [validation.value, order, Number(menuId)], function(err) {
    if (err) {
      console.error('更新菜单失败:', err);
      return res.status(500).json({ error: '更新失败' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '菜单不存在' });
    }
    res.json({ changed: this.changes });
  });
});

// 删除菜单
router.delete('/:id', auth, (req, res) => {
  const menuId = req.params.id;
  if (!isPositiveInteger(menuId)) {
    return res.status(400).json({ error: '无效的菜单ID' });
  }
  
  const id = Number(menuId);
  
  const deleteCards = () => new Promise((resolve, reject) => {
    db.run('DELETE FROM cards WHERE menu_id = ?', [id], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  
  const deleteSubMenuCards = () => new Promise((resolve, reject) => {
    db.run('DELETE FROM cards WHERE sub_menu_id IN (SELECT id FROM sub_menus WHERE parent_id = ?)', [id], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  
  const deleteSubMenus = () => new Promise((resolve, reject) => {
    db.run('DELETE FROM sub_menus WHERE parent_id = ?', [id], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  
  const deleteMenu = () => new Promise((resolve, reject) => {
    db.run('DELETE FROM menus WHERE id = ?', [id], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
  
  deleteCards()
    .then(deleteSubMenuCards)
    .then(deleteSubMenus)
    .then(deleteMenu)
    .then(changes => res.json({ deleted: changes }))
    .catch(err => {
      console.error('删除菜单失败:', err);
      res.status(500).json({ error: '删除失败' });
    });
});

// 新增子菜单
router.post('/:id/submenus', auth, (req, res) => {
  const parentId = req.params.id;
  if (!isPositiveInteger(parentId)) {
    return res.status(400).json({ error: '无效的菜单ID' });
  }
  
  const validation = validateMenuName(req.body.name);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  const order = isNonNegativeInteger(req.body.order) ? Number(req.body.order) : 0;
  
  db.run('INSERT INTO sub_menus (parent_id, name, "order") VALUES (?, ?, ?)',
    [Number(parentId), validation.value, order], function(err) {
    if (err) {
      console.error('添加子菜单失败:', err);
      return res.status(500).json({ error: '添加失败' });
    }
    res.json({ id: this.lastID });
  });
});

// 修改子菜单
router.put('/submenus/:id', auth, (req, res) => {
  const subMenuId = req.params.id;
  if (!isPositiveInteger(subMenuId)) {
    return res.status(400).json({ error: '无效的子菜单ID' });
  }
  
  const validation = validateMenuName(req.body.name);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  const order = isNonNegativeInteger(req.body.order) ? Number(req.body.order) : 0;
  
  db.run('UPDATE sub_menus SET name=?, "order"=? WHERE id=?', [validation.value, order, Number(subMenuId)], function(err) {
    if (err) {
      console.error('更新子菜单失败:', err);
      return res.status(500).json({ error: '更新失败' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: '子菜单不存在' });
    }
    res.json({ changed: this.changes });
  });
});

// 删除子菜单
router.delete('/submenus/:id', auth, (req, res) => {
  const subMenuId = req.params.id;
  if (!isPositiveInteger(subMenuId)) {
    return res.status(400).json({ error: '无效的子菜单ID' });
  }
  
  const id = Number(subMenuId);
  
  new Promise((resolve, reject) => {
    db.run('DELETE FROM cards WHERE sub_menu_id = ?', [id], (err) => {
      if (err) reject(err);
      else resolve();
    });
  })
  .then(() => new Promise((resolve, reject) => {
    db.run('DELETE FROM sub_menus WHERE id = ?', [id], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  }))
  .then(changes => res.json({ deleted: changes }))
  .catch(err => {
    console.error('删除子菜单失败:', err);
    res.status(500).json({ error: '删除失败' });
  });
});

module.exports = router;