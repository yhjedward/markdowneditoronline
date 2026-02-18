# MD Editor - Markdown 编辑器

一款专为移动设备优化的在线 Markdown 编辑器，支持 WebDAV 同步功能。项目包含完整的 **WebDAV 代理服务器**，解决了 HTTPS 前端与 HTTP WebDAV 服务器之间的跨域问题。

## ✨ 特性

### 编辑功能
- 📝 **完整的 Markdown 支持** - 标题、列表、链接、图片、代码块等所有标准语法
- 🎨 **实时预览** - 编辑与预览实时同步，一键切换
- ↩️ **撤销/重做** - 完整的编辑历史管理
- 🔧 **快捷工具栏** - 快速插入常用 Markdown 语法
- ⌨️ **键盘快捷键** - `Ctrl+S` 保存，`Ctrl+Z` 撤销，`Ctrl+Shift+Z` 重做

### 数据存储
- 💾 **本地存储** - 使用 IndexedDB 本地存储，数据安全可靠
- 🔄 **WebDAV 同步** - 支持双向同步到 WebDAV 服务器
- 📁 **目录浏览** - 支持浏览 WebDAV 服务器上的目录结构
- 📴 **离线可用** - PWA 支持，可安装到主屏幕离线使用

### 用户体验
- 📱 **移动优先设计** - 完美适配手机和平板，支持触摸滑动操作
- 🌙 **深色主题** - 护眼的深色界面设计
- 👆 **触摸手势** - 从左边缘向右滑动打开侧边栏

## ❓ 遇到问题？

如果您在使用过程中遇到任何问题，请查看以下文档：

- 📖 **[USER_INSTRUCTIONS.md](USER_INSTRUCTIONS.md)** - 快速上手指南，30 秒解决常见问题
- 🔧 **[QUICKFIX.md](QUICKFIX.md)** - 快速修复 HTTP 405 错误
- 📚 **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - 详细故障排除指南
- 🛠️ **[SOLUTION_SUMMARY.md](SOLUTION_SUMMARY.md)** - 完整的技术解决方案说明

### 诊断工具

运行诊断脚本检查配置：
```bash
npm run diagnose
```

### 常见问题速查

| 问题 | 快速解决 | 详细说明 |
|------|---------|---------|
| HTTP 405 错误 | 使用 `/webdav/` 地址 | 查看 [QUICKFIX.md](QUICKFIX.md) |
| CORS 跨域错误 | 使用代理模式 | 查看 [TROUBLESHOOTING.md](TROUBLESHOOTING.md) |
| 认证失败 | 检查用户名密码 | 查看 [USER_INSTRUCTIONS.md](USER_INSTRUCTIONS.md) |

## 🚀 快速开始

### 前置要求
- Node.js 16+
- npm

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd md-editor-proxy
```

2. **配置环境变量**
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置 WebDAV 服务器信息：
```env
PORT=3000
WEBDAV_PROTOCOL=http
WEBDAV_HOST=localhost
WEBDAV_PORT=8092
WEBDAV_PATH=/dav/
WEBDAV_USERNAME=your_username
WEBDAV_PASSWORD=your_password
```

3. **启动服务器**
```bash
# 使用启动脚本（推荐）
chmod +x start.sh
./start.sh

# 或手动启动
npm install
npm start
```

### 访问应用

启动成功后，可以通过以下地址访问：
- **前端应用**: http://localhost:3000
- **WebDAV 代理**: http://localhost:3000/webdav/ 或 http://localhost:3000/dav/
- **API 状态**: http://localhost:3000/api/status

## 📁 项目结构

```
md-editor-proxy/
├── public/              # 前端静态文件
│   ├── index.html      # 主页面
│   ├── app.js          # 主应用逻辑
│   ├── styles.css      # 样式文件
│   ├── marked.min.js   # Markdown 渲染引擎
│   ├── manifest.json   # PWA 配置
│   └── sw.js           # Service Worker
├── server.js           # Express 代理服务器
├── package.json        # 依赖配置
├── .env.example        # 环境变量示例
├── start.sh           # 启动脚本
└── README.md          # 项目文档
```

## 🔬 WebDAV 代理工作原理

### 什么是 WebDAV 代理？

WebDAV 代理是一种解决跨域问题的架构模式。在传统的 WebDAV 集成方案中，前端应用需要直接与 WebDAV 服务器通信，这在以下情况下会遇到问题：

1. **HTTPS vs HTTP 混合内容问题**
   - 现代浏览器会阻止 HTTPS 页面加载 HTTP 资源
   - 前端应用运行在 HTTPS，WebDAV 服务器运行在 HTTP
   - 浏览器会报"混合内容"错误

2. **跨域(CORS)限制**
   - 浏览器阻止不同域名间的请求
   - WebDAV 服务器需要特殊配置才能允许跨域访问

3. **认证信息传递**
   - 跨域请求中认证头可能被阻止
   - Basic Auth 在某些情况下无法正常工作

### 代理模式解决方案

我们的代理模式通过以下机制解决了这些问题：

```
用户浏览器 (HTTPS)
    ↓ 同一域名请求
