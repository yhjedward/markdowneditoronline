# WebDAV 代理模式识别问题修复

## 问题描述

用户配置 WebDAV 地址为 `https://md.yhjedward.com/webdav/` 时，遇到 HTTP 400 错误。

### 错误日志

```
app.js:282 [直接模式] PROPFIND https://md.yhjedward.com/webdav/
/webdav/:1 Failed to load resource: the server responded with a status of 400 ()
app.js:304 WebDAV 请求失败: Error: HTTP 400: - Bad Request
```

## 根本原因

### 问题 1: URL 规范化导致匹配失败

在 `WebDAVClient` 构造函数中（第 143 行），代码会移除用户输入 URL 的末尾斜杠：

```javascript
let url = baseUrl.replace(/\/$/, '');  // 例如: https://md.yhjedward.com/webdav/ → https://md.yhjedward.com/webdav
```

然而，`isProxyAddress()` 函数中的代理路径定义包含末尾斜杠：

```javascript
const proxyPaths = ['/dav/', '/webdav/'];  // ❌ 包含末尾斜杠
```

这导致即使 URL 格式正确，也无法匹配成功。

### 问题 2: 无效的 Content-Type 头

`testConnection()` 和 `listFiles()` 方法发送 PROPFIND 请求时，设置了 `Content-Type: text/xml` 但请求体为 `null`。某些 WebDAV 服务器会拒绝这种不一致的请求，返回 400 Bad Request。

## 解决方案

### 1. 修复 URL 规范化匹配逻辑（`public/app.js`）

更新 `isProxyAddress()` 函数，移除代理路径的末尾斜杠，并规范化 URL 进行匹配：

```javascript
// 修复后的代码
isProxyAddress(url) {
    try {
        const proxyPaths = ['/dav', '/webdav'];  // ✅ 不包含末尾斜杠
        const currentOrigin = window.location.origin;

        // 规范化URL进行匹配（移除末尾斜杠）
        const normalizedUrl = url.replace(/\/$/, '');

        // 检查是否是当前域名下的代理路径（/dav 或 /webdav）
        for (const proxyPath of proxyPaths) {
            if (normalizedUrl === currentOrigin + proxyPath ||
                normalizedUrl === proxyPath) {
                return true;
            }
        }

        return false;
    } catch (e) {
        return false;
    }
}
```

### 2. 移除无效的 Content-Type 头

从 PROPFIND 请求中移除 `Content-Type: text/xml` 头，因为请求体为空：

```javascript
// testConnection() 方法
async testConnection() {
    try {
        const response = await this.request('PROPFIND', '', null, {
            'Depth': '0'  // ✅ 移除了 Content-Type: text/xml
        });
        // ...
    }
}

// listFiles() 方法
async listFiles(path = '', filterMarkdown = false) {
    const response = await this.request('PROPFIND', path, null, {
        'Depth': '1'  // ✅ 移除了 Content-Type: text/xml
    });
    // ...
}
```

### 3. 创建 `.env` 配置文件

根据后端服务器信息创建正确的环境变量配置：

```env
PORT=3000

WEBDAV_PROTOCOL=http
WEBDAV_HOST=1.32.228.66
WEBDAV_PORT=8092
WEBDAV_PATH=/markdowneditor/

WEBDAV_USERNAME=yhj
WEBDAV_PASSWORD=636216
```

## 修复效果

### 修复前

```
WebDAV 地址: https://md.yhjedward.com/webdav/
客户端检测: ❌ 不是代理地址（使用直接模式）
请求方式: 直接发送 PROPFIND 到 /webdav/（带无效的 Content-Type 头）
结果: HTTP 400 Bad Request
```

### 修复后

```
WebDAV 地址: https://md.yhjedward.com/webdav/
客户端检测: ✅ 是代理地址（使用代理模式）
请求方式: 通过 API 端点 /api/files
流程: 浏览器 → /api/files → Node.js 代理 → 后端 WebDAV 服务器
结果: ✅ 成功连接
```

## 支持的代理路径

以下路径都可以使用，功能完全相同（支持带或不带末尾斜杠）：

| 路径格式 | 示例 |
|---------|------|
| `/webdav/` 或 `/webdav` | `https://md.yhjedward.com/webdav/` |
| `/dav/` 或 `/dav` | `https://md.yhjedward.com/dav/` |

两种路径都会：
- 自动触发代理模式
- 使用 API 端点进行通信
- 由代理服务器处理认证
- 避免跨域问题

## 验证步骤

1. **重启代理服务器**
   ```bash
   npm start
   ```

2. **浏览器配置**
   - WebDAV 服务器地址: `https://md.yhjedward.com/webdav/`
   - 用户名和密码: 可留空（使用服务器配置的认证）

3. **测试连接**
   - 打开浏览器开发者工具（F12）
   - 查看 Console 标签
   - 应该看到：`[代理模式] PROPFIND ...`
   - 连接测试应该成功

4. **API 状态检查**
   ```bash
   curl http://localhost:3000/api/status
   ```

## 相关文件

修改的文件：
- `public/app.js` - 修复代理地址识别逻辑和 PROPFIND 请求头
- `FIX_SUMMARY.md` - 更新修复说明

新增的文件：
- `.env` - 服务器配置文件

## 技术细节

### 代理模式工作流程

```
用户浏览器 (https://md.yhjedward.com)
    ↓
检测到 /webdav/ 路径 → 使用代理模式
    ↓
发送请求到: https://md.yhjedward.com/api/files
    ↓
Nginx 代理: /api/ → http://localhost:3000/api/
    ↓
Node.js 代理服务器 (端口 3000)
    ↓
使用配置的认证信息
    ↓
转发到后端: http://1.32.228.66:8092/markdowneditor/
    ↓
返回结果给浏览器
```

### 两种模式对比

| 特性 | 代理模式 | 直接模式 |
|------|----------|----------|
| 检测路径 | `/webdav/` 或 `/dav/` | 其他任意 URL |
| 认证方式 | 服务器配置 | 浏览器输入 |
| 请求路由 | API 端点 | 直接访问 |
| 跨域问题 | ✅ 自动解决 | ❌ 可能失败 |
| 推荐场景 | 生产环境 | 测试环境 |

## 总结

本次修复解决了两个关键问题：

1. **代理地址识别失败**: 由于 URL 规范化逻辑的问题，`/webdav/` 路径（带或不带末尾斜杠）未被正确识别为代理地址，导致前端错误地使用直接连接模式

2. **无效的 PROPFIND 请求头**: 发送 PROPFIND 请求时设置了 `Content-Type: text/xml` 但请求体为空，导致某些 WebDAV 服务器返回 400 Bad Request

修复后，前端会正确识别代理地址并使用代理模式，通过 REST API 端点与后端通信，避免直接发送 WebDAV 方法导致的错误。
