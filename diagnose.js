#!/usr/bin/env node

/**
 * MD Editor WebDAV 配置诊断工具
 *
 * 使用方法:
 *   node diagnose.js
 *
 * 这个脚本会检查：
 * 1. 环境变量配置是否正确
 * 2. 后端 WebDAV 服务器是否可达
 * 3. 代理服务器是否正常启动
 */

const axios = require('axios');
require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(50));
  log(title, 'blue');
  console.log('='.repeat(50));
}

async function testConnection(url, options = {}) {
  try {
    const response = await axios({
      method: options.method || 'GET',
      url: url,
      headers: options.headers || {},
      timeout: options.timeout || 10000,
      validateStatus: () => true
    });
    return {
      success: true,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

async function diagnose() {
  log('MD Editor WebDAV 代理服务器 - 配置诊断工具', 'blue');
  log('==========================================', 'blue');

  // 检查环境变量
  section('1. 检查环境变量配置');

  const requiredEnvVars = [
    'PORT',
    'WEBDAV_PROTOCOL',
    'WEBDAV_HOST',
    'WEBDAV_PORT',
    'WEBDAV_PATH'
  ];

  let allEnvVarsPresent = true;
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      log(`  ✓ ${envVar} = ${process.env[envVar]}`, 'green');
    } else {
      log(`  ✗ ${envVar} 未设置`, 'red');
      allEnvVarsPresent = false;
    }
  }

  const hasAuth = process.env.WEBDAV_USERNAME && process.env.WEBDAV_PASSWORD;
  if (hasAuth) {
    log(`  ✓ WebDAV 认证信息已配置`, 'green');
  } else {
    log(`  ⚠ WebDAV 认证信息未配置（某些服务器可能需要）`, 'yellow');
  }

  if (!allEnvVarsPresent) {
    log('\n  错误：缺少必要的环境变量配置！', 'red');
    log('  请检查 .env 文件是否正确配置。', 'red');
    return;
  }

  // 构建后端 WebDAV URL
  const WEBDAV_BASE_URL = `${process.env.WEBDAV_PROTOCOL}://${process.env.WEBDAV_HOST}:${process.env.WEBDAV_PORT}${process.env.WEBDAV_PATH}`;
  const PROXY_URL = `http://localhost:${process.env.PORT || 3000}`;

  section('2. WebDAV 后端服务器连接测试');
  log(`  后端地址: ${WEBDAV_BASE_URL}`, 'blue');

  // 测试后端 WebDAV 服务器
  const webdavHeaders = {
    'Depth': '0',
    'Content-Type': 'application/xml'
  };

  if (hasAuth) {
    const auth = Buffer.from(`${process.env.WEBDAV_USERNAME}:${process.env.WEBDAV_PASSWORD}`).toString('base64');
    webdavHeaders['Authorization'] = `Basic ${auth}`;
  }

  const webdavResult = await testConnection(WEBDAV_BASE_URL, {
    method: 'PROPFIND',
    headers: webdavHeaders
  });

  if (webdavResult.success) {
    if ([200, 207, 204].includes(webdavResult.status)) {
      log(`  ✓ 后端 WebDAV 服务器响应正常 (HTTP ${webdavResult.status})`, 'green');
    } else {
      log(`  ⚠ 后端 WebDAV 服务器响应: HTTP ${webdavResult.status} ${webdavResult.statusText}`, 'yellow');
      log('  注意：这可能是正常情况，取决于服务器配置', 'yellow');
    }
  } else {
    log(`  ✗ 无法连接到后端 WebDAV 服务器`, 'red');
    log(`  错误: ${webdavResult.error}`, 'red');
    if (webdavResult.code === 'ECONNREFUSED') {
      log('  提示: 请检查后端服务器是否正在运行', 'yellow');
    } else if (webdavResult.code === 'ETIMEDOUT') {
      log('  提示: 连接超时，请检查网络连接和防火墙设置', 'yellow');
    }
  }

  // 测试代理服务器
  section('3. 代理服务器连接测试');
  log(`  代理地址: ${PROXY_URL}`, 'blue');

  const proxyStatusResult = await testConnection(`${PROXY_URL}/api/status`);
  if (proxyStatusResult.success) {
    if (proxyStatusResult.status === 200) {
      log(`  ✓ 代理服务器运行正常`, 'green');
    } else {
      log(`  ⚠ 代理服务器响应: HTTP ${proxyStatusResult.status}`, 'yellow');
    }
  } else {
    log(`  ✗ 无法连接到代理服务器`, 'red');
    log(`  错误: ${proxyStatusResult.error}`, 'red');
    log('  提示: 请确保代理服务器正在运行 (npm start)', 'yellow');
  }

  // 测试代理连接到后端
  section('4. 代理连接测试');
  const proxyTestResult = await testConnection(`${PROXY_URL}/api/test-connection`);
  if (proxyTestResult.success) {
    if (proxyTestResult.status === 200) {
      log(`  ✓ 代理服务器可以连接到后端 WebDAV 服务器`, 'green');
    } else {
      log(`  ⚠ 代理测试响应: HTTP ${proxyTestResult.status}`, 'yellow');
    }
  } else {
    log(`  ✗ 代理服务器无法连接到后端 WebDAV 服务器`, 'red');
    log(`  错误: ${proxyTestResult.error}`, 'red');
  }

  // 配置建议
  section('5. 配置建议');
  log('  在浏览器中配置 WebDAV 时，请使用以下地址：', 'blue');
  console.log('');
  log(`  代理模式（推荐）: ${PROXY_URL}/webdav/`, 'green');
  log(`  代理模式（通过域名）: https://md.yhjedward.com/webdav/`, 'green');
  console.log('');
  log('  直接连接模式（需要 CORS 配置）:', 'yellow');
  log(`  ${WEBDAV_BASE_URL}`, 'yellow');
  console.log('');

  section('诊断完成');

  // 总结
  const webdavOk = webdavResult.success && [200, 207, 204].includes(webdavResult.status);
  const proxyOk = proxyStatusResult.success && proxyStatusResult.status === 200;

  if (webdavOk && proxyOk) {
    log('✓ 所有检查通过！配置正确。', 'green');
    log('  现在可以在浏览器中使用代理模式配置 WebDAV。', 'green');
  } else if (!webdavOk && proxyOk) {
    log('⚠ 代理服务器正常，但无法连接到后端 WebDAV 服务器。', 'yellow');
    log('  请检查后端服务器是否正在运行，以及网络连接是否正常。', 'yellow');
  } else if (webdavOk && !proxyOk) {
    log('⚠ 后端 WebDAV 服务器正常，但代理服务器未启动。', 'yellow');
    log('  请运行: npm start', 'yellow');
  } else {
    log('✗ 存在多个问题，请检查上述错误信息。', 'red');
  }

  console.log('');
}

diagnose().catch(error => {
  log(`诊断脚本运行失败: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
