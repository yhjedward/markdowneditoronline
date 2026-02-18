# MD Editor - Markdown 编辑器

一款专为安卓移动设备优化的在线 Markdown 编辑器，支持 WebDAV 同步功能。现在包含完整的 **WebDAV 代理服务器** 解决方案，解决了 HTTPS 前端与 HTTP WebDAV 服务器之间的跨域问题。

## 🆕 新增功能：WebDAV 代理服务器

- ✅ **完整的后端代理解决方案**
- ✅ **解决跨域(CORS)问题**
- ✅ **支持直接连接和代理模式**
- ✅ **Express + Node.js 实现**
- ✅ **自动化的部署脚本**

### 快速启动代理服务器

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置您的 WebDAV 服务器信息

# 2. 启动服务器
./start.sh
# 或手动启动
npm install && npm start
```

**代理地址**: http://localhost:3000/dav/

## 特性

- 📝 **完整的 Markdown 编辑功能** - 支持标题、列表、链接、图片、代码块等所有标准 Markdown 语法
- 📱 **移动优先设计** - 完美适配安卓手机和平板，支持触摸滑动操作
- 🔄 **WebDAV 同步** - 支持双向同步到 WebDAV 服务器（如 Nextcloud、坚果云等）
- 💾 **本地存储** - 使用 IndexedDB 本地存储，数据安全可靠
- 🎨 **实时预览** - 编辑与预览实时同步，一键切换
- ↩️ **撤销/重做** - 完整的编辑历史管理
- 🔧 **快捷工具栏** - 快速插入常用 Markdown 语法
- 🌙 **深色主题** - 护眼的深色界面设计
- 📴 **离线可用** - PWA 支持，可安装到主屏幕离线使用

## 使用说明

### 本地使用

1. 直接在浏览器中打开 `index.html` 文件即可使用
2. 建议将页面添加到主屏幕，以获得最佳体验

### 服务器部署

项目已提供 Nginx 配置文件 `nginx.conf`，快速部署步骤：

```bash
# 1. 上传文件到服务器
cp -r . /var/www/md-editor

# 2. 复制 nginx 配置
sudo cp nginx.conf /etc/nginx/conf.d/md-editor.conf

# 3. 修改配置中的 server_name 和 root 路径
sudo nano /etc/nginx/conf.d/md-editor.conf

# 4. 测试并重载 nginx
sudo nginx -t
sudo systemctl reload nginx
```

配置说明：
- 已配置 gzip 压缩，加快资源加载
- 已配置静态资源缓存（JS、CSS、图片缓存1年）
- 已配置前端路由支持（SPA 适配）
- 包含 HTTPS 配置示例（需 SSL 证书）

### WebDAV 同步配置

1. 点击侧边栏的"WebDAV 同步"按钮
2. 填写服务器信息：
   - **服务器地址**: 如 `https://dav.example.com/` 或 `https://dav.jianguoyun.com/dav/`
   - **用户名**: 你的 WebDAV 账号
   - **密码**: 你的 WebDAV 密码
   - **同步方向**: 双向同步 / 仅上传 / 仅下载
3. 点击"测试连接"验证配置
4. 保存后即可同步文件

#### 浏览服务器目录

除了常规的 WebDAV 同步功能，编辑器还支持直接浏览服务器上的目录结构：

1. 在侧边栏的"WebDAV 文件"区域，可以看到路径输入框
2. **输入路径浏览**：在输入框中输入服务器目录路径（如：`/documents`），然后点击"浏览"按钮
3. **文件夹导航**：
   - 点击文件夹图标（📁）或文件夹名称可以进入该目录
   - 点击"↑"按钮可以返回上一级目录
   - 点击"刷新列表"可以重新加载当前目录内容
4. **文件操作**：
   - 文件名显示为 📄 图标
   - 文件夹名称显示为 📁 图标，并以高亮颜色标识
   - 点击文件名可以直接打开并编辑
   - 点击下载按钮（⬇️）可以将文件下载到本地
5. 支持显示所有文件类型，不限于 .md 文件

### 故障排除

#### WebDAV 连接失败

如果连接测试失败，请按照以下步骤排查：

1. **检查服务器地址**
   - 确保服务器地址正确，并且以 `/` 结尾
   - 确保使用完整的 URL，包括协议（http:// 或 https://）
   - 例如：`http://1.32.228.66:8092/` 或 `http://1.32.228.66:8092/dav/`

2. **检查认证信息**
   - 确认用户名和密码正确
   - 注意大小写
   - 如果使用特殊字符，确保正确转义

