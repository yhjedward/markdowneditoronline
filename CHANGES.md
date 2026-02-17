# 变更日志 - WebDAV 连接调试改进

## 问题描述
用户访问 WebDAV 编辑器时，输入正确的用户名和密码后，提示"连接失败，请检查配置"，但没有提供具体的错误信息，无法诊断问题根源。

## 改进内容

### 1. 增强的错误处理 (app.js)

#### WebDAVClient 类改进：
- **改进了 `testConnection()` 方法**：
  - 现在会抛出详细的错误信息，而不是简单返回 false
  - 添加了控制台日志记录，便于调试

- **改进了 `request()` 方法**：
  - 添加了详细的请求和响应日志
  - 在错误发生时，尝试读取并记录服务器的错误响应体
  - 提供更完整的错误信息，包括 HTTP 状态码和响应内容

- **改进了构造函数**：
  - 添加了 URL 规范化处理（自动添加协议、统一末尾斜杠）
  - 添加了初始化日志，便于追踪配置问题

#### MDEditor 类改进：
- **改进了 `testWebDAVConnection()` 方法**：
  - 根据不同的错误类型提供友好的错误提示：
    - HTTP 401 → "认证失败：用户名或密码错误"
    - HTTP 403 → "权限不足：拒绝访问"
    - HTTP 404 → "未找到：请检查服务器地址是否正确"
    - 网络错误 → "网络错误：无法连接到服务器，可能是跨域(CORS)问题"
  - 添加了详细的控制台日志，包括 URL 和用户名信息
  - 错误信息现在会显示在 Toast 提示中

### 2. 用户界面改进 (index.html)

- **WebDAV 设置弹窗**：
  - 添加了 URL 输入框的提示文本，说明正确的格式
  - 更新了占位符文本，使用用户的实际服务器地址作为示例
  - 添加了"故障排除"部分，提供常见问题的解决建议
  - 提示用户查看浏览器控制台(F12)获取详细错误信息

### 3. 文档改进 (README.md)

- **新增"故障排除"部分**：
  - 详细说明了如何排查 WebDAV 连接问题
  - 提供了检查服务器地址、认证信息的方法
  - 列举了常见错误及解决方案
  - 提供了使用 curl 命令测试服务器的方法
  - 说明了同源策略和 CORS 的注意事项

## 使用方法

1. 打开浏览器开发者工具（F12），切换到"控制台"(Console)标签
2. 在编辑器中点击"WebDAV 同步"按钮
3. 输入正确的服务器地址、用户名和密码
4. 点击"测试连接"按钮
5. 查看控制台中的详细日志和 Toast 提示，了解连接失败的具体原因

## 技术细节

### 日志输出示例

成功的情况：
```
WebDAV 客户端初始化: { baseUrl: "http://1.32.228.66:8092/", username: "admin" }
开始测试 WebDAV 连接...
URL: http://1.32.228.66:8092/
用户名: admin
WebDAV 请求: PROPFIND http://1.32.228.66:8092/
请求头: { Authorization: "***", Depth: "0", "Content-Type": "text/xml" }
响应状态: 207 Multi-Status
WebDAV 连接测试成功
```

失败的情况（认证错误）：
```
WebDAV 客户端初始化: { baseUrl: "http://1.32.228.66:8092/", username: "wronguser" }
开始测试 WebDAV 连接...
URL: http://1.32.228.66:8092/
用户名: wronguser
WebDAV 请求: PROPFIND http://1.32.228.66:8092/
请求头: { Authorization: "***", Depth: "0", "Content-Type": "text/xml" }
响应状态: 401 Unauthorized
错误响应体: Not authorized
WebDAV 请求失败: Error: HTTP 401: Unauthorized - Not authorized
WebDAV connection test failed: Error: HTTP 401: Unauthorized - Not authorized
```

## 调试建议

如果仍然遇到问题，请检查：

1. **服务器地址**：确保 WebDAV 服务器支持 PROPFIND 方法
2. **认证信息**：确认用户名和密码正确，区分大小写
3. **CORS 配置**：如果编辑器和服务器在不同域，确保服务器返回正确的 CORS 头
4. **网络连接**：使用 curl 或其他工具测试服务器是否可访问
5. **服务器日志**：查看 WebDAV 服务器端的访问日志，了解请求是否到达服务器

## 测试命令

使用 curl 测试 WebDAV 服务器：
```bash
curl -X PROPFIND \
  -H "Depth: 0" \
  -H "Content-Type: text/xml" \
  -u "username:password" \
  http://1.32.228.66:8092/
```

测试 OPTIONS 请求（CORS 预检）：
```bash
curl -X OPTIONS \
  -H "Origin: http://1.32.228.66:8092" \
  -H "Access-Control-Request-Method: PROPFIND" \
  -H "Access-Control-Request-Headers: authorization,content-type,depth" \
  -v http://1.32.228.66:8092/
```
