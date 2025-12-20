const express = require('express');
const db = require('../db');
const auth = require('./authMiddleware');
const multer = require('multer');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// 解析浏览器书签HTML - 支持多种格式
function parseBookmarkHtml(html) {
  const bookmarks = [];
  
  // 多种正则模式匹配不同浏览器的书签格式
  const patterns = [
    // 标准格式: <A HREF="url">title</A>
    /<A[^>]*\sHREF="([^"]+)"[^>]*>([^<]+)<\/A>/gi,
    // 单引号格式: <A HREF='url'>title</A>
    /<A[^>]*\sHREF='([^']+)'[^>]*>([^<]+)<\/A>/gi,
    // 无引号格式（某些旧格式）
    /<A[^>]*\sHREF=([^\s>]+)[^>]*>([^<]+)<\/A>/gi
  ];
  
  const seen = new Set(); // 去重
  
  for (const regex of patterns) {
    let match;
    // 重置正则的lastIndex
    regex.lastIndex = 0;
    while ((match = regex.exec(html)) !== null) {
      let url = match[1].trim();
      const title = match[2].trim();
      
      // 移除可能的引号
      url = url.replace(/^['"]|['"]$/g, '');
      
      // 验证URL
      if (url && title && (url.startsWith('http://') || url.startsWith('https://'))) {
        const key = url.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          bookmarks.push({
            title: title.substring(0, 100), // 限制标题长度
            url: url.substring(0, 500), // 限制URL长度
            logo_url: '',
            desc: ''
          });
        }
      }
    }
  }
  
  console.log(`解析书签HTML: 找到 ${bookmarks.length} 个有效书签`);
  return bookmarks;
}

// 解析JSON书签
function parseBookmarkJson(json) {
  const bookmarks = [];
  function traverse(node) {
    if (node.type === 'url' && node.url && node.name) {
      bookmarks.push({ title: node.name, url: node.url, logo_url: '', desc: '' });
    }
    if (node.children) node.children.forEach(traverse);
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
  let errorCount = 0;
  let completed = 0;
  const total = bookmarks.length;
  let responseSent = false;
  
  // 设置超时保护
  const timeout = setTimeout(() => {
    if (!responseSent) {
      responseSent = true;
      res.json({ imported: successCount, total, timeout: true });
    }
  }, 30000);
  
  console.log(`开始导入 ${total} 个书签到菜单 ${menu_id}${sub_menu_id ? ', 子菜单 ' + sub_menu_id : ''}`);
  
  bookmarks.forEach((b, i) => {
    db.run(
      'INSERT INTO cards (menu_id, sub_menu_id, title, url, logo_url, "desc", "order") VALUES (?, ?, ?, ?, ?, ?, ?)',
      [Number(menu_id), sub_menu_id ? Number(sub_menu_id) : null, b.title, b.url, b.logo_url, b.desc, i],
      (err) => {
        if (!err) {
          successCount++;
        } else {
          errorCount++;
          console.error(`导入书签失败 [${b.title}]: ${err.message}`);
        }
        completed++;
        if (completed === total && !responseSent) {
          responseSent = true;
          clearTimeout(timeout);
          console.log(`导入完成: 成功 ${successCount}, 失败 ${errorCount}, 总计 ${total}`);
          res.json({ imported: successCount, total, errors: errorCount });
        }
      }
    );
  });
});

module.exports = router;
