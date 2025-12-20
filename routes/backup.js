const express = require('express');
const db = require('../db');
const auth = require('./authMiddleware');
const router = express.Router();

// 导出所有数据
router.get('/export', auth, async (req, res) => {
  try {
    const getData = (table) => new Promise((resolve, reject) => {
      db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const [menus, sub_menus, cards, ads, friends] = await Promise.all([
      getData('menus'),
      getData('sub_menus'),
      getData('cards'),
      getData('ads'),
      getData('friends')
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

// 导入数据
router.post('/import', auth, express.json({ limit: '50mb' }), async (req, res) => {
  const { data, overwrite } = req.body;
  if (!data) return res.status(400).json({ error: '无效的备份数据' });

  try {
    const runQuery = (sql, params = []) => new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });

    if (overwrite) {
      await runQuery('DELETE FROM cards');
      await runQuery('DELETE FROM sub_menus');
      await runQuery('DELETE FROM menus');
      await runQuery('DELETE FROM ads');
      await runQuery('DELETE FROM friends');
    }

    let imported = { menus: 0, sub_menus: 0, cards: 0, ads: 0, friends: 0 };
    
    // 建立旧ID到新ID的映射（用于关联关系）
    const menuIdMap = new Map();
    const subMenuIdMap = new Map();

    for (const menu of (data.menus || [])) {
      const result = await runQuery('INSERT INTO menus (name, "order") VALUES (?, ?)', [menu.name, menu.order || 0]);
      menuIdMap.set(menu.id, result.lastID);
      imported.menus++;
    }

    for (const sub of (data.sub_menus || [])) {
      const newParentId = menuIdMap.get(sub.parent_id) || sub.parent_id;
      const result = await runQuery('INSERT INTO sub_menus (parent_id, name, "order") VALUES (?, ?, ?)',
        [newParentId, sub.name, sub.order || 0]);
      subMenuIdMap.set(sub.id, result.lastID);
      imported.sub_menus++;
    }

    for (const card of (data.cards || [])) {
      const newMenuId = menuIdMap.get(card.menu_id) || card.menu_id;
      const newSubMenuId = card.sub_menu_id ? (subMenuIdMap.get(card.sub_menu_id) || card.sub_menu_id) : null;

      const insertCardSql = db.isPostgres
        ? 'INSERT INTO cards (menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, "desc", "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING'
        : 'INSERT OR IGNORE INTO cards (menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, "desc", "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

      await runQuery(
        insertCardSql,
        [newMenuId, newSubMenuId, card.title, card.url, card.logo_url || '', card.custom_logo_path || '', card.desc || '', card.order || 0]
      );
      imported.cards++;
    }

    for (const ad of (data.ads || [])) {
      await runQuery('INSERT INTO ads (position, img, url) VALUES (?, ?, ?)', [ad.position, ad.img, ad.url]);
      imported.ads++;
    }

    for (const friend of (data.friends || [])) {
      await runQuery('INSERT INTO friends (title, url, logo) VALUES (?, ?, ?)', [friend.title, friend.url, friend.logo || '']);
      imported.friends++;
    }

    res.json({ success: true, imported });
  } catch (err) {
    console.error('导入失败:', err);
    res.status(500).json({ error: '导入失败: ' + err.message });
  }
});

module.exports = router;
