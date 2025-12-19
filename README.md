# Nav8 - 个人导航站

一个现代化的导航网站项目，提供简洁美观的导航界面和强大的后台管理系统。

📖 **[完整部署指南（Koyeb/Fly.io/Docker）](DEPLOY.md)** | 🐛 **[问题反馈](https://github.com/truelife0958/nav8/issues)**

## 🛠️ 技术栈

- **前端**: Vue 3 + Vite
- **后端**: Node.js + Express
- **数据库**: SQLite
- **容器**: Docker

## ✨ 功能特性

- 🏠 卡片式导航界面
- 🔍 聚合搜索（Google、百度、Bing、GitHub）
- 📱 响应式设计，适配移动端
- 🎨 毛玻璃效果 UI
- 📋 栏目/卡片/广告/友链管理
- 📥 批量导入浏览器书签（HTML/JSON）
- 🔐 JWT 认证

## 🚀 快速部署

### Docker 部署（推荐）

```bash
docker run -d \
  --name nav8 \
  -p 3000:3000 \
  -v $(pwd)/database:/app/database \
  -v $(pwd)/uploads:/app/uploads \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=your_password \
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
      - ADMIN_PASSWORD=your_password
    volumes:
      - ./database:/app/database
      - ./uploads:/app/uploads
    restart: unless-stopped
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

## ⚙️ 环境变量

> 源码运行请使用 Node.js 18/20/22 LTS；Node 23/24/25 可能导致 `sqlite3`/`bcrypt` 原生模块无法加载。

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务端口 | `3000` |
| `ADMIN_USERNAME` | 管理员用户名 | `admin` |
| `ADMIN_PASSWORD` | 管理员密码 | `123456` |

## 📁 项目结构

```
nav8/
├── app.js              # 后端入口
├── config.js           # 配置文件
├── db.js               # 数据库初始化
├── routes/             # API 路由
├── uploads/            # 上传文件
├── web/                # 前端项目
│   ├── src/
│   │   ├── components/ # 组件
│   │   └── views/      # 页面
│   └── dist/           # 构建输出
└── database/           # SQLite 数据库
```

## 🔗 访问地址

- 首页: http://localhost:3000
- 后台: http://localhost:3000/admin
- 默认账号: admin / 123456

## 📄 许可证

MIT License
