#!/usr/bin/env node

const { GitOperator } = require('./lib/git-operator');
const winston = require('winston');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// 配置日志
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'git-push-mcp-demo' },
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

async function runOptimizationDemo() {
  console.log('🚀 Git Push MCP 优化功能演示');
  console.log('================================\n');
  
  const gitOperator = new GitOperator(logger);
  
  try {
    // 1. 演示仓库检测优化
    console.log('1. 仓库检测优化演示');
    console.log('-------------------');
    
    const repoCheck = await gitOperator.checkRepository();
    console.log(`当前目录仓库状态: ${repoCheck.isRepository ? '✓ 是Git仓库' : '✗ 非Git仓库'}`);
    if (repoCheck.root) {
      console.log(`仓库根目录: ${repoCheck.root}`);
    }
    console.log('');
    
    // 2. 演示自动初始化功能
    console.log('2. 自动仓库初始化演示');
    console.log('---------------------');
    
    // 创建临时目录测试初始化
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-push-demo-'));
    console.log(`创建测试目录: ${tempDir}`);
    
    try {
      // 切换到临时目录
      const originalDir = process.cwd();
      process.chdir(tempDir);
      
      console.log('切换到非Git目录...');
      
      // 检查是否为Git仓库（应该返回false）
      const initialCheck = await gitOperator.checkRepository();
      console.log(`初始化检查: ${initialCheck.isRepository ? '✓ 已是Git仓库' : '✗ 非Git仓库'}`);
      
      // 使用ensureRepository自动初始化
      console.log('使用ensureRepository自动处理...');
      const ensureResult = await gitOperator.ensureRepository();
      console.log(`初始化结果: ${ensureResult.success ? '✓ 成功' : '✗ 失败'}`);
      if (ensureResult.message) {
        console.log(`消息: ${ensureResult.message}`);
      }
      
      // 再次检查
      const finalCheck = await gitOperator.checkRepository();
      console.log(`最终检查: ${finalCheck.isRepository ? '✓ 现在是Git仓库' : '✗ 仍然是非Git仓库'}`);
      
      // 切回原目录
      process.chdir(originalDir);
      
    } finally {
      // 清理临时目录
      try {
        execSync(`rm -rf "${tempDir}"`, { stdio: 'ignore' });
        console.log(`已清理测试目录: ${tempDir}`);
      } catch (error) {
        // Windows环境下使用不同的命令
        try {
          execSync(`rmdir /s /q "${tempDir}"`, { stdio: 'ignore' });
        } catch (winError) {
          console.log(`请手动删除测试目录: ${tempDir}`);
        }
      }
    }
    console.log('');
    
    // 3. 演示现有仓库保护
    console.log('3. 现有仓库保护演示');
    console.log('-------------------');
    
    const initResult = await gitOperator.initializeRepository();
    console.log(`现有仓库初始化结果: ${initResult.success ? '✓ 成功' : '✗ 失败'}`);
    console.log(`消息: ${initResult.message}`);
    console.log('');
    
    // 4. 演示Git操作功能
    console.log('4. Git操作功能演示');
    console.log('------------------');
    
    // 创建测试文件
    const testFile = path.join(process.cwd(), 'optimization-test.txt');
    fs.writeFileSync(testFile, '这是一个优化测试文件');
    console.log('✓ 创建测试文件');
    
    try {
      // 添加并提交
      const addResult = await gitOperator.addAllAndCommit('test: 优化功能测试文件');
      console.log(`添加并提交结果: ${addResult.success ? '✓ 成功' : '✗ 失败'}`);
      if (addResult.message) {
        console.log(`提交消息: ${addResult.message}`);
      }
      
      // 获取状态
      const statusResult = await gitOperator.getStatus();
      if (statusResult.success) {
        const status = statusResult.data;
        console.log(`工作区状态: ${status.isClean ? '干净' : '有未提交更改'}`);
        console.log(`当前分支: ${status.current || 'unknown'}`);
        console.log(`修改文件数: ${status.modified.length}`);
        console.log(`新增文件数: ${status.created.length}`);
      }
      
    } finally {
      // 清理测试文件
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
        console.log('✓ 清理测试文件');
      }
    }
    
    console.log('\n✨ 优化功能演示完成！');
    console.log('\n优化特性总结:');
    console.log('• 智能.git目录检测，避免重复初始化');
    console.log('• 自动仓库初始化功能');
    console.log('• 现有仓库保护机制');
    console.log('• 统一的错误处理和日志记录');
    console.log('• 更健壮的状态检查机制');
    
  } catch (error) {
    logger.error('演示过程中出错:', error);
    console.error('❌ 演示失败:', error.message);
  }
}

// 运行演示
if (require.main === module) {
  runOptimizationDemo().catch(console.error);
}

module.exports = { runOptimizationDemo };