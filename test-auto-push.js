#!/usr/bin/env node

const { GitPushMCP } = require('./index');
const fs = require('fs');
const path = require('path');

async function runAutoPushTest() {
  console.log('=== Git Push MCP 自动推送功能测试 ===\n');
  
  const app = new GitPushMCP();
  let testFile2; // 声明变量以避免作用域问题
  
  // 创建测试文件
  const testFile = path.join(process.cwd(), 'auto-push-test.txt');
  fs.writeFileSync(testFile, '这是自动推送功能测试文件\n创建时间: ' + new Date().toISOString());
  console.log('✓ 创建测试文件:', testFile);
  
  try {
    // 测试1: 不启用自动推送
    console.log('\n📋 测试1：提交但不自动推送');
    console.log('--------------------------');
    
    const result1 = await app.handleRequest({
      command: 'process_natural_language',
      text: '提交自动推送测试文件',
      context: {
        autoStage: true,
        autoPush: false,  // 不自动推送
        conventionalCommits: true
      }
    });
    
    console.log('提交结果（无自动推送）:');
    console.log(JSON.stringify(result1, null, 2));
    console.log('推送状态:', result1.pushed ? '✓ 已推送' : '✗ 未推送');
    
    // 测试2: 启用自动推送
    console.log('\n📋 测试2：提交并自动推送');
    console.log('------------------------');
    
    // 创建另一个测试文件
    testFile2 = path.join(process.cwd(), 'auto-push-test2.txt');
    fs.writeFileSync(testFile2, '这是第二个自动推送测试文件\n创建时间: ' + new Date().toISOString());
    console.log('✓ 创建第二个测试文件:', testFile2);
    
    const result2 = await app.handleRequest({
      command: 'process_natural_language',
      text: '提交第二个测试文件',
      context: {
        autoStage: true,
        autoPush: true,  // 启用自动推送
        conventionalCommits: true
      }
    });
    
    console.log('提交结果（自动推送）:');
    console.log(JSON.stringify(result2, null, 2));
    console.log('推送状态:', result2.pushed ? '✓ 已推送' : '✗ 未推送');
    console.log('操作类型:', result2.action);
    
    // 测试3: 使用commitChanges API直接测试
    console.log('\n📋 测试3：使用API直接提交并推送');
    console.log('--------------------------------');
    
    const handler = app.mcpHandler;
    const result3 = await handler.commitChanges(
      'test: 第三个自动推送测试',
      [],
      true,
      true  // 启用自动推送
    );
    
    console.log('API提交结果:');
    console.log(JSON.stringify(result3, null, 2));
    console.log('推送状态:', result3.pushed ? '✓ 已推送' : '✗ 未推送');
    console.log('操作类型:', result3.action);
    
  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
    if (error.stack) {
      console.error('堆栈跟踪:', error.stack);
    }
  } finally {
    // 清理测试文件
    [testFile, testFile2].forEach(file => {
      if (file && fs.existsSync(file)) {
        fs.unlinkSync(file);
        console.log('✓ 清理测试文件:', file);
      }
    });
  }
  
  console.log('\n✨ 自动推送功能测试完成！');
  console.log('\n🎯 功能验证要点:');
  console.log('• 提交时不自动推送：pushed = false');
  console.log('• 提交时自动推送：pushed = true');
  console.log('• 正确识别当前分支并推送到origin');
  console.log('• 返回明确的操作类型标识');
  console.log('• 完善的错误处理和状态反馈');
}

// 运行测试
runAutoPushTest().catch(console.error);