代理服务器 (HTTPS)  ← 无跨域问题
    ↓ HTTP/HTTPS 连接
WebDAV 服务器        ← 后端服务器间通信，无浏览器限制
```

**核心实现原理：**

1. **智能检测模式**
   ```javascript
   // 前端自动检测是否是代理地址
   isProxyAddress(url) {
       return url === window.location.origin + '/dav/';
   }
   ```

2. **API 端点转换**
   - `PROPFIND /path/` → `GET /api/files`
   - `GET /path/file.md` → `GET /api/file/path/file.md`
   - `PUT /path/file.md` → `PUT /api/file/path/file.md`

3. **后端代理处理**
   ```javascript
   // Express 路由处理
   app.get('/api/files', proxy.listFiles);
   app.get('/api/file/*', proxy.getFile);
   app.put('/api/file/*', proxy.putFile);
   app.delete('/api/file/*', proxy.deleteFile);
   ```

### 对比：代理模式 vs 直接连接

| 特性 | 代理模式 | 直接连接模式 |
|------|----------|--------------|
| 跨域支持 | ✅ 自动解决 | ❌ 需要服务器配置 CORS |
| HTTPS 兼容性 | ✅ 支持 | ❌ 需要 HTTPS WebDAV 服务器 |
| 配置复杂度 | ✅ 简单 | ❌ 需要服务器端配置 |
| 安全性 | ✅ 统一认证 | ❌ 暴露 WebDAV 服务器 |
| 调试难度 | ✅ 集中日志 | ❌ 分散的浏览器错误 |

### 技术架构图

```
┌─────────────────┐    同一域名请求    ┌─────────────────┐
│                 │ ─────────────────→ │                 │
│   前端应用       │                   │   代理服务器     │
│  (index.html)   │ ←───────────────── │  (server.js)    │
│                 │   API 响应         │                 │
└─────────────────┘                   └─────────────────┘
                                              │
                                              │ HTTP/HTTPS
                                              ↓
                                      ┌─────────────────┐
                                      │                 │
                                      │  WebDAV 服务器  │
                                      │ (Nextcloud/自建)│
                                      │                 │
                                      └─────────────────┘
```

## 🔧 配置说明

### WebDAV 同步配置

本编辑器支持两种 WebDAV 连接模式：**代理模式**和**直接连接模式**。

#### 1. 代理模式（推荐）

**什么是 WebDAV 代理？**

WebDAV 代理是本项目的核心特性，它解决了前端应用与 WebDAV 服务器之间的跨域(CORS)问题。当你的前端运行在 HTTPS 协议下，而 WebDAV 服务器只支持 HTTP 时，浏览器会阻止直接的跨域请求。代理模式通过在同一域名下提供 API 端点来规避这个问题。

**代理模式的优势：**
- ✅ 解决 HTTPS 前端与 HTTP WebDAV 服务器的跨域问题
- ✅ 无需在 WebDAV 服务器上配置 CORS 响应头
- ✅ 统一的安全策略和认证处理
- ✅ 更好的错误处理和调试信息

**配置步骤：**

1. **启动代理服务器**
   确保代理服务器正在运行：
   ```bash
   npm start
   ```

2. **在编辑器中配置**
   - 点击侧边栏的"WebDAV 同步"按钮
   - 在"WebDAV 服务器地址"中输入：`http://your-domain.com/webdav/` 或 `http://your-domain.com/dav/`
   - 填写你的 WebDAV 账号信息（代理模式下可留空，使用服务器配置的认证）
   - 点击"测试连接"验证配置
   - 保存后即可开始同步

