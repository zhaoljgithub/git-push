#!/usr/bin/env node

const { GitPushMCP } = require('./index');
const fs = require('fs');
const path = require('path');

async function runExample() {
  console.log('=== Git Push MCP 优化功能示例 ===\n');
  
  const app = new GitPushMCP();
  
  // 示例1：在现有仓库中操作
  console.log('📋 示例1：在现有Git仓库中操作');
  console.log('--------------------------------');
  
  try {
    const result1 = await app.handleRequest({
      command: 'process_natural_language',
      text: '查看当前状态',
      context: {}
    });
    
    console.log('状态检查结果:');
    console.log(JSON.stringify(result1, null, 2));
    
  } catch (error) {
    console.error('状态检查失败:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // 示例2：创建测试文件并提交
  console.log('📋 示例2：创建文件并提交更改');
  console.log('------------------------------');
  
  // 创建测试文件
  const testFile = path.join(process.cwd(), 'example-test-file.txt');
  fs.writeFileSync(testFile, '这是Git Push MCP优化功能的测试文件\n创建时间: ' + new Date().toISOString());
  console.log('✓ 创建测试文件:', testFile);
  
  try {
    const result2 = await app.handleRequest({
      command: 'process_natural_language',
      text: '提交添加了优化功能示例',
      context: {
        autoStage: true,
        autoPush: false,
        conventionalCommits: true
      }
    });
    
    console.log('提交结果:');
    console.log(JSON.stringify(result2, null, 2));
    
  } catch (error) {
    console.error('提交失败:', error.message);
  } finally {
    // 清理测试文件
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
      console.log('✓ 清理测试文件');
    }
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // 示例3：演示仓库保护机制
  console.log('📋 示例3：仓库保护机制演示');
  console.log('----------------------------');
  
  try {
    const result3 = await app.handleRequest({
      command: 'process_natural_language',
      text: '初始化仓库',
      context: {}
    });
    
    console.log('仓库初始化结果:');
    console.log(JSON.stringify(result3, null, 2));
    
  } catch (error) {
    console.error('初始化检查失败:', error.message);
  }
  
  console.log('\n✨ 示例演示完成！');
  console.log('\n💡 优化特性验证:');
  console.log('• 智能检测现有.git目录，避免重复初始化');
  console.log('• 自动处理非Git目录的初始化需求');
  console.log('• 保护现有仓库不被意外覆盖');
  console.log('• 提供清晰的操作反馈和错误信息');
}

// 运行示例
runExample().catch(console.error);