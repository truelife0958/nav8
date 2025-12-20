const express = require('express');
const db = require('../db');
const auth = require('./authMiddleware');
const multer = require('multer');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// 解析浏览器书签HTML
function normalizeUrlForDedupe(rawUrl) {
  const url = String(rawUrl || '').trim().replace(/^['"]|['"]$/g, '');
  if (!url) return '';

  try {
    const u = new URL(url);
    // 同一个书签的 hash 变化不应重复导入
    u.hash = '';

    // 统一去除尾部斜杠（根路径除外）
    if (u.pathname && u.pathname !== '/') {
      u.pathname = u.pathname.replace(/\/+$/g, '');
      if (!u.pathname) u.pathname = '/';
    }

    return u.toString().toLowerCase();
  } catch {
    return url.replace(/\/+$/g, '').toLowerCase();
  }
}

function parseBookmarkHtml(html) {
  const bookmarks = [];

  // 单一正则覆盖双引号 / 单引号 / 无引号三种 href 写法
  const regex = /<A\b[^>]*\bHREF\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]*?)<\/A>/gi;
  const seen = new Set();

  let match;
  while ((match = regex.exec(html)) !== null) {
    const url = (match[1] || match[2] || match[3] || '').trim();
    const title = String(match[4] || '')
      .replace(/<[^>]+>/g, '')
      .trim();

    if (!url || !title) continue;
    if (!(url.startsWith('http://') || url.startsWith('https://'))) continue;

    const key = normalizeUrlForDedupe(url);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    bookmarks.push({
      title: title.substring(0, 100),
      url: url.substring(0, 500),
      logo_url: '',
      desc: ''
    });
  }

  console.log(`解析书签HTML: 找到 ${bookmarks.length} 个有效书签`);
  return bookmarks;
}

// 解析JSON书签
function parseBookmarkJson(json) {
  const bookmarks = [];
  const seen = new Set();

  function maybeAdd(rawTitle, rawUrl) {
    const title = String(rawTitle || '').trim();
    const url = String(rawUrl || '').trim();
    if (!title || !url) return;
    if (!(url.startsWith('http://') || url.startsWith('https://'))) return;

    const key = normalizeUrlForDedupe(url);
    if (!key || seen.has(key)) return;
    seen.add(key);

    bookmarks.push({
      title: title.substring(0, 100),
      url: url.substring(0, 500),
      logo_url: '',
      desc: ''
    });
  }

  function traverse(node) {
    if (!node) return;

    // Chrome / Edge 书签导出 JSON 常见结构
    if (node.type === 'url' && node.url && node.name) {
      maybeAdd(node.name, node.url);
    }

    // 其他结构兼容
    if (node.url && node.name) {
      maybeAdd(node.name, node.url);
    }

    if (Array.isArray(node.children)) node.children.forEach(traverse);
  }

  if (Array.isArray(json)) {
    json.forEach(traverse);
  } else if (json.roots) {
    Object.values(json.roots).forEach(traverse);
  } else {
    traverse(json);
  }

  return bookmarks;
}

// 批量导入书签
router.post('/', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请上传文件' });

  const { menu_id, sub_menu_id } = req.body;
  if (!menu_id || !Number.isInteger(Number(menu_id))) {
    return res.status(400).json({ error: '请选择有效的目标菜单' });
  }

  if (sub_menu_id && !Number.isInteger(Number(sub_menu_id))) {
    return res.status(400).json({ error: '请选择有效的目标子菜单' });
  }
  
  const content = req.file.buffer.toString('utf-8');
  let bookmarks = [];
  
  try {
    if (req.file.originalname.endsWith('.json')) {
      bookmarks = parseBookmarkJson(JSON.parse(content));
    } else {
      bookmarks = parseBookmarkHtml(content);
    }
  } catch (e) {
    return res.status(400).json({ error: '文件解析失败: ' + e.message });
  }
  
  if (!bookmarks.length) return res.status(400).json({ error: '未找到有效书签' });
  
  // 使用 Promise 确保所有插入完成后再返回
  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let completed = 0;
  const total = bookmarks.length;
  let responseSent = false;

  const requestId = req.headers['x-request-id'] || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  // 设置超时保护
  const timeout = setTimeout(() => {
    if (!responseSent) {
      responseSent = true;
      res.json({ imported: successCount, skipped: skippedCount, total, timeout: true, requestId });
    }
  }, 30000);

  console.log(
    `开始导入[${requestId}] ${total} 个书签到菜单 ${menu_id}${sub_menu_id ? ', 子菜单 ' + sub_menu_id : ''}`
  );
  
  const insertSql = db.isPostgres
    ? 'INSERT INTO cards (menu_id, sub_menu_id, title, url, logo_url, "desc", "order") VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT DO NOTHING'
    : 'INSERT OR IGNORE INTO cards (menu_id, sub_menu_id, title, url, logo_url, "desc", "order") VALUES (?, ?, ?, ?, ?, ?, ?)';

  bookmarks.forEach((b, i) => {
    db.run(
      insertSql,
      [Number(menu_id), sub_menu_id ? Number(sub_menu_id) : null, b.title, b.url, b.logo_url, b.desc, i],
      function (err) {
        if (!err) {
          if (this?.changes > 0) successCount++;
          else skippedCount++;
        } else {
          errorCount++;
          console.error(`导入书签失败 [${b.title}]: ${err.message}`);
        }

        completed++;
        if (completed === total && !responseSent) {
          responseSent = true;
          clearTimeout(timeout);
          console.log(
            `导入完成[${requestId}]: 成功 ${successCount}, 跳过 ${skippedCount}, 失败 ${errorCount}, 总计 ${total}`
          );
          res.json({ imported: successCount, skipped: skippedCount, total, errors: errorCount, requestId });
        }
      }
    );
  });
});

module.exports = router;
