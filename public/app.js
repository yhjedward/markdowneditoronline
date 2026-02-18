/**
 * MD Editor - Markdown 编辑器
 * 支持本地存储和 WebDAV 同步
 */

// ==================== 工具函数 ====================
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const formatDate = (date) => {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const debounce = (fn, delay) => {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
};

// Toast 提示
const showToast = (message, type = 'info') => {
    const toast = $('#toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
};

// ==================== 存储管理 ====================
class StorageManager {
    constructor() {
        this.DB_NAME = 'MDEditorDB';
        this.DB_VERSION = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('files')) {
                    const store = db.createObjectStore('files', { keyPath: 'id' });
                    store.createIndex('updatedAt', 'updatedAt', { unique: false });
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    async saveFile(file) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['files'], 'readwrite');
            const store = transaction.objectStore('files');
            file.updatedAt = Date.now();
            const request = store.put(file);
            request.onsuccess = () => resolve(file);
            request.onerror = () => reject(request.error);
        });
    }

    async getFile(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllFiles() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['files'], 'readonly');
            const store = transaction.objectStore('files');
            const index = store.index('updatedAt');
            const request = index.openCursor(null, 'prev');
            const files = [];

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    files.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(files);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    async deleteFile(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['files'], 'readwrite');
            const store = transaction.objectStore('files');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async saveSetting(key, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put({ key, value });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getSetting(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result?.value);
            request.onerror = () => reject(request.error);
        });
    }
}

// ==================== WebDAV 客户端 ====================
class WebDAVClient {
    constructor(baseUrl, username, password) {
        // 规范化 URL：移除末尾的斜杠，然后统一添加
        let url = baseUrl.replace(/\/$/, '');

        // 检查是否是代理地址（同一域名下的/dav/路径）
        this.isProxy = this.isProxyAddress(url);
        
        if (this.isProxy) {
            // 代理模式：使用API端点
            this.baseUrl = window.location.origin;
            this.auth = null; // 代理模式下不需要认证头
        } else {
            // 直接连接模式：保留原有逻辑
            // 确保协议存在
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'http://' + url;
            }
            this.baseUrl = url + '/';
            this.auth = 'Basic ' + btoa(username + ':' + password);
        }

        this.username = username;
        this.password = password;

