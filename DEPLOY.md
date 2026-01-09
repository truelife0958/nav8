# Nav8 部署指南

## 目录

- [安全配置说明](#安全配置说明)
- [Koyeb 部署（免费 Docker，推荐）](#koyeb-部署免费-docker推荐)
- [Fly.io 部署（免费额度 Docker，可选）](#flyio-部署免费额度-docker可选)
- [Docker 部署](#docker-部署)
- [Docker Compose 部署](#docker-compose-部署)
- [源码部署](#源码部署)
- [反向代理配置](#反向代理配置)
- [数据备份与恢复](#数据备份与恢复)
- [功能说明](#功能说明)
- [常见问题](#常见问题)

---

## 安全配置说明

### 🔐 重要：密码和密钥配置

从最新版本开始，Nav8 采用更安全的默认配置：

| 变量 | 未设置时的行为 | 建议 |
|------|---------------|------|
| `ADMIN_PASSWORD` | 随机生成16位密码，启动时打印到控制台 | **生产环境必须设置** |
| `JWT_SECRET` | 随机生成64位密钥，重启后token失效 | **生产环境必须设置** |

### 首次启动

如果不设置 `ADMIN_PASSWORD`，启动日志会显示：

```
🔐 Default admin password generated: a1b2c3d4e5f6g7h8
   Please change it after first login or set ADMIN_PASSWORD env variable.
```

### 生产环境配置示例

```bash
# 必须设置的环境变量
ADMIN_PASSWORD=your_strong_password_here
JWT_SECRET=your_random_64_char_secret_key_here
NODE_ENV=production

# 可选配置
CORS_ORIGIN=https://your-domain.com
```

---

## Koyeb 部署（免费 Docker，推荐）

Koyeb 支持直接从镜像仓库拉取 Docker 镜像部署。

### 0. 重要说明（数据库与持久化）

- 大多数免费 PaaS 的容器文件系统是 **临时的**，重启/迁移可能丢失 SQLite 数据。
- **生产/长期使用建议**：使用托管 PostgreSQL（Neon / Supabase / Render Postgres 等）

### 1. 创建 Service

1. 登录 Koyeb
2. Create App → **Docker**
3. Image：`ghcr.io/truelife0958/nav8:latest`
4. Exposed port：`3000`

### 2. 配置环境变量

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `PORT` | `3000` | 端口 |
| `ADMIN_USERNAME` | `admin` | 管理员用户名 |
| `ADMIN_PASSWORD` | `your_password` | **必须设置** |
| `JWT_SECRET` | `random_secret` | **必须设置** |
| `DATABASE_URL` | `postgres://...` | 推荐使用外部 PostgreSQL |
| `POSTGRES_SSL` | `true` | 需要 SSL 时设置 |
| `NODE_ENV` | `production` | 生产环境 |

---

## Fly.io 部署（免费额度 Docker，可选）

### 关键配置要点

- 应用监听端口：`PORT=3000`
- **强烈建议**使用外部 PostgreSQL
- 必须设置 `ADMIN_PASSWORD` 和 `JWT_SECRET`

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
  -e JWT_SECRET=your_random_secret_key \
  -e NODE_ENV=production \
  ghcr.io/truelife0958/nav8:latest
```

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务端口 | `3000` |
| `ADMIN_USERNAME` | 管理员用户名 | `admin` |
| `ADMIN_PASSWORD` | 管理员密码 | 随机生成 |
| `JWT_SECRET` | JWT签名密钥 | 随机生成 |
| `DATABASE_URL` | PostgreSQL 连接串 | 空（使用SQLite） |
| `CORS_ORIGIN` | 允许跨域来源 | 生产模式同源 |
| `NODE_ENV` | 运行环境 | `development` |

### 数据持久化

- `./database:/app/database` - SQLite 数据库文件
- `./uploads:/app/uploads` - 上传的图片文件

---

## Docker Compose 部署

### SQLite 模式

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
      - NODE_ENV=production
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
    container_name: nav8
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://nav8:nav8pass@postgres:5432/nav8
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=your_secure_password
      - JWT_SECRET=your_random_secret_key
      - NODE_ENV=production
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    container_name: nav8-postgres
    environment:
      - POSTGRES_USER=nav8
      - POSTGRES_PASSWORD=nav8pass
      - POSTGRES_DB=nav8
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  pgdata:
```

### 常用命令

```bash
# 启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 更新镜像
docker-compose pull && docker-compose up -d

# 停止
docker-compose down
```

---

## 源码部署

### 环境要求

- Node.js **18/20/22 LTS**（不要使用 23+ 非 LTS 版本）
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
cd web && npm install && npm run build && cd ..
```

### 3. 配置环境变量

```bash
# 创建 .env 文件（可选）
cat > .env << EOF
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_random_secret_key
PORT=3000
NODE_ENV=production
EOF
```

### 4. 启动服务

```bash
npm start
```

### 5. PM2 守护进程（生产环境推荐）

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

### Nginx

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

    client_max_body_size 10M;
}
```

### Nginx + HTTPS

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

### Caddy

```caddyfile
your-domain.com {
    reverse_proxy localhost:3000
}
```

---

## 数据备份与恢复

### 通过后台管理（推荐）

1. 登录后台 → 数据备份
2. 点击「导出数据」下载 JSON 备份文件
3. 恢复时点击「导入数据」上传备份文件

> 导入操作使用事务保护，失败时自动回滚，不会造成数据损坏。

### 命令行备份

```bash
# 备份数据库和上传文件
tar -czvf nav8-backup-$(date +%Y%m%d).tar.gz database/ uploads/

# 恢复
docker-compose down
tar -xzvf nav8-backup-20231201.tar.gz
docker-compose up -d
```

---

## 功能说明

### 批量导入书签

1. 后台管理 → 卡片管理 → 导入书签
2. 选择目标菜单和子菜单
3. 上传书签文件（支持 Chrome/Edge/Firefox HTML 格式）

### 批量操作

- **批量删除**：勾选卡片后点击「批量删除」
- **批量移动**：勾选卡片后选择目标菜单
- **死链检测**：检测卡片链接是否有效

---

## 常见问题

### Q: 首次启动密码是什么？

启动服务后查看控制台日志，会打印生成的随机密码：
```
🔐 Default admin password generated: a1b2c3d4e5f6g7h8
```

### Q: 忘记管理员密码？

重新设置 `ADMIN_PASSWORD` 环境变量并重启：

```bash
docker rm -f nav8
docker run -d --name nav8 ... -e ADMIN_PASSWORD=new_password ...
```

### Q: 每次重启后需要重新登录？

设置固定的 `JWT_SECRET` 环境变量：

```bash
-e JWT_SECRET=your_fixed_secret_key
```

### Q: 镜像拉取失败？

GHCR 包可能是私有的。解决方案：
1. GitHub 仓库 Settings → Packages → nav8
2. Package settings → 将 visibility 改为 Public

### Q: 如何修改端口？

- Docker：修改 `-p` 参数，如 `-p 8080:3000`
- 源码：设置 `PORT=8080` 环境变量

### Q: 数据库损坏怎么办？

1. 停止服务
2. 备份当前 `database/nav.db`
3. 删除 `database/nav.db`
4. 重启服务（自动创建新数据库）
5. 通过后台「数据备份」功能导入之前的备份

---

## 访问地址

- 首页: http://localhost:3000
- 后台: http://localhost:3000/admin

## 许可证

MIT License
