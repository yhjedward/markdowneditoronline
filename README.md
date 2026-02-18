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
- **WebDAV 代理**: http://localhost:3000/dav/
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

## 🔧 配置说明

### WebDAV 同步配置

1. 在编辑器中点击侧边栏的"WebDAV 同步"按钮
2. 填写服务器信息：
   - **服务器地址**: 如 `http://localhost:3000/dav/`（使用代理）或直接 WebDAV 地址
   - **用户名**: 你的 WebDAV 账号
   - **密码**: 你的 WebDAV 密码
3. 点击"测试连接"验证配置
4. 保存后即可同步文件

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

2. **检查认证信息**
   - 确认用户名和密码正确
   - 注意大小写

3. **查看浏览器控制台**
   - 按 `F12` 打开开发者工具
   - 查看控制台错误信息

4. **测试连接**
```bash
# 测试 WebDAV 服务器是否正常
curl -X PROPFIND -H "Depth: 0" -u "username:password" http://your-server/
```

### 常见错误

- **认证失败 (HTTP 401)**: 用户名或密码错误
- **权限不足 (HTTP 403)**: 账号没有访问权限
- **未找到 (HTTP 404)**: 服务器地址不正确或路径不存在
- **跨域(CORS)问题**: 使用代理服务器解决

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
