/**
 * MD Editor - 本地文件保存服务
 * 提供API将文件保存到服务器本地data目录
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

// 确保data目录存在
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`创建数据目录: ${DATA_DIR}`);
}

// MIME类型映射
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.md': 'text/markdown'
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // API路由：保存文件
    if (pathname === '/api/save' && req.method === 'POST') {
        handleSaveFile(req, res);
        return;
    }

    // API路由：获取文件列表
    if (pathname === '/api/files' && req.method === 'GET') {
        handleGetFiles(req, res);
        return;
    }

    // API路由：读取文件
    if (pathname.startsWith('/api/files/') && req.method === 'GET') {
        const filename = decodeURIComponent(pathname.replace('/api/files/', ''));
        handleReadFile(req, res, filename);
        return;
    }

    // API路由：删除文件
    if (pathname.startsWith('/api/files/') && req.method === 'DELETE') {
        const filename = decodeURIComponent(pathname.replace('/api/files/', ''));
        handleDeleteFile(req, res, filename);
        return;
    }

    // 静态文件服务
    serveStaticFile(req, res, pathname);
});

// 处理保存文件请求
function handleSaveFile(req, res) {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        try {
            const data = JSON.parse(body);
            const filename = data.filename || 'untitled.md';
            const content = data.content || '';

            // 确保文件名安全（防止目录遍历）
            const safeFilename = path.basename(filename);
            const filePath = path.join(DATA_DIR, safeFilename);

            fs.writeFile(filePath, content, 'utf8', (err) => {
                if (err) {
                    console.error('保存文件失败:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: err.message }));
                    return;
                }

                console.log(`文件已保存: ${safeFilename}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    filename: safeFilename,
                    path: filePath
                }));
            });
        } catch (error) {
            console.error('解析请求失败:', error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
        }
    });
}

// 处理获取文件列表请求
function handleGetFiles(req, res) {
    fs.readdir(DATA_DIR, (err, files) => {
        if (err) {
            console.error('读取目录失败:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
            return;
        }

        const fileList = files
            .filter(file => file.endsWith('.md'))
            .map(file => {
                const stats = fs.statSync(path.join(DATA_DIR, file));
                return {
                    name: file,
                    size: stats.size,
                    updatedAt: stats.mtime.getTime()
                };
            })
            .sort((a, b) => b.updatedAt - a.updatedAt);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, files: fileList }));
    });
}

// 处理读取文件请求
function handleReadFile(req, res, filename) {
    const safeFilename = path.basename(filename);
    const filePath = path.join(DATA_DIR, safeFilename);

    fs.readFile(filePath, 'utf8', (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'File not found' }));
            } else {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
            return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            success: true, 
            filename: safeFilename,
            content: content
        }));
    });
}

// 处理删除文件请求
function handleDeleteFile(req, res, filename) {
    const safeFilename = path.basename(filename);
    const filePath = path.join(DATA_DIR, safeFilename);

    fs.unlink(filePath, (err) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'File not found' }));
            } else {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
            return;
        }

        console.log(`文件已删除: ${safeFilename}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
    });
}

// 静态文件服务
function serveStaticFile(req, res, pathname) {
    // 默认首页
    let filePath = pathname === '/' ? '/index.html' : pathname;
    filePath = path.join(__dirname, filePath);

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('File not found');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Server error');
            }
            return;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
}

server.listen(PORT, () => {
    console.log(`
========================================
  MD Editor 服务器已启动
========================================
  访问地址: http://localhost:${PORT}
  数据目录: ${DATA_DIR}
  
  快捷键:
    Ctrl+C 停止服务器
========================================
    `);
});

module.exports = { server, DATA_DIR };
