/**
 * MD Editor WebDAV 代理服务器
 * 
 * 这是一个Express代理服务器，用于解决前端HTTPS和WebDAV服务器HTTP之间的跨域问题。
 * 它接收前端的WebDAV请求，转发到HTTP的WebDAV服务器，并处理响应。
 * 
 * 使用方法:
 *   1. 配置环境变量或直接在代码中设置WebDAV服务器地址
 *   2. 运行: npm start
 *   3. 在前端配置WebDAV地址为: /webdav-proxy/
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const axios = require('axios');
const xml2js = require('xml2js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// WebDAV 服务器配置
const WEBDAV_CONFIG = {
    protocol: process.env.WEBDAV_PROTOCOL || 'http',
    host: process.env.WEBDAV_HOST || 'localhost',
    port: process.env.WEBDAV_PORT || 8092,
    basePath: process.env.WEBDAV_PATH || '/dav/',
    username: process.env.WEBDAV_USERNAME || '',
    password: process.env.WEBDAV_PASSWORD || ''
};

const WEBDAV_BASE_URL = `${WEBDAV_CONFIG.protocol}://${WEBDAV_CONFIG.host}:${WEBDAV_CONFIG.port}${WEBDAV_CONFIG.basePath}`;

console.log('========================================');
console.log('MD Editor WebDAV 代理服务器');
console.log('========================================');
console.log(`WebDAV 后端地址: ${WEBDAV_BASE_URL}`);
console.log(`代理服务器端口: ${PORT}`);
console.log('========================================');

// 中间件配置
app.use(helmet({
    contentSecurityPolicy: false, // 允许代理跨域
    crossOriginEmbedderPolicy: false
}));
app.use(cors({
    origin: true, // 允许所有源
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PROPFIND', 'MKCOL', 'COPY', 'MOVE', 'HEAD'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Depth', 'X-Requested-With', 'Accept', 'If-Modified-Since', 'If-None-Match', 'Range'],
    exposedHeaders: ['Content-Length', 'Content-Type', 'ETag', 'Last-Modified', 'Accept-Ranges', 'Content-Range']
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.raw({ type: '*/*', limit: '50mb' }));

// 静态文件服务（前端）
app.use(express.static(path.join(__dirname, 'public')));

// 生成WebDAV认证头
function getWebDAVAuthHeader() {
    if (WEBDAV_CONFIG.username && WEBDAV_CONFIG.password) {
        const auth = Buffer.from(`${WEBDAV_CONFIG.username}:${WEBDAV_CONFIG.password}`).toString('base64');
        return `Basic ${auth}`;
    }
    return null;
}

// 代理WebDAV请求的核心函数
async function proxyWebDAV(req, res) {
    const targetPath = req.params.path || req.params[0] || '';
    const normalizedPath = targetPath.replace(/^\/+/, '');
    const targetUrl = `${WEBDAV_BASE_URL}${normalizedPath}`;
    
    console.log(`[${new Date().toISOString()}] ${req.method} ${targetUrl}`);
    
    // 获取请求头
    const headers = {
        ...req.headers,
        host: `${WEBDAV_CONFIG.host}:${WEBDAV_CONFIG.port}`,
    };
    
    // 处理认证
    const authHeader = getWebDAVAuthHeader();
    if (authHeader) {
        headers['Authorization'] = authHeader;
    }
    
    // 移除可能导致问题的代理请求头
    delete headers['host'];
    delete headers['connection'];
    delete headers['cookie'];
    
    // 确保正确的Content-Type
    if (req.headers['content-type'] && req.headers['content-type'].includes('text/xml')) {
        headers['Content-Type'] = 'application/xml; charset=utf-8';
    }
    
    try {
        const response = await axios({
            method: req.method,
            url: targetUrl,
            headers: headers,
            data: req.body,
            responseType: 'stream',
            timeout: 60000,
            validateStatus: () => true // 接受所有状态码
        });
        
        // 转发响应状态
        res.status(response.status);
        
        // 转发响应头
        const responseHeaders = response.headers;
        const allowedHeaders = [
            'content-type', 'content-length', 'etag', 'last-modified',
            'accept-ranges', 'content-range', 'dav', 'ms-author-via',
            'www-authenticate', 'authorization'
        ];
        
        Object.keys(responseHeaders).forEach(key => {
            if (allowedHeaders.includes(key.toLowerCase())) {
                res.setHeader(key, responseHeaders[key]);
            }
        });
        
        // 特别处理WebDAV特定响应头
        if (responseHeaders['dav']) {
            res.setHeader('DAV', responseHeaders['dav']);
        }
        
        // 流式传输响应
        response.data.pipe(res);
        
    } catch (error) {
        console.error(`[ERROR] WebDAV代理失败: ${error.message}`);
        
        if (error.code === 'ECONNREFUSED') {
            res.status(502).json({
                error: 'Bad Gateway',
                message: `无法连接到WebDAV服务器: ${WEBDAV_BASE_URL}`
            });
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
            res.status(504).json({
                error: 'Gateway Timeout',
                message: 'WebDAV服务器响应超时'
            });
        } else {
            res.status(500).json({
                error: 'Internal Server Error',
                message: error.message
            });
        }
    }
}

