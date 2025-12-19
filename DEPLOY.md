# Nav8 部署指南

## 目录

- [Docker 部署（推荐）](#docker-部署推荐)
- [Docker Compose 部署](#docker-compose-部署)
- [源码部署](#源码部署)
- [反向代理配置](#反向代理配置)
- [数据备份与恢复](#数据备份与恢复)
- [功能说明](#功能说明)
- [常见问题](#常见问题)

---

## Docker 部署（推荐）

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

- Node.js >= 18
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

## 访问地址

- 首页: http://localhost:3000
- 后台: http://localhost:3000/admin
- 默认账号: admin / 123456（请及时修改）

## 技术栈

- **前端**: Vue 3 + Vite
- **后端**: Node.js + Express
- **数据库**: SQLite
- **容器**: Docker

## 许可证

MIT License
