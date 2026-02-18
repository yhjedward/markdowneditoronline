# WebDAV 连接问题故障排除指南

## 当前问题：HTTP 405 Not Allowed 错误

### 错误现象
```
服务器错误：HTTP 405: - <html> <head><title>405 Not Allowed</title></head> <body> <center><h1>405 Not Allowed</h1></center> <hr><center>nginx/1.24.0 (Ubuntu)</center> </body> </html>
```

### 原因分析

这个错误表明：
1. 浏览器配置的 WebDAV 地址是 `https://md.yhjedward.com/markdowneditor`
2. 这个地址不是代理服务器的 `/webdav/` 路径
3. 浏览器使用"直接连接模式"向 nginx 发送 WebDAV 方法（如 PROPFIND、PUT、DELETE 等）
4. nginx 没有配置 WebDAV 支持，拒绝这些 HTTP 方法，返回 405 错误

### 解决方案

#### ✅ 方案 1：使用代理模式（推荐，最简单）

**修改浏览器中的 WebDAV 服务器地址为：**

```
http://localhost:3000/webdav/
```

或（如果您通过域名访问）：

```
https://md.yhjedward.com/webdav/
```

**工作原理：**
- 前端检测到 `/webdav/` 路径 → 自动使用代理模式
- 代理服务器将请求转发到后端 `http://1.32.228.66:8092/markdowneditor/`
- 无需修改 nginx 配置

#### ✅ 方案 2：配置 nginx 支持 WebDAV（直接连接模式）

如果您希望浏览器直接使用 `https://md.yhjedward.com/markdowneditor`，需要：

1. 在 nginx 配置中添加 WebDAV 支持
2. 参考文件：`nginx-webdav-config-example.conf`
3. 重启 nginx 服务

## 配置对比表

| 配置项 | 当前配置（错误） | 正确配置（代理模式） |
|--------|-----------------|---------------------|
| 浏览器 WebDAV 地址 | `https://md.yhjedward.com/markdowneditor` | `https://md.yhjedward.com/webdav/` 或 `http://localhost:3000/webdav/` |
| 后端 WebDAV 服务器 | `http://1.32.228.66:8092/markdowneditor/` | `http://1.32.228.66:8092/markdowneditor/`（保持不变） |
| 连接模式 | 直接连接（失败） | 代理模式（✅） |
| nginx 配置 | 需要 WebDAV 支持 | 不需要额外配置 |

## 快速测试步骤

### 1. 测试代理服务器是否运行

在终端执行：
```bash
curl http://localhost:3000/api/status
```

期望返回：
```json
{
  "status": "online",
  "server": "MD Editor WebDAV Proxy",
  "version": "1.0.0",
  "webdav": {
    "backend_url": "http://1.32.228.66:8092/markdowneditor/",
    "configured": true
  }
}
```

### 2. 测试后端 WebDAV 连接

```bash
curl -X PROPFIND \
  -H "Depth: 0" \
  -u "yhj:636216" \
  http://1.32.228.66:8092/markdowneditor/
```

如果返回 207 或 200，说明后端 WebDAV 服务器正常。

### 3. 测试代理模式

```bash
curl http://localhost:3000/api/test-connection
```

## 常见问题

### Q1: 为什么不能直接用 `https://md.yhjedward.com/markdowneditor`？

A: 因为 nginx 默认不配置 WebDAV 支持。您需要：
- 修改 nginx 配置添加 WebDAV 方法支持（参考 `nginx-webdav-config-example.conf`）
- 或使用代理模式，通过本项目的 Node.js 代理服务器

### Q2: 如何确认当前使用的是哪种模式？

A: 打开浏览器开发者工具（F12），查看控制台日志：
- `[代理模式]` → 代理模式
- `[直接模式]` → 直接连接模式

### Q3: 代理模式和直接模式有什么区别？

| 特性 | 代理模式 | 直接连接模式 |
|------|----------|--------------|
| WebDAV 地址格式 | `https://domain.com/webdav/` | 完整的 WebDAV URL |
| 跨域支持 | ✅ 自动解决 | ❌ 需要服务器配置 CORS |
| HTTPS 兼容性 | ✅ 支持 | ❌ 需要 HTTPS WebDAV 服务器 |
| 配置复杂度 | ✅ 简单 | ❌ 需要 nginx 配置 |
| 推荐场景 | 生产环境 | 开发/测试环境 |

## 推荐配置（生产环境）

### 1. 环境变量配置 (.env)

```env
PORT=3000

# WebDAV后端服务器配置
WEBDAV_PROTOCOL=http
WEBDAV_HOST=1.32.228.66
WEBDAV_PORT=8092
WEBDAV_PATH=/markdowneditor/

# WebDAV认证信息
WEBDAV_USERNAME=yhj
WEBDAV_PASSWORD=636216
```

### 2. 浏览器 WebDAV 配置

```
WebDAV 服务器地址：https://md.yhjedward.com/webdav/
用户名：留空（代理模式下不需要）
密码：留空（代理模式下不需要）
```

### 3. Nginx 配置（仅需要代理到 Node.js 服务器）

```nginx
server {
    listen 443 ssl http2;
    server_name md.yhjedward.com;

    # SSL 证书配置
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # 将所有请求代理到 Node.js 服务器
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 获取更多帮助

如果问题仍未解决，请提供以下信息：
1. 浏览器控制台日志（F12 → Console）
2. 代理服务器日志
3. 代理服务器状态：`curl http://localhost:3000/api/status`
