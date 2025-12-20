# Nav8 API 文档

## 基础信息

- **Base URL**: `/api`
- **认证方式**: Bearer Token (JWT)
- **Content-Type**: `application/json`

## 认证

### 登录
```
POST /api/login
```

**请求体**:
```json
{
  "username": "admin",
  "password": "123456"
}
```

**响应**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "lastLoginTime": "2024-01-01 12:00:00",
  "lastLoginIp": "127.0.0.1"
}
```

---

## 菜单管理

### 获取所有菜单
```
GET /api/menus
```

**响应**:
```json
[
  {
    "id": 1,
    "name": "Home",
    "order": 1,
    "subMenus": [
      { "id": 1, "parent_id": 1, "name": "子菜单", "order": 1 }
    ]
  }
]
```

### 创建菜单 🔒
```
POST /api/menus
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "name": "新菜单",
  "order": 1
}
```

### 更新菜单 🔒
```
PUT /api/menus/:id
Authorization: Bearer <token>
```

### 删除菜单 🔒
```
DELETE /api/menus/:id
Authorization: Bearer <token>
```

---

## 子菜单管理

### 获取子菜单
```
GET /api/menus/:id/submenus
```

### 创建子菜单 🔒
```
POST /api/menus/:id/submenus
Authorization: Bearer <token>
```

### 更新子菜单 🔒
```
PUT /api/menus/submenus/:id
Authorization: Bearer <token>
```

### 删除子菜单 🔒
```
DELETE /api/menus/submenus/:id
Authorization: Bearer <token>
```

---

## 卡片管理

### 获取卡片
```
GET /api/cards/:menuId?subMenuId=<subMenuId>
```

### 创建卡片 🔒
```
POST /api/cards
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "menu_id": 1,
  "sub_menu_id": null,
  "title": "Google",
  "url": "https://google.com",
  "logo_url": "",
  "custom_logo_path": "",
  "desc": "搜索引擎",
  "order": 1
}
```

### 更新卡片 🔒
```
PUT /api/cards/:id
Authorization: Bearer <token>
```

### 删除卡片 🔒
```
DELETE /api/cards/:id
Authorization: Bearer <token>
```

### 批量删除卡片 🔒
```
POST /api/cards/batch/delete
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "ids": [1, 2, 3]
}
```

### 批量移动卡片 🔒
```
POST /api/cards/batch/move
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "ids": [1, 2, 3],
  "menu_id": 2,
  "sub_menu_id": null
}
```

---

## 广告管理

### 获取广告
```
GET /api/ads
```

### 创建广告 🔒
```
POST /api/ads
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "position": "left",
  "img": "https://example.com/ad.png",
  "url": "https://example.com"
}
```

### 更新广告 🔒
```
PUT /api/ads/:id
Authorization: Bearer <token>
```

### 删除广告 🔒
```
DELETE /api/ads/:id
Authorization: Bearer <token>
```

---

## 友链管理

### 获取友链
```
GET /api/friends
```

### 创建友链 🔒
```
POST /api/friends
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "title": "友站名称",
  "url": "https://example.com",
  "logo": "https://example.com/logo.png"
}
```

### 更新友链 🔒
```
PUT /api/friends/:id
Authorization: Bearer <token>
```

### 删除友链 🔒
```
DELETE /api/friends/:id
Authorization: Bearer <token>
```

---

## 用户管理

### 获取当前用户信息 🔒
```
GET /api/users/me
Authorization: Bearer <token>
```

### 获取用户资料 🔒
```
GET /api/users/profile
Authorization: Bearer <token>
```

### 修改密码 🔒
```
PUT /api/users/password
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "oldPassword": "旧密码",
  "newPassword": "新密码"
}
```

---

## 文件上传

### 上传Logo 🔒
```
POST /api/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**表单字段**:
- `logo`: 图片文件

**响应**:
```json
{
  "path": "logo-1234567890.png"
}
```

---

## 书签导入

### 导入书签 🔒
```
POST /api/import
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**表单字段**:
- `file`: HTML或JSON书签文件
- `menu_id`: 目标菜单ID
- `sub_menu_id`: 目标子菜单ID (可选)

**响应**:
```json
{
  "imported": 10,
  "total": 12,
  "errors": 2
}
```

---

## 数据备份

### 导出备份 🔒
```
GET /api/backup/export
Authorization: Bearer <token>
```

**响应**: JSON文件下载

### 导入备份 🔒
```
POST /api/backup/import
Authorization: Bearer <token>
```

**请求体**:
```json
{
  "data": { ... },
  "overwrite": false
}
```

---

## 错误响应

所有错误响应格式:
```json
{
  "error": "错误描述"
}
```

常见HTTP状态码:
- `400` - 请求参数错误
- `401` - 未授权/Token无效
- `404` - 资源不存在
- `429` - 请求过于频繁
- `500` - 服务器内部错误

---

## 请求限制

- 通用API: 每15分钟100次请求
- 登录接口: 每15分钟5次尝试

🔒 = 需要认证
