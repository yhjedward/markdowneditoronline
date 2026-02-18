# 更新日志 / Changelog

## 修复 WebDAV 代理模式识别问题

### 问题描述
用户配置 WebDAV 地址为 `https://md.yhjedward.com/webdav/` 时遇到 HTTP 400 错误，因为前端代码只识别 `/dav/` 作为代理路径，不识别 `/webdav/`。

### 修复内容

#### 1. 修复前端代理模式识别 (`public/app.js`)
- **修改**: `WebDAVClient.isProxyAddress()` 方法
- **变更**: 从只检查 `/dav/` 改为同时检查 `/dav/` 和 `/webdav/`
- **效果**: 现在两种路径都会自动触发代理模式

```javascript
// 修改前
const proxyPath = '/dav/';
if (url === currentOrigin + proxyPath || ...) { return true; }

// 修改后
const proxyPaths = ['/dav/', '/webdav/'];
for (const proxyPath of proxyPaths) {
    if (url === currentOrigin + proxyPath || ...) { return true; }
}
```

#### 2. 创建服务器配置文件 (`.env`)
- **创建**: 新建 `.env` 配置文件
- **内容**: 根据用户的服务器日志配置 WebDAV 后端地址
```env
WEBDAV_PROTOCOL=http
WEBDAV_HOST=1.32.228.66
WEBDAV_PORT=8092
WEBDAV_PATH=/markdowneditor/
WEBDAV_USERNAME=yhj
WEBDAV_PASSWORD=636216
```

#### 3. 更新文档 (`README.md`)
- **修改**: 添加 `/webdav/` 路径说明
- **变更**: 所有提到代理路径的地方都同时列出 `/webdav/` 和 `/dav/`
- **效果**: 用户可以清楚地知道两种路径都可以使用

#### 4. 更新启动脚本 (`start.sh`)
- **修改**: 启动提示信息
- **变更**: 显示两种代理路径
- **效果**: 启动服务器时会看到完整的路径选项

#### 5. 创建修复说明文档 (`FIX_SUMMARY.md`)
- **创建**: 新建详细的修复说明文档
- **内容**: 包含问题描述、根本原因、解决方案、验证步骤等

### 支持的代理路径

修复后，以下两种路径都可以正常使用代理模式：

| 路径 | 示例 |
|------|------|
| `/webdav/` | `https://md.yhjedward.com/webdav/` ✅ |
| `/dav/` | `https://md.yhjedward.com/dav/` ✅ |

两种路径功能完全相同，选择其一即可。

### 验证修复

1. **重启代理服务器**
   ```bash
   npm start
   ```

2. **浏览器配置**
   - WebDAV 服务器地址: `https://md.yhjedward.com/webdav/`
   - 用户名和密码: 可留空（代理模式使用服务器配置的认证）

3. **测试连接**
   - 打开浏览器开发者工具 (F12)
   - 查看 Console 标签
   - 应该看到: `[代理模式] PROPFIND ...`
   - 连接测试应该成功

### 技术细节

**修复前的问题流程:**
```
用户配置: https://md.yhjedward.com/webdav/
前端检测: ❌ 不是代理地址
使用模式: 直接连接模式
发送请求: PROPFIND to /webdav/
结果: HTTP 400 Bad Request
```

**修复后的正确流程:**
```
用户配置: https://md.yhjedward.com/webdav/
前端检测: ✅ 是代理地址
使用模式: 代理模式
发送请求: API 调用到 /api/files
流程: 浏览器 → /api/files → Node.js 代理 → 后端 WebDAV
结果: ✅ 成功
```

### 相关文件

**修改的文件:**
- `public/app.js` - 核心修复
- `README.md` - 文档更新
- `start.sh` - 启动脚本更新

**新增的文件:**
- `.env` - 服务器配置
- `FIX_SUMMARY.md` - 修复说明
- `CHANGELOG.md` - 本更新日志

### 向后兼容性

✅ 完全向后兼容 - 原有的 `/dav/` 路径继续正常工作，新增的 `/webdav/` 路径也能正常工作。
