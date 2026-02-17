# MD Editor - Markdown 编辑器

一款专为安卓移动设备优化的在线 Markdown 编辑器，支持 WebDAV 同步功能。

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

### WebDAV 同步配置

1. 点击侧边栏的"WebDAV 同步"按钮
2. 填写 WebDAV 服务器信息：
   - **服务器地址**: 如 `https://dav.example.com/` 或 `https://dav.jianguoyun.com/dav/`
   - **用户名**: 你的 WebDAV 账号
   - **密码**: 你的 WebDAV 密码
   - **同步方向**: 双向同步 / 仅上传 / 仅下载
3. 点击"测试连接"验证配置
4. 保存后即可同步文件

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
