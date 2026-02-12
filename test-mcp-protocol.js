#!/usr/bin/env node

const { spawn } = require('child_process');
const readline = require('readline');

// 启动MCP服务器
const server = spawn('node', ['mcp-server.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// 设置 readline 来处理服务器输出
const rl = readline.createInterface({
  input: server.stdout,
  output: server.stdin
});

let messageId = 1;

function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: messageId++,
    method,
    params
  };
  
  console.log('发送请求:', JSON.stringify(request));
  server.stdin.write(JSON.stringify(request) + '\n');
}

// 监听服务器响应
rl.on('line', (line) => {
  try {
    const response = JSON.parse(line);
    console.log('收到响应:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.log('服务器输出:', line);
  }
});

// 监听错误
server.stderr.on('data', (data) => {
  console.error('服务器错误:', data.toString());
});

// 测试序列
setTimeout(() => {
  console.log('\n=== 测试1: 列出工具 ===');
  sendRequest('tools/list');
}, 1000);

setTimeout(() => {
  console.log('\n=== 测试2: 获取Git状态 ===');
  sendRequest('tools/call', {
    name: 'get_git_status',
    arguments: {}
  });
}, 2000);

setTimeout(() => {
  console.log('\n=== 测试3: 自然语言处理 ===');
  sendRequest('tools/call', {
    name: 'process_natural_language',
    arguments: {
      text: '查看状态'
    }
  });
}, 3000);

// 5秒后结束测试
setTimeout(() => {
  console.log('\n=== 测试结束 ===');
  server.kill();
  process.exit(0);
}, 5000);