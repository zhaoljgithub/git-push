#!/usr/bin/env node

const { MCPHandler } = require('./lib/mcp-handler');
const readline = require('readline');

class GitPushMCP {
  constructor() {
    this.handler = new MCPHandler();
    this.setupStdio();
  }

  setupStdio() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    rl.on('line', async (line) => {
      try {
        const request = JSON.parse(line);
        await this.handleRequest(request);
      } catch (error) {
        console.error('Error parsing request:', error);
        this.sendError('Invalid JSON request');
      }
    });

    rl.on('close', () => {
      process.exit(0);
    });
  }

  async handleRequest(request) {
    const { id, method, params } = request;

    try {
      let result;

      switch (method) {
        case 'initialize':
          result = await this.initialize(params);
          break;
        case 'git_push/execute_command':
          result = await this.executeCommand(params);
          break;
        case 'git_push/get_status':
          result = await this.getStatus();
          break;
        case 'git_push/get_history':
          result = await this.getHistory();
          break;
        case 'git_push/get_branches':
          result = await this.getBranches();
          break;
        default:
          throw new Error(`Method ${method} not found`);
      }

      this.sendResponse(id, result);
    } catch (error) {
      this.sendError(id, error.message);
    }
  }

  async initialize(params) {
    return {
      protocolVersion: '1.0.0',
      capabilities: {
        tools: {
          list: true,
          call: true
        }
      },
      serverInfo: {
        name: 'git-push-mcp',
        version: '1.0.0'
      }
    };
  }

  async executeCommand(params) {
    const { command } = params;
    const result = await this.handler.processCommand(command);
    return {
      success: result.success,
      message: result.message,
      details: result.details || null
    };
  }

  async getStatus() {
    const result = await this.handler.processCommand('查看状态');
    return {
      status: result.message,
      hasChanges: result.success
    };
  }

  async getHistory() {
    const result = await this.handler.processCommand('查看提交历史');
    return {
      history: result.message
    };
  }

  async getBranches() {
    const result = await this.handler.processCommand('查看分支');
    return {
      branches: result.message,
      current: 'master' // 可以根据实际情况动态获取
    };
  }

  sendResponse(id, result) {
    const response = {
      jsonrpc: '2.0',
      id,
      result
    };
    console.log(JSON.stringify(response));
  }

  sendError(id, error) {
    const response = {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: error
      }
    };
    console.log(JSON.stringify(response));
  }
}

// 启动MCP服务器
if (require.main === module) {
  new GitPushMCP();
}

module.exports = { GitPushMCP };