// WebDAV 代理路由
// 处理所有路径的WebDAV请求
app.all('/webdav/*', proxyWebDAV);
app.all('/webdav', proxyWebDAV);

// 简化的WebDAV路由（不带/webdav前缀）
app.all('/dav/*', proxyWebDAV);
app.all('/dav', proxyWebDAV);

// API端点：获取代理状态
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        server: 'MD Editor WebDAV Proxy',
        version: '1.0.0',
        webdav: {
            backend_url: WEBDAV_BASE_URL,
            configured: !!(WEBDAV_CONFIG.username && WEBDAV_CONFIG.password)
        }
    });
});

// API端点：测试WebDAV连接
app.get('/api/test-connection', async (req, res) => {
    try {
        const authHeader = getWebDAVAuthHeader();
        const headers = {
            'Depth': '0'
        };
        
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }
        
        const response = await axios({
            method: 'PROPFIND',
            url: WEBDAV_BASE_URL,
            headers: headers,
            timeout: 10000,
            validateStatus: () => true
        });
        
        if (response.status === 207 || response.status === 200 || response.status === 204) {
            res.json({ success: true, message: 'WebDAV连接成功' });
        } else {
            res.json({ success: false, message: `服务器返回状态: ${response.status}` });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// API端点：配置WebDAV连接（用于前端动态设置）
app.post('/api/configure', (req, res) => {
    const { url, username, password } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: '缺少WebDAV服务器地址' });
    }
    
    // 这里可以存储配置到内存或数据库
    // 简化版本：返回配置信息
    res.json({
        success: true,
        message: '配置已更新',
        config: {
            url: url,
            hasCredentials: !!(username && password)
        }
    });
});

// 列出文件（简化版API）
app.get('/api/files', async (req, res) => {
    try {
        const authHeader = getWebDAVAuthHeader();
        const headers = {
            'Depth': '1'
        };
        
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }
        
        const response = await axios({
            method: 'PROPFIND',
            url: WEBDAV_BASE_URL,
            headers: headers,
            timeout: 10000
        });
        
        const parser = new xml2js.Parser({ explicitArray: false });
        parser.parseString(response.data, (err, result) => {
            if (err) {
                return res.status(500).json({ error: '解析XML失败', details: err.message });
            }
            
            const responses = result['multistatus']['response'];
            const files = [];
            
            // 处理单个响应的情况
            const responseList = Array.isArray(responses) ? responses : [responses];
            
            responseList.forEach(item => {
                const href = item.href;
                const displayName = item.propstat?.prop?.displayname || href.split('/').pop();
                const isDirectory = !!item.propstat?.prop?.resourcetype?.collection;
                
                // 跳过根目录
                if (href === WEBDAV_BASE_URL || href === WEBDAV_BASE_URL + '/') {
                    return;
                }
                
                files.push({
                    name: displayName,
                    path: href,
                    isDirectory: isDirectory,
                    lastModified: item.propstat?.prop?.getlastmodified,
                    size: item.propstat?.prop?.getcontentlength || 0
                });
            });
            
            res.json({ files });
        });
    } catch (error) {
        console.error('获取文件列表失败:', error);
        res.status(500).json({ error: error.message });
    }
});

// 读取文件
app.get('/api/file/*', async (req, res) => {
    const filePath = req.params[0];
    const targetUrl = `${WEBDAV_BASE_URL}${filePath}`;
    
    try {
        const authHeader = getWebDAVAuthHeader();
        const headers = {};
        
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }
        
        const response = await axios({
            method: 'GET',
            url: targetUrl,
            headers: headers,
            timeout: 30000
        });
        
        res.type('text/plain; charset=utf-8');
        res.send(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 写入文件
app.put('/api/file/*', async (req, res) => {
    const filePath = req.params[0];
    const targetUrl = `${WEBDAV_BASE_URL}${filePath}`;
    
    try {
        const authHeader = getWebDAVAuthHeader();
        const headers = {
            'Content-Type': 'text/markdown; charset=utf-8'
        };
        
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }
        
        const response = await axios({
            method: 'PUT',
            url: targetUrl,
            headers: headers,
            data: req.body,
            timeout: 30000
        });
        
        res.status(response.status).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 删除文件
app.delete('/api/file/*', async (req, res) => {
    const filePath = req.params[0];
    const targetUrl = `${WEBDAV_BASE_URL}${filePath}`;
    
    try {
        const authHeader = getWebDAVAuthHeader();
        const headers = {};
        
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }
        
        const response = await axios({
            method: 'DELETE',
            url: targetUrl,
            headers: headers,
            timeout: 10000
        });
        
        res.status(response.status).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// SPA路由支持 - 所有其他请求返回index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`服务器已启动: http://localhost:${PORT}`);
    console.log(`前端页面: http://localhost:${PORT}`);
    console.log(`WebDAV代理: http://localhost:${PORT}/webdav/`);
    console.log(`========================================`);
});

module.exports = app;
