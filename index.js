#!/usr/bin/env node

const { GitOperator } = require('./lib/git-operator');
const { NaturalLanguageProcessor } = require('./lib/nlp-processor');
const { MCPHandler } = require('./lib/mcp-handler');
const winston = require('winston');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 配置日志
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'git-push-mcp' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class GitPushMCP {
  constructor() {
    this.nlpProcessor = new NaturalLanguageProcessor();
    this.gitOperator = new GitOperator(logger);
    this.mcpHandler = new MCPHandler(this.nlpProcessor, this.gitOperator, logger);
  }

  async handleRequest(request) {
    try {
      logger.info('收到请求:', request);
      const response = await this.mcpHandler.processRequest(request);
      logger.info('响应结果:', response);
      return response;
    } catch (error) {
      logger.error('处理请求时出错:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // 直接运行模式（用于测试）
  async runDirectMode() {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('=== 灵码Git提交助手 ===');
    console.log('输入自然语言指令来操作Git（输入"quit"退出）\n');

    const askQuestion = () => {
      rl.question('> ', async (input) => {
        if (input.toLowerCase() === 'quit') {
          console.log('再见！');
          rl.close();
          return;
        }

        try {
          const result = await this.handleRequest({
            command: 'process_natural_language',
            text: input,
            context: {
              autoStage: true,
              autoPush: false,
              conventionalCommits: true
            }
          });

          this.displayResult(result);
        } catch (error) {
          console.error('❌ 执行出错:', error.message);
        }

        askQuestion();
      });
    };

    askQuestion();
  }

  displayResult(result) {
    if (result.success) {
      console.log('✅ 操作成功！');
      
      if (result.action) {
        console.log(`执行动作: ${result.action}`);
      }
      
      if (result.message) {
        console.log(`消息: ${result.message}`);
      }
      
      if (result.details) {
        console.log('详细信息:');
        console.log(result.details);
      }
      
      if (result.changes) {
        console.log('\n变更统计:');
        Object.entries(result.changes).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      }
    } else {
      console.log('❌ 操作失败！');
      console.log(`错误: ${result.error}`);
      
      if (result.suggestion) {
        console.log(`建议: ${result.suggestion}`);
      }
    }
    
    console.log('---');
  }
}

// 主程序入口
async function main() {
  const app = new GitPushMCP();
  
  // 检查是否作为MCP服务器运行
  if (process.argv.includes('--mcp')) {
    // 这里可以实现MCP协议的具体通信逻辑
    console.log('启动MCP服务器模式...');
    // TODO: 实现MCP协议通信
  } else {
    // 直接交互模式
    await app.runDirectMode();
  }
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

// 启动应用
if (require.main === module) {
  main().catch(error => {
    logger.error('应用启动失败:', error);
    process.exit(1);
  });
}

module.exports = { GitPushMCP };