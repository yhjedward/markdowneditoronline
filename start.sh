#!/bin/bash

# MD Editor WebDAV 代理服务器启动脚本

echo "========================================="
echo "MD Editor WebDAV 代理服务器"
echo "========================================="

# 检查是否存在.env文件
if [ ! -f ".env" ]; then
    echo "未找到 .env 文件，创建默认配置..."
    cp .env.example .env
    echo "已创建 .env 文件，请根据您的WebDAV服务器配置进行修改"
fi

# 检查Node.js环境
if ! command -v node &> /dev/null; then
    echo "错误: 未找到Node.js，请先安装Node.js"
    exit 1
fi

# 检查npm
if ! command -v npm &> /dev/null; then
    echo "错误: 未找到npm，请先安装npm"
    exit 1
fi

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "安装依赖包..."
    npm install
fi

# 启动服务器
echo "启动服务器..."
echo "按 Ctrl+C 停止服务器"
echo "========================================="
echo "前端地址: http://localhost:3000"
echo "WebDAV代理: http://localhost:3000/webdav/ 或 http://localhost:3000/dav/"
echo "API状态: http://localhost:3000/api/status"
echo "========================================="

npm start
