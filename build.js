#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function buildPackage() {
  try {
    console.log('📦 开始构建 Git Push MCP 包...');
    
    // 清理旧的构建文件
    const buildDir = path.join(__dirname, 'dist');
    if (fs.existsSync(buildDir)) {
      fs.rmSync(buildDir, { recursive: true });
    }
    fs.mkdirSync(buildDir);
    
    console.log('📁 创建构建目录...');
    
    // 复制必要文件
    const filesToInclude = [
      'package.json',
      'index.js',
      'mcp-server.js',
      'README.md',
      'INSTALL.md',
      '.env.example',
      '.gitignore'
    ];
    
    const dirsToInclude = [
      'lib'
    ];
    
    // 复制文件
    for (const file of filesToInclude) {
      const src = path.join(__dirname, file);
      const dest = path.join(buildDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`📄 复制: ${file}`);
      }
    }
    
    // 复制目录
    for (const dir of dirsToInclude) {
      const src = path.join(__dirname, dir);
      const dest = path.join(buildDir, dir);
      if (fs.existsSync(src)) {
        copyDirectory(src, dest);
        console.log(`📁 复制目录: ${dir}`);
      }
    }
    
    // 更新package.json中的版本信息
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(buildDir, 'package.json'), 'utf8')
    );
    
    // 添加构建时间戳
    packageJson.buildDate = new Date().toISOString();
    packageJson.buildVersion = `${packageJson.version}-${Date.now()}`;
    
    fs.writeFileSync(
      path.join(buildDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    console.log('🔧 更新包信息...');
    
    // 运行npm pack在构建目录中
    console.log('📦 创建npm包...');
    const result = execSync('npm pack', {
      cwd: buildDir,
      encoding: 'utf8'
    });
    
    console.log('✅ 构建完成!');
    console.log(`📁 构建文件位于: ${buildDir}`);
    console.log(`📦 包文件: ${result.trim()}`);
    
    // 移动包文件到根目录
    const packageFile = path.join(buildDir, result.trim());
    const targetFile = path.join(__dirname, result.trim());
    
    if (fs.existsSync(packageFile)) {
      fs.copyFileSync(packageFile, targetFile);
      console.log(`🚚 包文件已移动到: ${targetFile}`);
    }
    
  } catch (error) {
    console.error('❌ 构建失败:', error.message);
    process.exit(1);
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

// 主程序
if (require.main === module) {
  buildPackage().catch(console.error);
}

module.exports = { buildPackage };