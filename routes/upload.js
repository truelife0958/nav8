const express = require('express');
const multer = require('multer');
const path = require('path');
const auth = require('./authMiddleware');
const router = express.Router();

// 允许的文件类型
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/x-icon'];
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'];

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now() + ext);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件 (jpg, jpeg, png, gif, webp, svg, ico)'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制5MB
  }
});

// 使用 async/await 包装 upload.single 虽然它本身是中间件
// 这里主要是为了保持一致性，但 multer 是标准中间件，直接用也行
// 我们可以保留原来的结构，但确保错误返回 JSON
router.post('/', auth, (req, res, next) => {
  upload.single('logo')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: '文件大小不能超过5MB' });
        }
        return res.status(400).json({ error: err.message });
      }
      return res.status(400).json({ error: err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' });
    }
    
    res.json({ 
      filename: req.file.filename, 
      url: '/uploads/' + req.file.filename,
      success: true
    });
  });
});

module.exports = router;
