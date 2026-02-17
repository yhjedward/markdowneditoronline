# MD Editor 部署指南

## 问题解决：Nginx 反向代理下"另存为"功能

### 问题描述
通过 Nginx 反向代理访问时，点击"另存为"按钮无法弹出选择目录/文件夹的对话框。

### 根本原因
`File System Access API` (`showSaveFilePicker()`) 需要**安全上下文 (Secure Context)** 才能工作：
- ✅ **HTTPS** 访问
- ✅ **localhost** 本地开发
- ❌ **HTTP** 访问（即使有域名也不是安全上下文）

当通过 HTTP 访问时，浏览器会禁用 File System Access API，导致直接降级到普通下载方式。

### 解决方案

#### 1. 推荐方案：配置 HTTPS

这是解决"另存为"无法弹出选择目录问题的根本方法：

```bash
# 生成 SSL 证书（开发环境使用）
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /path/to/private.key \
  -out /path/to/certificate.crt

# 更新 Nginx 配置，启用 HTTPS
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    root /var/www/md-editor;
    index index.html;
    
    # 其余配置与 HTTP 版本相同...
}
```

#### 2. 临时方案：使用 localhost

如果是在开发环境中，可以：
1. 直接访问 `http://localhost` 而不是使用域名
2. 或在hosts文件中将域名指向 `127.0.0.1`

#### 3. 当前方案：普通下载

当前应用已经包含了降级方案：
- 当 File System Access API 不可用时，会自动使用普通下载
- 文件会直接下载到浏览器默认下载目录
- 应用会显示提示信息说明情况

### 新增功能说明

#### 智能提示
更新后的代码会自动检测访问环境：
- 如果不是安全上下文访问，会显示提示："请使用 HTTPS 访问以启用高级保存功能"
- 如果是支持的环境，会优先使用 File System Access API
- 如果浏览器不支持，会使用普通下载方式

#### File System Access API 功能
在 HTTPS 环境下，用户可以：
- ✅ 选择具体的保存目录
- ✅ 重命名保存的文件
- ✅ 查看保存结果

#### 普通下载功能
在任何环境下都可以：
- ✅ 直接下载文件到默认下载目录
- ✅ 使用浏览器默认的文件名
- ✅ 在所有现代浏览器中工作

### 部署步骤

1. **复制文件到服务器**
   ```bash
   cp -r md-editor /var/www/
   ```

2. **配置 Nginx**
   - 使用提供的 `nginx.conf` 文件
   - 根据实际情况修改 `server_name` 和 `root` 路径

3. **测试功能**
   - 访问 `http://your-domain.com` - 应该能正常工作，但"另存为"为普通下载
   - 访问 `https://your-domain.com` - 应该能使用"另存为"选择目录功能

### 故障排除

#### 问题：HTTP 访问时仍然无法弹出选择目录
**解决：** 这是正常行为，HTTP 环境不支持 File System Access API

#### 问题：HTTPS 访问时仍然无法弹出选择目录
**可能原因：**
- SSL 证书配置问题
- 浏览器不支持 File System Access API（需要 Chrome/Edge 86+）
- 网络策略或安全软件阻止

**解决：**
1. 检查浏览器控制台是否有错误信息
2. 确认使用支持的浏览器（Chrome、Edge、Opera）
3. 确认网站完全通过 HTTPS 加载

#### 问题：本地开发时无法使用
**解决：** 确保访问 `http://localhost` 而非 `http://127.0.0.1:端口号`

### 安全注意事项

1. **生产环境建议使用 HTTPS**
   - 提高用户体验（File System Access API）
   - 增强整体安全性

2. **内容安全策略 (CSP)**
   - 已配置适当的 CSP 头
   - 平衡了安全性和功能性

3. **文件权限**
   - 确保 Web 服务器有权限读取网站文件
   - 不要给予过度的文件系统权限

### 总结

| 访问方式 | "另存为"功能 | 用户体验 |
|----------|-------------|----------|
| HTTPS + 支持的浏览器 | ✅ 选择目录 | 最佳 |
| HTTP + localhost | ✅ 选择目录 | 最佳 |
| HTTP + 域名 | ❌ 直接下载 | 良好 |

选择合适的方案取决于你的具体需求和安全考虑。