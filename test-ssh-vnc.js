#!/usr/bin/env node

/**
 * HomeDCIM SSH & VNC Quick Test
 * 
 * 这个脚本展示如何通过 API 测试 SSH 和 VNC 功能
 * 可用于集成测试或演示
 */

const http = require('http');

const API_URL = 'http://localhost:3001';

/**
 * 发起 HTTP 请求
 */
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-User': 'test-script'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * 验证 SSH 页面
 */
async function testSSHPage() {
  console.log('\n🔍 测试 SSH 页面...');
  const res = await request('GET', '/ssh.html');
  if (res.status === 200 && res.body.includes('xterm')) {
    console.log('✅ SSH 页面正常 (200 OK)');
    console.log('   包含 xterm.js 库: ✓');
  } else {
    console.log('❌ SSH 页面异常:', res.status);
  }
}

/**
 * 验证 VNC 页面
 */
async function testVNCPage() {
  console.log('\n🔍 测试 VNC 页面...');
  const res = await request('GET', '/vnc.html');
  if (res.status === 200 && res.body.includes('noVNC') && res.body.includes('websockify')) {
    console.log('✅ VNC 页面正常 (200 OK)');
    console.log('   包含 noVNC 库: ✓');
    console.log('   包含 websockify 说明: ✓');
  } else {
    console.log('❌ VNC 页面异常:', res.status);
  }
}

/**
 * 验证审计日志 API
 */
async function testAuditAPI() {
  console.log('\n🔍 测试审计日志 API...');
  const res = await request('GET', '/api/audits');
  if (res.status === 200) {
    const audits = JSON.parse(res.body);
    console.log('✅ 审计日志 API 正常 (200 OK)');
    console.log(`   已记录 ${audits.length} 条审计日志`);
    if (audits.length > 0) {
      console.log('   最近的条目:', audits[audits.length - 1].action);
    }
  } else {
    console.log('❌ 审计日志 API 异常:', res.status);
  }
}

/**
 * 测试 websockify 启动 API（仅显示端点）
 */
async function testWebsockifyEndpoint() {
  console.log('\n🔍 测试 websockify 启动端点...');
  console.log('   端点: POST /api/start-websockify');
  console.log('   请求体:');
  console.log('   {');
  console.log('     "targetHost": "192.168.1.20",');
  console.log('     "targetPort": 5900,');
  console.log('     "wsPort": 6080');
  console.log('   }');
  console.log('   💡 注意: 需要在主机上安装 websockify 才能真正启动代理');
}

/**
 * 主函数
 */
async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   HomeDCIM SSH & VNC 功能测试        ║');
  console.log('╚════════════════════════════════════════╝');

  try {
    await testSSHPage();
    await testVNCPage();
    await testAuditAPI();
    await testWebsockifyEndpoint();

    console.log('\n' + '═'.repeat(40));
    console.log('✅ 所有测试完成！');
    console.log('\n💡 接下来：');
    console.log('   1. 打开浏览器访问 http://localhost:3001');
    console.log('   2. 点击导航菜单中的"SSH 终端"或"VNC 远程"');
    console.log('   3. 输入目标服务器信息并连接');
    console.log('\n📖 更多说明请查看 SSH_VNC_GUIDE.md');
  } catch (e) {
    console.error('❌ 测试失败:', e.message);
    process.exit(1);
  }
}

main();