3. **查看浏览器控制台**
   - 按 `F12` 打开开发者工具
   - 切换到"控制台"(Console)标签
   - 点击"测试连接"按钮
   - 查看详细的错误信息和请求日志

4. **常见错误及解决方案**
   - **认证失败 (HTTP 401)**: 用户名或密码错误，请检查凭证
   - **权限不足 (HTTP 403)**: 账号没有访问权限，请联系管理员
   - **未找到 (HTTP 404)**: 服务器地址不正确或路径不存在
   - **跨域(CORS)问题**: 服务器未配置允许跨域请求，需要在服务器上添加 CORS 响应头（见下文）
   - **连接超时**: 网络连接问题，检查网络或服务器是否在线

5. **解决 CORS 跨域问题**

   如果出现"跨域(CORS)问题"错误，需要在 WebDAV 服务器上配置允许跨域访问的响应头。

   **Nginx 配置示例：**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           # WebDAV 配置
           dav_methods PUT DELETE MKCOL COPY MOVE;
           dav_ext_methods PROPFIND OPTIONS;

           # CORS 配置
           add_header 'Access-Control-Allow-Origin' '*';
           add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE, PROPFIND, MKCOL, COPY, MOVE';
           add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Depth, X-Requested-With';
           add_header 'Access-Control-Expose-Headers' 'Content-Length, Content-Type';

           # 处理 OPTIONS 预检请求
           if ($request_method = 'OPTIONS') {
               return 204;
           }
       }
   }
   ```

   **Apache 配置示例：**
   ```apache
   <Directory "/path/to/webdav">
       # WebDAV 配置
       Dav On

       # CORS 配置
       Header always set Access-Control-Allow-Origin "*"
       Header always set Access-Control-Allow-Methods "GET, POST, OPTIONS, PUT, DELETE, PROPFIND, MKCOL, COPY, MOVE"
       Header always set Access-Control-Allow-Headers "Authorization, Content-Type, Depth, X-Requested-With"
       Header always set Access-Control-Expose-Headers "Content-Length, Content-Type"

       # 处理 OPTIONS 预检请求
       RewriteEngine On
       RewriteCond %{REQUEST_METHOD} OPTIONS
       RewriteRule ^(.*)$ $1 [R=200,L]
   </Directory>
   ```

   **其他 WebDAV 服务的 CORS 配置：**
   - **Nextcloud**: 在 config.php 中设置 `trusted_domains` 和 `cors.allowed_origins`
   - **坚果云**: 默认不支持 CORS，建议使用代理服务器
   - **ownCloud**: 在 config.php 中配置 `cors.domains`

6. **测试服务器连接**
   可以使用命令行工具测试 WebDAV 服务器是否正常：
   ```bash
   curl -X PROPFIND -H "Depth: 0" -u "username:password" http://your-server/
   ```

7. **同源策略**
   - 如果编辑器页面和 WebDAV 服务器在同一域名下，不应该有跨域问题
   - 如果在不同域名，需要服务器正确配置 CORS 头（见上文的 CORS 配置）

### 支持的 WebDAV 服务

- Nextcloud
- ownCloud
- 坚果云
- Box.com
- Yandex.Disk
- 其他标准 WebDAV 服务

### 键盘快捷键

- `Ctrl/Cmd + S` - 保存文件
- `Ctrl/Cmd + Z` - 撤销
- `Ctrl/Cmd + Shift + Z` - 重做

### 触摸手势

- 从左边缘向右滑动 - 打开侧边栏
- 向右滑动 - 关闭侧边栏

## 技术栈

- 纯原生 JavaScript (ES6+)
- IndexedDB - 本地数据存储
- WebDAV 协议 - 云同步
- Service Worker - PWA 离线支持
- CSS3 - 响应式布局

## 文件说明

```
project/
├── index.html      # 主页面
├── styles.css      # 样式文件
├── app.js          # 主应用逻辑
├── marked.min.js   # Markdown 渲染引擎
├── manifest.json   # PWA 配置
├── sw.js           # Service Worker
├── nginx.conf      # Nginx 部署配置
└── README.md       # 说明文档
```

## 浏览器兼容性

- Chrome/Edge 80+
- Firefox 75+
- Safari 13+
- Chrome for Android 80+
- Safari on iOS 13+

## 数据安全

- 所有数据存储在浏览器本地 IndexedDB 中
- WebDAV 密码使用浏览器的安全存储
- 支持离线使用，联网后自动同步

## 开源协议

MIT License
