#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

async function installMCP() {
  try {
    console.log('🚀 开始安装 Git Push MCP 服务...');
    
    // 获取全局npm目录
    const npmGlobalDir = await getNpmGlobalDir();
    const binDir = path.join(npmGlobalDir, 'bin');
    const libDir = path.join(npmGlobalDir, 'lib', 'node_modules', 'git-push-mcp');
    
    // 创建必要的目录
    await createDirectories([binDir, libDir]);
    
    // 复制文件
    await copyFiles(binDir, libDir);
    
    // 创建可执行链接
    await createExecutableLink(binDir);
    
    console.log('✅ Git Push MCP 服务安装成功！');
    console.log(`🔧 使用方法: git-push-mcp "你的自然语言命令"`);
    console.log(`📡 或者作为MCP服务器: git-push-mcp --server`);
    
  } catch (error) {
    console.error('❌ 安装失败:', error.message);
    process.exit(1);
  }
}

async function getNpmGlobalDir() {
  const { execSync } = require('child_process');
  try {
    const output = execSync('npm config get prefix', { encoding: 'utf8' }).trim();
    return output;
  } catch (error) {
    // 如果npm命令失败，使用默认路径
    const homeDir = os.homedir();
    return process.platform === 'win32' 
      ? path.join(homeDir, 'AppData', 'Roaming', 'npm')
      : path.join(homeDir, '.npm-global');
  }
}

async function createDirectories(dirs) {
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 创建目录: ${dir}`);
    }
  }
}

async function copyFiles(binDir, libDir) {
  const packageRoot = __dirname;
  const filesToCopy = [
    'package.json',
    'mcp-server.js',
    'index.js',
    '.env.example'
  ];
  
  const dirsToCopy = [
    'lib'
  ];
  
  // 复制文件
  for (const file of filesToCopy) {
    const src = path.join(packageRoot, file);
    const dest = path.join(libDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`📄 复制文件: ${file}`);
    }
  }
  
  // 复制目录
  for (const dir of dirsToCopy) {
    const src = path.join(packageRoot, dir);
    const dest = path.join(libDir, dir);
    if (fs.existsSync(src)) {
      copyDirectory(src, dest);
      console.log(`📁 复制目录: ${dir}`);
    }
  }
  
  // 安装依赖
  console.log('📦 安装依赖...');
  const { execSync } = require('child_process');
  try {
    execSync('npm install --production', {
      cwd: libDir,
      stdio: 'inherit'
    });
    console.log('✅ 依赖安装完成');
  } catch (error) {
    console.warn('⚠️  依赖安装失败，可能需要手动安装');
  }
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function createExecutableLink(binDir) {
  const executablePath = path.join(binDir, 'git-push-mcp');
  
  if (process.platform === 'win32') {
    // Windows批处理文件
    const batContent = `@echo off
node "%~dp0\\..\\lib\\node_modules\\git-push-mcp\\index.js" %*`;
    fs.writeFileSync(executablePath + '.cmd', batContent);
    
    // PowerShell脚本
    const psContent = `#!/usr/bin/env pwsh
node "$PSScriptRoot\\..\\lib\\node_modules\\git-push-mcp\\index.js" @args`;
    fs.writeFileSync(executablePath + '.ps1', psContent);
  } else {
    // Unix/Linux可执行文件
    const scriptContent = `#!/usr/bin/env node
require('${path.join(__dirname, '..', 'lib', 'node_modules', 'git-push-mcp', 'index.js')}')`;
    fs.writeFileSync(executablePath, scriptContent);
    fs.chmodSync(executablePath, '755');
  }
  
  console.log('🔗 创建可执行链接');
}

// 卸载功能
async function uninstallMCP() {
  try {
    console.log('🗑️ 开始卸载 Git Push MCP 服务...');
    
    const npmGlobalDir = await getNpmGlobalDir();
    const binDir = path.join(npmGlobalDir, 'bin');
    const libDir = path.join(npmGlobalDir, 'lib', 'node_modules', 'git-push-mcp');
    
    // 删除可执行文件
    const executablePath = path.join(binDir, 'git-push-mcp');
    if (process.platform === 'win32') {
      if (fs.existsSync(executablePath + '.cmd')) {
        fs.unlinkSync(executablePath + '.cmd');
        console.log('🗑️ 删除可执行文件');
      }
    } else {
      if (fs.existsSync(executablePath)) {
        fs.unlinkSync(executablePath);
        console.log('🗑️ 删除可执行文件');
      }
    }
    
    // 删除库文件
    if (fs.existsSync(libDir)) {
      fs.rmSync(libDir, { recursive: true, force: true });
      console.log('🗑️ 删除库文件');
    }
    
    console.log('✅ Git Push MCP 服务卸载成功！');
    
  } catch (error) {
    console.error('❌ 卸载失败:', error.message);
    process.exit(1);
  }
}

// 主程序
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--uninstall') || args.includes('uninstall')) {
    await uninstallMCP();
  } else {
    await installMCP();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { installMCP, uninstallMCP };