# Nav8 部署指南

## 目录

- [Koyeb 部署（免费 Docker，推荐）](#koyeb-部署免费-docker推荐)
- [Fly.io 部署（免费额度 Docker，可选）](#flyio-部署免费额度-docker可选)
- [Docker 部署](#docker-部署)
- [Docker Compose 部署](#docker-compose-部署)
- [源码部署](#源码部署)
- [反向代理配置](#反向代理配置)
- [数据备份与恢复](#数据备份与恢复)
- [功能说明](#功能说明)
- [常见问题](#常见问题)
- [Zeabur（已弃用）](#zeabur已弃用)

---

## Koyeb 部署（免费 Docker，推荐）

Koyeb 支持直接从镜像仓库拉取 Docker 镜像部署，适合替代 Zeabur 这类 PaaS。

### 0. 重要说明（数据库与持久化）

- 大多数免费 PaaS 的容器文件系统是 **临时的**，重启/迁移可能丢失 `SQLite` 数据文件。
- 生产/长期使用建议：使用 **托管 PostgreSQL（Neon / Supabase / Render Postgres 等）**，并设置 `DATABASE_URL`。

### 1. 准备镜像

使用已发布的镜像：

- `ghcr.io/truelife0958/nav8:latest`

### 2. 创建 Service

1. 登录 Koyeb
2. Create App → **Docker**
3. Image：填写 `ghcr.io/truelife0958/nav8:latest`
4. Exposed port：`3000`

### 3. 配置环境变量

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `PORT` | `3000` | 端口（与 Koyeb 暴露端口一致） |
| `ADMIN_USERNAME` | `admin` | 管理员用户名 |
| `ADMIN_PASSWORD` | `your_password` | 管理员密码 |
| `DATABASE_URL` | `postgres://...` | **推荐**：使用外部 PostgreSQL |
| `POSTGRES_SSL` | `true` 或 `false` | 需要 SSL 时设为 `true` |

### 4. 绑定域名

在 Koyeb 的 Domains 中绑定域名，或使用其提供的默认域名。

---

## Fly.io 部署（免费额度 Docker，可选）

Fly.io 支持 Dockerfile/镜像部署，有一定免费额度（可能需要绑定支付方式，视其政策而定）。

### 1. 创建应用

- 按 Fly.io 官方流程安装 `flyctl` 并登录
- 选择从镜像或 Dockerfile 部署

### 2. 关键配置要点

- 应用监听端口需与平台分配一致：建议保持应用内部 `PORT=3000`
- 强烈建议使用外部 PostgreSQL（原因同上）

---

## Docker 部署

### 快速启动

```bash
docker run -d \
  --name nav8 \
  -p 3000:3000 \
  -v $(pwd)/database:/app/database \
  -v $(pwd)/uploads:/app/uploads \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=your_secure_password \
  ghcr.io/truelife0958/nav8:latest
```

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务端口 | `3000` |
| `ADMIN_USERNAME` | 管理员用户名 | `admin` |
| `ADMIN_PASSWORD` | 管理员密码 | `123456` |
| `DATABASE_URL` | PostgreSQL 连接字符串（可选，默认使用 SQLite） | - |

### 数据持久化

- `./database:/app/database` - SQLite 数据库文件
- `./uploads:/app/uploads` - 上传的图片文件

---

## Docker Compose 部署

### 1. 创建 docker-compose.yml

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
    volumes:
      - ./database:/app/database
      - ./uploads:/app/uploads
    restart: unless-stopped
```

### 2. 启动服务

```bash
docker-compose up -d
```

### 3. 查看日志

```bash
docker-compose logs -f
```

### 4. 更新镜像

```bash
docker-compose pull
docker-compose up -d
```

---

## 源码部署

### 环境要求

- Node.js **18/20/22 LTS**（不要使用 23/24/25 这类非 LTS，可能导致 `sqlite3`/`bcrypt` 原生模块无法加载）
- npm >= 8

### 1. 克隆项目

```bash
git clone https://github.com/truelife0958/nav8.git
cd nav8
```

### 2. 安装依赖

```bash
# 后端依赖
npm install

# 前端依赖并构建
cd web
npm install
npm run build
cd ..
```

### 3. 配置环境变量（可选）

```bash
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=your_secure_password
export PORT=3000
```

### 4. 启动服务

```bash
npm start
```

### 5. 使用 PM2 守护进程（生产环境推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start app.js --name nav8

# 设置开机自启
pm2 startup
pm2 save
```

---

## 反向代理配置

### Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 上传文件大小限制
    client_max_body_size 10M;
}
```

### Nginx + SSL (HTTPS)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 10M;
}
```

### Caddy 配置

```caddyfile
your-domain.com {
    reverse_proxy localhost:3000
}
```

---

## 数据备份与恢复

### 备份

```bash
# 备份数据库和上传文件
tar -czvf nav8-backup-$(date +%Y%m%d).tar.gz database/ uploads/
```

### 恢复

```bash
# 停止服务
docker-compose down

# 解压备份
tar -xzvf nav8-backup-20231201.tar.gz

# 启动服务
docker-compose up -d
```

---

## 功能说明

### 批量导入书签

支持从浏览器导出的书签文件批量导入：

1. 进入后台管理 → 卡片管理
2. 点击「导入书签」按钮
3. 选择目标菜单和子菜单
4. 上传书签文件（支持 HTML 和 JSON 格式）
5. 点击「开始导入」

**支持的格式：**
- Chrome/Edge 导出的 HTML 书签文件
- Firefox 导出的 HTML 书签文件
- JSON 格式书签文件

### 批量操作

- **批量删除**：勾选多个卡片后点击「批量删除」
- **批量移动**：勾选多个卡片后选择目标菜单，点击「批量移动」

---

## 常见问题

### Q: 镜像拉取失败？

**原因：** GHCR 包默认是私有的

**解决方案：**
1. 登录 GitHub
2. 进入仓库 Settings → Packages
3. 找到 nav8 包，点击 Package settings
4. 在 Danger Zone 中将 visibility 改为 Public

或者使用源码部署方式。

### Q: 忘记管理员密码怎么办？

重新启动容器并设置新密码：

```bash
docker rm -f nav8
docker run -d \
  --name nav8 \
  -p 3000:3000 \
  -v $(pwd)/database:/app/database \
  -v $(pwd)/uploads:/app/uploads \
  -e ADMIN_PASSWORD=new_password \
  ghcr.io/truelife0958/nav8:latest
```

### Q: 如何修改端口？

**Docker 方式：** 修改 `-p` 参数，如 `-p 8080:3000`

**源码方式：** 设置环境变量 `PORT=8080`

### Q: 上传图片失败？

1. 检查 `uploads` 目录权限
2. 检查 Nginx `client_max_body_size` 配置
3. 确保挂载了 uploads 目录

### Q: 导入书签失败？

1. 确保文件格式正确（HTML 或 JSON）
2. 文件大小不超过 5MB
3. 检查书签文件是否包含有效的 URL

### Q: 如何查看日志？

```bash
# Docker
docker logs -f nav8

# PM2
pm2 logs nav8
```

### Q: 数据库损坏怎么办？

1. 停止服务
2. 备份当前数据库文件
3. 删除 `database/nav.db`
4. 重启服务（会自动创建新数据库）

---

## Zeabur（已弃用）

Zeabur 部署在本项目中曾遇到连接/健康检查相关问题，当前不再作为推荐方案。

如仍需使用 Zeabur，可参考历史配置要点：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DATABASE_URL` | `${POSTGRES_URI}` | Zeabur 内置 Postgres 变量引用 |

---

## 访问地址

- 首页: http://localhost:3000
- 后台: http://localhost:3000/admin
- 默认账号: admin / 123456（请及时修改）

## 技术栈

- **前端**: Vue 3 + Vite
- **后端**: Node.js + Express
- **数据库**: SQLite / PostgreSQL
- **容器**: Docker

## 许可证

MIT License
