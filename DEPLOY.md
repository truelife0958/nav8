# Nav-Item 部署指南

本文档提供 Nav-Item 导航站的完整部署说明，包括多种部署方式和详细配置。

## 📋 目录

- [环境要求](#环境要求)
- [环境变量配置](#环境变量配置)
- [部署方式](#部署方式)
  - [源代码部署](#源代码部署)
  - [Docker 部署](#docker-部署)
  - [Docker Compose 部署](#docker-compose-部署)
  - [Serv00/CT8/Hostuno 部署](#serv00ct8hostuno-部署)
- [构建官方镜像](#构建官方镜像)
  - [本地构建并推送](#本地构建并推送)
  - [GitHub Actions 自动构建](#github-actions-自动构建)
- [反向代理配置](#反向代理配置)
- [数据备份与恢复](#数据备份与恢复)
- [常见问题](#常见问题)

---

## 环境要求

### 源代码部署
- **Node.js**: >= 14.x（推荐 18.x 或 20.x LTS）
- **npm**: >= 6.x
- **操作系统**: Linux / macOS / Windows

### Docker 部署
- **Docker**: >= 20.x
- **Docker Compose**: >= 2.x（可选）

---

## 环境变量配置

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| `PORT` | 服务监听端口 | `3000` | 否 |
| `ADMIN_USERNAME` | 管理员用户名 | `admin` | 否 |
| `ADMIN_PASSWORD` | 管理员密码 | `123456` | **建议修改** |
| `JWT_SECRET` | JWT 密钥 | 内置默认值 | 生产环境建议修改 |
| `NODE_ENV` | 运行环境 | `development` | 生产环境设为 `production` |

### 配置示例

创建 `.env` 文件（源代码部署时使用）：

```env
PORT=3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret_key
NODE_ENV=production
```

---

## 部署方式

### 源代码部署

#### 1. 克隆项目

```bash
git clone https://github.com/eooce/nav-Item.git
cd nav-item
```

#### 2. 安装后端依赖

```bash
npm install
```

#### 3. 构建前端

```bash
cd web
npm install
npm run build
cd ..
```

#### 4. 配置环境变量（可选）

```bash
# 创建 .env 文件
cat > .env << EOF
PORT=3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
NODE_ENV=production
EOF
```

#### 5. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

#### 6. 使用 PM2 守护进程（推荐生产环境）

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start app.js --name nav-item

# 设置开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs nav-item

# 重启服务
pm2 restart nav-item

# 停止服务
pm2 stop nav-item
```

#### 7. 访问应用

- **前端首页**: http://localhost:3000
- **后台管理**: http://localhost:3000/admin
- **默认账号**: admin / 123456

---

### Docker 部署

#### 方式一：使用官方镜像（推荐）

```bash
docker run -d \
  --name nav-item \
  -p 3000:3000 \
  -v $(pwd)/database:/app/database \
  -v $(pwd)/uploads:/app/uploads \
  -e NODE_ENV=production \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=your_secure_password \
  --restart unless-stopped \
  eooce/nav-item
```

#### 方式二：使用 GitHub Container Registry

```bash
docker run -d \
  --name nav-item \
  -p 3000:3000 \
  -v $(pwd)/database:/app/database \
  -v $(pwd)/uploads:/app/uploads \
  -e NODE_ENV=production \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=your_secure_password \
  --restart unless-stopped \
  ghcr.io/eooce/nav-item:latest
```

#### 方式三：本地构建镜像

```bash
# 克隆项目
git clone https://github.com/eooce/nav-Item.git
cd nav-item

# 构建镜像
docker build -t nav-item:local .

# 运行容器
docker run -d \
  --name nav-item \
  -p 3000:3000 \
  -v $(pwd)/database:/app/database \
  -v $(pwd)/uploads:/app/uploads \
  -e NODE_ENV=production \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=your_secure_password \
  --restart unless-stopped \
  nav-item:local
```

#### Docker 常用命令

```bash
# 查看容器状态
docker ps -a | grep nav-item

# 查看日志
docker logs -f nav-item

# 进入容器
docker exec -it nav-item sh

# 重启容器
docker restart nav-item

# 停止并删除容器
docker stop nav-item && docker rm nav-item

# 更新镜像
docker pull eooce/nav-item
docker stop nav-item && docker rm nav-item
# 然后重新运行 docker run 命令
```

---

### Docker Compose 部署

#### 1. 创建 docker-compose.yml

```yaml
version: '3'

services:
  nav-item:
    image: eooce/nav-item
    container_name: nav-item
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=your_secure_password
      - NODE_ENV=production
    volumes:
      - ./database:/app/database
      - ./uploads:/app/uploads
    restart: unless-stopped
```

#### 2. 启动服务

```bash
# 启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down

# 重启
docker-compose restart

# 更新镜像并重启
docker-compose pull
docker-compose up -d
```

---

### Serv00/CT8/Hostuno 部署

使用一键安装脚本：

```bash
bash <(curl -Ls https://github.com/eooce/nav-item/releases/download/ct8-and-serv00/install.sh)
```

#### 自定义域名

```bash
DOMAIN=your-domain.com bash <(curl -Ls https://github.com/eooce/nav-item/releases/download/ct8-and-serv00/install.sh)
```

---

## 构建官方镜像

本节介绍如何构建 Docker 镜像并推送到 Docker Hub 和 GitHub Container Registry (GHCR)。

### 本地构建并推送

#### 1. 推送到 Docker Hub

```bash
# 登录 Docker Hub
docker login

# 构建镜像
docker build -t eooce/nav-item:latest .

# 推送镜像
docker push eooce/nav-item:latest

# 带版本标签
docker build -t eooce/nav-item:v1.0.0 -t eooce/nav-item:latest .
docker push eooce/nav-item:v1.0.0
docker push eooce/nav-item:latest
```

#### 2. 推送到 GitHub Container Registry (GHCR)

```bash
# 登录 GHCR（使用 GitHub Personal Access Token）
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# 构建镜像
docker build -t ghcr.io/eooce/nav-item:latest .

# 推送镜像
docker push ghcr.io/eooce/nav-item:latest

# 带版本标签
docker build -t ghcr.io/eooce/nav-item:v1.0.0 -t ghcr.io/eooce/nav-item:latest .
docker push ghcr.io/eooce/nav-item:v1.0.0
docker push ghcr.io/eooce/nav-item:latest
```

#### 3. 多架构构建（amd64 + arm64）

```bash
# 创建 buildx 构建器
docker buildx create --name multiarch --use

# 构建并推送多架构镜像到 Docker Hub
docker buildx build --platform linux/amd64,linux/arm64 \
  -t eooce/nav-item:latest \
  -t eooce/nav-item:v1.0.0 \
  --push .

# 构建并推送多架构镜像到 GHCR
docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/eooce/nav-item:latest \
  -t ghcr.io/eooce/nav-item:v1.0.0 \
  --push .
```

### GitHub Actions 自动构建

项目已配置 GitHub Actions 工作流 ([`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml))，支持自动构建并推送镜像。

#### 触发条件

- 推送到 `main` 分支
- 创建版本标签（如 `v1.0.0`）
- 手动触发 (workflow_dispatch)

#### 配置 Secrets

在 GitHub 仓库设置中添加以下 Secrets：

| Secret 名称 | 说明 |
|-------------|------|
| `DOCKER_HUB_USERNAME` | Docker Hub 用户名 |
| `DOCKER_HUB_TOKEN` | Docker Hub Access Token |

> `GITHUB_TOKEN` 由 GitHub 自动提供，无需手动配置。

#### 获取 Docker Hub Access Token

1. 登录 [Docker Hub](https://hub.docker.com/)
2. 进入 Account Settings → Security
3. 点击 "New Access Token"
4. 输入描述，选择权限（Read & Write）
5. 复制生成的 Token

#### 配置步骤

1. 进入 GitHub 仓库 → Settings → Secrets and variables → Actions
2. 点击 "New repository secret"
3. 添加 `DOCKER_HUB_USERNAME` 和 `DOCKER_HUB_TOKEN`

#### 自动生成的标签

| 触发方式 | 生成的标签 |
|----------|-----------|
| 推送到 main | `latest`, `sha-xxxxxxx` |
| 创建 v1.2.3 标签 | `1.2.3`, `1.2`, `latest` |

#### 手动触发构建

1. 进入 GitHub 仓库 → Actions
2. 选择 "Build and Push Docker Image" 工作流
3. 点击 "Run workflow"

---

## 反向代理配置

### Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 重定向到 HTTPS（可选）
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL 证书配置
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    
    # 代理配置
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 上传文件大小限制
    client_max_body_size 10M;
}
```

### Caddy 配置

```caddyfile
your-domain.com {
    reverse_proxy localhost:3000
}
```

### Apache 配置

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/
    
    <Proxy *>
        Order deny,allow
        Allow from all
    </Proxy>
</VirtualHost>
```

---

## 数据备份与恢复

### 数据目录说明

| 目录 | 说明 |
|------|------|
| `database/` | SQLite 数据库文件 |
| `uploads/` | 上传的图片文件 |

### 备份

```bash
# 创建备份目录
mkdir -p backups

# 备份数据库和上传文件
tar -czvf backups/nav-item-backup-$(date +%Y%m%d).tar.gz database/ uploads/
```

### 恢复

```bash
# 停止服务
docker stop nav-item  # Docker 部署
# 或
pm2 stop nav-item     # PM2 部署

# 解压备份文件
tar -xzvf backups/nav-item-backup-20231201.tar.gz

# 重启服务
docker start nav-item  # Docker 部署
# 或
pm2 start nav-item     # PM2 部署
```

### 自动备份脚本

创建 `backup.sh`：

```bash
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATA_DIR="/path/to/nav-item"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份
tar -czvf "$BACKUP_DIR/nav-item-$DATE.tar.gz" \
    -C "$DATA_DIR" database/ uploads/

# 删除 7 天前的备份
find "$BACKUP_DIR" -name "nav-item-*.tar.gz" -mtime +7 -delete

echo "Backup completed: nav-item-$DATE.tar.gz"
```

添加到 crontab（每天凌晨 2 点执行）：

```bash
0 2 * * * /path/to/backup.sh >> /var/log/nav-item-backup.log 2>&1
```

---

## 常见问题

### 1. 端口被占用

```bash
# 查看端口占用
lsof -i :3000
# 或
netstat -tlnp | grep 3000

# 修改端口
# 方式一：环境变量
PORT=3001 npm start

# 方式二：Docker
docker run -p 3001:3000 ...
```

### 2. 数据库权限问题

```bash
# 确保 database 目录有写入权限
chmod 755 database/
chmod 644 database/nav.db
```

### 3. Docker 容器无法启动

```bash
# 查看详细日志
docker logs nav-item

# 检查挂载目录权限
ls -la database/ uploads/

# 确保目录存在
mkdir -p database uploads
```

### 4. 忘记管理员密码

```bash
# 方式一：重新设置环境变量并重启
# Docker
docker stop nav-item && docker rm nav-item
docker run ... -e ADMIN_PASSWORD=new_password ...

# 方式二：删除数据库重新初始化（会丢失所有数据）
rm database/nav.db
# 重启服务
```

### 5. 上传图片失败

```bash
# 检查 uploads 目录权限
chmod 755 uploads/

# Docker 部署确保挂载了 uploads 目录
docker run ... -v $(pwd)/uploads:/app/uploads ...
```

### 6. 前端页面空白

```bash
# 确保前端已构建
cd web && npm run build

# 检查 dist 目录是否存在
ls -la web/dist/
```

---

## 技术支持

- **GitHub Issues**: https://github.com/eooce/nav-item/issues
- **项目主页**: https://github.com/eooce/nav-item

---

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情
