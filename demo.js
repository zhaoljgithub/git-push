#!/usr/bin/env node

const { GitPushMCP } = require('./index');

async function runDemo() {
  console.log('🚀 Git Push MCP 演示程序');
  console.log('========================\n');
  
  const app = new GitPushMCP();
  
  // 演示各种自然语言命令
  const demoCommands = [
    '查看状态',
    '提交添加了新功能',
    '添加所有文件',
    '查看提交历史',
    '有什么变化',
    'commit fix bug',
    '把test.js提交',
    '查看分支'
  ];
  
  for (const command of demoCommands) {
    console.log(`\n📝 测试命令: "${command}"`);
    console.log('-'.repeat(40));
    
    try {
      const result = await app.handleRequest({
        command: 'process_natural_language',
        text: command,
        context: {
          autoStage: true,
          autoPush: false,
          conventionalCommits: true
        }
      });
      
      displayResult(result);
      
    } catch (error) {
      console.error('❌ 执行出错:', error.message);
    }
    
    // 添加延迟以便观察
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✨ 演示完成！');
}

function displayResult(result) {
  if (result.success) {
    console.log('✅ 成功!');
    if (result.action) {
      console.log(`   动作: ${result.action}`);
    }
    if (result.message) {
      console.log(`   消息: ${result.message}`);
    }
    if (result.changes) {
      console.log('   变更:');
      Object.entries(result.changes).forEach(([key, value]) => {
        console.log(`     ${key}: ${value}`);
      });
    }
  } else {
    console.log('❌ 失败!');
    console.log(`   错误: ${result.error}`);
    if (result.suggestion) {
      console.log(`   建议: ${result.suggestion}`);
    }
  }
}

// 运行演示
runDemo().catch(console.error);