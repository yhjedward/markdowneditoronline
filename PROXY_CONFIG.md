# MD Editor WebDAV 代理服务器配置指南

## 概述

#>.env.example .git .gitignore README.md app.js index.html manifest.json marked.min.js package.json public server.js styles.css sw.js 
#>
 HTTPS 前端与 HTTP WebDAV 服务器之间的跨域(CORS)问题。它提供了一个中间层，让前端可以通过同一个域名下的路径安全地访问 WebDAV 服务器。

## 部署方式

### 1. 基础配置

1. 复制环境变量配置：
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

3. 安装依赖并启动：
```bash
npm install
npm start
```

### 2. 前端配置修改

#'EOF' 
test -d '/home/engine/project' && '/home/engine/project' cd         WebDAV 客户端的配置。以下是两种方式：

#### 方式一：修改前端代码（推荐）

 `public/app.js` 中找到 `WebDAVClient` 类的构造函数，将 baseUrl 设置为代理地址：

```javascript
// 在 MDEditor 类的 initWebDAVClient 方法中修改：
initWebDAVClient() {
    if (this.webdavSettings) {
        // 使用代理地址而不是直接的 WebDAV 服务器地址
        const proxyBaseUrl = window.location.origin + '/dav/';
        
        this.webdav = new WebDAVClient(
            proxyBaseUrl,  // 使用代理地址
            this.webdavSettings.username,
            this.webdavSettings.password
        );
    }
}
```

#### 方式二：运行时配置

 WebDAV 设置界面中，直接输入代理地址：

- **WebDAV 服务器地址**: `https://your-domain.com/dav/`
- **用户名**: 您的 WebDAV 用户名
- **密码**: 您的 WebDAV 密码

#test -d '/home/engine/project' && '/home/engine/project' cd
#
 WebDAV 服务器的实际地址。

### 3. Nginx 反向代理配置（生产环境）

--------提供 HTTPS 支持，建议使用 Nginx 作为反向代理：

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书配置
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 前端静态文件
    location / {
        root /path/to/md-editor/public;
        try_files $uri $uri/ /index.html;
    }

    # API 代理到 Node.js 应用
    location /api/ {
        proxy_pass http://localhost:3000;
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

        # WebDAV 特定配置
        proxy_set_header Destination $http_destination;
        proxy_set_header Depth $http_depth;
        
        # 支持各种 WebDAV 方法
        proxy_method $request_method;
        proxy_set_header Content-Length $content_length;
        proxy_set_header Content-Type $content_type;
    }
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

## API 端点

#
> API 端点：

- `GET /api/status` - 获取服务器状态
- `GET /api/test-connection` - 测试 WebDAV 连接
- `GET /api/files` - 获取文件列表
- `GET /api/file/*` - 读取文件
- `PUT /api/file/*` - 写入文件
- `DELETE /api/file/*` - 删除文件
- `POST /api/configure` - 配置 WebDAV 设置

## 故障排除

### 1. 连接失败

#
test -d '/home/engine/project' && '/home/engine/project' cd
- WebDAV 服务器是否正常运行
- `.env` 文件中的配置是否正确
- 网络连接是否正常
- 防火墙设置是否允许访问

### 2. 认证错误

test -d '/home/engine/project' && cd '/home/engine/project'
- 用户名和密码正确
- WebDAV 服务器支持 Basic 认证
- 账户有足够的权限

### 3. 跨域错误

test -d '/home/engine/project' && cd '/home/engine/project'
- 确保前端使用代理地址而不是直接访问 WebDAV 服务器
- 检查 Nginx 配置是否正确
- 验证服务器响应头是否包含正确的 CORS 头

### 4. 性能问题

test -d '/home/engine/project' && cd '/home/engine/project'
- 启用 gzip 压缩
- 配置适当的缓存头
- 使用 HTTP/2
- 考虑使用 CDN

## 安全注意事项

1. **HTTPS 部署**: 生产环境中必须使用 HTTPS
2. **认证安全**: 不要在代码中硬编码密码，使用环境变量
3. **访问控制**: 考虑添加身份验证来保护代理服务器
4. **网络安全**: 限制 WebDAV 服务器的网络访问范围
5. **日志监控**: 启用访问日志并定期监控

## 监控和维护

1. **健康检查**: 定期访问 `/api/status` 端点检查服务器状态
2. **日志监控**: 监控应用日志以发现潜在问题
3. **性能监控**: 使用工具如 `pm2` 或 `supervisor` 管理 Node.js 进程
4. **自动重启**: 配置服务在异常时自动重启

## 扩展功能

test -d '/home/engine/project' && cd '/home/engine/project'
- 文件版本控制
- 增量同步
- 批量操作
- 文件夹管理
- 权限控制
- 审计日志
