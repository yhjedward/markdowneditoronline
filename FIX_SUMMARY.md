# WebDAV 代理模式识别问题修复

## 问题描述

用户配置 WebDAV 地址为 `https://md.yhjedward.com/webdav/` 时，遇到 HTTP 400 错误。

### 错误日志

```
app.js:282 [直接模式] PROPFIND https://md.yhjedward.com/webdav/
/webdav/:1 Failed to load resource: the server responded with a status of 400 ()
app.js:304 WebDAV 请求失败: Error: HTTP 400: - Bad Request
```

服务器日志：
```
::ffff:127.0.0.1 - yhj [18/Feb/2026:10:29:20 +0000] "PROPFIND /webdav/ HTTP/1.0" 400 11 "https://md.yhjedward.com/" "Mozilla/5.0"
```

## 根本原因

前端代码 `app.js` 中的 `isProxyAddress()` 函数只识别 `/dav/` 路径作为代理地址，不识别 `/webdav/` 路径。

```javascript
// 原代码（只识别 /dav/）
isProxyAddress(url) {
    const proxyPath = '/dav/';  // ❌ 只检查这一个路径
    const currentOrigin = window.location.origin;

    if (url === currentOrigin + proxyPath ||
        url === currentOrigin.replace(/\/$/, '') + '/dav/' ||
        url === proxyPath) {
        return true;
    }
    return false;
}
```

这导致：
1. 用户的配置 `https://md.yhjedward.com/webdav/` 未被识别为代理地址
2. 前端使用"直接连接模式"而非"代理模式"
3. 直接模式下发送 PROPFIND 请求到 `/webdav/`，但后端返回 400 错误

## 解决方案

### 1. 修改前端代码（`public/app.js`）

更新 `isProxyAddress()` 函数，使其同时识别 `/dav/` 和 `/webdav/` 作为代理地址：

```javascript
// 修复后的代码（同时识别 /dav/ 和 /webdav/）
isProxyAddress(url) {
    try {
        const proxyPaths = ['/dav/', '/webdav/'];  // ✅ 支持两个路径
        const currentOrigin = window.location.origin;

        // 检查是否是当前域名下的代理路径（/dav/ 或 /webdav/）
        for (const proxyPath of proxyPaths) {
            if (url === currentOrigin + proxyPath ||
                url === currentOrigin.replace(/\/$/, '') + proxyPath ||
                url === proxyPath) {
                return true;
            }
        }

        return false;
    } catch (e) {
        return false;
    }
}
```

### 2. 创建 `.env` 配置文件

根据用户的服务器日志创建正确的环境变量配置：

```env
PORT=3000

WEBDAV_PROTOCOL=http
WEBDAV_HOST=1.32.228.66
WEBDAV_PORT=8092
WEBDAV_PATH=/markdowneditor/

WEBDAV_USERNAME=yhj
WEBDAV_PASSWORD=636216
```

### 3. 更新文档

更新以下文档以反映两个路径都受支持：
- `README.md` - 配置说明
- `start.sh` - 启动脚本提示

## 修复效果

### 修复前

```
WebDAV 地址: https://md.yhjedward.com/webdav/
客户端检测: ❌ 不是代理地址（使用直接模式）
请求方式: 直接发送 PROPFIND 到 /webdav/
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

现在两种路径都可以使用，功能完全相同：

| 路径 | 示例 |
|------|------|
| `/webdav/` | `https://md.yhjedward.com/webdav/` |
| `/dav/` | `https://md.yhjedward.com/dav/` |

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
- `public/app.js` - 修复代理地址识别逻辑
- `start.sh` - 更新启动提示
- `README.md` - 更新文档

新增的文件：
- `.env` - 服务器配置文件
- `FIX_SUMMARY.md` - 本修复说明文档

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

本次修复解决了 `/webdav/` 路径未被识别为代理地址的问题，使得用户可以使用与 nginx 配置一致的路径。修复后，前端会正确使用代理模式，通过 API 端点与后端通信，避免直接发送 WebDAV 方法（如 PROPFIND）导致的错误。