**重要提示：**
- 代理地址必须指向当前域名下的 `/webdav/` 或 `/dav/` 路径
- 例如：如果你的应用运行在 `https://example.com`，那么 WebDAV 地址应填写为 `https://example.com/webdav/` 或 `https://example.com/dav/`
- 代理会自动处理与后端 WebDAV 服务器的连接
- 两种路径 (`/webdav/` 和 `/dav/`) 功能完全相同，选择其一即可

#### 2. 直接连接模式

**适用场景：**
- WebDAV 服务器已正确配置 CORS 响应头
- 开发环境或内网环境
- 信任的 WebDAV 服务器

**配置步骤：**

1. **确保 WebDAV 服务器支持 CORS**
   在 WebDAV 服务器上配置以下响应头：
   ```nginx
   # Nginx 配置示例
   add_header Access-Control-Allow-Origin *;
   add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
   add_header Access-Control-Allow-Headers "Authorization, Content-Type";
   ```

2. **在编辑器中配置**
   - 点击侧边栏的"WebDAV 同步"按钮
   - 在"WebDAV 服务器地址"中输入完整的 WebDAV 地址：
     - Nextcloud: `https://your-cloud.com/remote.php/dav/files/username/`
     - 坚果云: `https://dav.jianguoyun.com/dav/`
     - 自建服务器: `http://your-server:8092/dav/`
   - 填写对应的用户名和密码
   - 点击"测试连接"验证配置

**选择建议：**

| 场景 | 推荐模式 | 原因 |
|------|----------|------|
| HTTPS 前端 + HTTP WebDAV | 代理模式 | 解决跨域问题 |
| 已配置 CORS 的 HTTPS WebDAV | 直接连接 | 更简单的架构 |
| 开发环境 | 直接连接 | 配置简单 |
| 生产环境 | 代理模式 | 更安全可靠 |

### 浏览 WebDAV 目录

1. 在侧边栏的"WebDAV 文件"区域，可以看到路径输入框
2. 输入服务器目录路径（如：`/documents`），点击"浏览"
3. 文件夹导航：
   - 点击文件夹图标进入目录
   - 点击"↑"返回上一级
   - 点击"刷新列表"重新加载
4. 文件操作：
   - 点击文件名直接打开编辑
   - 点击下载按钮下载到本地

### 实际使用示例

#### 示例 1：使用代理模式连接到坚果云

**场景：** 你有一个运行在 HTTP 的 WebDAV 服务器，想要从 HTTPS 网站访问

**步骤：**
1. **启动代理服务器**
   ```bash
   npm start
   ```

2. **配置环境变量** (`.env`)
   ```env
   PORT=3000
   WEBDAV_PROTOCOL=https
   WEBDAV_HOST=dav.jianguoyun.com
   WEBDAV_PORT=443
   WEBDAV_PATH=/dav/
   WEBDAV_USERNAME=your_email@example.com
   WEBDAV_PASSWORD=your_password
   ```

3. **在编辑器中配置**
   - WebDAV 服务器地址：`https://your-domain.com/dav/`
   - 用户名和密码：与坚果云账号相同

**为什么这样工作？**
- 前端发送请求到 `https://your-domain.com/dav/`（同一域名，无跨域问题）
- 代理服务器连接到 `https://dav.jianguoyun.com/dav/`（服务器间通信，无浏览器限制）

#### 示例 2：使用代理模式连接到自建 WebDAV 服务器

**场景：** 你有一个运行在内网的 HTTP WebDAV 服务器，想要通过代理从外网访问

**网络架构：**
```
Internet → 代理服务器 (外网) → 内网 WebDAV 服务器
```

**配置步骤：**

1. **在内网 WebDAV 服务器上安装并配置**
   ```bash
   # 使用 Docker 快速部署 WebDAV 服务器
   docker run -d \
     --name webdav \
     -p 8092:80 \
     -v /path/to/webdav:/var/lib/dav/data \
     -e AUTH_TYPE=Basic \
     -e USERNAME=admin \
     -e PASSWORD=password \
     morrisjobke/webdav
   ```

