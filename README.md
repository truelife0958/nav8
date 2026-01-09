# Nav8 - 个人导航站

一个现代化的导航网站项目，提供简洁美观的导航界面和强大的后台管理系统。

📖 **[完整部署指南](DEPLOY.md)** | 📚 **[API文档](API.md)** | 🐛 **[问题反馈](https://github.com/truelife0958/nav8/issues)**

## ✨ 功能特性

- 🏠 卡片式导航界面，支持主菜单和子菜单分类
- 🔍 聚合搜索（Google、百度、Bing、GitHub、站内搜索）
- 📱 响应式设计，完美适配移动端
- 📲 PWA支持，可添加到手机桌面
- 🎨 毛玻璃效果 UI，多种卡片动画
- 📋 栏目/卡片/广告/友链管理
- 📥 批量导入浏览器书签（HTML/JSON）
- 💾 数据备份与恢复（事务支持，保证数据一致性）
- 🔐 JWT认证 + 请求限流 + 安全默认配置
- 📊 访问统计（PV/UV）

## 🛠️ 技术栈

- **前端**: Vue 3 + Vite
- **后端**: Node.js + Express
- **数据库**: SQLite / PostgreSQL（双模式支持）
- **容器**: Docker

## 🚀 快速部署

### Docker 部署（推荐）

```bash
docker run -d \
  --name nav8 \
  -p 3000:3000 \
  -v $(pwd)/database:/app/database \
  -v $(pwd)/uploads:/app/uploads \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=your_secure_password \
  -e JWT_SECRET=your_random_secret_key \
  ghcr.io/truelife0958/nav8:latest
```

### Docker Compose

```yaml
version: '3'
services:
  nav8:
    image: ghcr.io/truelife0958/nav8:latest
    container_name: nav8
    ports:
      - "3000:3000"
    environment:
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=your_secure_password
      - JWT_SECRET=your_random_secret_key
    volumes:
      - ./database:/app/database
      - ./uploads:/app/uploads
    restart: unless-stopped
```

### PostgreSQL 模式

```yaml
version: '3'
services:
  nav8:
    image: ghcr.io/truelife0958/nav8:latest
    environment:
      - DATABASE_URL=postgres://user:pass@postgres:5432/nav8
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=your_secure_password
      - JWT_SECRET=your_random_secret_key
    ports:
      - "3000:3000"
    depends_on:
      - postgres
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=nav8
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

### 源码部署

```bash
# 克隆项目
git clone https://github.com/truelife0958/nav8.git
cd nav8

# 安装依赖
npm install
cd web && npm install && npm run build && cd ..

# 启动服务
npm start
```

> ⚠️ 源码运行请使用 Node.js 18/20/22 LTS；Node 23+ 可能导致原生模块无法加载。

## ⚙️ 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务端口 | `3000` |
| `ADMIN_USERNAME` | 管理员用户名 | `admin` |
| `ADMIN_PASSWORD` | 管理员密码 | **随机生成**（首次启动时打印） |
| `JWT_SECRET` | JWT签名密钥 | **随机生成**（重启后token失效） |
| `DATABASE_URL` | PostgreSQL连接串 | 空（使用SQLite） |
| `CORS_ORIGIN` | 允许的跨域来源 | 开发模式`*`，生产模式同源 |
| `NODE_ENV` | 运行环境 | `development` |

### 🔐 安全说明

- **首次启动**：如未设置 `ADMIN_PASSWORD`，系统会生成随机密码并打印到控制台
- **生产环境**：强烈建议设置 `ADMIN_PASSWORD` 和 `JWT_SECRET` 环境变量
- **JWT密钥**：未设置时每次重启会生成新密钥，导致所有已登录用户需重新登录

## 📁 项目结构

```
nav8/
├── app.js              # 后端入口
├── config.js           # 配置文件（安全默认值）
├── db.js               # 数据库层（SQLite/PostgreSQL + 事务支持）
├── routes/             # API路由
│   ├── auth.js         # 登录认证
│   ├── menu.js         # 菜单管理（优化N+1查询）
│   ├── card.js         # 卡片管理
│   ├── backup.js       # 数据备份（事务保护）
│   ├── stats.js        # 访问统计
│   └── ...
├── utils/              # 工具函数
│   ├── validator.js    # 输入验证
│   └── bcrypt.js       # 密码加密
├── uploads/            # 上传文件
├── web/                # 前端项目（Vue 3）
│   ├── src/
│   │   ├── components/ # 组件
│   │   └── views/      # 页面
│   ├── public/         # 静态资源（PWA）
│   └── dist/           # 构建输出
└── database/           # SQLite数据库
```

## 🔗 访问地址

- 首页: http://localhost:3000
- 后台: http://localhost:3000/admin
- 默认账号: admin / （首次启动时查看控制台输出）

## 📄 许可证

MIT License
