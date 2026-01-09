const express = require('express');
const db = require('../db');
const auth = require('./authMiddleware');
const { validateCard, validateIdArray, isPositiveInteger, processCardsWithDisplayLogo } = require('../utils/validator');
const router = express.Router();

// 检测链接是否有效
async function checkUrl(url, timeout = 10000) {
  // 验证URL格式
  try {
    new URL(url);
  } catch {
    return { ok: false, status: 0, statusText: 'URL格式无效' };
  }

  // 尝试 HEAD 请求
  const headResult = await tryFetch(url, 'HEAD', timeout);
  if (headResult.ok) {
    return headResult;
  }
  
  // HEAD 请求失败时尝试 GET 请求（某些服务器不支持 HEAD）
  // 但如果是超时错误，直接返回，不再尝试 GET
  if (headResult.statusText === '请求超时') {
    return headResult;
  }
  
  return await tryFetch(url, 'GET', timeout);
}

// 辅助函数：执行 fetch 请求
async function tryFetch(url, method, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      redirect: 'follow'
    });
    
    clearTimeout(timeoutId);
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return { ok: false, status: 0, statusText: '请求超时' };
    }
    return { ok: false, status: 0, statusText: error.message || '连接失败' };
  }
}

// 搜索卡片 (必须放在 /:menuId 之前)
router.get('/search/query', async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string' || !q.trim()) {
    return res.json([]);
  }

  const keyword = `%${q.trim()}%`;
  try {
    const cards = await db.all(
      `SELECT * FROM cards WHERE title LIKE ? OR url LIKE ? OR "desc" LIKE ? ORDER BY "order" LIMIT 100`,
      [keyword, keyword, keyword]
    );

    res.json(processCardsWithDisplayLogo(cards));
  } catch (err) {
    console.error('搜索失败:', err);
    res.status(500).json({ error: '搜索失败' });
  }
});

// 获取指定菜单的卡片
router.get('/:menuId', async (req, res) => {
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
  
  try {
    const rows = await db.all(query, params);
    res.json(processCardsWithDisplayLogo(rows));
  } catch (err) {
    console.error('获取卡片失败:', err);
    return res.status(500).json({ error: '获取卡片失败' });
  }
});

// 新增卡片
router.post('/', auth, async (req, res) => {
  const validation = validateCard(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  const { menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, order } = validation.data;
  
  try {
    const result = await db.run(
      'INSERT INTO cards (menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, "desc", "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, order]
    );
    res.json({ id: result.lastID, success: true });
  } catch (err) {
    console.error('添加卡片失败:', err);
    // 检查是否是唯一约束冲突
    if (err.message && (err.message.includes('UNIQUE') || err.message.includes('unique') || err.message.includes('duplicate'))) {
      return res.status(409).json({ error: '该分类下已存在相同URL的卡片' });
    }
    return res.status(500).json({ error: '添加失败: ' + (err.message || '未知错误') });
  }
});

// 修改卡片
router.put('/:id', auth, async (req, res) => {
  const cardId = req.params.id;
  if (!isPositiveInteger(cardId)) {
    return res.status(400).json({ error: '无效的卡片ID' });
  }
  
  const validation = validateCard(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  const { menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, order } = validation.data;
  
  try {
    const result = await db.run(
      'UPDATE cards SET menu_id=?, sub_menu_id=?, title=?, url=?, logo_url=?, custom_logo_path=?, "desc"=?, "order"=? WHERE id=?',
      [menu_id, sub_menu_id, title, url, logo_url, custom_logo_path, desc, order, Number(cardId)]
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: '卡片不存在' });
    }
    res.json({ changed: result.changes, success: true });
  } catch (err) {
    console.error('更新卡片失败:', err);
    // 检查是否是唯一约束冲突
    if (err.message && (err.message.includes('UNIQUE') || err.message.includes('unique') || err.message.includes('duplicate'))) {
      return res.status(409).json({ error: '该分类下已存在相同URL的卡片' });
    }
    return res.status(500).json({ error: '更新失败: ' + (err.message || '未知错误') });
  }
});