        console.log('WebDAV 客户端初始化:', {
            baseUrl: this.isProxy ? 'Proxy Mode' : this.baseUrl,
            username: username,
            mode: this.isProxy ? 'Proxy' : 'Direct'
        });
    }

    // 检查是否是代理地址
    isProxyAddress(url) {
        try {
            const proxyPath = '/dav/';
            const currentOrigin = window.location.origin;
            
            // 检查是否是当前域名下的 /dav/ 路径
            if (url === currentOrigin + proxyPath || 
                url === currentOrigin.replace(/\/$/, '') + '/dav/' ||
                url === proxyPath) {
                return true;
            }
            
            return false;
        } catch (e) {
            return false;
        }
    }

    async request(method, path, body = null, headers = {}) {
        if (this.isProxy) {
            // 代理模式：使用API端点
            return this.proxyRequest(method, path, body, headers);
        } else {
            // 直接连接模式：使用原有的逻辑
            return this.directRequest(method, path, body, headers);
        }
    }

    // 代理模式请求
    async proxyRequest(method, path, body = null, headers = {}) {
        // 将 WebDAV 路径转换为 API 调用
        const apiPath = this.convertToApiPath(method, path);
        const url = this.baseUrl + apiPath;
        
        const options = {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
            cache: 'no-cache',
            headers: {
                'Accept': 'application/json',
                ...headers
            }
        };

        console.log(`[代理模式] ${method} ${path} -> ${url}`);

        try {
            if (method === 'PROPFIND') {
                const response = await fetch(this.baseUrl + '/api/files', options);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response;
            } else if (method === 'GET') {
                const filePath = path.replace(/^\//, '');
                const response = await fetch(this.baseUrl + `/api/file/${filePath}`, options);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response;
            } else if (method === 'PUT') {
                const filePath = path.replace(/^\//, '');
                const response = await fetch(this.baseUrl + `/api/file/${filePath}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'text/markdown' },
                    body: body
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response;
            } else if (method === 'DELETE') {
                const filePath = path.replace(/^\//, '');
                const response = await fetch(this.baseUrl + `/api/file/${filePath}`, {
                    method: 'DELETE'
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response;
            } else {
                throw new Error(`不支持的HTTP方法: ${method}`);
            }
        } catch (error) {
            console.error('代理请求失败:', error);
            throw error;
        }
    }

    // 直接连接请求（原逻辑）
    async directRequest(method, path, body = null, headers = {}) {
        const url = this.baseUrl + path;
        const options = {
            method,
            mode: 'cors',
            credentials: 'omit',
            cache: 'no-cache',
            headers: {
                'Authorization': this.auth,
                'Accept': '*/*',
                ...headers
            }
        };

        if (body) {
            options.body = body;
        }

        console.log(`[直接模式] ${method} ${url}`);
        console.log('请求头:', { ...options.headers, Authorization: '***' });

        try {
            const response = await fetch(url, options);

            console.log(`响应状态: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                // 尝试读取错误响应体
                let errorText = '';
                try {
                    errorText = await response.text();
                    console.error('错误响应体:', errorText);
                } catch (e) {
                    // 忽略读取错误
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ' - ' + errorText : ''}`);
            }

            return response;
        } catch (error) {
            console.error('WebDAV 请求失败:', error);

            // 检查是否是 CORS 错误
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                throw new Error('CORS_ERROR: 无法连接到服务器，可能是跨域(CORS)问题。请确保 WebDAV 服务器配置了正确的 CORS 响应头，允许来自当前域的请求。');
            }

            throw error;
        }
    }

    // 转换WebDAV路径为API路径
    convertToApiPath(method, path) {
        if (method === 'PROPFIND') {
            return '/api/files';
        }
        return '/api' + path;
    }

    async testConnection() {
        try {
            const response = await this.request('PROPFIND', '', null, {
                'Depth': '0',
                'Content-Type': 'text/xml'
            });

            // 检查响应状态，PROPFIND 应该返回 207 (Multi-Status)
            // 但有些服务器可能返回 200 或其他 2xx 状态码
            return true;
        } catch (error) {
            console.error('WebDAV connection test failed:', error);
            throw error; // 重新抛出错误以便上层处理
        }
    }

    async listFiles(path = '', filterMarkdown = false) {
        const response = await this.request('PROPFIND', path, null, {
            'Depth': '1',
            'Content-Type': 'text/xml'
        });

        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

        const responses = xmlDoc.querySelectorAll('response');
        const files = [];

        responses.forEach((resp) => {
            const href = resp.querySelector('href')?.textContent || '';
            const displayName = decodeURIComponent(href.split('/').filter(Boolean).pop() || '/');
            const lastModified = resp.querySelector('getlastmodified')?.textContent || '';
            const contentLength = resp.querySelector('getcontentlength')?.textContent || '0';

            // 跳过当前目录
            const relativePath = href.replace(this.baseUrl, '');
            if (relativePath === path || relativePath === path + '/' || relativePath === '') {
                return;
            }

            const isCollection = resp.querySelector('collection') !== null;

            // 显示目录或根据过滤设置显示文件
            if (isCollection || !filterMarkdown || displayName.endsWith('.md')) {
                files.push({
                    name: displayName,
                    path: href,
                    relativePath: relativePath,
                    lastModified: lastModified ? new Date(lastModified).getTime() : Date.now(),
                    size: parseInt(contentLength) || 0,
                    isDirectory: isCollection
                });
            }
        });

        // 排序：目录在前，然后按名称排序
        files.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });

        return files;
    }

    async getFile(path) {
        // 确保路径是相对于 baseUrl 的
        const relativePath = path.replace(this.baseUrl, '');
        const response = await this.request('GET', relativePath);
        return await response.text();
    }

    async putFile(path, content) {
        // 确保路径是相对于 baseUrl 的
        const relativePath = path.replace(this.baseUrl, '');
        await this.request('PUT', relativePath, content, {
            'Content-Type': 'text/markdown'
        });
    }

    async deleteFile(path) {
        const relativePath = path.replace(this.baseUrl, '');
        await this.request('DELETE', relativePath);
    }
}

// ==================== 编辑器应用 ====================
class MDEditor {
    constructor() {
        this.storage = new StorageManager();
        this.webdav = null;
        this.currentFile = null;
        this.files = [];
        this.history = [];
        this.historyIndex = -1;
        this.isPreviewMode = false;
        this.webdavSettings = null;

        this.init();
    }

    async init() {
        try {
            await this.storage.init();
            this.bindEvents();
            this.loadFiles();
            this.loadWebDAVSettings();
            this.setupAutoSave();
            this.updatePreview();
        } catch (error) {
            console.error('初始化失败:', error);
            showToast('初始化失败，请刷新页面重试', 'error');
        }
    }

    bindEvents() {
        // 侧边栏
        $('#menuBtn').addEventListener('click', () => this.openSidebar());
        $('#closeSidebar').addEventListener('click', () => this.closeSidebar());
        $('#overlay').addEventListener('click', () => this.closeSidebar());

        // 文件操作
        $('#newFileBtn').addEventListener('click', () => this.showNewFileModal());
        $('#saveBtn').addEventListener('click', () => this.saveCurrentFile());
        $('#saveAsBtn').addEventListener('click', () => this.saveAsFile());

        // 编辑器
        const editor = $('#editor');
        editor.addEventListener('input', () => {
            this.onEditorInput();
            this.updateSaveStatus('unsaved');
        });

        // 监听撤销/重做快捷键
        editor.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    this.redo();
                } else {
                    this.undo();
                }
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveCurrentFile();
            }
        });

        // 预览
        $('#previewToggle').addEventListener('click', () => this.togglePreview());

        // 撤销/重做
        $('#undoBtn').addEventListener('click', () => this.undo());
        $('#redoBtn').addEventListener('click', () => this.redo());

        // 快捷工具栏
        $$('.quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.insertMarkdown(action);
            });
        });

        // WebDAV
        $('#syncBtn').addEventListener('click', () => this.showWebDAVModal());
        $('#refreshWebdavBtn').addEventListener('click', () => this.refreshWebDAVFiles());

        // 弹窗关闭
        $$('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.remove('show');
            });
        });

        // WebDAV 表单
        $('#webdavForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveWebDAVSettings();
        });

        $('#testConnection').addEventListener('click', () => this.testWebDAVConnection());

        // 文件表单
        $('#fileForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createNewFile();
        });

        // 确认弹窗
        $('#confirmCancel').addEventListener('click', () => {
            $('#confirmModal').classList.remove('show');
        });

        // 触摸滑动支持
        this.setupTouchGestures();
    }

    setupTouchGestures() {
        let touchStartX = 0;
        let touchEndX = 0;
        const sidebar = $('#sidebar');

        document.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        }, { passive: true });

        this.handleSwipe = () => {
            const swipeThreshold = 100;
            const diff = touchEndX - touchStartX;

            // 从左侧边缘向右滑动打开侧边栏
            if (diff > swipeThreshold && touchStartX < 50) {
                this.openSidebar();
            }
            // 向左滑动关闭侧边栏
            if (diff < -swipeThreshold && sidebar.classList.contains('open')) {
                this.closeSidebar();
            }
        };
    }

    setupAutoSave() {
        // 每 30 秒自动保存
        setInterval(() => {
            if (this.currentFile && $('#editor').value !== this.currentFile.content) {
                this.saveCurrentFile();
            }
        }, 30000);

        // 页面关闭前保存
        window.addEventListener('beforeunload', () => {
            if (this.currentFile && $('#editor').value !== this.currentFile.content) {
                this.saveCurrentFile();
            }
        });
    }

    // ==================== 文件管理 ====================
    async loadFiles() {
        this.files = await this.storage.getAllFiles();
        this.renderFileList();
    }

    renderFileList() {
        const localList = $('#localFileList');
        localList.innerHTML = '';

        this.files.forEach(file => {
            const li = document.createElement('li');
            li.className = file.id === this.currentFile?.id ? 'active' : '';
            li.innerHTML = `
                <span class="filename">${file.name}</span>
                <div class="file-actions">
                    <button data-action="rename" title="重命名">✏️</button>
                    <button data-action="delete" title="删除">🗑️</button>
                </div>
            `;

            li.querySelector('.filename').addEventListener('click', () => this.openFile(file));

            li.querySelector('[data-action="rename"]').addEventListener('click', (e) => {
                e.stopPropagation();
                this.renameFile(file);
            });

            li.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
                e.stopPropagation();
                this.confirmDeleteFile(file);
            });

            localList.appendChild(li);
        });

        if (this.files.length === 0) {
            localList.innerHTML = '<li style="color: var(--text-muted); text-align: center; cursor: default;">暂无文件</li>';
        }
    }

    async createNewFile() {
        let filename = $('#filenameInput').value.trim();
        if (!filename) return;

        if (!filename.endsWith('.md')) {
            filename += '.md';
        }

        const file = {
            id: generateId(),
            name: filename,
            content: '',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        await this.storage.saveFile(file);
        this.files.unshift(file);
        this.renderFileList();
        this.openFile(file);

        $('#fileModal').classList.remove('show');
        $('#filenameInput').value = '';
        showToast('文件创建成功', 'success');
    }

    async openFile(file) {
        // 保存当前文件
        if (this.currentFile) {
            const currentContent = $('#editor').value;
            if (currentContent !== this.currentFile.content) {
                this.currentFile.content = currentContent;
                await this.storage.saveFile(this.currentFile);
            }
        }

        this.currentFile = file;
        $('#editor').value = file.content;
        $('#currentFilename').textContent = file.name;
        this.updateSaveStatus('saved');
        this.renderFileList();
        this.updatePreview();
        this.saveHistory();

        // 移动端关闭侧边栏
        if (window.innerWidth <= 768) {
            this.closeSidebar();
        }
    }

    async saveCurrentFile() {
        if (!this.currentFile) {
            this.showNewFileModal();
            return;
        }

        this.updateSaveStatus('saving');

        const content = $('#editor').value;
        this.currentFile.content = content;
        await this.storage.saveFile(this.currentFile);

        // 更新文件列表中的位置
        const index = this.files.findIndex(f => f.id === this.currentFile.id);
        if (index > 0) {
            this.files.splice(index, 1);
            this.files.unshift(this.currentFile);
            this.renderFileList();
        }

        this.updateSaveStatus('saved');
        showToast('保存成功', 'success');
    }

    async saveAsFile() {
        const content = $('#editor').value;
        if (!content) {
            showToast('没有可保存的内容', 'error');
            return;
        }

        // 使用 Blob + a 标签下载到本地
        this.downloadFileAsBlob(content);
    }

    downloadFileAsBlob(content) {
        const filename = this.currentFile?.name || 'untitled.md';
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });

        // 方法1: 使用 navigator.msSaveOrOpenBlob (IE/Edge)
        if (navigator.msSaveOrOpenBlob) {
            navigator.msSaveOrOpenBlob(blob, filename);
            showToast('文件保存成功', 'success');
            return;
        }

        // 方法2: 使用 Chrome/Firefox 的现代下载 API
        if (window.showSaveFilePicker) {
            this.saveWithFilePicker(content, filename);
            return;
        }

        // 方法3: 使用传统的 a 标签下载方式
        this.saveWithAnchorTag(blob, filename);
    }

    async saveWithFilePicker(content, suggestedFilename) {
        try {
            const options = {
                suggestedName: suggestedFilename,
                types: [
                    {
                        description: 'Markdown 文件',
                        accept: { 'text/markdown': ['.md', '.markdown'] }
                    },
                    {
                        description: '文本文件',
                        accept: { 'text/plain': ['.txt'] }
                    }
                ]
            };

            const handle = await window.showSaveFilePicker(options);
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
            showToast('文件保存成功', 'success');
        } catch (error) {
            if (error.name === 'AbortError') {
                // 用户取消了保存对话框
                return;
            }
            console.error('使用 FilePicker 保存失败:', error);
            // 降级到传统方法
            const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
            this.saveWithAnchorTag(blob, suggestedFilename);
        }
    }

    saveWithAnchorTag(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;

        // 添加到DOM并设置属性
        document.body.appendChild(a);

        // 使用 MouseEvent 触发点击，模拟真实用户操作
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            button: 0 // 左键点击
        });

        // 尝试触发下载
        const success = a.dispatchEvent(clickEvent);

        if (success) {
            showToast('文件保存成功', 'success');
        } else {
            showToast('下载失败，请手动复制内容', 'error');
        }

        // 延迟清理资源
        setTimeout(() => {
            try {
                if (document.body.contains(a)) {
                    document.body.removeChild(a);
                }
                URL.revokeObjectURL(url);
            } catch (e) {
                console.warn('清理资源时出错:', e);
            }
        }, 2000);
    }

    async renameFile(file) {
        const newName = prompt('请输入新文件名:', file.name);
        if (newName && newName !== file.name) {
            file.name = newName.endsWith('.md') ? newName : newName + '.md';
            await this.storage.saveFile(file);
            this.renderFileList();
            if (this.currentFile?.id === file.id) {
                $('#currentFilename').textContent = file.name;
            }
            showToast('重命名成功', 'success');
        }
    }

    confirmDeleteFile(file) {
        $('#confirmTitle').textContent = '删除文件';
        $('#confirmMessage').textContent = `确定要删除 "${file.name}" 吗？此操作不可恢复。`;
        $('#confirmModal').classList.add('show');

        $('#confirmOk').onclick = async () => {
            await this.storage.deleteFile(file.id);
            this.files = this.files.filter(f => f.id !== file.id);
            this.renderFileList();

            if (this.currentFile?.id === file.id) {
                this.currentFile = null;
                $('#editor').value = '';
                $('#currentFilename').textContent = '未命名';
                this.updateSaveStatus('');
                this.updatePreview();
            }

            $('#confirmModal').classList.remove('show');
            showToast('文件已删除', 'success');
        };
    }

    showNewFileModal() {
        $('#fileModalTitle').textContent = '新建文件';
        $('#filenameInput').value = '';
        $('#fileModal').classList.add('show');
        setTimeout(() => $('#filenameInput').focus(), 100);
    }

    // ==================== 编辑器功能 ====================
    onEditorInput() {
        this.updatePreview();
        this.debouncedSaveHistory();
    }

    debouncedSaveHistory = debounce(() => this.saveHistory(), 500);

    saveHistory() {
        const content = $('#editor').value;

        // 如果历史记录已改变，删除当前位置之后的历史
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        this.history.push(content);
        this.historyIndex++;

        // 限制历史记录数量
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            $('#editor').value = this.history[this.historyIndex];
            this.updatePreview();
            this.updateSaveStatus('unsaved');
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            $('#editor').value = this.history[this.historyIndex];
            this.updatePreview();
            this.updateSaveStatus('unsaved');
        }
    }

    insertMarkdown(type) {
        const editor = $('#editor');
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const selectedText = editor.value.substring(start, end);
        let insertion = '';

        const actions = {
            heading: () => `## ${selectedText || '标题'}`,
            bold: () => `**${selectedText || '粗体文本'}**`,
            italic: () => `*${selectedText || '斜体文本'}*`,
            list: () => `- ${selectedText || '列表项'}`,
            link: () => `[${selectedText || '链接文本'}](https://example.com)`,
            code: () => `\`\`\`\n${selectedText || '代码块'}\n\`\`\``,
            quote: () => `> ${selectedText || '引用文本'}`
        };

        insertion = actions[type] ? actions[type]() : '';

        editor.setRangeText(insertion, start, end, 'end');
        editor.focus();
        this.updatePreview();
        this.updateSaveStatus('unsaved');
    }

    updatePreview() {
        const content = $('#editor').value;
        if (typeof marked !== 'undefined') {
            $('#preview').innerHTML = marked.parse(content);
        }
    }

    togglePreview() {
        this.isPreviewMode = !this.isPreviewMode;
        const previewWrapper = $('#previewWrapper');
        const previewToggle = $('#previewToggle');

        if (this.isPreviewMode) {
            this.updatePreview();
            previewWrapper.classList.remove('hidden');
            previewWrapper.classList.add('show');
            previewToggle.textContent = '编辑';
        } else {
            previewWrapper.classList.remove('show');
            previewWrapper.classList.add('hidden');
            previewToggle.textContent = '预览';
        }
    }

    updateSaveStatus(status) {
        const saveStatus = $('#saveStatus');
        saveStatus.className = 'save-status';
        if (status) {
            saveStatus.classList.add(status);
        }
    }

    // ==================== 侧边栏 ====================
    openSidebar() {
        $('#sidebar').classList.add('open');
        $('#overlay').classList.add('show');
    }

    closeSidebar() {
        $('#sidebar').classList.remove('open');
        $('#overlay').classList.remove('show');
    }

    // ==================== WebDAV 同步 ====================
    async loadWebDAVSettings() {
        this.webdavSettings = await this.storage.getSetting('webdav');
        if (this.webdavSettings) {
            this.initWebDAVClient();
        }
    }

    initWebDAVClient() {
        if (this.webdavSettings) {
            this.webdav = new WebDAVClient(
                this.webdavSettings.url,
                this.webdavSettings.username,
                this.webdavSettings.password
            );
        }
    }

    showWebDAVModal() {
        const settings = this.webdavSettings || {};
        $('#webdavUrl').value = settings.url || '';
        $('#webdavUsername').value = settings.username || '';
        $('#webdavPassword').value = settings.password || '';
        $('#syncDirection').value = settings.syncDirection || 'both';

        $('#webdavModal').classList.add('show');
    }

    async testWebDAVConnection() {
        const url = $('#webdavUrl').value.trim();
        const username = $('#webdavUsername').value.trim();
        const password = $('#webdavPassword').value;

        if (!url || !username || !password) {
            showToast('请填写完整的连接信息', 'error');
            return;
        }

        const testBtn = $('#testConnection');
        testBtn.textContent = '测试中...';
        testBtn.disabled = true;

        try {
            const client = new WebDAVClient(url, username, password);

            console.log('开始测试 WebDAV 连接...');
            console.log('URL:', client.baseUrl);
            console.log('用户名:', username);

            const success = await client.testConnection();

            if (success) {
                showToast('WebDAV 连接成功', 'success');
                console.log('WebDAV 连接测试成功');
            } else {
                showToast('连接失败，请检查配置', 'error');
            }
        } catch (error) {
            console.error('连接测试失败:', error);

            // 根据错误类型提供更友好的提示
            let errorMessage = '连接失败';

            if (error.message.includes('HTTP 401')) {
                errorMessage = '认证失败：WebDAV 用户名或密码错误';
            } else if (error.message.includes('HTTP 403')) {
                errorMessage = '权限不足：拒绝访问';
            } else if (error.message.includes('HTTP 404')) {
                errorMessage = '未找到：请检查服务器地址是否正确';
            } else if (error.message.includes('CORS_ERROR')) {
                errorMessage = '跨域(CORS)问题：WebDAV 服务器未配置允许跨域访问。请确保服务器响应头包含：Access-Control-Allow-Origin: *';
            } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                errorMessage = '网络错误：无法连接到服务器。可能是 CORS 问题或网络不通';
            } else if (error.message.includes('HTTP')) {
                errorMessage = '服务器错误：' + error.message;
            } else {
                errorMessage = '连接失败: ' + error.message;
            }

            showToast(errorMessage, 'error');
        } finally {
            testBtn.textContent = '测试连接';
            testBtn.disabled = false;
        }
    }

    async saveWebDAVSettings() {
        const settings = {
            url: $('#webdavUrl').value.trim(),
            username: $('#webdavUsername').value.trim(),
            password: $('#webdavPassword').value,
            syncDirection: $('#syncDirection').value
        };

        await this.storage.saveSetting('webdav', settings);
        this.webdavSettings = settings;
        this.initWebDAVClient();

        $('#webdavModal').classList.remove('show');
        showToast('设置已保存', 'success');

        // 开始同步
        this.syncWithWebDAV();
    }

    async syncWithWebDAV() {
        if (!this.webdav) {
            showToast('WebDAV 未配置', 'error');
            return;
        }

        showToast('开始 WebDAV 同步...', 'info');

        try {
            const direction = this.webdavSettings.syncDirection;

            if (direction === 'both' || direction === 'download') {
                // 从服务器下载
                const remoteFiles = await this.webdav.listFiles('', true);

                for (const remoteFile of remoteFiles) {
                    if (remoteFile.isDirectory) continue;

                    const content = await this.webdav.getFile(remoteFile.path);
                    const existingFile = this.files.find(f => f.name === remoteFile.name);

                    if (existingFile) {
                        // 更新现有文件
                        if (remoteFile.lastModified > existingFile.updatedAt) {
                            existingFile.content = content;
                            existingFile.updatedAt = remoteFile.lastModified;
                            await this.storage.saveFile(existingFile);
                        }
                    } else {
                        // 创建新文件
                        const newFile = {
                            id: generateId(),
                            name: remoteFile.name,
                            content: content,
                            createdAt: remoteFile.lastModified,
                            updatedAt: remoteFile.lastModified
                        };
                        await this.storage.saveFile(newFile);
                        this.files.push(newFile);
                    }
                }
            }

            if (direction === 'both' || direction === 'upload') {
                // 上传到服务器
                for (const localFile of this.files) {
                    try {
                        await this.webdav.putFile(localFile.name, localFile.content);
                    } catch (error) {
                        console.error(`上传 ${localFile.name} 失败:`, error);
                    }
                }
            }

            this.files = await this.storage.getAllFiles();
            this.renderFileList();
            showToast('WebDAV 同步完成', 'success');
            this.refreshWebDAVFiles();
        } catch (error) {
            console.error('WebDAV 同步失败:', error);
            showToast(`WebDAV 同步失败: ${error.message}`, 'error');
        }
    }

    async refreshWebDAVFiles() {
        if (!this.webdav) {
            $('#webdavFileList').innerHTML = '<li style="color: var(--text-muted); text-align: center;">请先配置 WebDAV</li>';
            return;
        }

        try {
            const files = await this.webdav.listFiles('', true);
            const list = $('#webdavFileList');
            list.innerHTML = '';

            files.forEach(file => {
                const li = document.createElement('li');

                li.innerHTML = `
                    <span class="file-icon">📄</span>
                    <span class="filename">${file.name}</span>
                    <div class="file-actions">
                        <button data-action="download" title="下载">⬇️</button>
                    </div>
                `;

                li.querySelector('[data-action="download"]').addEventListener('click', async () => {
                    try {
                        const content = await this.webdav.getFile(file.path);
                        const existingFile = this.files.find(f => f.name === file.name);

                        if (existingFile) {
                            existingFile.content = content;
                            existingFile.updatedAt = Date.now();
                            await this.storage.saveFile(existingFile);
                            if (this.currentFile?.id === existingFile.id) {
                                $('#editor').value = content;
                                this.updatePreview();
                            }
                        } else {
                            const newFile = {
                                id: generateId(),
                                name: file.name,
                                content: content,
                                createdAt: Date.now(),
                                updatedAt: Date.now()
                            };
                            await this.storage.saveFile(newFile);
                            this.files.unshift(newFile);
                        }

                        this.renderFileList();
                        showToast('下载成功', 'success');
                    } catch (error) {
                        console.error('下载失败:', error);
                        showToast('下载失败: ' + error.message, 'error');
                    }
                });

                li.querySelector('.filename').addEventListener('click', async () => {
                    try {
                        const content = await this.webdav.getFile(file.path);
                        const existingFile = this.files.find(f => f.name === file.name);

                        if (existingFile) {
                            existingFile.content = content;
                            existingFile.updatedAt = Date.now();
                            await this.storage.saveFile(existingFile);
                            this.openFile(existingFile);
                        } else {
                            const newFile = {
                                id: generateId(),
                                name: file.name,
                                content: content,
                                createdAt: Date.now(),
                                updatedAt: Date.now()
                            };
                            await this.storage.saveFile(newFile);
                            this.files.unshift(newFile);
                            this.renderFileList();
                            this.openFile(newFile);
                        }
                    } catch (error) {
                        console.error('打开文件失败:', error);
                        showToast('打开文件失败: ' + error.message, 'error');
                    }
                });

                list.appendChild(li);
            });

            if (files.length === 0) {
                list.innerHTML = '<li style="color: var(--text-muted); text-align: center;">暂无文件</li>';
            }
        } catch (error) {
            console.error('获取文件列表失败:', error);
            $('#webdavFileList').innerHTML = `<li style="color: var(--text-muted); text-align: center;">获取 WebDAV 文件列表失败: ${error.message}</li>`;
        }
    }
}

// ==================== 初始化应用 ====================
document.addEventListener('DOMContentLoaded', () => {
    window.editor = new MDEditor();
});

// 注册 Service Worker (PWA 支持)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(console.error);
}
