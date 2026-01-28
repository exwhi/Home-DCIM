#!/usr/bin/env node
/**
 * 快速验证脚本 - 测试所有页面和 API 端点 (改进版)
 */

const http = require('http');

const BASE_URL = 'http://localhost:3002';

const tests = [
  // 页面加载测试
  { method: 'GET', path: '/', name: '✓ Dashboard (index.html)' },
  { method: 'GET', path: '/management.html', name: '✓ Device Management' },
  { method: 'GET', path: '/analytics.html', name: '✓ Analytics & Reports' },
  { method: 'GET', path: '/ssh.html', name: '✓ SSH Terminal' },
  { method: 'GET', path: '/vnc.html', name: '✓ VNC Remote' },
  
  // API 端点测试
  { method: 'GET', path: '/api/cabinets', name: '✓ Cabinets API' },
  { method: 'GET', path: '/api/devices', name: '✓ Devices API' },
  { method: 'GET', path: '/api/power-summary', name: '✓ Power Summary API' },
  { method: 'GET', path: '/api/alerts', name: '✓ Alerts API' },
  { method: 'GET', path: '/api/capacity-analysis', name: '✓ Capacity Analysis API' },
  { method: 'GET', path: '/api/settings', name: '✓ Settings API' },
  { method: 'GET', path: '/api/environment', name: '✓ Environment API' },
];

let passed = 0;
let failed = 0;

function testEndpoint(test) {
  return new Promise((resolve) => {
    const url = new URL(test.path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: test.method,
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      const success = res.statusCode >= 200 && res.statusCode < 400;
      if (success) {
        console.log(`✅ ${test.name}`);
        passed++;
      } else {
        console.log(`❌ ${test.name} [${res.statusCode}]`);
        failed++;
      }
      res.on('data', () => {}); // consume response data
      res.on('end', () => resolve());
    });

    req.on('error', (e) => {
      console.log(`❌ ${test.name} (连接错误)`);
      failed++;
      resolve();
    });

    req.on('timeout', () => {
      console.log(`❌ ${test.name} (超时)`);
      req.destroy();
      failed++;
      resolve();
    });

    req.end();
  });
}

async function runTests() {
  console.log('\n🔍 HomeDCIM 页面和 API 验证开始...\n');
  console.log('=' .repeat(50));
  
  for (const test of tests) {
    await testEndpoint(test);
    // Add a small delay between requests
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log('=' .repeat(50));
  console.log(`\n📊 测试结果: ✅ ${passed}/${tests.length} 通过`);
  
  if (failed === 0) {
    console.log('🎉 所有测试通过！系统工作正常。\n');
    process.exit(0);
  } else {
    console.log(`⚠️  ${failed} 个测试失败\n`);
    process.exit(1);
  }
}

// Give server time to start
setTimeout(runTests, 500);