2. **在代理服务器上配置** (`.env`)
   ```env
   PORT=3000
   WEBDAV_PROTOCOL=http
   WEBDAV_HOST=192.168.1.100
   WEBDAV_PORT=8092
   WEBDAV_PATH=/dav/
   WEBDAV_USERNAME=admin
   WEBDAV_PASSWORD=password
   ```

3. **在编辑器中配置**
   - WebDAV 服务器地址：`https://your-domain.com/dav/`

**网络流程：**
```
用户 → https://your-domain.com → 代理服务器 → http://192.168.1.100:8092
```

#### 示例 3：开发环境直接连接测试

**场景：** 开发环境快速测试，不使用代理

**配置步骤：**

1. **本地启动 WebDAV 服务器**
   ```bash
   # 安装 cadaver（WebDAV 客户端工具）
   # Ubuntu/Debian
   sudo apt install cadaver
   
   # 启动简单 WebDAV 服务器进行测试
   python3 -m http.server 8092
   ```

2. **在编辑器中配置（直接连接模式）**
   - WebDAV 服务器地址：`http://localhost:8092/`
   - 用户名：留空或任意值
   - 密码：留空或任意值

**注意：** 这种配置仅用于开发测试，生产环境请使用代理模式。

#### 示例 4：生产环境完整部署

**场景：** 完整的生产环境部署，包括 HTTPS 代理和 WebDAV 后端

**步骤 1：配置代理服务器** (`.env`)
```env
PORT=3000
WEBDAV_PROTOCOL=http
WEBDAV_HOST=webdav-backend.internal
WEBDAV_PORT=8092
WEBDAV_PATH=/dav/
WEBDAV_USERNAME=production_user
WEBDAV_PASSWORD=secure_password
```

**步骤 2：使用 PM2 管理进程**
```bash
npm install -g pm2
pm2 start server.js --name "md-editor-proxy"
pm2 startup
pm2 save
```

