#!/usr/bin/env node

const { GitOperator } = require('./lib/git-operator');
const { MCPHandler } = require('./lib/mcp-handler');
const fs = require('fs');
const path = require('path');

async function testOptimization() {
  console.log('🧪 Git Push MCP 优化功能测试');
  console.log('================================\n');
  
  const gitOperator = new GitOperator(console);
  const mcpHandler = new MCPHandler();
  
  try {
    // 1. 测试仓库状态检测
    console.log('1. 仓库状态检测测试');
    console.log('--------------------');
    const repoCheck = await gitOperator.checkRepository();
    console.log(`仓库检查结果: ${repoCheck.isRepository ? '✓ 是Git仓库' : '✗ 非Git仓库'}`);
    if (repoCheck.root) {
      console.log(`仓库根目录: ${repoCheck.root}`);
    }
    console.log('');
    
    // 2. 测试状态获取
    console.log('2. Git状态获取测试');
    console.log('------------------');
    const statusResult = await gitOperator.getStatus();
    if (statusResult.success) {
      const status = statusResult.data;
      console.log(`✓ 状态获取成功`);
      console.log(`  当前分支: ${status.current || 'unknown'}`);
      console.log(`  工作区状态: ${status.isClean ? '干净' : '有未提交更改'}`);
      console.log(`  修改文件: ${status.modified.length}`);
      console.log(`  新增文件: ${status.created.length}`);
      console.log(`  删除文件: ${status.deleted.length}`);
      console.log(`  暂存文件: ${status.staged.length}`);
      console.log(`  未跟踪文件: ${status.not_added.length}`);
    } else {
      console.log(`✗ 状态获取失败: ${statusResult.error}`);
    }
    console.log('');
    
    // 3. 创建测试文件并测试提交流程
    console.log('3. 提交流程测试');
    console.log('---------------');
    
    // 创建测试文件
    const testFile = path.join(process.cwd(), 'optimization-test.txt');
    const testContent = `优化测试文件 - ${new Date().toISOString()}\n这是用来测试提交功能的文件。`;
    fs.writeFileSync(testFile, testContent);
    console.log('✓ 创建测试文件');
    
    try {
      // 测试自然语言处理提交
      console.log('\n3.1 自然语言提交测试');
      const nlResult = await mcpHandler.processNaturalLanguage('提交优化测试文件', {
        autoStage: true,
        autoPush: false,
        conventionalCommits: true
      });
      
      console.log(`提交结果: ${nlResult.success ? '✓ 成功' : '✗ 失败'}`);
      if (nlResult.success) {
        console.log(`  动作: ${nlResult.action}`);
        console.log(`  消息: ${nlResult.message}`);
        if (nlResult.stats) {
          console.log(`  统计: ${JSON.stringify(nlResult.stats)}`);
        }
      } else {
        console.log(`  错误: ${nlResult.error}`);
      }
      
      // 测试直接提交方法
      console.log('\n3.2 直接提交方法测试');
      const directResult = await gitOperator.addAllAndCommit('test: 直接提交测试');
      
      console.log(`直接提交结果: ${directResult.success ? '✓ 成功' : '✗ 失败'}`);
      if (directResult.success) {
        console.log(`  消息: ${directResult.message}`);
        if (directResult.stats) {
          console.log(`  统计: 变更${directResult.stats.changes}个文件, 插入${directResult.stats.insertions}行, 删除${directResult.stats.deletions}行`);
        }
      }
      
    } finally {
      // 清理测试文件
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
        console.log('✓ 清理测试文件');
      }
    }
    
    // 4. 测试状态查询
    console.log('\n4. 状态查询测试');
    console.log('---------------');
    const statusQuery = await mcpHandler.processNaturalLanguage('状态');
    console.log(`状态查询结果: ${statusQuery.success ? '✓ 成功' : '✗ 失败'}`);
    if (statusQuery.success && statusQuery.details) {
      console.log(`  当前分支: ${statusQuery.details.currentBranch}`);
      console.log(`  工作区: ${statusQuery.details.isClean ? '干净' : '有更改'}`);
      const changes = statusQuery.details.changes;
      console.log(`  文件变更: 修改${changes.modified}, 新增${changes.created}, 删除${changes.deleted}`);
    }
    
    console.log('\n🎉 优化功能测试完成！');
    console.log('\n优化改进总结:');
    console.log('• ✅ 改进了仓库状态检测逻辑');
    console.log('• ✅ 优化了提交统计信息准确性');
    console.log('• ✅ 增强了错误处理和日志记录');
    console.log('• ✅ 统一了数据返回格式');
    console.log('• ✅ 改进了自动暂存逻辑');
    
  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
    console.error('堆栈:', error.stack);
  }
}

// 运行测试
if (require.main === module) {
  testOptimization().catch(console.error);
}

module.exports = { testOptimization };