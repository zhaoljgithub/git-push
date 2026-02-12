#!/usr/bin/env node

const { MCPHandler } = require('./lib/mcp-handler');

async function testAutoPushFeature() {
  console.log('🧪 开始测试自动推送功能...\n');
  
  const handler = new MCPHandler();
  
  try {
    // 1. 检查当前状态
    console.log('1. 检查Git仓库状态...');
    const statusResult = await handler.getGitStatus();
    console.log('状态检查结果:', JSON.stringify(statusResult, null, 2));
    
    if (!statusResult.success) {
      console.log('❌ 不在Git仓库中，测试终止');
      return;
    }
    
    // 2. 创建测试文件
    console.log('\n2. 创建测试文件...');
    const fs = require('fs');
    const testContent = `// 测试自动推送功能 - ${new Date().toISOString()}\nconsole.log('Hello Git Push MCP!');`;
    fs.writeFileSync('test-feature.txt', testContent);
    console.log('✅ 测试文件创建成功');
    
    // 3. 测试一体化commit-and-push功能
    console.log('\n3. 测试一体化commit-and-push功能...');
    const commitMessage = "test: 验证自动推送功能";
    const autoPushResult = await handler.commitChanges(commitMessage, [], true, true);
    console.log('一体化操作结果:', JSON.stringify(autoPushResult, null, 2));
    
    if (autoPushResult.success && autoPushResult.pushed) {
      console.log('✅ 自动推送功能测试成功！');
    } else {
      console.log('❌ 自动推送功能测试失败');
    }
    
    // 4. 清理测试文件
    console.log('\n4. 清理测试文件...');
    try {
      fs.unlinkSync('test-feature.txt');
      console.log('✅ 测试文件清理完成');
    } catch (err) {
      console.log('⚠️ 测试文件清理失败:', err.message);
    }
    
    // 5. 最终状态检查
    console.log('\n5. 最终状态检查...');
    const finalStatus = await handler.getGitStatus();
    console.log('最终状态:', JSON.stringify(finalStatus, null, 2));
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 执行测试
if (require.main === module) {
  testAutoPushFeature();
}

module.exports = { testAutoPushFeature };