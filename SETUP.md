# MD Editor WebDAV 代理服务器 - 快速开始指南

## 解决方案概述

#>.env.example .git .gitignore PROXY_CONFIG.md README.md app.js index.html manifest.json marked.min.js node_modules package-lock.json package.json public server.js start.sh styles.css sw.js 
#>
 HTTPS 前端和 HTTP WebDAV 服务器之间的跨域问题，提供了一个完整的后端解决方案。

## 快速部署

### 1. 准备环境

#'EOF''EOF'
test -d '/home/engine/project' && cd '/home/engine/project'
- Node.js (推荐 v16+)
- npm

### 2. 配置 WebDAV 服务器

1. 复制环境配置文件：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，配置您的 WebDAV 服务器信息：
```env
PORT=3000
WEBDAV_PROTOCOL=http
WEBDAV_HOST=localhost
WEBDAV_PORT=8092
WEBDAV_PATH=/dav/
WEBDAV_USERNAME=your_username
WEBDAV_PASSWORD=your_password
```

### 3. 启动服务器

**方式一：使用启动脚本（推荐）**
```bash
chmod +x start.sh
./start.sh
```

**方式二：手动启动**
```bash
npm install
npm start
```

### 4. 访问应用

- **前端应用**: http://localhost:3000
- **WebDAV 代理**: http://localhost:3000/dav/
- **API 状态**: http://localhost:3000/api/status

## 前端配置

### 方法一：使用代理地址

 Markdown 编辑器的 WebDAV 设置中：

1. 打开前端应用
2. 点击"WebDAV 同步"按钮
3. 配置以下信息：
   - **服务器地址**: `http://localhost:3000/dav/` 或 `https://your-domain.com/dav/`
   - **用户名**: 您的 WebDAV 用户名
   - **密码**: 您的 WebDAV 密码
4. 点击"测试连接"验证配置

### 方法二：自动检测

#
#
#
#test -d '/home/engine/project' && cd /home/engine/project/
#
test -d '/home/engine/project' && /home/engine/project  cd API 端点而不是直接连接 WebDAV 服务器。

## 支持的功能

### WebDAV 代理功能
- ✅ 文件列表浏览 (PROPFIND)
- ✅ 文件读取 (GET)
- ✅ 文件上传 (PUT)
- ✅ 文件删除 (DELETE)
- ✅ 目录操作 (MKCOL)
- ✅ 文件移动 (MOVE)
- ✅ 文件复制 (COPY)

### API 端点
- `GET /api/status` - 服务器状态
- `GET /api/test-connection` - WebDAV 连接测试
- `GET /api/files` - 获取文件列表
- `GET /api/file/*` - 读取文件
- `PUT /api/file/*` - 写入文件
- `DELETE /api/file/*` - 删除文件

## 安全特性

1. **CORS 支持**: 自动处理跨域请求
2. **认证代理**: 在后端处理 WebDAV 认证
3. **请求转发**: 透明代理所有 WebDAV 操作
4. **错误处理**: 完善的错误响应和日志记录
5. **安全头**: 使用 Helmet 设置安全 HTTP 头

## 生产环境部署

### 使用 Nginx 反向代理

--------，建议使用 Nginx 作为反向代理：

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 配置
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # 前端静态文件
    location / {
        root /path/to/md-editor/public;
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
```

### 使用 PM2 管理进程

#'EOF' 
 PM2：
```bash
npm install -g pm2
```

test -d '/home/engine/project' && cd '/home/engine/project'
```bash
pm2 start server.js --name "md-editor-proxy"
pm2 startup
pm2 save
```

## 故障排除

### 常见问题

1. **连接失败**
   - 检查 WebDAV 服务器是否正常运行
   - 验证 `.env` 文件中的配置
   - 确认防火墙设置

2. **认证错误**
   - 验证用户名和密码
   - 检查 WebDAV 服务器权限

3. **跨域问题**
   - 确保前端使用代理地址
   - 检查浏览器控制台错误

4. **性能问题**
   - 启用 gzip 压缩
   - 配置适当的缓存策略

### 日志查看

test -d /home/engine/project && cd /home/engine/project
- 请求时间和方法
- 目标 URL
- 响应状态
- 错误信息

### 测试连接

 API 端点测试连接：
```bash
curl http://localhost:3000/api/status
curl http://localhost:3000/api/test-connection
```

## 开发说明

### 项目结构

```
/home/engine/project/
 server.js          # 主服务器文件
 package.json       # 依赖配置
 .env.example       # 环境变量示例
 start.sh          # 启动脚本
 public/           # 前端静态文件
   ├── index.html
   ├── app.js        # 增强版 WebDAV 客户端
   └── ...
 PROXY_CONFIG.md   # 详细配置文档
 SETUP.md          # 本文档
```

### 自定义配置

 `server.js` 中修改以下设置：
- 端口号
- CORS 配置
- 代理路径
- 超时设置
- 日志级别

## 技术支持

#test -d '/home/engine/project' && cd /home/engine/project/
test -d '/home/engine/project' && cd '/home/engine/project'
1. 服务器日志输出
2. 浏览器开发者工具控制台
3. 网络连接状态
4. WebDAV 服务器配置

---

**注意**: 这是一个开发版本的代理服务器，生产环境使用前请进行充分测试。