// 删除卡片
router.delete('/:id', auth, async (req, res) => {
  const cardId = req.params.id;
  if (!isPositiveInteger(cardId)) {
    return res.status(400).json({ error: '无效的卡片ID' });
  }
  
  try {
    const result = await db.run('DELETE FROM cards WHERE id=?', [Number(cardId)]);
    res.json({ deleted: result.changes });
  } catch (err) {
    console.error('删除卡片失败:', err);
    return res.status(500).json({ error: '删除失败' });
  }
});

// 批量删除卡片
router.post('/batch/delete', auth, async (req, res) => {
  const validation = validateIdArray(req.body.ids, '卡片');
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  const placeholders = validation.ids.map(() => '?').join(',');
  try {
    const result = await db.run(`DELETE FROM cards WHERE id IN (${placeholders})`, validation.ids);
    res.json({ deleted: result.changes });
  } catch (err) {
    console.error('批量删除卡片失败:', err);
    return res.status(500).json({ error: '删除失败' });
  }
});

// 批量移动卡片
router.post('/batch/move', auth, async (req, res) => {
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
  
  try {
    const result = await db.run(
      `UPDATE cards SET menu_id = ?, sub_menu_id = ? WHERE id IN (${placeholders})`,
      [Number(menu_id), targetSubMenuId, ...idsValidation.ids]
    );
    res.json({ moved: result.changes, success: true });
  } catch (err) {
    console.error('批量移动卡片失败:', err);
    // 检查是否是唯一约束冲突
    if (err.message && (err.message.includes('UNIQUE') || err.message.includes('unique') || err.message.includes('duplicate'))) {
      return res.status(409).json({ error: '目标分类下已存在相同URL的卡片，无法移动' });
    }
    return res.status(500).json({ error: '移动失败: ' + (err.message || '未知错误') });
  }
});

// 检测死链 - 批量检测卡片链接是否有效
router.post('/batch/check-links', auth, async (req, res) => {
  const { ids } = req.body;
  
  const idsValidation = validateIdArray(ids, '卡片');
  if (!idsValidation.valid) {
    return res.status(400).json({ error: idsValidation.error });
  }
  
  const placeholders = idsValidation.ids.map(() => '?').join(',');
  
  try {
    const cards = await db.all(`SELECT id, url, title FROM cards WHERE id IN (${placeholders})`, idsValidation.ids);
    
    if (!cards || cards.length === 0) {
      return res.json({ results: [], deadLinks: [] });
    }
    
    const results = [];
    const deadLinks = [];
    
    // 并发检测，但限制并发数
    const concurrency = 5;
    for (let i = 0; i < cards.length; i += concurrency) {
      const batch = cards.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(async (card) => {
          const result = await checkUrl(card.url);
          return {
            id: card.id,
            url: card.url,
            title: card.title,
            ok: result.ok,
            status: result.status,
            statusText: result.statusText
          };
        })
      );
      
      for (const r of batchResults) {
        results.push(r);
        if (!r.ok) {
          deadLinks.push(r.id);
        }
      }
    }
    
    res.json({ results, deadLinks });
    } catch (err) {
      console.error('获取卡片失败:', err);
      return res.status(500).json({ error: '获取卡片失败' });
    }
  });
  
  // 批量更新卡片排序
  router.post('/batch/reorder', auth, async (req, res) => {
    const { orders } = req.body;
    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ error: '请提供排序数据' });
    }
    
    try {
      for (const item of orders) {
        if (isPositiveInteger(item.id) && typeof item.order === 'number') {
          await db.run('UPDATE cards SET "order" = ? WHERE id = ?', [item.order, Number(item.id)]);
        }
      }
      res.json({ success: true, updated: orders.length });
    } catch (err) {
      console.error('更新排序失败:', err);
      return res.status(500).json({ error: '更新排序失败' });
    }
  });
  
  module.exports = router;
