const express = require('express');
const db = require('../db');
const auth = require('./authMiddleware');
const { validateMenuName, isPositiveInteger, isNonNegativeInteger } = require('../utils/validator');
const router = express.Router();

// 获取所有菜单（包含子菜单）
router.get('/', async (req, res) => {
  const { page, pageSize } = req.query;

  try {
    if (!page && !pageSize) {
      const menus = await db.all('SELECT * FROM menus ORDER BY "order"');
      if (!menus || menus.length === 0) return res.json([]);

      const menusWithSubMenus = await Promise.all(
        menus.map(async (menu) => {
          try {
            const subMenus = await db.all(
              'SELECT * FROM sub_menus WHERE parent_id = ? ORDER BY "order"',
              [menu.id]
            );
            return { ...menu, subMenus: subMenus || [] };
          } catch (err) {
            console.error('获取子菜单失败:', err);
            return { ...menu, subMenus: [] };
          }
        })
      );

      return res.json(menusWithSubMenus);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 10));
    const offset = (pageNum - 1) * size;

    const countRow = await db.get('SELECT COUNT(*) as total FROM menus');
    const total = typeof countRow?.total === 'string' ? parseInt(countRow.total, 10) : (countRow?.total ?? 0);

    const rows = await db.all('SELECT * FROM menus ORDER BY "order" LIMIT ? OFFSET ?', [size, offset]);
    return res.json({
      total,
      page: pageNum,
      pageSize: size,
      data: rows || []
    });
  } catch (err) {
    console.error('获取菜单失败:', err);
    return res.status(500).json({ error: '获取菜单失败' });
  }
});

// 获取指定菜单的子菜单
router.get('/:id/submenus', async (req, res) => {
  const menuId = req.params.id;
  if (!isPositiveInteger(menuId)) {
    return res.status(400).json({ error: '无效的菜单ID' });
  }

  try {
    const rows = await db.all('SELECT * FROM sub_menus WHERE parent_id = ? ORDER BY "order"', [Number(menuId)]);
    return res.json(rows || []);
  } catch (err) {
    console.error('获取子菜单失败:', err);
    return res.status(500).json({ error: '获取子菜单失败' });
  }
});

// 新增菜单
router.post('/', auth, async (req, res) => {
  const validation = validateMenuName(req.body.name);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const order = isNonNegativeInteger(req.body.order) ? Number(req.body.order) : 0;

  try {
    const result = await db.run('INSERT INTO menus (name, "order") VALUES (?, ?)', [validation.value, order]);
    return res.json({ id: result.lastID });
  } catch (err) {
    console.error('添加菜单失败:', err);
    return res.status(500).json({ error: '添加失败' });
  }
});

// 修改菜单
router.put('/:id', auth, async (req, res) => {
  const menuId = req.params.id;
  if (!isPositiveInteger(menuId)) {
    return res.status(400).json({ error: '无效的菜单ID' });
  }

  const validation = validateMenuName(req.body.name);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const order = isNonNegativeInteger(req.body.order) ? Number(req.body.order) : 0;

  try {
    const result = await db.run('UPDATE menus SET name=?, "order"=? WHERE id=?', [
      validation.value,
      order,
      Number(menuId)
    ]);

    if (result.changes === 0) {
      return res.status(404).json({ error: '菜单不存在' });
    }

    return res.json({ changed: result.changes });
  } catch (err) {
    console.error('更新菜单失败:', err);
    return res.status(500).json({ error: '更新失败' });
  }
});

// 删除菜单
router.delete('/:id', auth, async (req, res) => {
  const menuId = req.params.id;
  if (!isPositiveInteger(menuId)) {
    return res.status(400).json({ error: '无效的菜单ID' });
  }

  const id = Number(menuId);

  try {
    await db.run('DELETE FROM cards WHERE menu_id = ?', [id]);
    await db.run(
      'DELETE FROM cards WHERE sub_menu_id IN (SELECT id FROM sub_menus WHERE parent_id = ?)',
      [id]
    );
    await db.run('DELETE FROM sub_menus WHERE parent_id = ?', [id]);

    const result = await db.run('DELETE FROM menus WHERE id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: '菜单不存在' });
    }

    return res.json({ deleted: result.changes });
  } catch (err) {
    console.error('删除菜单失败:', err);
    return res.status(500).json({ error: '删除失败' });
  }
});

