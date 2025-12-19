const express = require('express');
const db = require('../db');
const auth = require('./authMiddleware');
const multer = require('multer');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// 解析浏览器书签HTML
function parseBookmarkHtml(html) {
  const bookmarks = [];
  const regex = /<A[^>]*HREF="([^"]*)"[^>]*>([^<]*)<\/A>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const url = match[1];
    const title = match[2].trim();
    if (url && title && url.startsWith('http')) {
      bookmarks.push({ title, url, logo_url: '', desc: '' });
    }
  }
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
  if (!menu_id) return res.status(400).json({ error: '请选择目标菜单' });
  
  const content = req.file.buffer.toString('utf-8');
  let bookmarks = [];
  
  try {
    if (req.file.originalname.endsWith('.json')) {
      bookmarks = parseBookmarkJson(JSON.parse(content));
    } else {
      bookmarks = parseBookmarkHtml(content);
    }
  } catch (e) {
    return res.status(400).json({ error: '文件解析失败' });
  }
  
  if (!bookmarks.length) return res.status(400).json({ error: '未找到有效书签' });
  
  const stmt = db.prepare('INSERT INTO cards (menu_id, sub_menu_id, title, url, logo_url, desc, "order") VALUES (?, ?, ?, ?, ?, ?, ?)');
  let count = 0;
  
  bookmarks.forEach((b, i) => {
    stmt.run(menu_id, sub_menu_id || null, b.title, b.url, b.logo_url, b.desc, i, (err) => {
      if (!err) count++;
    });
  });
  
  stmt.finalize(() => {
    res.json({ imported: count, total: bookmarks.length });
  });
});

module.exports = router;
