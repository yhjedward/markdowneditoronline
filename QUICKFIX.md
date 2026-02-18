# 快速修复：HTTP 405 错误

## 问题

您遇到 HTTP 405 Not Allowed 错误，这是因为浏览器配置的 WebDAV 地址不正确。

## 解决方案（30 秒完成）

### 步骤 1：打开 WebDAV 设置

在浏览器中点击"WebDAV 同步"按钮

### 步骤 2：修改服务器地址

将 **WebDAV 服务器地址** 从：
```
https://md.yhjedward.com/markdowneditor
```

改为：
```
https://md.yhjedward.com/webdav/
```

或（如果在本地测试）：
```
http://localhost:3000/webdav/
```

### 步骤 3：测试连接

点击"测试连接"按钮，应该会显示连接成功。

### 步骤 4：保存

点击"保存并同步"完成配置。

## 为什么会出现这个问题？

| 您的配置 | 问题 |
|---------|------|
| `https://md.yhjedward.com/markdowneditor` | ❌ 不是代理地址，nginx 不支持 WebDAV 方法 |
| `https://md.yhjedward.com/webdav/` | ✅ 代理地址，通过代理服务器处理 |

## 工作原理

```
您的浏览器
    ↓ WebDAV 请求到 /webdav/
Node.js 代理服务器 (自动处理认证)
    ↓ 连接到后端
WebDAV 后端服务器 (http://1.32.228.66:8092/markdowneditor/)
```

## 验证是否修复

打开浏览器控制台（F12），查看控制台日志：

✅ **正常**：`[代理模式] PROPFIND ...`
❌ **错误**：`[直接模式] PROPFIND ...` 或 `HTTP 405`

## 需要更多帮助？

- 查看 `TROUBLESHOOTING.md` 获取详细的故障排除指南
- 运行 `node diagnose.js` 检查服务器配置
- 查看 `nginx-webdav-config-example.conf` 了解 nginx 配置示例