// 新增子菜单
router.post('/:id/submenus', auth, async (req, res) => {
  const parentId = req.params.id;
  if (!isPositiveInteger(parentId)) {
    return res.status(400).json({ error: '无效的菜单ID' });
  }

  const validation = validateMenuName(req.body.name);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const order = isNonNegativeInteger(req.body.order) ? Number(req.body.order) : 0;

  try {
    const result = await db.run('INSERT INTO sub_menus (parent_id, name, "order") VALUES (?, ?, ?)', [
      Number(parentId),
      validation.value,
      order
    ]);
    return res.json({ id: result.lastID });
  } catch (err) {
    console.error('添加子菜单失败:', err);
    return res.status(500).json({ error: '添加失败' });
  }
});

// 修改子菜单
router.put('/submenus/:id', auth, async (req, res) => {
  const subMenuId = req.params.id;
  if (!isPositiveInteger(subMenuId)) {
    return res.status(400).json({ error: '无效的子菜单ID' });
  }

  const validation = validateMenuName(req.body.name);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const order = isNonNegativeInteger(req.body.order) ? Number(req.body.order) : 0;

  try {
    const result = await db.run('UPDATE sub_menus SET name=?, "order"=? WHERE id=?', [
      validation.value,
      order,
      Number(subMenuId)
    ]);

    if (result.changes === 0) {
      return res.status(404).json({ error: '子菜单不存在' });
    }

    return res.json({ changed: result.changes });
  } catch (err) {
    console.error('更新子菜单失败:', err);
    return res.status(500).json({ error: '更新失败' });
  }
});

// 删除子菜单
router.delete('/submenus/:id', auth, async (req, res) => {
  const subMenuId = req.params.id;
  if (!isPositiveInteger(subMenuId)) {
    return res.status(400).json({ error: '无效的子菜单ID' });
  }

  const id = Number(subMenuId);

  try {
    await db.run('DELETE FROM cards WHERE sub_menu_id = ?', [id]);
    const result = await db.run('DELETE FROM sub_menus WHERE id = ?', [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: '子菜单不存在' });
    }

    return res.json({ deleted: result.changes });
  } catch (err) {
    console.error('删除子菜单失败:', err);
    return res.status(500).json({ error: '删除失败' });
  }
});

// 批量更新菜单排序
router.post('/batch/reorder', auth, async (req, res) => {
  const { orders } = req.body;
  
  if (!Array.isArray(orders) || orders.length === 0) {
    return res.status(400).json({ error: '无效的排序数据' });
  }
  
  // 验证每个排序项
  for (const item of orders) {
    if (!isPositiveInteger(item.id) || !isNonNegativeInteger(item.order)) {
      return res.status(400).json({ error: '无效的排序数据格式' });
    }
  }
  
  try {
    for (const item of orders) {
      await db.run('UPDATE menus SET "order" = ? WHERE id = ?', [Number(item.order), Number(item.id)]);
    }
    return res.json({ updated: orders.length });
  } catch (err) {
    console.error('批量更新菜单排序失败:', err);
    return res.status(500).json({ error: '排序更新失败' });
  }
});

// 批量更新子菜单排序
router.post('/submenus/batch/reorder', auth, async (req, res) => {
  const { orders } = req.body;
  
  if (!Array.isArray(orders) || orders.length === 0) {
    return res.status(400).json({ error: '无效的排序数据' });
  }
  
  // 验证每个排序项
  for (const item of orders) {
    if (!isPositiveInteger(item.id) || !isNonNegativeInteger(item.order)) {
      return res.status(400).json({ error: '无效的排序数据格式' });
    }
  }
  
  try {
    for (const item of orders) {
      await db.run('UPDATE sub_menus SET "order" = ? WHERE id = ?', [Number(item.order), Number(item.id)]);
    }
    return res.json({ updated: orders.length });
  } catch (err) {
    console.error('批量更新子菜单排序失败:', err);
    return res.status(500).json({ error: '排序更新失败' });
  }
});

module.exports = router;
