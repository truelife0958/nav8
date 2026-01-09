const express = require('express');
const db = require('../db');
const auth = require('./authMiddleware');
const router = express.Router();

// 导出所有数据
router.get('/export', auth, async (req, res) => {
  try {
    // 并行获取所有表数据
    const [menus, sub_menus, cards, ads, friends] = await Promise.all([
      db.all('SELECT * FROM menus'),
      db.all('SELECT * FROM sub_menus'),
      db.all('SELECT * FROM cards'),
      db.all('SELECT * FROM ads'),
      db.all('SELECT * FROM friends')
    ]);

    const backup = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      data: { menus, sub_menus, cards, ads, friends }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=nav8-backup-${Date.now()}.json`);
    res.json(backup);
  } catch (err) {
    console.error('导出失败:', err);
    res.status(500).json({ error: '导出失败' });
  }
});

// Import data with transaction support for data consistency
router.post('/import', auth, express.json({ limit: '50mb' }), async (req, res) => {
  const { data, overwrite } = req.body;
  if (!data) return res.status(400).json({ error: '无效的备份数据' });

  try {
    const imported = await db.transaction(async (txDb) => {
      let counts = { menus: 0, sub_menus: 0, cards: 0, ads: 0, friends: 0 };

      if (overwrite) {
        // Clear existing data within transaction - safe rollback if import fails
        await txDb.run('DELETE FROM cards');
        await txDb.run('DELETE FROM sub_menus');
        await txDb.run('DELETE FROM menus');
        await txDb.run('DELETE FROM ads');
        await txDb.run('DELETE FROM friends');
      }

      // Build ID mappings for relationships
      const menuIdMap = new Map();
      const subMenuIdMap = new Map();

      for (const menu of (data.menus || [])) {
        const result = await txDb.run('INSERT INTO menus (name, "order") VALUES (?, ?)', [menu.name, menu.order || 0]);
        menuIdMap.set(menu.id, result.lastID);
        counts.menus++;
      }

      for (const sub of (data.sub_menus || [])) {
        const newParentId = menuIdMap.get(sub.parent_id) || sub.parent_id;
        const result = await txDb.run('INSERT INTO sub_menus (parent_id, name, "order") VALUES (?, ?, ?)',
          [newParentId, sub.name, sub.order || 0]);
        subMenuIdMap.set(sub.id, result.lastID);
        counts.sub_menus++;
      }

      for (const card of (data.cards || [])) {
        const newMenuId = menuIdMap.get(card.menu_id) || card.menu_id;
        const newSubMenuId = card.sub_menu_id ? (subMenuIdMap.get(card.sub_menu_id) || card.sub_menu_id) : null;

        const insertCardSql = db.isPostgres
          ? 'INSERT INTO cards (menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, "desc", "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING'
          : 'INSERT OR IGNORE INTO cards (menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, "desc", "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

        await txDb.run(
          insertCardSql,
          [newMenuId, newSubMenuId, card.title, card.url, card.logo_url || '', card.custom_logo_path || '', card.desc || '', card.order || 0]
        );
        counts.cards++;
      }

      for (const ad of (data.ads || [])) {
        await txDb.run('INSERT INTO ads (position, img, url) VALUES (?, ?, ?)', [ad.position, ad.img, ad.url]);
        counts.ads++;
      }

      for (const friend of (data.friends || [])) {
        await txDb.run('INSERT INTO friends (title, url, logo) VALUES (?, ?, ?)', [friend.title, friend.url, friend.logo || '']);
        counts.friends++;
      }

      return counts;
    });

    res.json({ success: true, imported });
  } catch (err) {
    console.error('导入失败 (已回滚):', err);
    res.status(500).json({ error: '导入失败: ' + err.message });
  }
});

module.exports = router;
