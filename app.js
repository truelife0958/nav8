const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const menuRoutes = require('./routes/menu');
const cardRoutes = require('./routes/card');
const uploadRoutes = require('./routes/upload');
const authRoutes = require('./routes/auth');
const adRoutes = require('./routes/ad');
const friendRoutes = require('./routes/friend');
const userRoutes = require('./routes/user');
const importRoutes = require('./routes/import');
const backupRoutes = require('./routes/backup');
const compression = require('compression');
const app = express();

// 信任反向代理（Zeabur/Nginx等）
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3000;

// 安全头中间件
app.use((req, res, next) => {
  // 防止点击劫持
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // 防止MIME类型嗅探
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // XSS保护
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // 引用策略
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// 请求频率限制 - 通用API限制
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 200, // 每个IP最多200次请求
  message: { error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/uploads') || !req.path.startsWith('/api')
});

// 登录接口更严格的限制
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10, // 每个IP最多10次登录尝试
  message: { error: '登录尝试过于频繁，请15分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 写操作限制（POST/PUT/DELETE）
const writeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 30, // 每分钟最多30次写操作
  message: { error: '操作过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 安全配置
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// 应用请求频率限制
app.use('/api', apiLimiter);
app.use('/api/login', loginLimiter);

// 写操作限制
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return writeLimiter(req, res, next);
  }
  next();
});

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  etag: true
}));
app.use(express.static(path.join(__dirname, 'web/dist'), {
  maxAge: '1d',
  etag: true
}));

// API路由
app.use('/api/menus', menuRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api', authRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/users', userRoutes);
app.use('/api/import', importRoutes);
app.use('/api/backup', backupRoutes);

// SPA路由处理 - 所有非API和非静态文件请求返回index.html
app.get('*', (req, res, next) => {
  // 排除API路由和uploads
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'web/dist', 'index.html'));
});

// 404处理 - 必须在错误处理之前
app.use((req, res, next) => {
  res.status(404).json({ error: '接口不存在' });
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误', message: err.message });
});

app.listen(PORT, () => {
  console.log(`server is running at http://localhost:${PORT}`);
});