**步骤 3：配置 Nginx 反向代理**
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书配置
    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;

    # 前端应用
    location / {
        root /var/www/md-editor/public;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebDAV 代理
    location /dav/ {
        proxy_pass http://localhost:3000/dav/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

**步骤 4：在编辑器中配置**
- WebDAV 服务器地址：`https://your-domain.com/dav/`

**安全优势：**
- 统一 HTTPS 访问
- WebDAV 后端隐藏在内网
- 统一的认证和授权
- 集中的安全策略

## 🌐 支持的 WebDAV 服务

- ✅ Nextcloud
- ✅ ownCloud
- ✅ 坚果云
- ✅ Box.com
- ✅ Yandex.Disk
- ✅ 其他标准 WebDAV 服务

## 🔧 技术栈

### 前端
- 纯原生 JavaScript (ES6+)
- IndexedDB - 本地数据存储
- WebDAV 协议 - 云同步
- Service Worker - PWA 离线支持
- CSS3 - 响应式布局

### 后端
- Express.js - Web 服务器
- Axios - HTTP 客户端
- CORS - 跨域处理
- Helmet - 安全中间件
- Morgan - 日志记录

## 🐛 故障排除

### WebDAV 连接失败

1. **检查服务器地址**
   - 确保地址正确，并以 `/` 结尾
   - 使用完整的 URL（http:// 或 https://）
   - 代理模式下，地址必须是当前域名下的 `/dav/` 路径

2. **检查认证信息**
   - 确认用户名和密码正确
   - 注意大小写

3. **查看浏览器控制台**
   - 按 `F12` 打开开发者工具
   - 查看控制台错误信息
   - 代理模式会在控制台显示 `[代理模式]` 或 `[直接模式]` 标识

4. **测试连接**
```bash
# 测试 WebDAV 服务器是否正常
curl -X PROPFIND -H "Depth: 0" -u "username:password" http://your-server/

# 测试代理服务器是否正常
curl http://localhost:3000/api/status
```

### 代理模式常见问题

#### 问题：代理模式不生效

**症状：** 浏览器仍然出现 CORS 错误

**排查步骤：**
1. 确认填写的地址是 `/dav/` 结尾
2. 检查浏览器控制台是否有 `[代理模式]` 日志
3. 确保代理服务器正在运行：`curl http://localhost:3000/api/status`
4. 检查前端应用和代理服务器是否在同一域名下

#### 问题：代理服务器启动失败

**排查步骤：**
1. 检查端口是否被占用：
   ```bash
   lsof -i :3000
   ```
2. 检查环境变量配置是否正确
3. 查看服务器日志错误信息

#### 问题：代理无法连接后端 WebDAV

**排查步骤：**
1. 确认 `.env` 文件中的 WebDAV 服务器配置正确
2. 测试后端 WebDAV 服务器是否可达：
   ```bash
   curl -X PROPFIND -H "Depth: 0" -u "username:password" http://your-webdav-server:8092/
   ```
3. 检查后端 WebDAV 服务器是否允许来自代理服务器的访问

### 直接连接模式常见问题

#### 问题：跨域(CORS)错误

**症状：** 浏览器提示 "Access to fetch at... has been blocked by CORS policy"

**解决方案：**
1. **推荐方案**：改用代理模式
2. 在 WebDAV 服务器上配置 CORS 响应头：

**Nginx 配置：**
```nginx
location / {
    # CORS 配置
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PROPFIND, OPTIONS";
    add_header Access-Control-Allow-Headers "Authorization, Content-Type, Depth";
    add_header Access-Control-Allow-Credentials "true";

    # 处理预检请求
    if ($request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PROPFIND, OPTIONS";
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, Depth";
        add_header Access-Control-Max-Age 86400;
        return 204;
    }

    # WebDAV 配置
    dav_methods PUT DELETE MKCOL COPY MOVE;
    dav_access user:rw;
    autoindex on;
}
```

**Apache 配置：**
```apache
<VirtualHost *:80>
    ServerName your-server.com
    DocumentRoot /path/to/webdav

    # CORS 配置
    Header set Access-Control-Allow-Origin "*"
    Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PROPFIND, OPTIONS"
    Header set Access-Control-Allow-Headers "Authorization, Content-Type, Depth"

    # WebDAV 配置
    DAV On
    Options Indexes

    <Directory "/path/to/webdav">
        DAV On
        Require valid-user
        AuthType Basic
        AuthName "WebDAV"
        AuthUserFile /path/to/.htpasswd
    </Directory>
</VirtualHost>
```

### 常见错误代码

| 错误代码 | 含义 | 解决方案 |
|----------|------|----------|
| HTTP 401 | 认证失败 | 检查用户名和密码 |
| HTTP 403 | 权限不足 | 检查账号权限设置 |
| HTTP 404 | 未找到 | 检查服务器地址和路径 |
| HTTP 207 | 多状态响应 | 正常情况，表示请求成功 |
| CORS 错误 | 跨域问题 | 使用代理模式或配置 CORS |
| ECONNREFUSED | 连接拒绝 | 检查服务器是否运行 |

## 🌐 生产环境部署

### 使用 Nginx 反向代理

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 配置
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # 前端静态文件
    location / {
        root /path/to/md-editor-proxy/public;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebDAV 代理
    location /dav/ {
        proxy_pass http://localhost:3000/dav/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Destination $http_destination;
        proxy_set_header Depth $http_depth;
    }
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### 使用 PM2 管理进程

```bash
npm install -g pm2
pm2 start server.js --name "md-editor-proxy"
pm2 startup
pm2 save
```

## 📊 API 端点

- `GET /api/status` - 服务器状态
- `GET /api/test-connection` - 测试 WebDAV 连接
- `GET /api/files` - 获取文件列表
- `GET /api/file/*` - 读取文件
- `PUT /api/file/*` - 写入文件
- `DELETE /api/file/*` - 删除文件

## 🔒 安全特性

1. **CORS 支持** - 自动处理跨域请求
2. **认证代理** - 在后端处理 WebDAV 认证
3. **安全头** - 使用 Helmet 设置安全 HTTP 头
4. **请求转发** - 透明代理所有 WebDAV 操作
5. **错误处理** - 完善的错误响应和日志记录

## 🌐 浏览器兼容性

- Chrome/Edge 80+
- Firefox 75+
- Safari 13+
- Chrome for Android 80+
- Safari on iOS 13+

## 📝 开源协议

MIT License
